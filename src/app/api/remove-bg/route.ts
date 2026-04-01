// src/app/api/remove-bg/route.ts
// FREE Background Removal powered by Gemini Vision
// No external API needed — uses the user's existing Gemini API key
// Gemini 3 Pro Image is instructed to re-render the subject on a pure white background,
// producing an asset perfect for transparent layer export via Canvas API on the frontend.

import { NextResponse } from 'next/server';

export const maxDuration = 120;

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL_PRO = 'gemini-3-pro-image-preview';
const MODEL_FAST = 'gemini-3.1-flash-image-preview';

export async function POST(req: Request) {
  try {
    const { imageUrl, mode = 'subject' } = await req.json();
    const apiKey = req.headers.get('x-api-key') || process.env.GOOGLE_AI_KEY || process.env.IMAGE_API_KEY;

    if (!apiKey) return NextResponse.json({ error: 'API Key necessária' }, { status: 401 });
    if (!imageUrl) return NextResponse.json({ error: 'Imagem necessária' }, { status: 400 });

    // Decode base64
    const mimeMatch = imageUrl.match(/^data:(image\/[^;]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const base64Data = imageUrl.startsWith('data:')
      ? imageUrl.substring(imageUrl.indexOf('base64,') + 7)
      : imageUrl;

    let prompt = '';

    if (mode === 'subject') {
      // Mode 1: Extract ONLY the subject on pure white
      prompt = `[SURGICAL SUBJECT EXTRACTION — STUDIO CUTOUT]
You are a master photo retoucher with 20+ years of cutting hair from backgrounds.

TASK: Take the main subject (person, product, or object) from this image and place it on a PURE WHITE (#FFFFFF) background.

CRITICAL REQUIREMENTS:
1. SUBJECT ISOLATION: Remove 100% of the original background. Replace it with solid white.
2. EDGE PRECISION: Every edge — including individual hair strands, soft fabric edges, transparent glass — must be preserved with clinical precision. No edge halos. No background color bleed.
3. SHADOW: Retain a soft natural contact shadow below the subject on the white surface to anchor it physically.
4. SUBJECT FIDELITY: The subject itself must be 100% unchanged — same face, same clothing, same colors, same lighting.
5. WHITE BACKGROUND: The area outside the subject must be pure white (#FFFFFF), fully flat, no gradient.
6. QUALITY: Studio cutout quality. This will be used as a transparent PNG layer for professional design work.

Output: The isolated subject on white. Nothing else.`;

    } else if (mode === 'background') {
      // Mode 2: Remove subject, keep only background
      prompt = `[BACKGROUND EXTRACTION — SUBJECT REMOVAL]
You are an expert digital compositor.

TASK: Remove the main subject (person, product, or object) from this image. 
Fill the area where the subject was using intelligent Content-Aware Fill — reconstruct what would have been behind the subject based on the surrounding background patterns, textures, and perspective.

CRITICAL REQUIREMENTS:
1. SUBJECT REMOVAL: The main subject must be completely gone. No ghost artifacts, no remnants.
2. CONTENT-AWARE FILL: The empty space must be filled seamlessly. Match environment textures, lighting, and perspective precisely. 
3. BACKGROUND FIDELITY: Every other part of the background must remain 100% unchanged.
4. SEAMLESS SEAMS: The reconstructed area must be indistinguishable from the original background.
5. QUALITY: Professional compositing standard. This will be used as a background layer for professional design work.

Output: The clean background with the subject removed. Nothing else.`;
    }

    const parts = [
      { inline_data: { mime_type: mimeType, data: base64Data } },
      { text: prompt },
    ];

    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        temperature: 0.2, // Very low temp for precise surgical extraction
        imageConfig: {
          aspectRatio: '1:1', // Will match source aspect ratio
          imageSize: '4K',
        },
      },
    };

    // Try Pro first, fallback to Flash
    const modelsToTry = [MODEL_PRO, MODEL_FAST];
    let resultImageUrl = null;

    for (const modelId of modelsToTry) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 100_000);

      try {
        console.log(`[RemoveBg] Calling ${modelId} in ${mode} mode...`);
        const res = await fetch(
          `${GEMINI_BASE}/models/${modelId}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        if (res.status === 503 || res.status === 429) {
          console.warn(`[RemoveBg] ${modelId} overloaded, trying fallback...`);
          continue;
        }

        const text = await res.text();
        if (!res.ok) throw new Error(`API Error ${res.status}: ${text.slice(0, 300)}`);

        const json = JSON.parse(text);
        for (const candidate of json?.candidates || []) {
          for (const part of candidate?.content?.parts || []) {
            if (part?.inlineData?.data) {
              const mime = part.inlineData.mimeType || 'image/png';
              resultImageUrl = `data:${mime};base64,${part.inlineData.data}`;
              console.log(`[RemoveBg] Success with ${modelId}!`);
              break;
            }
          }
          if (resultImageUrl) break;
        }

        if (resultImageUrl) break;
        throw new Error('No image in response from Gemini.');

      } catch (err: any) {
        clearTimeout(timeout);
        console.error(`[RemoveBg] Error with ${modelId}:`, err.message);
        if (modelId === MODEL_FAST) throw err;
      }
    }

    if (!resultImageUrl) throw new Error('Falha ao extrair camada. Tente novamente.');

    return NextResponse.json({
      url: resultImageUrl,
      mode,
    });

  } catch (error: any) {
    console.error('[RemoveBg] Fatal error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
