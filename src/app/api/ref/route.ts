// src/app/api/ref/route.ts — Reference Builder dedicated API
import { NextResponse } from 'next/server';
import { buildRefPrompt, type RefBuilderPayload } from '@/lib/refPrompt';

export const maxDuration = 120;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function extractBase64(dataUrl: string): { base64: string; mimeType: string } {
  if (!dataUrl?.startsWith('data:')) return { mimeType: 'image/jpeg', base64: dataUrl };
  const mimeEnd = dataUrl.indexOf(';'); const base64Start = dataUrl.indexOf('base64,');
  if (mimeEnd === -1 || base64Start === -1) return { mimeType: 'image/jpeg', base64: dataUrl };
  return { mimeType: dataUrl.substring(5, mimeEnd), base64: dataUrl.substring(base64Start + 7) };
}

async function refineWithBrandStrategist(prompt: string, apiKey: string): Promise<string> {
  const url = `${GEMINI_BASE}/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `You are a Senior Brand Strategist at a world-class branding studio (Pentagram, Base Design, Collins level).
Add a 2-3 sentence creative direction note for this design reference that focuses on: specific color theory application, material storytelling, and cultural resonance.
DO NOT rewrite the brief. ONLY append. English only.

BRIEF:\n${prompt}` }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 250 }
      }),
    });
    if (!res.ok) return prompt;
    const json = await res.json();
    const vision = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (vision && vision.length > 40) return `${prompt}\n\n[BRAND STRATEGIST VISION]\n${vision.trim()}`;
    return prompt;
  } catch { return prompt; }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const apiKey = req.headers.get('x-api-key') || process.env.GOOGLE_AI_KEY || process.env.IMAGE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 });

    // Support multiple reference images for merging
    const refImages: string[] = [];
    if (data.refImage) refImages.push(data.refImage);
    if (data.refImages && Array.isArray(data.refImages)) {
      refImages.push(...data.refImages.filter((img: string) => img && !refImages.includes(img)));
    }

    const payload: RefBuilderPayload = {
      concept: data.concept || '',
      graphicStyle: data.graphicStyle || 'minimalist',
      materials: data.materials || [],
      outputType: data.outputType || 'moodboard',
      proportion: data.proportion || '1:1',
      colorDirection: data.colorDirection || 'muted',
      era: data.era,
      targetAudience: data.targetAudience,
      keywords: data.keywords || [],
      extraPrompt: data.extraPrompt,
      hasRefImage: refImages.length > 0,
      refInstruction: data.refInstruction,
      refCount: refImages.length,
    };

    const basePrompt = buildRefPrompt(payload);
    const finalPrompt = await refineWithBrandStrategist(basePrompt, apiKey);

    const parts: any[] = [];
    // Add all reference images with explicit labels for multi-reference merging
    refImages.forEach((img, i) => {
      const { base64, mimeType } = extractBase64(img);
      parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
      const label = refImages.length > 1 ? `REFERENCE IMAGE ${i + 1} for FUSION` : 'STYLE REFERENCE';
      parts.push({ text: `[${label} — EXTRACT DESIGN DNA]` });
    });
    
    if (refImages.length > 1) {
      parts.push({ text: `[SYSTEM] MULTI-REFERENCE FUSION MODE: Synthesize all attached references into one singular cohesive vision.` });
    }

    parts.push({ text: finalPrompt });

    const aspectMap: Record<string, string> = { '1:1': '1:1', '4:3_h': '4:3', '4:3_v': '3:4', '16:9': '16:9', '4:5': '3:4' };
    const aspectRatio = aspectMap[payload.proportion] || '1:1';

    // Call Gemini with 1x Retry and 0.8 Temp
    const url = `${GEMINI_BASE}/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`;
    let lastError = '';
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 110_000);

      try {
        console.log(`[Ref Engine] Attempt ${attempt}/${maxRetries}...`);
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
          lastError = `Gemini error: ${res.status} — ${text.slice(0, 300)}`;
          if (res.status >= 400 && res.status < 500) break;
          continue;
        }

        const json = JSON.parse(text);
        for (const candidate of json?.candidates || []) {
          for (const part of candidate?.content?.parts || []) {
            if (part?.inlineData?.data) {
              const mime = part.inlineData.mimeType || 'image/jpeg';
              return NextResponse.json({ 
                id: Math.random().toString(36).slice(2), 
                url: `data:${mime};base64,${part.inlineData.data}`, 
                prompt: finalPrompt, 
                dimensions: payload.proportion 
              });
            }
          }
        }
        throw new Error('No image returned.');
      } catch (err: any) {
        lastError = err.message;
        if (attempt === maxRetries) throw new Error(lastError);
      } finally {
        clearTimeout(timeout);
      }
    }
    throw new Error(lastError || 'Reference Engine Failure');
  } catch (error: any) {
    console.error('[REF ENGINE] Fatal:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
