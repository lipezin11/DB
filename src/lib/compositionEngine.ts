/**
 * compositionEngine.ts — v1.0 GEMINI FLASH COMPOSITION PRE-PASS
 * ═══════════════════════════════════════════════════════════════
 * PURPOSE: Before calling Gemini Pro for image generation, call Gemini
 *          Flash (text-only, ultra-fast) to pre-compute the optimal
 *          compositional blueprint. This separates THINKING from GENERATING.
 * RESULT:  Every generated image has a pre-planned artistic direction,
 *          not left to the generative model's random interpretation.
 */

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL_FLASH_TEXT = 'gemini-3-flash-preview';

export interface CompositionBlueprint {
  rule: string;           // e.g., "Golden Ratio spiral, subject at phi point"
  lightingRatio: string;  // e.g., "Rembrandt 3:1 key-to-fill ratio"
  colorHarmony: string;   // e.g., "Complementary split: warm amber + cool indigo"
  depthLayers: string;    // e.g., "3 planes: bokeh foreground → sharp midground → depth background"
  cameraAngle: string;    // e.g., "Eye-level with 3° downward tilt, 85mm compression"
  moodScore: number;      // 1-10 dramatic intensity
  anchorPoint: string;    // e.g., "Subject eye-line at 62% vertical (upper third)"
  textZone: string;       // e.g., "Left 35% of frame clean for headline overlay"
}

export async function computeCompositionBlueprint(
  prompt: string,
  mode: 'pessoa' | 'produto' | 'art' | 'bg' | 'ref',
  format: string,
  apiKey: string
): Promise<CompositionBlueprint | null> {
  console.log('[Composition] Pre-computing composition blueprint with Gemini Flash...');

  const systemInstruction = `You are a Master Film Director and Senior Art Director with 30+ years of experience.
Your ONLY job is to pre-compute the perfect compositional blueprint for an AI image generation prompt.
You are the THINKING stage — a separate Gemini model will do the actual drawing based on your blueprint.

CRITICAL: Output a JSON object with EXACTLY this shape. Be extremely specific and technical.
Think like: Roger Deakins (cinematography), Annie Leibovitz (portrait composition), Helmut Newton (advertising).`;

  const formatInstructions: Record<string, string> = {
    '1:1': 'Square Instagram format — strong centered or offset compositions work best',
    '9:16': 'Vertical Stories format — strong diagonal lines and vertical leading lines',
    '16:9': 'Cinematic widescreen — horizontal rule of thirds, wide establishing compositions',
    '4:5': 'Portrait feed format — tall vertical hierarchy, strong foreground-to-background staging',
  };

  const modeInstructions: Record<string, string> = {
    pessoa: 'ADVERTISING PORTRAIT — Subject is hero. Negative space for text overlay is mandatory.',
    produto: 'PRODUCT PHOTOGRAPHY — Product is hero. Studio or contextual staging.',
    art: 'SOCIAL MEDIA CREATIVE — Maximum scroll-stopping visual impact.',
    bg: 'ABSTRACT BACKGROUND — No subjects. Texture, gradient, and atmosphere only.',
    ref: 'MOODBOARD REFERENCE — Design direction, material language, color palette.',
  };

  const request = `Analyze this creative brief and compute the optimal composition blueprint:

MODE: ${modeInstructions[mode] || 'GENERAL'}
FORMAT: ${formatInstructions[format] || format}

CREATIVE BRIEF (first 600 chars):
${prompt.slice(0, 600)}

Return ONLY a valid JSON object. Do not add any text before or after the JSON. Use this exact structure:
{
  "rule": "specific compositional rule with exact placement percentages",
  "lightingRatio": "exact lighting ratio and source positions",
  "colorHarmony": "specific color theory calculation for this scene",
  "depthLayers": "describe exactly 3 depth planes with distance and blur amount",
  "cameraAngle": "exact focal length, f-stop, and angular position",
  "moodScore": <number 1-10>,
  "anchorPoint": "exact eye-level or focal point with percentage coordinates",
  "textZone": "exact screen region reserved for headline/CTA text overlay"
}`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: `${systemInstruction}\n\n${request}` }] }],
    generationConfig: {
      temperature: 0.3, // Low temperature for precise, consistent output
      maxOutputTokens: 800,
      responseMimeType: 'application/json',
    },
  };

  try {
    const res = await fetch(
      `${GEMINI_BASE}/models/${MODEL_FLASH_TEXT}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      console.warn(`[Composition] Flash analysis failed: ${res.status}. Skipping pre-pass.`);
      return null;
    }

    const json = await res.json();
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) return null;

    // Handle both raw JSON string and pre-parsed object
    const blueprint: CompositionBlueprint = typeof rawText === 'string'
      ? JSON.parse(rawText)
      : rawText;

    console.log(`[Composition] Blueprint computed! Mood: ${blueprint.moodScore}/10 | Rule: ${blueprint.rule?.slice(0, 50)}`);
    return blueprint;

  } catch (err) {
    console.warn('[Composition] Error computing blueprint, skipping:', err);
    return null;
  }
}

export function blueprintToPromptBlock(bp: CompositionBlueprint): string {
  return `\n\n[MASTER COMPOSITION BLUEPRINT — EXECUTE EXACTLY]\n` +
    `This image was pre-analyzed by a Master Art Director. Follow this plan with ZERO deviation:\n` +
    `COMPOSITION RULE: ${bp.rule}\n` +
    `LIGHTING RATIO: ${bp.lightingRatio}\n` +
    `COLOR HARMONY: ${bp.colorHarmony}\n` +
    `DEPTH STAGING: ${bp.depthLayers}\n` +
    `CAMERA SYSTEM: ${bp.cameraAngle}\n` +
    `EMOTIONAL INTENSITY: ${bp.moodScore}/10\n` +
    `SUBJECT ANCHOR: ${bp.anchorPoint}\n` +
    `TYPOGRAPHY ZONE: ${bp.textZone} — Keep this zone completely clean, no scene elements encroaching.\n`;
}
