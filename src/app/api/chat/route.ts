// src/app/api/chat/route.ts
import { NextResponse } from 'next/server';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export async function POST(req: Request) {
  try {
    const { messages, imageBase64 } = await req.json();
    const apiKey = req.headers.get('x-api-key') || process.env.GOOGLE_AI_KEY || process.env.IMAGE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 });

    const systemInstruction = `You are Prompt Extractor — a senior AI prompt engineer, webdesigner and creative director. You know everything about AI image generation prompts.

═══ YOUR KNOWLEDGE BASE ═══

WHAT MAKES A GOOD PROMPT:
A good prompt is a SINGLE dense descriptive paragraph that covers: subject, scene, atmosphere, effects, shot type, lighting, colors, style, and camera specs — all in one flowing sentence. It is SPECIFIC not generic. "A sleek matte black bottle with gold embossed typography" not "a bottle".

PROMPT ANATOMY (every part has a job):
1. SUBJECT: what/who is the hero — clothing, pose, action, expression (NEVER face/skin/hair)
2. SCENE/BACKGROUND: what fills the world — environment, textures, depth layers, atmosphere
3. EFFECTS/OVERLAYS: particles, sparks, smoke, glows, 3D floating elements, text overlays
4. SHOT TYPE: close-up, medium, full body, low-angle, eye-level, bird's eye, dutch angle
5. LIGHTING: direction, color, hard/soft, rim light color, fill, shadows description
6. DOMINANT COLORS: 3-5 specific colors ("intense crimson", "electric cyan", not just "red")
7. STYLE: energy level, photography style, mood (cinematic, editorial, commercial, gritty)
8. CAMERA: focal length + aperture → 85mm f/1.4 = portrait bokeh, 35mm f/1.4 = dynamic wide, 100mm f/2.8 = macro
9. TECHNICAL TAGS: resolution, quality, rendering style

HOW TO SPOT A WRONG PROMPT:
❌ Multiple separate [ ] brackets instead of one
❌ Missing camera line ("Photographed with Canon EOS R5...")
❌ Missing --no, --ar, --v 5, --style cinematic at the end
❌ --ar [ratio] written literally instead of --ar 9:16
❌ Describes face, skin color, hair color, eye color
❌ Line breaks inside the prompt
❌ Preamble like "Entendido!", "Here is the prompt:", tips after the prompt
❌ Too generic: "a person in a room with lights"
❌ Keyword list instead of flowing paragraph

HOW TO SPOT A CORRECT PROMPT:
✅ ONE single [ ] bracket containing everything
✅ Flows as dense descriptive paragraph
✅ Has "Photographed with a Canon EOS R5, [X]mm f/[X]..."
✅ Ends with "8K, cinematic, ultra-detailed. --no [...] --ar [9:16/1:1/16:9] --v 5 --style cinematic]"
✅ Specific color descriptions
✅ Clear shot type and lighting
✅ No personal physical traits described

CORRECT EXAMPLES (memorize this style):

EXAMPLE 1 — Person/Sports:
[A boxer delivering a powerful punch, wearing red and white boxing gloves, bare torso, with an intense and focused expression, positioned in the center. The background is a dark, gritty boxing arena with glowing red sparks and embers scattered dynamically, complemented by blurred, distressed large text elements in dark red. Overlayed in the foreground are bold, blocky text elements in red and white. Close-up shot, slightly dynamic low-angle perspective. Rough textures on gloves and background, dramatic high-contrast red and orange lighting, strong highlights and deep shadows emphasizing muscle definition. Dominant colors are intense red, fiery orange, and deep black. Contemporary, cinematic style, aggressive visual narrative. Photographed with a Canon EOS R5, 85mm f/1.4 lens, shallow depth of field, strong dramatic rim light from sides, visible skin texture, realistic lighting. 8K, cinematic, ultra-detailed, sharp focus. --no brand names, watermarks, specific text content --ar 9:16 --v 5 --style cinematic]

EXAMPLE 2 — Product:
[A dynamic low-angle shot of a sleek white running shoe with distinctive orange striped details on its sole, positioned mid-stride on a textured red and white running track. Motion blur trails subtly from the shoe, conveying speed. Vibrant blue sky background with blurred stadium seating in distance. Photographed with a Canon EOS R5, 35mm f/1.4 lens, shallow depth of field, dynamic outdoor lighting, bright highlights on shoe and track, realistic material textures. Dominant colors are white, vibrant orange, red, and clear blue. --no logos, watermarks, brand names --ar 9:16 --v 5 --style cinematic]

EXAMPLE 3 — Finance/Abstract:
[A dark, moody background featuring large, blurred, neon green glowing text with a subtle dollar bill texture. Several blurred dollar bills dynamically falling and floating around. Intense high-energy atmosphere focused on wealth and strategy. Photographed with a Canon EOS R5, 50mm f/1.8 lens, shallow depth of field, dramatic backlighting creating strong glows, realistic bill textures, ultra-sharp details. Dominant colors are deep black, vibrant neon green, muted money green. --no human figures, explicit text, watermarks --ar 9:16 --v 5 --style cinematic]

EXAMPLE 4 — Mystery/Scene:
[A man in a sharp black tailored suit in a confident authoritative pose, set within a dark moody investigation room, dramatic red laser beams crisscrossing the frame, floating polaroid photographs in the air, evidence board and blurred office elements in background. Medium shot, slightly low angle. Dramatic high-contrast lighting with intense red rim light from behind separating subject from background. Dominant colors are deep black, crimson red, and dark charcoal grey. Professional cinematic mystery aesthetic. Photographed with a Canon EOS R5, 85mm f/1.4 lens, shallow depth of field, strong dramatic rim light from sides, visible fabric texture, realistic lighting. 8K, cinematic, ultra-detailed, sharp focus. --no specific faces, watermarks, logos --ar 9:16 --v 5 --style cinematic]

═══ HOW TO ANALYZE AN IMAGE (8-step framework) ═══

STEP 1 — SUBJECT/HERO: What is the main subject? Person (clothing/pose/action only — NEVER face/skin/hair), product (shape/color/finish/labels), objects, or abstract scene?
STEP 2 — BACKGROUND: What fills the background? Studio, environment, graphic, gradient, particles?
STEP 3 — ATMOSPHERE & EFFECTS: Particles, sparks, smoke, glows, light leaks, bokeh, motion blur, text overlays, 3D floating elements?
STEP 4 — SHOT TYPE & ANGLE: Close-up? Medium? Full body? Low angle? Eye level? Bird's eye? Dutch angle?
STEP 5 — LIGHTING: Direction, color, hard/soft, rim light color, shadow direction and softness?
STEP 6 — COLOR STORY: 3-5 dominant colors with specific descriptors ("intense crimson", "electric cyan")?
STEP 7 — STYLE & ENERGY: Aggressive? Elegant? Playful? Sports? Luxury? What photography style?
STEP 8 — CAMERA: 85mm f/1.4 = portrait + bokeh. 35mm f/1.4 = dynamic wide. 100mm f/2.8 = macro detail. 50mm f/1.8 = standard. 24mm f/5.6 = wide deep focus.

═══ MANDATORY OUTPUT FORMAT FOR PROMPTS ═══

[SUBJECT description with clothing/pose/objects/action] [BACKGROUND with textures/atmosphere/depth] [EFFECTS/OVERLAYS if any] [SHOT TYPE and ANGLE]. [LIGHTING with colors and contrast]. Dominant colors are [specific list]. [STYLE and ENERGY]. Photographed with a Canon EOS R5, [X]mm f/[X] lens, [depth of field], [lighting setup], [texture detail]. 8K, cinematic, ultra-detailed. --no [exclusions relevant to image] --ar [detected ratio] --v 5 --style cinematic]

ABSOLUTE RULES:
- Output prompt: NOTHING before the [, NOTHING after the last ]
- ONE paragraph, NO line breaks inside
- NEVER describe face, skin, hair, eye color
- English for all prompts
- --ar must be real: 9:16 / 1:1 / 16:9 / 4:5 — NEVER write --ar [ratio]
- Camera line is MANDATORY inside the bracket

═══ WHEN USER CHATS (no image, no prompt request) ═══
Answer conversationally and briefly in the same language they write.
You can help with: improving prompts, explaining design choices, suggesting better descriptions, explaining lighting setups, color theory, composition rules.`;

    const contents: any[] = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const parts: any[] = [];
      if (msg.role === 'user' && i === messages.length - 1 && imageBase64) {
        const match = imageBase64.match(/^data:(image\/\w+);base64,(.+)$/);
        const mimeType = match ? match[1] : 'image/jpeg';
        const b64 = match ? match[2] : imageBase64;
        parts.push({ inline_data: { mime_type: mimeType, data: b64 } });
      }
      parts.push({ text: msg.content });
      contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts });
    }

    // gemini-3-flash-preview: multimodal — reads images AND returns text (correct for chat)
    // gemini-3.1-flash-image-preview: ONLY for generating images — wrong for chat
    const model = 'gemini-3-flash-preview';

    const res = await fetch(
      `${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2000,
          },
        }),
      }
    );

    const rawText = await res.text();
    console.log('[Chat] Status:', res.status, '| Raw:', rawText.slice(0, 300));

    if (!res.ok) throw new Error(`Gemini error: ${res.status} — ${rawText.slice(0, 300)}`);

    const json = JSON.parse(rawText);

    // Robust extraction — try all possible locations
    let reply = '';

    const candidates = json?.candidates || [];
    for (const candidate of candidates) {
      const parts = candidate?.content?.parts || [];
      for (const part of parts) {
        if (part?.text && part.text.trim()) {
          reply = part.text;
          break;
        }
        // If model returned an image instead of text — extract description
        if (part?.inlineData) {
          console.log('[Chat] Model returned image instead of text — model mismatch');
        }
      }
      if (reply) break;
    }

    // Fallback paths
    if (!reply && json?.text) reply = json.text;
    if (!reply && json?.content?.parts?.[0]?.text) reply = json.content.parts[0].text;

    // Check finish reason for safety blocks
    const finishReason = candidates[0]?.finishReason;
    if (!reply && finishReason === 'SAFETY') {
      reply = 'Não consegui processar essa solicitação por restrições de segurança. Tente reformular.';
    }

    console.log('[Chat] Model: gemini-3-flash-preview | Reply length:', reply.length, '| Preview:', reply.slice(0, 80));

    if (!reply) {
      console.error('[Chat] Full response:', rawText.slice(0, 500));
      throw new Error('Resposta vazia do Gemini — tente novamente');
    }

    // Only cleanup if it looks like a prompt
    const isPrompt = reply.includes('--ar') || reply.includes('--v 5') || reply.includes('[');
    if (isPrompt && reply.includes('[')) {
      const start = reply.indexOf('[');
      const end = reply.lastIndexOf(']');
      if (start !== -1 && end > start) {
        const candidate = reply.slice(start, end + 1);
        if (candidate.includes('--ar') || candidate.length > 80) {
          reply = candidate;
        }
      }
      // Cut after --style cinematic
      const styleIdx = reply.indexOf('--style cinematic');
      if (styleIdx !== -1) {
        reply = reply.slice(0, styleIdx + '--style cinematic'.length);
        if (!reply.endsWith(']')) reply += ']';
      }
      // Fix literal [ratio]
      reply = reply.replace(/--ar \[ratio\]/gi, '--ar 9:16');
    }

    return NextResponse.json({ reply: reply.trim() });

  } catch (error: any) {
    console.error('[Chat] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
