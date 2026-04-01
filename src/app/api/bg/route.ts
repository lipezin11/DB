// src/app/api/bg/route.ts — Background Builder dedicated API
import { NextResponse } from 'next/server';
import { buildBgPrompt, type BgBuilderPayload } from '@/lib/bgPrompt';

export const maxDuration = 120;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function extractBase64(dataUrl: string): { base64: string; mimeType: string } {
  if (!dataUrl?.startsWith('data:')) return { mimeType: 'image/jpeg', base64: dataUrl };
  const mimeEnd = dataUrl.indexOf(';');
  const base64Start = dataUrl.indexOf('base64,');
  if (mimeEnd === -1 || base64Start === -1) return { mimeType: 'image/jpeg', base64: dataUrl };
  return { mimeType: dataUrl.substring(5, mimeEnd), base64: dataUrl.substring(base64Start + 7) };
}

async function refineWithUIDirector(prompt: string, apiKey: string): Promise<string> {
  const url = `${GEMINI_BASE}/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `You are a Senior UI/UX Art Director at a world-class digital agency (Apple, Stripe, Linear, Notion level).
Append a 2-3 sentence creative direction note for this background that focuses on: specific gradient transitions, depth cues, and how it'll feel under UI elements.
DO NOT rewrite. ONLY append. English only. Be specific.

BRIEF:
${prompt}` }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 250 }
      }),
    });
    if (!res.ok) return prompt;
    const json = await res.json();
    const vision = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (vision && vision.length > 40) return `${prompt}\n\n[UI ART DIRECTOR VISION]\n${vision.trim()}`;
    return prompt;
  } catch { return prompt; }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const apiKey = req.headers.get('x-api-key') || process.env.GOOGLE_AI_KEY || process.env.IMAGE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 });

    const payload: BgBuilderPayload = {
      destination: data.destination || 'hero_web',
      style: data.style || 'gradient_mesh',
      colors: data.colors || [],
      complexity: data.complexity ?? 50,
      safeZone: data.safeZone ?? true,
      safeZonePosition: data.safeZonePosition || 'center',
      format: data.format || '16:9',
      mood: data.mood || 'dark',
      theme: data.theme,
      extraPrompt: data.extraPrompt,
      hasRefImage: !!data.refImage,
      refInstruction: data.refInstruction,
      // Extended V3
      environment: data.environment,
      scenarioPhysics: data.scenarioPhysics,
      visualStyles: data.visualStyles,
    };

    const basePrompt = buildBgPrompt(payload);
    const finalPrompt = await refineWithUIDirector(basePrompt, apiKey);

    const parts: any[] = [];
    if (data.refImage) {
      const { base64, mimeType } = extractBase64(data.refImage);
      parts.push({ inline_data: { mime_type: mimeType, data: base64 } });
      parts.push({ text: '[STYLE REFERENCE — EXTRACT VISUAL DNA]' });
    }
    parts.push({ text: finalPrompt });

    const aspectMap: Record<string, string> = { '16:9': '16:9', '1:1': '1:1', '9:16': '9:16', '4:3_h': '4:3', '4:3_v': '3:4', '4:5': '3:4', ultrawide: '16:9' };
    const aspectRatio = aspectMap[payload.format] || '16:9';

    // Call Gemini with 1x Retry and 0.8 Temp
    const url = `${GEMINI_BASE}/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`;
    let lastError = '';
    const maxRetries = 2;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 110_000);

      try {
        console.log(`[BG Engine] Attempt ${attempt}/${maxRetries}...`);
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
                dimensions: payload.format 
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
    throw new Error(lastError || 'Engine Failure');
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
