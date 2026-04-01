// src/app/api/extract-scenario/route.ts
import { NextResponse } from 'next/server';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();
    const apiKey = req.headers.get('x-api-key') || process.env.GOOGLE_AI_KEY || process.env.IMAGE_API_KEY;

    if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    if (!imageUrl) return NextResponse.json({ error: 'Missing imageUrl' }, { status: 400 });

    const match      = imageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    const mimeType   = match ? match[1] : 'image/jpeg';
    const base64Data = match ? match[2] : imageUrl;

    const prompt = `You are an expert at analyzing background scenes and environments in images.

Analyze ONLY the background, environment, atmosphere and scene of this image. Ignore any people, subjects or products in the foreground.

Describe in detail:
- What is the environment/location?
- What textures and surfaces are visible?
- What is the color palette of the background?
- What atmospheric effects are present? (fog, particles, glow, bokeh, light rays)
- What is the lighting setup? (colors, direction, intensity)
- What is the mood and energy?
- Are there any graphic elements, patterns or overlays in the background?

Then write a single dense description of this background/scene in English that could be used to recreate it. Start with "Background:" and be extremely specific.

Output ONLY the background description — no explanations, no preamble. Maximum 3 sentences.`;

    const res = await fetch(
      `${GEMINI_BASE}/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { inline_data: { mime_type: mimeType, data: base64Data } },
              { text: prompt }
            ]
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 400 },
        }),
      }
    );

    const text = await res.text();
    if (!res.ok) throw new Error(`Gemini error: ${res.status}`);

    const scenarioPrompt = JSON.parse(text)?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    if (!scenarioPrompt) throw new Error('No scenario extracted');

    console.log('[ExtractScenario]', scenarioPrompt.slice(0, 100));
    return NextResponse.json({ scenarioPrompt });

  } catch (error: any) {
    console.error('ExtractScenario error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}