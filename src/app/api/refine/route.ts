// src/app/api/refine/route.ts — v2.0 PHOTOSHOP KILLER ENGINE
import { NextResponse } from 'next/server';
import { computeCompositionBlueprint, blueprintToPromptBlock } from '@/lib/compositionEngine';

export const maxDuration = 300; // Allow up to 5 minutes for Vercel

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL_REFINER = 'gemini-3-flash-preview';
const MODEL_PRO_IMAGE = 'gemini-3-pro-image-preview';
const MODEL_FAST_IMAGE = 'gemini-3.1-flash-image-preview';

// ─── ANALYSE REFINEMENT INTENT (GEMINI FLASH) ──────────────────────────────────
async function analyzeRefinementIntent(
  originalPrompt: string,
  userInstructions: string,
  apiKey: string,
  hasRefImage: boolean
): Promise<{ rewrittenPrompt: string; imageAnchorStrictness: 'STRICT' | 'LOOSE' | 'IGNORE' }> {
  console.log('[Refine] Analyzing intent with Gemini Flash...');
  const url = `${GEMINI_BASE}/models/${MODEL_REFINER}:generateContent?key=${apiKey}`;

  const promptRequest = `You are a master AI Art Director translating user feedback for an image generation pipeline.
You will receive the base prompt of a generated image, and the user's feedback/instruction.

YOUR TASK:
1. Examine what the user wants to change.
2. The user wants to refine an EXISTING generated image based on the ORIGINAL PROMPT.
3. If they ask for a specific change (e.g., "change shirt color to red", "remove the cup", "add a dog"), you MUST keep the original prompt 99% identical. ONLY alter or add the exact words necessary to enact their change. Set imageAnchorStrictness to "STRICT".
4. If they ask for a stylistic/lighting overhaul (e.g., "make it cyberpunk", "better lighting"), rewrite the environment/lighting description but strictly keep the core subject exactly the same. Set imageAnchorStrictness to "LOOSE".
5. Only if they ask for a completely different image entirely should you set imageAnchorStrictness to "IGNORE".
6. ALWAYS PRESERVE specific layout meta-instructions like [NO PERSON], [TYPOGRAPHY REINFORCEMENT], etc.
${hasRefImage ? '7. [IMPORTANT]: The user HAS UPLOADED A SECONDARY REFERENCE IMAGE. Your rewritten prompt MUST explicitly command the model to visually incorporate the elements, colors, textures, or objects from that secondary reference image into the final result. Be very specific about what to take from it.' : ''}

CRITICAL: The rewritten prompt must be a COMPLETE, DETAILED image generation prompt. It must describe the full scene with the change integrated. Do NOT just output the change.

ORIGINAL PROMPT:
${originalPrompt || 'No original prompt provided.'}

USER INSTRUCTION:
${userInstructions}

Return a JSON with "rewrittenPrompt" and "imageAnchorStrictness" ("STRICT", "LOOSE", or "IGNORE").`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: promptRequest }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 2000,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          rewrittenPrompt: { type: "STRING" },
          imageAnchorStrictness: { type: "STRING" }
        },
        required: ["rewrittenPrompt", "imageAnchorStrictness"]
      }
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.warn(`[Refine API] Intent analysis failed: ${res.status}`);
      throw new Error('Fallback');
    }

    const text = await res.text();
    const jsonCandidate = JSON.parse(text)?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (jsonCandidate) {
      const parsed = JSON.parse(jsonCandidate);
      console.log(`[Refine API] Flash Analysis Success. Strictness: ${parsed.imageAnchorStrictness}`);
      console.log(`[Refine API] Rewritten prompt preview: ${parsed.rewrittenPrompt?.slice(0, 200)}`);
      return {
        rewrittenPrompt: parsed.rewrittenPrompt,
        imageAnchorStrictness: parsed.imageAnchorStrictness as any || 'STRICT'
      };
    }
    throw new Error('Empty response');
  } catch (err) {
    console.error('[Refine API] Error in intent analysis, using fallback:', err);
    return {
      rewrittenPrompt: `Based on this existing image, make the following changes: ${userInstructions}. Keep everything else exactly the same. ${originalPrompt ? 'Original context: ' + originalPrompt.slice(0, 800) : ''}`,
      imageAnchorStrictness: 'STRICT'
    };
  }
}

// ─── ART DIRECTOR REFINEMENT (same layer as /api/generate) ──────────────────────
async function artDirectorRefine(prompt: string, apiKey: string, appType: string = 'design'): Promise<string> {
  console.log('[Refine] Art Director pass for appType:', appType);
  const url = `${GEMINI_BASE}/models/${MODEL_REFINER}:generateContent?key=${apiKey}`;

  let systemInstruction = `You are an expert Art Director for High-End Advertising Image Generation.
Your task is to analyze the technical prompt and provide a highly creative, 3-sentence "Art Director Vision" to APPEND to it.`;

  if (appType === 'art') {
    systemInstruction += `\n\nCRITICAL SPECIFIC INSTRUCT FOR 'ART BUILDER': 
This is a Social Media Ad Creative. You MUST describe high-impact contrast, energetic visual hierarchy, and colors that convert. Make it sound like a top-tier Dentsu or Ogilvy ad campaign.`;
  } else if (appType === 'bg') {
    systemInstruction += `\n\nCRITICAL SPECIFIC INSTRUCT FOR 'BACKGROUND BUILDER':
This is a UI background. You MUST describe abstract serenity, macro textures, clean negative space, and smooth ambient gradients. NO subjects.`;
  } else if (appType === 'ref') {
    systemInstruction += `\n\nCRITICAL SPECIFIC INSTRUCT FOR 'REFERENCE BUILDER':
This is a design moodboard. You MUST describe material properties, Pantone color harmony, and tactile visual vibes.`;
  }

  systemInstruction += `

CRITICAL RULES:
1. DO NOT REWRITE THE PROMPT. Your output will be APPENDED to the original prompt.
2. FOCUS ON CREATIVITY: Describe the atmospheric depth, specific lighting qualities (e.g., bounced light, cinematic shadows), and textures.
3. NO HALLUCINATION: Respect the subject and environment of the raw prompt.
4. STRUCTURE: Output ONLY 2 to 3 sentences of pure visual and creative direction.
5. LANGUAGE: English only.`.trim();

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `SYSTEM: ${systemInstruction}\n\nUSER PROMPT TO REFINE:\n${prompt}` }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
      }),
    });

    if (!res.ok) {
      console.warn('[Refine] Art Director pass failed, using raw prompt.');
      return prompt;
    }

    const json = await res.json();
    const artVision = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (artVision && artVision.length > 50) {
      console.log('[Refine] Art Director vision added successfully.');
      return `${prompt}\n\n[ART DIRECTOR VISION]\n${artVision.trim()}`;
    }
    return prompt;
  } catch {
    return prompt;
  }
}

export async function POST(req: Request) {
  try {
    const { originalPrompt, instructions, imageUrl, dimensions, refImageUrl, appType } = await req.json();
    const apiKey = req.headers.get('x-api-key') || process.env.GOOGLE_AI_KEY || process.env.IMAGE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    if (!instructions && !refImageUrl) return NextResponse.json({ error: 'Missing instructions or reference image' }, { status: 400 });

    // ── STEP 1: Analyze intent with Flash ──
    const intent = await analyzeRefinementIntent(originalPrompt, instructions || 'Aplicar referência da imagem em anexo.', apiKey, !!refImageUrl);
    
    // ── STEP 2: Pass through Art Director layer ONLY IF NOT STRICT ──
    let artDirectedPrompt = intent.rewrittenPrompt;
    if (intent.imageAnchorStrictness !== 'STRICT') {
      artDirectedPrompt = await artDirectorRefine(intent.rewrittenPrompt, apiKey, appType);
    }
    
    console.log(`[Refine] Final prompt length: ${artDirectedPrompt.length}, Strictness: ${intent.imageAnchorStrictness}`);

    // ── STEP 3: Build parts array ──
    const parts: any[] = [];

    // Include the original image if available
    if (imageUrl && intent.imageAnchorStrictness !== 'IGNORE') {
      let mimeType = 'image/jpeg';
      let base64Data = imageUrl;
      
      if (imageUrl.startsWith('data:')) {
        const mimeEnd = imageUrl.indexOf(';');
        const base64Start = imageUrl.indexOf('base64,');
        if (mimeEnd !== -1 && base64Start !== -1) {
          mimeType = imageUrl.substring(5, mimeEnd);
          base64Data = imageUrl.substring(base64Start + 7);
        }
      }

      if (base64Data.length > 5_500_000) {
        console.warn(`[Refine API] Warning: Image might be too large (${(base64Data.length/1000000).toFixed(1)}MB base64). Could cause model timeout.`);
      }
      
      parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
      
      if (intent.imageAnchorStrictness === 'STRICT') {
        parts.push({ text: `[IMAGE EDITING MODE — CRITICAL IDENTITY AND SCENE LOCK]\nThis attached image is the EXACT BASE FRAME. You must NOT recreate or redraw the scene. Your ONLY job is to apply the specific modifications described in the prompt below onto this exact image. PRESERVE WITH ZERO DEVIATION: face, identity, hair, skin tone, background, lighting, objects, text, and overall composition. Make ONLY the localized edit requested.` });
      } else {
        parts.push({ text: `[BASE IMAGE — CREATIVE REINTERPRETATION]\nThis is the base image. Maintain the core subject but evolve the scene, lighting, and composition creatively according to the new instructions.` });
      }
    }

    // Include the NEW user reference image if available
    if (refImageUrl) {
      let rMimeType = 'image/jpeg';
      let rBase64Data = refImageUrl;
      
      if (refImageUrl.startsWith('data:')) {
        const mimeEnd = refImageUrl.indexOf(';');
        const base64Start = refImageUrl.indexOf('base64,');
        if (mimeEnd !== -1 && base64Start !== -1) {
          rMimeType = refImageUrl.substring(5, mimeEnd);
          rBase64Data = refImageUrl.substring(base64Start + 7);
        }
      }
      
      parts.push({ inline_data: { mime_type: rMimeType, data: rBase64Data } });
      parts.push({ text: `[USER REFERENCE IMAGE — MUST INTEGRATE]\nThe user supplied this secondary image to guide their request: "${instructions}". You MUST visually incorporate the key elements (colors, textures, objects, patterns) from this reference image into the final output. This is NOT optional.` });
    }

    // Add the full prompt with Art Director vision and 4K directive
    if (intent.imageAnchorStrictness === 'STRICT') {
      parts.push({ text: `[STRICT EDITING COMMAND]
Execute the following modification on the provided base image: "${instructions}"
CRITICAL: Do not describe a new scene. You are acting as a Photoshop editor. Keep the style, background, identity, and framing 100% identical. 
For context, the image was originally generated with this prompt: ${originalPrompt}

[QUALITY DIRECTIVE] RENDER IN 4K ULTRA-DEFINITION. Photorealistic, 8K highly-detailed textures, clinical optical sharpness, professional medium format aesthetic. Zero compression artifacts. Flawless anatomy and perfect lighting.` });
    } else {
      parts.push({ text: artDirectedPrompt + `\n\n[QUALITY DIRECTIVE] RENDER IN 4K ULTRA-DEFINITION. Photorealistic, 8K highly-detailed textures, clinical optical sharpness, professional medium format aesthetic. Zero compression artifacts. Flawless anatomy and perfect lighting.` });
    }

    // ── STEP 3.5: Composition Pre-Pass ──
    // Inject a blueprint ONLY for LOOSE/IGNORE refinements (structural changes)
    if (intent.imageAnchorStrictness !== 'STRICT') {
      const appTypeMode = (appType === 'art' ? 'art' : appType === 'bg' ? 'bg' : appType === 'ref' ? 'ref' : 'pessoa') as any;
      const blueprint = await computeCompositionBlueprint(
        intent.rewrittenPrompt, appTypeMode,
        dimensions || '1:1', apiKey
      );
      if (blueprint) {
        const bpBlock = blueprintToPromptBlock(blueprint);
        // Inject before final quality directive
        parts[parts.length - 1] = {
          text: (parts[parts.length - 1]?.text || '') + bpBlock
        };
      }
    }

    const aspectMap: Record<string, string> = {
      '1:1': '1:1', '9:16': '9:16', '16:9': '16:9', '4:5': '4:5', '3:4': '3:4', 'carousel': '16:9',
    };

    // ── STEP 4: Generate with Pro model, auto-fallback to Flash on 503 ──
    const generationConfig = {
      responseModalities: ['TEXT', 'IMAGE'],
      temperature: intent.imageAnchorStrictness === 'STRICT' ? 0.4 : 0.8, // Lower temp for STRICT edits
      imageConfig: {
        aspectRatio: aspectMap[dimensions] || '1:1',
        imageSize: '4K', // ← CRITICAL FIX: was missing, causing 1K default quality
      },
    };

    // Try Pro first, fallback to Flash on overload
    const modelsToTry = [MODEL_PRO_IMAGE, MODEL_FAST_IMAGE];
    let res: Response | null = null;
    let lastError = '';

    for (const modelId of modelsToTry) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 240_000);
      console.log(`[Refine] Attempting model: ${modelId}...`);

      try {
        res = await fetch(
          `${GEMINI_BASE}/models/${modelId}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeout);

        if (res.status === 503 || res.status === 429) {
          console.warn(`[Refine] ${modelId} overloaded (${res.status}). Trying fallback...`);
          lastError = `Model ${modelId} overloaded (${res.status})`;
          res = null;
          continue; // try next model
        }
        break; // success or non-retriable error
      } catch (err: any) {
        clearTimeout(timeout);
        lastError = err.message;
        if (modelId === MODEL_FAST_IMAGE) throw new Error(lastError);
      }
    }

    if (!res) throw new Error(`All models overloaded: ${lastError}. Tente novamente em alguns segundos.`);

    // Legacy variable name for compatibility below
    const resForParsing = res;

    const text = await resForParsing.text();
    console.log('[Refine] Status:', resForParsing.status, text.slice(0, 300));
    
    if (!resForParsing.ok) {
      let errorMessage = 'Unknown error';
      try {
        const errorJson = JSON.parse(text);
        if (errorJson.promptFeedback?.blockReason) {
           errorMessage = `Imagem bloqueada pela API: ${errorJson.promptFeedback.blockReason}`;
        } else {
           errorMessage = errorJson.error?.message || text.slice(0, 400);
        }
      } catch (e) {
        errorMessage = text.slice(0, 400);
      }
      throw new Error(`Gemini refine error: ${resForParsing.status} — ${errorMessage}`);
    }

    const json = JSON.parse(text);
    for (const candidate of json?.candidates || []) {
      for (const part of candidate?.content?.parts || []) {
        if (part?.inlineData?.data) {
          const mime = part.inlineData.mimeType || 'image/jpeg';
          return NextResponse.json({
            id: Math.random().toString(36).slice(2),
            url: `data:${mime};base64,${part.inlineData.data}`,
            prompt: artDirectedPrompt,
            isVertical: dimensions === '9:16' || dimensions === '4:5' || dimensions === '3:4',
            dimensions: dimensions,
          });
        }
      }
    }

    console.error('[Refine] No image in response:', text.slice(0, 500));
    throw new Error('No image returned from Gemini. Check API key and model availability.');

  } catch (error: any) {
    console.error('Refine error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
