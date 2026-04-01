// src/app/api/convert/route.ts — Gemini 3 Pro Image img2img para 9:16
import { NextResponse } from 'next/server';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export async function POST(req: Request) {
  try {
    const { originalPrompt, imageUrl } = await req.json();
    const apiKey = req.headers.get('x-api-key') || process.env.GOOGLE_AI_KEY || process.env.IMAGE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 });

    const verticalPrompt = `Convert this image to 9:16 vertical format. Keep the same subject, scene, lighting and style. Adapt the composition for vertical Stories format with the subject centered. ${originalPrompt ? 'Original context: ' + originalPrompt.slice(0, 400) : ''}`.slice(0, 2800);

    const parts: any[] = [];

    // Se tem a imagem, manda como img2img — muito mais fiel
    if (imageUrl) {
      const match = imageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
      const mimeType = match ? match[1] : 'image/jpeg';
      const base64Data = match ? match[2] : imageUrl;
      parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
    }

    parts.push({ text: verticalPrompt });

    const res = await fetch(
      `${GEMINI_BASE}/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            temperature: 1.0,
            imageConfig: { aspectRatio: '9:16', imageSize: '4K' },
          },
        }),
      }
    );

    const text = await res.text();
    console.log('[Convert] Status:', res.status, text.slice(0, 150));
    if (!res.ok) throw new Error(`Gemini convert error: ${res.status} — ${text.slice(0, 400)}`);

    const json = JSON.parse(text);
    for (const candidate of json?.candidates || []) {
      for (const part of candidate?.content?.parts || []) {
        if (part?.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/jpeg';
          return NextResponse.json({
            id: Math.random().toString(36).slice(2),
            url: `data:${mime};base64,${part.inlineData.data}`,
            prompt: verticalPrompt,
            isVertical: true,
          });
        }
      }
    }

    throw new Error('No image returned from Gemini');

  } catch (error: any) {
    console.error('Convert error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
