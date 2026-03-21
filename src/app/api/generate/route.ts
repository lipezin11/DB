// src/app/api/generate/route.ts — Versão corrigida para Imagen
import { NextResponse } from 'next/server';
import { enhanceBriefWithPatterns } from '@/lib/ragSystem';

// Funções de construção de prompt (mantenha as suas da v15.0)
// ... (cole aqui as funções buildPersonPrompt e buildProductPrompt)

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const apiKey = req.headers.get('x-goog-api-key') || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'API key não fornecida' }, { status: 401 });
    }

    const hasPhoto = !!data.subject?.photo;
    const isProduto = data.subject?.subjectMode === 'produto';
    const hasRef = !!data.style?.refImage;

    console.log('\n========================================');
    console.log('--- IMAGEN API (GOOGLE) ---');
    console.log(`Mode: ${isProduto ? 'PRODUTO' : 'PESSOA'} | Photo: ${hasPhoto} | Ref: ${hasRef}`);

    const brief = `SUBJECT: ${data.subject?.gender} in ${data.context?.niche}. SCENE: ${data.context?.environment || 'Professional'}. FRAMING: ${data.composition?.framing}.`;
    const enhancedBrief = enhanceBriefWithPatterns(brief, data.context?.niche || 'general');

    const finalPrompt = isProduto
      ? buildProductPrompt(data, enhancedBrief, hasPhoto)
      : buildPersonPrompt(data, enhancedBrief, hasPhoto);

    console.log('Prompt preview:', finalPrompt.slice(0, 500) + '...');

    // Modelo de imagem - tente ambos
    const model = 'imagen-3.0-generate-001'; // ou 'gemini-3-pro-image-preview'

    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: finalPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        // Parâmetros específicos para imagem
        responseModalities: ['image'],
        temperature: 1.0,
        topK: 32,
        topP: 1.0,
        maxOutputTokens: 4096,
      },
    };

    console.log('📡 Enviando requisição para:', `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.slice(0,5)}...`);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    const responseText = await response.text();
    console.log('Resposta da API (status):', response.status);
    console.log('Resposta da API (corpo):', responseText.slice(0, 500));

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} - ${responseText}`);
    }

    const result = JSON.parse(responseText);

    // Extrai a imagem (se houver)
    let imageUrl = '';
    if (result.candidates && result.candidates[0]?.content?.parts) {
      for (const part of result.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      // Se não veio imagem, talvez veio texto de erro
      return NextResponse.json({
        id: Date.now().toString(36),
        url: '',
        prompt: finalPrompt,
        text: result.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem imagem gerada',
        model: model,
        warning: 'Modelo não retornou imagem. Verifique se o modelo correto está habilitado.'
      });
    }

    return NextResponse.json({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      url: imageUrl,
      prompt: finalPrompt,
      model: model,
    });

  } catch (error: any) {
    console.error('Pipeline error:', error.message);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
