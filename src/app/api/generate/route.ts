// src/app/api/generate/route.ts — v15.0 PHOTOSHOP KILLER ENGINE
import { NextResponse } from 'next/server';
import { enhanceBriefWithPatterns } from '@/lib/ragSystem';
import { buildArtPrompt, type ArtBuilderPayload } from '@/lib/artPrompt';
import { buildBgPrompt, type BgBuilderPayload } from '@/lib/bgPrompt';
import { buildRefPrompt, type RefBuilderPayload } from '@/lib/refPrompt';
import { computeCompositionBlueprint, blueprintToPromptBlock } from '@/lib/compositionEngine';

export const maxDuration = 120; // Allow up to 2 minutes for Vercel

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL_HIGH = 'gemini-3-pro-image-preview';    // Pro — máxima qualidade
const MODEL_FAST = 'gemini-3.1-flash-image-preview'; // Flash — fallback automático em 503
const MODEL_REFINER = 'gemini-3-flash-preview';       // Texto: refinamento de prompt e composição

// ─── IMAGE SIZE LIMITER ───────────────────────────────────────────────────────
// Gemini works best with images under ~4MB base64. Oversized images cause timeouts.
const MAX_IMAGE_BASE64_LENGTH = 5_500_000; // ~4MB decoded

function isImageTooLarge(base64: string): boolean {
  if (base64.length > MAX_IMAGE_BASE64_LENGTH) {
    console.warn(`[Gemini] WARNING: Image is very large (${(base64.length / 1_000_000).toFixed(1)}MB base64). May cause timeout.`);
    return true;
  }
  return false;
}

// ─── GERAR COM GEMINI ─────────────────────────────────────────────────────────
async function generateWithGemini(
  prompt: string,
  apiKey: string,
  inputImages?: { base64: string; mimeType: string; label?: string }[],
  aspectRatio?: string,
  useProModel?: boolean,
  useSearch?: boolean
): Promise<string> {

  const model = useProModel ? MODEL_HIGH : MODEL_FAST;
  console.log(`[Gemini] Using model: ${model} | Search: ${!!useSearch}`);

  const parts: any[] = [];

  // Push images with their labels INTERLEAVED — each image immediately followed by its context
  if (inputImages && inputImages.length > 0) {
    // Log total payload size
    const totalSize = inputImages.reduce((sum, img) => sum + img.base64.length, 0);
    console.log(`[Gemini] Total image payload: ${(totalSize / 1_000_000).toFixed(1)}MB across ${inputImages.length} images`);

    for (const img of inputImages) {
      isImageTooLarge(img.base64);
      parts.push({ inline_data: { mime_type: img.mimeType, data: img.base64 } });
      // Immediately label this image so Gemini knows what it is
      if (img.label) {
        parts.push({ text: `[${img.label}]` });
      }
    }

    // Additional fidelity instructions
    const hasPersonRef = inputImages.some(img => img.label?.includes('PERSON'));
    const hasStyleRef = inputImages.some(img => img.label?.includes('STYLE REFERENCE'));
    const hasProductRef = inputImages.some(img => img.label?.includes('PRODUCT'));
    const hasContinuityRef = inputImages.some(img => img.label?.includes('CONTINUITY'));

    let imageInstructions = '';

    // Subject fidelity lock — FACE & BONE STRUCTURE ANCHOR
    if (hasPersonRef && !hasContinuityRef) {
      imageInstructions += `[CRITICAL — FACIAL IDENTITY LOCK]\n`;
      imageInstructions += `The PERSON REFERENCE image is the EXACT facial identity. `;
      imageInstructions += `LOCK: facial bone structure, eye shape/color, nose, lips, and unique skin details (freckles, marks). `;
      imageInstructions += `ADAPT: Allow hair, clothing, body pose, and skin lighting to evolve and synchronize 100% with the generated environment's theme and lighting. `;
      imageInstructions += `The subject must look like they were NATURALLY photographed in this scene, not composited. `;
      imageInstructions += `Do NOT copy any human features from the STYLE REFERENCE.\n\n`;
    }

    if (hasPersonRef && hasProductRef) {
      imageInstructions += `[IDENTITY + PRODUCT LOCK]\n`;
      imageInstructions += `PERSON image = facial identity anchor. PRODUCT image = product shape/color/label anchor. Preserve both precisely.\n\n`;
    }

    // Style reference explicit instruction — SURGICAL EXTRACTION
    if (hasStyleRef) {
      imageInstructions += `[STYLE REFERENCE — PIXEL-PERFECT EXTRACTION]\n`;
      imageInstructions += `The STYLE REFERENCE image(s) define the MANDATORY VISUAL WORLD. `;
      imageInstructions += `You MUST meticulously copy and apply: `;
      imageInstructions += `1. EXACT BACKGROUND & SCENERY: Replicate the background geometry, colors, and depth. `;
      imageInstructions += `2. EXACT LIGHTING: Match the light source direction, intensity, and color temperature. `;
      imageInstructions += `3. EXACT ATMOSPHERE: Replicate any fog, dust, particles, or ambient mood. `;
      imageInstructions += `4. SPECIFIC PROPS: Identify and reproduce prominent objects found in the reference. `;
      imageInstructions += `Ignore your default creative bias. The user wants THIS world, not an approximation. `;
      imageInstructions += `NEVER copy human features (face, bone structure) from the style reference.\n\n`;
    }

    if (imageInstructions) {
      parts.push({ text: imageInstructions });
    }
  }

  parts.push({ text: prompt });

  const body: any = {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      temperature: 0.7, // Lower temperature for more stable high-res details
      imageConfig: {
        aspectRatio: aspectRatio === '4:5' ? '3:4' : (aspectRatio === '21:9' ? '16:9' : (aspectRatio || '1:1')),
        imageSize: "4K", // 4096 pixels resolution anchor
      },
    },
  };

  // Ativa Google Search quando não tem ref — busca refs visuais automaticamente
  if (useSearch) {
    body.tools = [{ googleSearch: {} }];
    console.log('[Gemini] Google Search grounding ENABLED for visual reference lookup');
  }

  const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`;
  
  // ── SMART MODEL FALLBACK: Pro → Flash on 503/429 ──
  const modelsToTry = useProModel ? [MODEL_HIGH, MODEL_FAST] : [MODEL_FAST];
  let lastError = '';

  for (const modelId of modelsToTry) {
    const modelUrl = `${GEMINI_BASE}/models/${modelId}:generateContent?key=${apiKey}`;
    const maxRetries = modelId === MODEL_HIGH ? 2 : 1;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 110_000);

      try {
        console.log(`[Gemini] Model: ${modelId} | Attempt ${attempt}/${maxRetries} | Search: ${!!useSearch}`);
        const res = await fetch(modelUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        const text = await res.text();

        if (!res.ok) {
          console.warn(`[Gemini] ${modelId} attempt ${attempt} failed (${res.status}).`);
          lastError = `Gemini API error: ${res.status} — ${text.slice(0, 500)}`;
          if (res.status === 503 || res.status === 429) {
            // Overloaded — break inner retry loop, try next model
            break;
          }
          if (res.status === 400 || res.status === 401 || res.status === 403) break;
          continue;
        }

        console.log(`[Gemini] SUCCESS on ${modelId} attempt ${attempt}!`);
        const json = JSON.parse(text);

        if (json.promptFeedback?.blockReason) {
          throw new Error(`Imagem bloqueada pelos filtros de segurança da API (${json.promptFeedback.blockReason}).`);
        }

        const candidates = json?.candidates || [];
        for (const candidate of candidates) {
          const parts = candidate?.content?.parts || [];
          for (const part of parts) {
            if (part?.inlineData?.data) {
              const mime = part.inlineData.mimeType || 'image/jpeg';
              if (modelId === MODEL_FAST && useProModel) {
                console.log('[Gemini] Note: Used Flash fallback due to Pro overload. Result tagged as Modo Rápido.');
              }
              return `data:${mime};base64,${part.inlineData.data}`;
            }
          }
        }

        throw new Error(`Gemini não retornou dados de imagem na resposta.`);

      } catch (err: any) {
        lastError = err.message || 'Unknown network error';
        console.error(`[Gemini] Error on ${modelId} attempt ${attempt}:`, lastError);
        if (attempt === maxRetries) break; // try next model
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  throw new Error(lastError || 'Falha catastrófica: todos os modelos estão indisponíveis. Tente novamente em instantes.');
}

// ─── REFINAR PROMPT (GEMINI 3 FLASH) ──────────────────────────────────────────
async function refinePromptWithGemini(
  prompt: string,
  apiKey: string
): Promise<string> {
  console.log('[Gemini] Refining prompt with Gemini 3 Flash...');
  
  const url = `${GEMINI_BASE}/models/${MODEL_REFINER}:generateContent?key=${apiKey}`;
  
  const systemInstruction = `
    You are an expert Art Director for High-End Advertising Image Generation.
    Your task is to analyze the technical prompt and provide a highly creative, 3-sentence "Art Director Vision".
    
    CRITICAL RULES:
    1. DO NOT REWRITE THE PROMPT. Your output will be APPENDED to the original prompt.
    2. FOCUS ON CREATIVITY: Describe the atmospheric depth, specific lighting qualities (e.g., bounced light, cinematic shadows), and textures.
    3. NO HALLUCINATION: Respect the subject and environment of the raw prompt. 
    4. IF STYLE REFERENCES ARE MENTIONED: Your vision MUST integrate the user's specific DNA instructions regarding those references with absolute priority.
    5. STRUCTURE: Output ONLY 2 to 3 sentences of pure visual and creative direction.
    6. LANGUAGE: English only.
  `.trim();

  const body = {
    contents: [{ role: 'user', parts: [{ text: `SYSTEM: ${systemInstruction}\n\nUSER PROMPT TO REFINE:\n${prompt}` }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.warn(`[Gemini] Prompt refinement failed (Status: ${res.status}). Using raw prompt.`);
      return prompt;
    }

    const json = await res.json();
    const refined = json.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (refined && refined.length > 40) {
      console.log('[Gemini] Prompt successfully refined!');
      // Return ONLY the art director vision — the caller will append it to the original
      return refined.trim();
    }
    
    return '';
  } catch (err) {
    console.error('[Gemini] Error refining prompt:', err);
    return '';
  }
}

// ─── EXTRACT BASE64 ───────────────────────────────────────────────────────────
function extractBase64(dataUrl: string): { base64: string; mimeType: string } {
  if (!dataUrl.startsWith('data:')) {
    return { mimeType: 'image/jpeg', base64: dataUrl };
  }
  const mimeEnd = dataUrl.indexOf(';');
  const base64Start = dataUrl.indexOf('base64,');
  if (mimeEnd === -1 || base64Start === -1) {
    return { mimeType: 'image/jpeg', base64: dataUrl };
  }
  return {
    mimeType: dataUrl.substring(5, mimeEnd),
    base64: dataUrl.substring(base64Start + 7),
  };
}

// ─── ASPECT RATIO MAP ─────────────────────────────────────────────────────────
function getAspectRatio(dimensions: string): string {
  const map: Record<string, string> = {
    '1:1': '1:1',
    '9:16': '9:16',
    '16:9': '16:9',
    '4:5': '4:5',
    '3:4': '3:4',
    'carousel': '16:9',  // Generates 2 square slides horizontally as a 16:9 ultra-wide image
  };
  return map[dimensions] || '1:1';
}

// ─── PESSOA PROMPT — SENIOR CREATIVE DIRECTOR LEVEL ──────────────────────────
function buildPersonPrompt(data: any, enhancedBrief: string, hasPhoto: boolean): string {
  const gender = data.subject?.gender === 'Feminino' ? 'female' : 'male';
  const genderWord = gender === 'female' ? 'woman' : 'man';
  const count = parseInt(data.subject?.count) || 1;
  const description = (data.subject?.description || '').slice(0, 500);
  const position = (data.subject?.position || 'centro').toLowerCase();
  const niche = data.context?.niche || '';
  const environment = (data.context?.environment || '').slice(0, 400);
  const framing = data.composition?.framing || 'Plano Médio';
  const floating = (data.composition?.floatingElements || '').slice(0, 350);
  const rimColor = data.lighting?.rim || '#FF6B00';
  const fillColor = data.lighting?.fill || '#0044FF';
  const ambientColor = data.lighting?.ambient || '#0a0a1a';
  const sobriety = data.style?.sobriety || 50;
  const useBlur = data.style?.blur !== false;
  const useGradient = !!data.style?.gradient;
  const gradColor = data.style?.gradientColor || '#000000';
  const dimensions = data.dimensions || '1:1';
  const refInstruction = (data.style?.refInstruction || '').slice(0, 250);
  const hasRefImage = !!data.style?.refImage;
  const scenarioRefPrompt = (data.style?.scenarioRefPrompt || '').slice(0, 400);
  const hasScenarioRef = !!scenarioRefPrompt;
  const typoRefOptions = (data.style?.typoRefOptions || []) as string[];
  const hasTypoRef = !!data.style?.typoRefImage;
  const extraPrompt = (data.style?.extraPrompt || '').slice(0, 300);
  const visualStyle = data.style?.visualStyle || null;
  const isWidescreen = dimensions === '16:9';

  const framingMap: Record<string, string> = {
    'Close-up': 'extreme close-up portrait, face and upper chest, face fills 70% of frame',
    'Médio': 'medium shot waist-up, full hand gestures visible, engaging body language',
    'Medium': 'medium shot waist-up, full hand gestures visible, engaging body language',
    'Plano Médio': 'medium shot waist-up, full hand gestures visible, engaging body language',
    'Americano': 'american plan shot knees-up, full body language visible, strong stance',
    'Plano Americano': 'american plan shot knees-up, full body language visible, strong stance',
    'Full Body': 'full body environmental portrait, head to toe, relationship with environment',
  };

  const posMap: Record<string, string> = {
    'esquerda': 'subject anchored on left third (rule of thirds), right two-thirds clean negative space reserved for headline and CTA text overlay',
    'centro': 'subject centered with equal negative space on both sides, symmetrical marketing composition',
    'direita': 'subject anchored on right third (rule of thirds), left two-thirds clean negative space reserved for headline and CTA text overlay',
  };

  const fmtMap: Record<string, string> = {
    '9:16': 'vertical 9:16 full-bleed format optimized for Instagram Stories, TikTok, and Reels — safe zones respected',
    '16:9': 'cinematic 16:9 widescreen optimized for website hero sections, YouTube thumbnails, and digital banners',
    '4:5': 'tall portrait 4:5 format optimized for Instagram and Facebook feed maximum real estate',
    '1:1': 'perfect square 1:1 format optimized for Instagram grid, Facebook, and LinkedIn feed',
    'carousel': '16:9 ultra-wide double-slide format for Instagram carousel. This image contains TWO 1:1 square Instagram slides side by side. Design it so the user can slice it directly in half. Frame elements specifically on the left and right halves.',
  };

  let p = '';

  // Subject isolation rules — ADAPTIVE MODE
  if (hasPhoto) {
    p += `[IMAGE EDITING — ADAPTIVE IDENTITY LOCK] `;
    p += `LOCKED FROM INPUT PHOTO: facial bone structure, eye color/shape, nose, lips, and unique skin features. `;
    p += `ADAPTIVE ELEMENTS: hair, clothing, body pose, and overall lighting. The subject's style (hair/clothes) must morph to perfectly suit the environment described below. `;
    p += `Example: if the context is "Cyberpunk", change clothing to futuristic gear. If "Beach", change to casual swimwear. `;
    p += `PROHIBITED: do NOT alter facial geometry. PROHIBITED from style reference: copy ZERO human features from any reference image. `;
    p += `Integrate the face onto a body/clothing that fits the new world seamlessly. `;
  }

  // References — placed EARLY for maximum priority
  if (hasRefImage && refInstruction) {
    p += `[STYLE REFERENCE — ULTRA HIGH PRIORITY] Apply these specific elements from the attached STYLE REFERENCE image: ${refInstruction}. `;
    p += `Copy ALL non-human visual elements: exact color palette, lighting setup, background design, atmosphere, specific props and objects. NEVER copy faces, hair, skin or body from reference. `;
  } else if (hasRefImage) {
    p += `[STYLE REFERENCE — ULTRA HIGH PRIORITY] Faithfully extract and apply from the attached STYLE REFERENCE image: exact color palette, lighting mood, background design system, atmosphere, specific objects, and props. `;
    p += `These override ALL default creative decisions. Replicate all prominent non-human elements. NEVER copy human characteristics from reference. `;
  }

  // Creative direction baseline
  p += `[CREATIVE DIRECTION] Senior advertising creative director and master retoucher level composite. `;
  p += `Think: Nike global campaign, Red Bull athlete editorial, UFC championship poster quality. `;
  p += `${framingMap[framing] || 'medium shot waist-up'}. `;
  p += `${fmtMap[dimensions] || '1:1 square'}. `;
  p += `${posMap[position] || 'centered'}. `;

  // Subject
  p += `SUBJECT: ${count > 1 ? `${count} ${gender} people` : `${genderWord}`}. `;
  if (description) {
    p += `EXACT APPEARANCE (mandatory — zero deviation): ${description} `;
  }
  p += `Expression: intense direct eye contact with lens, both eyes fully open, pupils sharp with dual catchlights visible. `;

  // World/environment — webdesigner fills intelligently if missing
  // Scenario ref overrides or enriches environment
  const finalEnvironment = hasScenarioRef
    ? (environment ? `${environment} — style reference: ${scenarioRefPrompt}` : scenarioRefPrompt)
    : environment;

  if (finalEnvironment) {
    p += `BACKGROUND & SCENE (MANDATORY — highest priority, must be executed exactly): ${finalEnvironment} `;
    p += `This is not optional — the described scene MUST appear exactly as specified. `;
    p += `Render as a fully immersive visual world: foreground atmospheric elements, `;
    p += `subject in sharp midground, environment filling entire background with full detail and depth. `;
    p += `Every surface, texture and lighting element of this scene must be present and photorealistic. `;
  } else if (niche) {
    p += `VISUAL WORLD: [INTELLIGENT FILL] Design the most impactful advertising background for ${niche}. `;
    p += `Choose an environment that maximizes brand authority and visual stopping power for this niche. `;
    p += `Create atmospheric depth with environmental storytelling that reinforces the ${niche} positioning. `;
  } else {
    p += `VISUAL WORLD: [INTELLIGENT FILL] Design the most compelling environment that elevates this subject. `;
    p += `Dramatic atmospheric backdrop with premium production value. `;
  }

  // Lighting — technical and precise
  const isAutoLighting = rimColor === 'auto' || ambientColor === 'auto';
  if (isAutoLighting) {
    p += `LIGHTING SETUP: [AI CREATIVE DECISION] Choose the most dramatically impactful lighting for this scene. `;
    p += `Pick colors that complement the environment and subject perfectly — strong rim separation, motivated color temperature, cinematic contrast. `;
    p += `No flat lighting. Bold creative lighting choice that serves the visual narrative. `;
  } else {
    p += `LIGHTING SETUP: `;
    p += `Key light: large-area softbox at 45° camera-left, wrapping light across face with defined cheekbone shadow, sharp catchlight at 11 o'clock in both eyes. `;
    p += `Rim/separation light: ${rimColor} gel, tight hard light from behind-right carving luminous edge around hair and shoulder, separating subject from background. `;
    p += `Fill light: ${fillColor} tint, 2 stops under key, lifting shadow side without killing contrast. `;
    p += `Ambient: ${ambientColor} environmental color bleeding from background into scene. `;
    p += `No flat lighting. Dramatic Rembrandt-influenced contrast with deep rich shadows. `;
  }

  // Floating elements — physical integration
  if (floating) {
    p += `COMPOSITED SCENE ELEMENTS: ${floating} `;
    p += `Integration requirements: `;
    p += `(1) Each element is a specific high-detail 3D object — not generic shapes. `;
    p += `(2) Physical placement: some overlap subject's foreground arms/shoulders, some exist behind subject in midground, creating true depth layering. `;
    p += `(3) Light interaction: every element receives main key light direction with matching specular highlights and cast shadows onto subject skin and clothing. `;
    p += `(4) Depth staging: closest elements 40-50% frame height (large), mid-distance 20-30%, farthest 5-10% (tiny), enforcing extreme depth perspective. `;
    p += `(5) Material accuracy: metallic surfaces show fresnel reflections, glass elements show refraction, organic elements show subsurface scattering. `;
  }

  // Optics
  if (useBlur) {
    p += `OPTICS: 85mm f/1.4 portrait lens — subject in tack-sharp focus, background with smooth organic bokeh discs, medium format compression flattening environment. `;
  } else {
    p += `OPTICS: 35mm f/5.6 — deep focus throughout frame, environmental and subject both sharp, documentary realism. `;
  }

  // Gradient
  if (useGradient) {
    if (isWidescreen) {
      if (position === 'esquerda') {
        p += `GRADIENT OVERLAY: ${gradColor} solid color occupying rightmost 35% of frame, smooth linear fade to fully transparent moving left. Subject area on left remains unaffected. `;
      } else if (position === 'direita') {
        p += `GRADIENT OVERLAY: ${gradColor} solid color occupying leftmost 35% of frame, smooth linear fade to fully transparent moving right. Subject area on right remains unaffected. `;
      } else {
        p += `GRADIENT OVERLAY: ${gradColor} on both lateral edges (20% each side), fading toward transparent center vignette. `;
      }
    } else {
      p += `GRADIENT OVERLAY: ${gradColor} solid at bottom edge, smooth linear gradient fading to fully transparent at 35% height mark. Creates clean space for text at base. `;
    }
  }

  // Visual grade
  if (sobriety < 25) {
    p += `COLOR GRADE: Hyper-saturated editorial — split-toned (warm amber highlights, cool cyan shadows), extreme clarity, vibrant punchy colors, maximum visual energy. `;
  } else if (sobriety < 50) {
    p += `COLOR GRADE: Premium creative advertising — rich saturated colors, dynamic contrast, cinematic color treatment, scroll-stopping visual impact. `;
  } else if (sobriety < 75) {
    p += `COLOR GRADE: Balanced luxury commercial — refined palette, controlled saturation, polished finishing, premium brand aesthetic. `;
  } else {
    p += `COLOR GRADE: Corporate premium — desaturated sophistication, executive restraint, authoritative color palette, luxury brand identity. `;
  }

  // References already placed at top of prompt for max priority — reinforcement only
  if (hasRefImage) {
    p += `[REFERENCE REMINDER] The STYLE REFERENCE image attached is ACTIVE. ALL visual decisions must align with it. `;
  }

  if (hasTypoRef && typoRefOptions.length > 0) {
    p += `TYPOGRAPHY SYSTEM — apply from reference: ${typoRefOptions.join(', ')}. Integrate typographic language into composition hierarchy. `;
  } else if (hasTypoRef) {
    p += `TYPOGRAPHY SYSTEM — match reference typographic style: weight, sizing hierarchy, text treatment and spatial rhythm. `;
  }

  if (visualStyle) {
    const styleMap: Record<string, string> = {
      'Clássico': 'classic editorial advertising style, timeless composition, balanced and refined',
      'Formal': 'formal corporate style, authoritative, clean lines, executive presence',
      'Elegante': 'elegant luxury aesthetic, sophisticated color palette, premium brand feel',
      'Sexy': 'bold sensual advertising aesthetic, confident body language, fashion editorial energy',
      'Institucional': 'institutional professional look, trustworthy, clean, government or corporate brand standard',
      'Tecnológico': 'high-tech digital aesthetic, blue/cyan/dark palette, futuristic UI elements, data visualization feel',
      'Glassmorphism': 'glassmorphism design style — frosted glass panels, translucent overlays, soft light blur, iridescent highlights',
      'Interface UI': 'UI/UX design aesthetic — clean grid, system components, soft shadows, product interface feel',
      'Minimalista': 'ultra-minimalist — negative space dominant, single accent color, nothing unnecessary',
      'Lúdico': 'playful and fun visual style, saturated bright colors, friendly rounded shapes, joy and energy',
      'Cartoon': 'cartoon illustration aesthetic, bold outlines, flat vibrant colors, stylized proportions',
      'Infoproduto': 'infoproduct marketing style — high energy, bold typography areas, transformational narrative visual',
      'Jovial': 'youthful energetic style, bold saturated palette, dynamic composition, modern youth culture',
      'Gamer': 'gaming aesthetic — dark dramatic palette, neon accent lighting, HUD elements, esports energy',
      'Retrato Profissional': 'professional portrait photography style — clean background, even lighting, executive headshot quality',
      'Ultra Realista': 'photorealistic rendering — 8K hyperrealism, studio photography quality, every detail pixel-perfect',
      'Glow': 'glow and luminescence aesthetic — soft light halos, inner glow on edges, ethereal luminous atmosphere',
    };
    const styleDesc = styleMap[visualStyle] || visualStyle;
    p += `VISUAL STYLE — MANDATORY: Apply the "${visualStyle}" visual style throughout the entire image: ${styleDesc}. This style must be unmistakably present in every visual decision. `;
  }

  if (extraPrompt) {
    // Sem ref: expande e enriquece o prompt adicional seguindo nossos padrões
    if (!data.style?.refImage && !data.style?.typoRefImage) {
      p += `ENHANCED USER DIRECTIVE (interpret and expand this following professional advertising standards): `;
      p += `"${extraPrompt}" — translate this intent into specific visual decisions: `;
      p += `exact colors, lighting treatment, atmospheric elements, composition choices, `;
      p += `and environmental details that would make a senior art director proud. `;
    } else {
      p += `ADDITIONAL DIRECTIVE: ${extraPrompt} `;
    }
  }
  if (enhancedBrief) p += `DESIGN INTELLIGENCE: ${enhancedBrief.slice(0, 200)} `;

  // Technical quality ceiling
  // When minimal input — boost creative interpretation + trigger search
  if (!environment && !niche && !floating && !description) {
    p += `[FULL CREATIVE FREEDOM + SEARCH GROUNDING] Very few details provided. `;
    p += `Use Google Search to find the most impactful visual references for this type of content. `;
    p += `Then apply senior creative director decisions: invent a bold specific visual world, `;
    p += `strong color story, dramatic atmospheric environment, dynamic composition. `;
    p += `Make it look like a $100,000 production. `;
  } else if (!environment) {
    p += `[SEARCH-ENHANCED SCENE] Use Google Search to find the best visual references for ${niche || 'this subject'} advertising. `;
    p += `Apply the most visually impactful environment and color treatment found. `;
  }

  p += `MATERIAL SCIENCE: Apply SUBSURFACE SCATTERING to skin (light bleeding through ears/thin areas), realistic micro-pores, natural moisture in eyes (dual catchlights), and oily-matte skin texture balance. `;
  p += `OPTICS: Sony A1 with 85mm f/1.2 G-Master lens. Razor-sharp subject focus, buttery 11-blade circular bokeh. `;
  p += `PHYSICS: 100% Ray-traced shadows and reflections. Fresnel index 1.5 on skin. `;
  p += `Space for headline text overlay (WCAG AAA contrast zones). `;

  p += `--no closed eyes, sideways gaze, wrong skin tone, wrong hair, wrong clothing, `;
  p += `missing described accessories or props, flat studio-only lighting, obvious AI artifacts, `;
  p += `plastic waxy skin, deformed anatomy, extra fingers, bad composite edges, `;
  p += `generic stock photo look, 2D flat elements, inconsistent light direction, amateur composition.`;

  return p.slice(0, 6000).trim();
}

// Internal builders for ART, BG, and REF have been removed in favor of specialized lib modules to ensure maximum quality.
// The POST handler now maps the data to ArtBuilderPayload, BgBuilderPayload, or RefBuilderPayload.


// ─── PRODUTO PROMPT — SENIOR LEVEL ───────────────────────────────────────────
function buildProductPrompt(data: any, enhancedBrief: string, hasPhoto: boolean): string {
  const environment = (data.context?.environment || '').slice(0, 300);
  const description = (data.subject?.description || '').slice(0, 300);
  const rimColor = data.lighting?.rim || '#ffffff';
  const ambientColor = data.lighting?.ambient || '#f0f0f0';
  const sobriety = data.style?.sobriety || 60;
  const dimensions = data.dimensions || '1:1';
  const refInstruction = (data.style?.refInstruction || '').slice(0, 250);
  const hasRefImage = !!data.style?.refImage;
  const floating = (data.composition?.floatingElements || '').slice(0, 250);
  const extraPrompt = (data.style?.extraPrompt || '').slice(0, 250);
  const useGradient = !!data.style?.gradient;
  const gradColor = data.style?.gradientColor || '#000000';

  const fmtMap: Record<string, string> = {
    '9:16': 'vertical 9:16 Stories', '16:9': 'cinematic 16:9 widescreen',
    '4:5': 'tall portrait 4:5 feed', '1:1': 'square 1:1',
    'carousel': 'square 1:1 carousel slide — one viewport of a wider panoramic product showcase scene.',
  };

  let p = '';

  if (hasPhoto) {
    p += `[PRODUCT — MAXIMUM FIDELITY MODE] `;
    p += `The input photo contains the EXACT product that must appear in the output. `;
    p += `PRESERVE WITH ZERO DEVIATION: `;
    p += `(1) SHAPE: exact 3D geometry, proportions, form — not approximated; `;
    p += `(2) COLORS: exact color values on every surface, panel, detail; `;
    p += `(3) TEXT/LABELS: every letter, number, logo, brand mark reproduced EXACTLY — same font, same size, same position, fully legible and sharp; `;
    p += `(4) FINISH: exact surface material — matte, gloss, metallic, transparent — reproduced accurately; `;
    p += `(5) DETAILS: stitching, texture, pattern, seams, hardware — all preserved. `;
    p += `The product must be INSTANTLY RECOGNIZABLE as the same product from the input photo. `;
    p += `Place this identical product in the new scene described below. Product must be sharper than the background. `;
  }

  p += `[CREATIVE DIRECTION] Award-winning product photography and advertising composite, ${fmtMap[dimensions] || '1:1 square'}. `;
  p += `Think: Apple product campaign, Porsche advertisement, luxury fragrance editorial quality. `;
  p += `Product is the undisputed hero — commanding, sharp, aspirational. `;

  if (hasRefImage && refInstruction) {
    p += `STYLE DIRECTIVE — apply from reference: ${refInstruction}. Adapt this visual language to feature this specific product. `;
  } else if (hasRefImage) {
    p += `STYLE DIRECTIVE — analyze reference image and replicate: background design system, color palette, lighting treatment, spatial composition, overall aesthetic language. Feature this product in that visual world. `;
  }

  if (environment) {
    p += `SCENE: ${environment} `;
    p += `Environment must complement and elevate product perception. Photorealistic depth and material quality. `;
  } else if (sobriety > 65) {
    p += `SCENE: [INTELLIGENT FILL] Premium studio setup — `;
    p += `seamless gradient backdrop from pure white center bleeding to rich dark edges, `;
    p += `subtle ground plane reflection underneath product, microscopic particles in light beam, `;
    p += `architectural negative space optimized for headline placement. Luxury minimalist. `;
  } else if (sobriety > 35) {
    p += `SCENE: [INTELLIGENT FILL] Premium lifestyle context — `;
    p += `complementary environmental backdrop at 25% opacity blur, cinematic depth of field, `;
    p += `environmental storytelling that reinforces product category positioning. `;
  } else {
    p += `SCENE: [INTELLIGENT FILL] Bold editorial environment — `;
    p += `dramatic graphic backdrop with strong color story, dynamic compositional energy, `;
    p += `brand statement visual impact. `;
  }

  if (description) p += `PRODUCT CONTEXT: ${description} `;

  p += `PRODUCT LIGHTING: `;
  p += `Large 120cm octabox overhead-front as key — even, shadow-free illumination revealing every product surface detail and texture. `;
  p += `${rimColor} accent light from rear-left, creating crisp edge definition and material separation. `;
  p += `${ambientColor} ambient fill from environment. `;
  p += `Ground-plane shadow: soft natural contact shadow anchoring product with correct umbra/penumbra. `;
  p += `Surface-specific rendering: glossy surfaces show controlled specular highlights, matte surfaces show soft diffuse shading, metallic surfaces show environment reflections. `;

  if (floating) {
    p += `3D DECORATIVE ELEMENTS: ${floating} `;
    p += `Each physically rendered with product-consistent lighting, correct perspective, and cast shadows. `;
  }

  if (useGradient) {
    p += `GRADIENT OVERLAY: ${gradColor} at bottom, linear fade to transparent at 35% height. `;
  }

  if (sobriety > 70) p += `COLOR GRADE: Luxury minimalist — clean whites, controlled neutrals, premium restraint. `;
  else if (sobriety < 30) p += `COLOR GRADE: Bold editorial — vibrant saturated palette, maximum visual statement. `;
  else p += `COLOR GRADE: Premium commercial — balanced richness, polished finish, brand authority. `;

  if (extraPrompt) p += `ADDITIONAL DIRECTIVE: ${extraPrompt} `;
  if (enhancedBrief) p += `DESIGN INTELLIGENCE: ${enhancedBrief.slice(0, 150)} `;

  p += `MATERIAL SCIENCE: Physical Based Rendering (PBR). Fresnel reflections on glossy surfaces, micro-roughness on matte, Anisotropic highlights on brushed metals. `;
  p += `OPTICS: Phase One IQ4 150MP with 80mm f/8. Edge-to-edge clinical sharpness, zero distortion, maximum texture resolution. `;
  p += `PHYSICS: 100% Ray-traced ground-plane contact shadows, caustics on glass/liquid elements. `;
  p += `Apple.com / Leica / Porsche advertising standard. `;
  p += `--no wrong product geometry, color shift, missing labels, blurry product, flat lighting, bad shadows, amateur composition.`;

  return p.slice(0, 6000).trim();
}


// ─── MISTO PROMPT ────────────────────────────────────────────────────────────
function buildMixedPrompt(data: any, enhancedBrief: string, hasPerson: boolean, hasProduct: boolean): string {
  const description = (data.subject?.description || '').slice(0, 400);
  const niche = data.context?.niche || '';
  const environment = (data.context?.environment || '').slice(0, 350);
  const rimColor = data.lighting?.rim || '#FFD700';
  const ambientColor = data.lighting?.ambient || '#0a0a1a';
  const sobriety = data.style?.sobriety || 50;
  const dimensions = data.dimensions || '1:1';
  const floating = (data.composition?.floatingElements || '').slice(0, 250);
  const useGradient = !!data.style?.gradient;
  const gradColor = data.style?.gradientColor || '#000000';
  const isWidescreen = dimensions === '16:9';
  const position = data.subject?.position || 'centro';
  const extraPrompt = (data.style?.extraPrompt || '').slice(0, 200);
  const visualStyle = data.style?.visualStyle || null;
  const refInstruction = (data.style?.refInstruction || '').slice(0, 200);
  const hasRefImage = !!data.style?.refImage;

  const fmtMap: Record<string, string> = {
    '9:16': '9:16 vertical', '16:9': '16:9 widescreen', '4:5': '4:5 portrait', '1:1': '1:1 square',
    'carousel': '1:1 square carousel slide — one viewport of a wider panoramic scene with person and product.',
  };

  let p = '';

  p += `[COMPOSITE SCENE — PERSON + PRODUCT] `;

  if (hasPerson) {
    p += `PERSON: Keep exact face from first input photo — face, skin tone, hair locked. `;
    p += `PROHIBITED from person photo: carry over zero facial hair, glasses, expression lines not described. `;
  }
  if (hasProduct) {
    p += `PRODUCT: Keep exact product from last input photo — shape, color, labels, finish, every detail. `;
  }

  p += `Create a premium advertising composite where the PERSON and PRODUCT appear TOGETHER in the same scene. `;
  p += `${fmtMap[dimensions] || '1:1 square'}. `;

  // Positioning
  if (position === 'esquerda') p += `Person on left, product prominently featured on right side. `;
  else if (position === 'direita') p += `Person on right, product prominently featured on left side. `;
  else p += `Person as main subject, product naturally integrated into the scene near them. `;

  if (description) p += `${description} `;

  if (environment) {
    p += `SCENE: ${environment} `;
  } else if (niche) {
    p += `SCENE: Premium ${niche} environment designed to feature both person and product. `;
  } else {
    p += `SCENE: Aspirational lifestyle environment that connects the person to the product naturally. `;
  }

  p += `Person interacting with or presenting the product — natural, confident, brand-ambassador energy. `;
  p += `CRITICAL ANATOMY DIRECTIVE: Hands and fingers MUST be anatomically perfect if visible. No distorted rendering. `;
  p += `LIGHTING: ${rimColor} rim light, ${ambientColor} ambient, dramatic but commercial, cinematic rim-lighting separating both subjects from the background. `;

  if (floating) p += `Scene elements: ${floating}. Realistic 3D, casting accurate shadows on the subject and product. `;

  if (useGradient) {
    if (isWidescreen && position === 'esquerda') p += `Gradient: ${gradColor} right 35% to transparent. `;
    else if (isWidescreen && position === 'direita') p += `Gradient: ${gradColor} left 35% to transparent. `;
    else p += `Gradient: ${gradColor} bottom 35% fading up to transparent. `;
  }

  if (sobriety < 30) p += `Bold vibrant energetic style, dynamic contrast, hyper-saturated. `;
  else if (sobriety > 70) p += `Premium refined corporate style, sophisticated muted color palette, executive restraint. `;
  else p += `Premium balanced commercial style, rich cinematic color grade. `;

  p += `MATERIAL SCIENCE: For PERSON, apply SUBSURFACE SCATTERING and micro-pores. For PRODUCT, apply PBR SHADERS with fresnel reflections on gloss and micro-roughness on matte surfaces. `;
  p += `OPTICS: Phase One IQ4 150MP with 80mm f/1.4. Clinical edge-to-edge sharpness on both subjects. `;
  p += `PHYSICS: 100% Ray-traced ground-plane shadows and caustics if glass/liquid is present. `;
  p += `Space for headline text overlay. `;
  p += `--no wrong person, wrong product, incorrect facial features, deformed hands, mutated fingers, extra limbs, bad proportions, sloppy object integration, flat lighting, amateur composite, watermarks.`;

  return p.slice(0, 6000).trim();
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const apiKey = req.headers.get('x-api-key') || process.env.GOOGLE_AI_KEY || process.env.IMAGE_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: 'Cole sua API Key do Google AI Studio no campo superior direito!' }, { status: 401 });
    }

    const hasPhoto = !!data.subject?.photo;
    const hasPhotos = (data.subject?.photos || []).length > 0;
    const isProduto = data.subject?.subjectMode === 'produto';
    const isMisto = data.subject?.subjectMode === 'misto';
    const hasProduct = !!data.subject?.productPhoto;
    const hasRef = !!data.style?.refImage;
    const hasTypo = !!data.style?.typoRefImage;

    console.log('\n========================================');
    console.log('--- STARTING AI PIPELINE v14.0 GEMINI 3 ---');
    const modeLabel = isMisto ? 'MISTO' : isProduto ? 'PRODUTO' : 'PESSOA';
    console.log(`Mode: ${modeLabel} | Photos: ${(data.subject?.photos || []).length} | Product: ${hasProduct} | Ref: ${hasRef}`);

    console.log('--- STEP 1: BUILDING CREATIVE BRIEF ---');
    const brief = `SUBJECT: ${data.subject?.gender} in ${data.context?.niche}. SCENE: ${data.context?.environment || 'Professional'}. FRAMING: ${data.composition?.framing}.`;

    console.log('--- STEP 2: RAG DESIGN INTELLIGENCE ---');
    const enhancedBrief = enhanceBriefWithPatterns(brief, data.context?.niche || 'general');

    console.log('--- STEP 3: BUILDING FINAL PROMPT ---');
    let finalPrompt = '';
    const appType = data.appType || 'design';
    const isRefining = data.refineMode === true;
    
    // Master Sharpness Directive - INDUSTRIAL GRADE 4K
    const sharpnessBoost = `\n\n[MASTER OPTICAL FIDELITY & 4K RESOLUTION]\n` +
      `RENDER AT NATIVE 4K (4096px). Use hardware-level sharpening (Fujifilm GFX 100S / Phase One XF standard). ` +
      `Zero upscaling noise. Capture high-frequency spatial detail: skin micro-pores, fabric weave, minute dust particles, and individual hair strands. ` +
      `Materials must follow 100% physically accurate PBR shaders (proper Fresnel, micro-roughness, real-world specular). ` +
      `Lens: Carl Zeiss Otus 85mm f/1.4 clarity. Clinical depth of field. 16-bit color depth simulation.`;

    if (isRefining) {
       const userRefineInstruction = data.refineInstruction || "";
       finalPrompt = `[NEURAL REFINEMENT & DETAIL RESTORATION MODE]\n` +
         `TARGET: HIGH-FIDELITY UPSCALING, ANATOMY CORRECTION, AND USER DIRECTIVES.\n` +
         `1. Observe the attached original image as a template.\n` +
         `2. RE-RENDER the same scene but fix any AI artifacts (distorted fingers, blurry faces, lighting inconsistencies).\n` +
         `3. ENHANCE TEXTURES: Upscale skin, hair, and surfaces by 300% detail density.\n` +
         `4. PHOTOPROUP: Ensure sharp commercial color grading (Rec.709 premium).\n` +
         (userRefineInstruction ? `5. USER SPECIFIC MODIFICATION: "${userRefineInstruction}". Priority instruction.\n` : "") +
         sharpnessBoost;
    } else {
       // Standard Builder Dispatch
       switch(appType) {
      case 'art':
        const artPayload: ArtBuilderPayload = {
          format: data.dimensions || '1:1',
          subjectPhoto: data.subject?.photo,
          subjectQty: data.subject?.count ? parseInt(data.subject.count) : 1,
          subjectDesc: data.subject?.description,
          subjectPos: data.subject?.position,
          niche: data.context?.niche || 'general',
          environment: data.context?.environment,
          rimLight: data.lighting?.rim,
          compLight: data.lighting?.fill,
          floatingElements: data.composition?.floatingElements,
          refImage: data.style?.refImage,
          sobriety: data.style?.sobriety,
          extraPrompt: data.style?.extraPrompt,
          headline: data.text?.headline,
          creativeDNA: data.creativeDNA,
          scenarioPhysics: data.scenarioPhysics,
          brandIdentity: data.brandIdentity
        };
        finalPrompt = buildArtPrompt(artPayload);
        if (!isRefining) finalPrompt += sharpnessBoost;
        break;
      case 'bg':
        const bgPayload: BgBuilderPayload = {
          destination: 'hero_web',
          style: data.style?.visualStyle || 'gradient_mesh',
          colors: [data.lighting?.ambient, data.lighting?.rim].filter(Boolean),
          complexity: data.style?.sobriety || 50,
          safeZone: true,
          safeZonePosition: data.subject?.position === 'centro' ? 'center' : (data.subject?.position === 'esquerda' ? 'left' : 'right'),
          format: data.dimensions || '16:9',
          mood: data.style?.sobriety > 50 ? 'muted' : 'vibrant',
          theme: data.context?.niche,
          extraPrompt: data.style?.extraPrompt,
          refImage: data.style?.refImage,
          environment: data.context?.environment,
          scenarioPhysics: data.scenarioPhysics,
          visualStyles: data.style?.visualStyles
        };
        finalPrompt = buildBgPrompt(bgPayload);
        if (!isRefining) finalPrompt += sharpnessBoost;
        break;
      case 'ref':
        const refPayload: RefBuilderPayload = {
          concept: data.subject?.description || '',
          graphicStyle: 'minimalist',
          materials: [],
          outputType: 'moodboard',
          proportion: data.dimensions || '1:1',
          colorDirection: 'vibrant',
          extraPrompt: data.style?.extraPrompt,
          hasRefImage: hasRef,
          refCount: (data.style?.styleRefImages || []).length || (hasRef ? 1 : 0),
          refInstruction: data.style?.refInstruction
        };
        finalPrompt = buildRefPrompt(refPayload);
        if (!isRefining) finalPrompt += sharpnessBoost;
        break;
      default: // 'design'
        finalPrompt = isProduto
          ? buildProductPrompt(data, enhancedBrief, hasPhoto)
          : isMisto
            ? buildMixedPrompt(data, enhancedBrief, hasPhoto, hasProduct)
            : buildPersonPrompt(data, enhancedBrief, hasPhoto || hasPhotos);
        
        if (!isRefining) finalPrompt += sharpnessBoost;
    }
}

    // ─── CAROUSEL SLIDE-SPECIFIC OVERRIDES ──────────────────────────────────
    const isCarousel = data.dimensions === 'carousel';
    const isFollowUpSlide = isCarousel && !!data.carouselRefImage;
    const carouselTexts = data.carouselTexts || [];

    if (isCarousel) {
      finalPrompt += `\n\n[ULTRA-WIDE CAROUSEL FORMAT — 16:9 DOUBLE SLIDE]`;
      finalPrompt += `\nThis image must be designed as TWO 1:1 square slides placed side-by-side in a single 16:9 panoramic widescreen composition. `;
      finalPrompt += `The user will manually cut this image in half right down the middle (50% mark). IMPORTANT: Do NOT draw any visible divider line, border, seam, or frame in the middle of the image. The content must transition completely seamlessly across the center split. `;
      
      if (isFollowUpSlide) {
        finalPrompt += `\n\n[CONTINUITY GENERATION]`;
        finalPrompt += `\nThe FIRST attached reference image is the PREVIOUS 16:9 generation. `;
        finalPrompt += `You must draw the exact continuation of its RIGHT EDGE on the LEFT EDGE of this new image. `;
        finalPrompt += `Match the background, environment, lighting, and any elements that were cropped on the right edge of the reference. Ensure a flawless seamless visual flow. `;
      } else {
        finalPrompt += `\n\nEnsure a seamless visual flow across the center cut line. Background, environment, and lighting must stretch seamlessly across both halves. `;
        finalPrompt += `You may place a large visually engaging element exactly in the center to encourage the user to swipe natively on Instagram. `;
      }

      finalPrompt += `\n\n[LEFT HALF TYPOGRAPHY & SUBJECT]`;
      if (carouselTexts[0]?.headline || carouselTexts[0]?.subheadline) {
        finalPrompt += `\nOn the left 50% of the image, incorporate reading space and render the text: `;
        if (carouselTexts[0]?.headline) finalPrompt += `Headline: "${carouselTexts[0].headline}" `;
        if (carouselTexts[0]?.subheadline) finalPrompt += `Subheadline: "${carouselTexts[0].subheadline}" `;
      }
      if (carouselTexts[0]?.subjectImage) {
        finalPrompt += `\nFocus the FIRST provided person reference strongly on this left half. `;
      }

      finalPrompt += `\n\n[RIGHT HALF TYPOGRAPHY & SUBJECT]`;
      if (carouselTexts[1]?.headline || carouselTexts[1]?.subheadline) {
        finalPrompt += `\nOn the right 50% of the image, incorporate reading space and render the text: `;
        if (carouselTexts[1]?.headline) finalPrompt += `Headline: "${carouselTexts[1].headline}" `;
        if (carouselTexts[1]?.subheadline) finalPrompt += `Subheadline: "${carouselTexts[1].subheadline}" `;
      }
      if (carouselTexts[1]?.subjectImage) {
        finalPrompt += `\nFocus the LAST provided person reference strongly on this right half. `;
      }
    }

    console.log('Prompt chars:', finalPrompt.length);

    // Monta imagens de input
    const inputImages: { base64: string; mimeType: string; label?: string }[] = [];

    if (isCarousel) {
      if (carouselTexts[0]?.subjectImage) {
        console.log(`--- STEP 4A: PREPARING LEFT HALF SUBJECT PHOTO ---`);
        inputImages.push({ ...extractBase64(carouselTexts[0].subjectImage), label: 'PERSON FOR LEFT HALF' });
      }
      if (carouselTexts[1]?.subjectImage) {
        console.log(`--- STEP 4A: PREPARING RIGHT HALF SUBJECT PHOTO ---`);
        inputImages.push({ ...extractBase64(carouselTexts[1].subjectImage), label: 'PERSON FOR RIGHT HALF' });
      }
    } else if (hasPhotos) {
      console.log(`--- STEP 4A: PREPARING ${data.subject.photos.length} SUBJECT PHOTOS ---`);
      for (const [index, photo] of data.subject.photos.slice(0, 4).entries()) {
        const inst = data.subject?.description || '';
        inputImages.push({ ...extractBase64(photo), label: `PERSON REFERENCE ${index + 1}. MANTENHA A IDENTIDADE. INSTRUCTION: ${inst}` });
      }
    } else if (hasPhoto) {
      console.log('--- STEP 4A: PREPARING SUBJECT PHOTO ---');
      const inst = data.subject?.description || '';
      inputImages.push({ ...extractBase64(data.subject.photo), label: `PERSON REFERENCE. MANTENHA A IDENTIDADE. INSTRUCTION: ${inst}` });
    }

    if (isMisto && hasProduct) {
      console.log('--- STEP 4A+: PREPARING PRODUCT PHOTO ---');
      inputImages.push({ ...extractBase64(data.subject.productPhoto), label: 'PRODUCT REFERENCE' });
    }

    // New Ref Builder Array Logic
    // New Ref Builder Array Logic — MOVED TO FRONT FOR PRIORITY
    const styleRefImages = data.styleRefImages || (data.style?.refImage ? [data.style.refImage] : []);
    if (styleRefImages.length > 0) {
      console.log(`--- STEP 4B: PREPARING ${styleRefImages.length} STYLE REFERENCES (PRIORITY) ---`);
      styleRefImages.slice(0, 3).forEach((img: string, i: number) => {
        const dna = data.style?.refInstruction ? `USER INSTRUCTION: ${data.style.refInstruction}` : '';
        inputImages.unshift({ ...extractBase64(img), label: `GOLDEN STYLE REFERENCE ${i + 1} — EXTRACT ALL VISUAL DNA: COLORS, LIGHTING, COMPOSITION, TEXTURES, AND ATMOSPHERE. ${dna}` });
      });
    }

    if (data.style?.scenarioRefImage) {
      console.log('--- STEP 4C: PREPARING SCENARIO REFERENCE ---');
      inputImages.push({ ...extractBase64(data.style.scenarioRefImage), label: 'SCENARIO REFERENCE' });
    }

    if (hasTypo) {
      console.log('--- STEP 4C: PREPARING TYPOGRAPHY REFERENCE ---');
      inputImages.push({ ...extractBase64(data.style.typoRefImage), label: 'TYPOGRAPHY REFERENCE' });
    }

    // Carousel follow-up: inject the first slide as the primary visual reference
    if (isFollowUpSlide && data.carouselRefImage) {
      console.log('--- STEP 4D: INJECTING CAROUSEL REFERENCE SLIDE ---');
      inputImages.unshift({ ...extractBase64(data.carouselRefImage), label: 'CONTINUITY REFERENCE - PREVIOUS 16:9 GENERATION SLIDE (THE LEFT EDGE OF THIS NEW IMAGE MUST PERFECTLY SEAMLESSLY CONTINUE THE RIGHT EDGE OF THIS REFERENCE)' });
    }

    // ─── STEP 4D: PREPARING ASPECT RATIO & SEARCH ─────────────────────────────
    const aspectRatio = getAspectRatio(data.dimensions);
    const hasAnyRef = (styleRefImages.length > 0) || hasTypo || inputImages.length > 0;
    const useSearch = !hasAnyRef;

    if (useSearch) {
      console.log('[Gemini] No refs detected — activating Google Search for visual reference lookup');
    }

    // ─── STEP 4E: CONTEXTUAL REINFORCEMENTS (TEXT, NO PERSON, SHARPNESS) ──────
    const rootExtra = data.extraPrompt || '';
    const styleExtra = data.style?.extraPrompt || '';
    const extraPromptStr = (rootExtra || styleExtra).toLowerCase();
    const envStr = (data.context?.environment || '').toLowerCase();
    const hasTextKeywords = /texto|letra|frase|escrita|headline|typography|overlay|font/.test(extraPromptStr + envStr) || isCarousel;
    
    // Detect absence of person/identity
    const hasPersonIdentity = (data.subject?.description || '').length > 20 || hasPhoto || hasPhotos;
    const isNoPersonScene = !hasPersonIdentity && !isProduto && !isMisto;

    if (hasTextKeywords) {
      finalPrompt += `\n\n[TYPOGRAPHY REINFORCEMENT] Text elements must be: perfectly legible, correctly spelled, no distorted letters, properly integrated with correct perspective. High contrast and clean edges.`;
    }

    if (isNoPersonScene) {
      finalPrompt += `\n\n[SCENE-ONLY REINFORCEMENT] ABSTRACT/SCENE-ONLY — NO PERSON. Do NOT add any person, face, body, or biological features. Focus entirely on environment, visual elements, geometry and atmosphere.`;
    }

    // Universal Sharpness & Niche Authority Directive
    const nicheSignals: Record<string, string> = {
      'trader': 'Financial HUD elements, glowing market charts in background, 3D trading icons, cool tech blue/cyan atmosphere, high-stakes authority.',
      'engenharia': 'Construction site depth, structural scaffolding, warm golden hour sun flares, volumetric dust particles, professional safety gear details.',
      'marketing': 'High-conversion advertising layout, bold graphical elements, floating high-quality 3D icons, clean commercial studio lighting.',
    };
    const activeNiche = (data.context?.niche || '').toLowerCase();
    let nicheBoost = '';
    for (const [key, val] of Object.entries(nicheSignals)) {
      if (activeNiche.includes(key)) nicheBoost = `\n\n[NICHE AUTHORITY BOOST] ${val}`;
    }

    // ── MODE-SPECIFIC ENHANCED NEGATIVE PROMPTS ───────────────────────────────────────────────────
    const modeNegatives: Record<string, string> = {
      pessoa: `
--ANATOMY: no fused fingers, extra digits, missing thumb, wrong hand count, floating limbs, double arms, bent-wrong joints, melting skin.
--FACE: no closed eyes, sideways gaze, asymmetric eyes, wrong eye color, double chin artifacts, floating ears, blurry face, wax skin.
--IDENTITY: no wrong hair color/length, no beard if not specified, no glasses if not specified, no aging artifacts, no skin discoloration.
--CLOTHING: no wrong fabric physics, no floating cloth, no impossible creases, no texture tiling patterns.
--LIGHTING: no flat studio background, no inconsistent light direction, no hot spots burning out face, no green-screen edge bleeding.
--COMPOSITION: no generic stock photo look, no watermarks, no text overlays, no logos, no amateur framing, no cropped limbs.
--QUALITY: no JPEG compression artifacts, no pixelation, no noise, no AI hallucination artifacts, no splotchy color areas.`,
      produto: `
--PRODUCT: no wrong product geometry, no color shift from reference, no missing labels/logos, no blurry product surfaces, no warped perspective.
--TEXT: no misread logo text, no distorted typography, no partial letters, no wrong font on label.
--LIGHTING: no overblown specular hot spots, no missing contact shadow, no floating product (needs ground plane connection).
--BACKGROUND: no distracting competing elements, no wrong depth of field (product must be sharpest element).
--QUALITY: no AI hallucination artifacts, no pixelation, no watermarks, no stock photo compositing artifacts.`,
      art: `
--COMPOSITION: no centered crop with no text space, no generic influencer pose, no flat lighting, no stock photo energy.
--QUALITY: no AI artifacts, no pixelation, no watermarks, no lens distortion without intent, no overprocessed HDR look.
--CONTENT: no NSFW, no violence, no trademarked logos unless user specified.`,
      bg: `
--SUBJECT: no people, no faces, no body parts, no human-like shapes.
--QUALITY: no pixelation, no tiling patterns, no seams, no visible AI generation artifacts.
--DESIGN: no cluttered composition, no competing focal points, no text.`,
      ref: `
--QUALITY: no low resolution, no pixelation, no stock photo watermarks.
--CONTENT: no random unrelated elements.`
    };

    const negativeBlock = modeNegatives[appType] || modeNegatives['pessoa'];
    finalPrompt += `\n\n[ZERO TOLERANCE DEFECT LIST]${negativeBlock}`;
    finalPrompt += `\n\n[QUALITY REINFORCEMENT] Razor-sharp focus, ultra-high definition textures, zero motion blur, extreme clarity in ALL surfaces, 8K professional photography standard, peak sharpness. INDISTINGUISHABLE FROM REALITY.`;

    // ─── STEP 4F: COMPOSITION PRE-PASS (THINKING BEFORE DRAWING) ─────────────
    const compMode = (appType === 'art' ? 'art' : appType === 'bg' ? 'bg' : appType === 'ref' ? 'ref' : isProduto ? 'produto' : 'pessoa') as any;
    console.log('--- STEP 4F: COMPOSITION PRE-PASS ---');
    const blueprint = await computeCompositionBlueprint(finalPrompt, compMode, data.dimensions || '1:1', apiKey);
    if (blueprint) {
      finalPrompt += blueprintToPromptBlock(blueprint);
    }

    // ─── STEP 4G: INTELLECTUAL PROMPT REFINEMENT ──────────────────────────────
    const creativeDirection = await refinePromptWithGemini(finalPrompt, apiKey);
    
    // Always use original prompt as base — append art director vision ONLY if it's new content
    const promptToUse = creativeDirection 
      ? `${finalPrompt}\n\n[ART DIRECTOR ENHANCEMENT]\n${creativeDirection}` 
      : finalPrompt;

    console.log('--- STEP 5: CALLING GEMINI 3 PRO IMAGE ---');

    const imageDataUrl = await generateWithGemini(
      promptToUse,
      apiKey,
      inputImages.length > 0 ? inputImages : undefined,
      aspectRatio,
      true, // usa Nano Banana Pro
      useSearch
    );

    console.log('--- PIPELINE COMPLETE ---');
    console.log('========================================\n');

    return NextResponse.json({
      id: Math.random().toString(36).slice(2),
      url: imageDataUrl,
      prompt: finalPrompt,
      dimensions: data.dimensions, // Pass it back to frontend to activate slice button
      model: 'gemini-3-pro-image',
    });

  } catch (error: any) {
    console.error('Pipeline error:', error.message);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
