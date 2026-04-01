// src/app/api/art/route.ts
// Dedicated API for ART BUILDER — Unified for all Apps with Extended DNA
import { NextResponse } from 'next/server';
import { buildArtPrompt, type ArtBuilderPayload } from '@/lib/artPrompt';

export const maxDuration = 300; // Increased to 5 mins for safety

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function extractBase64(dataUrl: string): { base64: string; mimeType: string } | null {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  const mimeEnd = dataUrl.indexOf(';');
  const base64Start = dataUrl.indexOf('base64,');
  if (mimeEnd === -1 || base64Start === -1) return null;
  return { mimeType: dataUrl.substring(5, mimeEnd), base64: dataUrl.substring(base64Start + 7) };
}

async function refineWithArtDirector(prompt: string, apiKey: string): Promise<string> {
  const url = `${GEMINI_BASE}/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
  const systemInstruction = `You are a World-Class Art Director. Enhance the creative brief with technical aesthetic details (lighting, materials, atmospherics). Keep the core subject intact. Output only the enhanced brief in 2-3 sentences. Language: English.`.trim();

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\nBRIEF:\n${prompt}` }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
      }),
    });
    if (!res.ok) return prompt;
    const json = await res.json();
    const vision = json.candidates?.[0]?.content?.parts?.[0]?.text;
    return vision ? `${prompt}\n\n[ART DIRECTOR ENHANCEMENT]\n${vision.trim()}` : prompt;
  } catch { return prompt; }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const apiKey = req.headers.get('x-api-key') || process.env.GOOGLE_AI_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 });

    // Build Payload with all standardized and specialized fields
    const payload: ArtBuilderPayload = {
      format: data.format || '1:1',
      subjectPhoto: data.subjectPhoto,
      subjectQty: data.subjectQty,
      subjectGender: data.subjectGender,
      subjectDesc: data.subjectDesc,
      subjectPos: data.subjectPos,
      niche: data.niche || '',
      environment: data.environment,
      useBgPhotos: data.useBgPhotos,
      brandColors: data.brandColors,
      rimLight: data.rimLight,
      compLight: data.compLight,
      shotType: data.shotType,
      floatingElements: data.floatingElements,
      refImage: data.refImage,
      sobriety: data.sobriety,
      visualStyles: data.visualStyles,
      useBlur: data.useBlur,
      useSideGradient: data.useSideGradient,
      extraPrompt: data.extraPrompt,
      headline: data.headline,
      // Extended DNA
      creativeDNA: data.creativeDNA,
      scenarioPhysics: data.scenarioPhysics,
      brandIdentity: data.brandIdentity
    };

    console.log('[NEURAL ENGINE] Initializing generation for niche:', payload.niche);
    const basePrompt = buildArtPrompt(payload);
    const finalPrompt = await refineWithArtDirector(basePrompt, apiKey);

    // Use Interleaved Labeling Standard
    const parts: any[] = [];
    
    const subjImg = extractBase64(data.subjectPhoto);
    if (subjImg) {
      parts.push({ inline_data: { mime_type: subjImg.mimeType, data: subjImg.base64 } });
      parts.push({ text: '[PERSON REFERENCE — IDENTITY LOCK]' });
    }
    
    const refImg = extractBase64(data.refImage);
    if (refImg) {
      parts.push({ inline_data: { mime_type: refImg.mimeType, data: refImg.base64 } });
      parts.push({ text: '[STYLE REFERENCE — ARTISTIC DNA]' });
    }
    
    if (subjImg && refImg) {
      parts.push({ text: `[SYSTEM] SYNTHESIS MODE: Combine PERSON identity with STYLE artistic language. Do not mix traits.` });
    }
    
    parts.push({ text: finalPrompt });

    // Normalize Aspect Ratio
    const aspectRatio = data.format === '4:5' ? '3:4' : (data.format || '1:1');

    // Call Gemini with 1x Retry and 0.8 Temp
    const url = `${GEMINI_BASE}/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`;
    let lastError = '';
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180_000);

      try {
        console.log(`[Art Engine] Attempt ${attempt}/${maxRetries}...`);
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
              temperature: 0.8,
              imageConfig: { aspectRatio },
            },
          }),
          signal: controller.signal,
        });

        const text = await res.text();
        if (!res.ok) {
          lastError = `AI Engine Error: ${res.status} - ${text.slice(0, 300)}`;
          if (res.status >= 400 && res.status < 500) break;
          continue;
        }

        const json = JSON.parse(text);
        for (const candidate of json?.candidates || []) {
          for (const part of candidate?.content?.parts || []) {
            if (part?.inlineData?.data) {
              return NextResponse.json({
                id: Math.random().toString(36).slice(2),
                url: `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`,
                prompt: finalPrompt,
                dimensions: data.format
              });
            }
          }
        }
        throw new Error('No image synthesized.');
      } catch (err: any) {
        lastError = err.message;
        if (attempt === maxRetries) throw new Error(lastError);
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new Error(lastError);
  } catch (error: any) {
    console.error('[NEURAL ENGINE] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
