/**
 * refPrompt.ts — V3 SPECIALIZED ENGINE: REFERENCE MERGING & MOODBOARD SYNTHESIS
 * ════════════════════════════════════════════════════════════════════════════════
 * PURPOSE: Takes 1-3 reference images and MERGES their visual DNA into a new cohesive image
 * LEVEL:   Senior Brand Strategist at Pentagram / Base Design / Collins
 * METHOD:  Visual DNA Extraction → Style Interpolation → Cohesive Synthesis
 *          Handles: Moodboards, Brand Boards, Style References, Texture Studies
 */

export interface RefBuilderPayload {
  concept: string;          // free-text concept / vibe
  graphicStyle: string;     // 'minimalist' | 'bauhaus' | 'swiss' | 'neo_brutalist' | 'organic' | 'luxury' | 'streetwear' | 'tech' | 'editorial'
  materials: string[];      // e.g. ['leather', 'glass', 'concrete', 'neon', 'marble']
  outputType: string;       // 'moodboard' | 'color_palette' | 'typography_ref' | 'brand_identity' | 'texture_sheet' | 'lifestyle'
  proportion: string;       // '1:1' | '4:3_h' | '4:3_v' | '16:9'
  colorDirection: string;   // 'warm' | 'cold' | 'monochrome' | 'vibrant' | 'muted' | 'dark' | 'light'
  era?: string;             // 'contemporary' | '90s' | '70s' | 'futuristic' | 'timeless'
  targetAudience?: string;
  keywords?: string[];
  extraPrompt?: string;
  hasRefImage: boolean;
  refInstruction?: string;
  refCount?: number;        // V3: how many reference images are attached for merging
}

export function buildRefPrompt(data: RefBuilderPayload): string {
  const {
    concept, graphicStyle, materials, outputType, proportion,
    colorDirection, era, targetAudience, keywords, extraPrompt,
    hasRefImage, refInstruction, refCount,
  } = data;

  const sections: string[] = [];

  // ═══ OVERRIDE ═══
  if (extraPrompt) {
    sections.push(`[CREATIVE OVERRIDE — MAXIMUM PRIORITY]\n${extraPrompt}\nAll instructions below are subordinate to this directive.`);
  }

  // ═══ 1. ROLE & MISSION ═══
  const isMultiRef = (refCount || 0) > 1;
  sections.push(
    `[REFERENCE SYNTHESIS ENGINE — BRAND STRATEGIST V3]` +
    `\nYou are a Senior Brand Strategist and Visual Director at a world-class branding studio` +
    ` (Pentagram, Base Design, Collins, Wolff Olins level).` +
    (isMultiRef
      ? `\n\n🔬 MULTI-REFERENCE MERGING MODE (${refCount} references attached)` +
        `\nYour mission: EXTRACT the visual DNA from EACH attached reference image,` +
        ` then SYNTHESIZE a new original image that MERGES the best elements from all references.` +
        `\nThis is NOT about copying one reference. It's about creating something NEW that contains` +
        ` the GENETIC CODE of ALL references — a hybrid that inherits the strengths of each parent.`
      : `\nYour mission: create a professional design reference artifact that communicates` +
        ` a clear creative direction and brand world.`)
  );

  // ═══ 2. MULTI-REFERENCE MERGING INSTRUCTIONS ═══
  if (isMultiRef && hasRefImage) {
    sections.push(
      `[DNA FUSION PROTOCOL — 6-STRAND ANALYSIS]` +
      `\nFor EACH attached reference, perform a deep-scan to extract these 6 DNA strands:` +
      `\n` +
      `\n1. CHROMATIC DNA: Dominant hex-scale, saturation curve, and color-blocking logic.` +
      `\n2. OPTIC DNA: Lighting directionality, IES profiles, softbox vs specular quality.` +
      `\n3. MATERIAL DNA: PBR shader properties — surface roughness, fresnel index, refraction.` +
      `\n4. STRUCTURAL DNA: Geometric rhythm, grid alignment, negative space "breathing" zones.` +
      `\n5. ATMOSPHERIC DNA: Volumetric haze, grain profile (organic vs digital), energy level.` +
      `\n6. SEMANTIC DNA: Emotional narrative, brand authority level, niche specific cues.` +
      `\n` +
      `\n[FUSION RULES — BRAND DIRECTOR LEVEL]` +
      `\n• INTEGRATION: Do NOT overlap references. SYNTHESIZE them into a singular visual truth.` +
      `\n• HIERARCHY: Identify the primary 'Soul' from Ref 1 and enrich it with 'Detail' from Ref 2.` +
      `\n• COHESION: Every pixel must look like it was created by the same hand/camera in the same session.` +
      `\n• PHYSICS: Ensure 100% consistent light-shadow interaction across the fused scene.` +
      `\n` +
      `\nThe output must be a MASTERPIECE OF SYNTHESIS — a single, coherent, cinematic vision.`
    );
  } else if (hasRefImage && refInstruction) {
    sections.push(
      `[STYLE REFERENCE EVOLUTION]` +
      `\nDirective: ${refInstruction}.` +
      `\nExtract the design DNA from the reference — structure, geometry, lighting, artistic identity.` +
      `\nEvolve it: keep the soul, enhance the execution, refine the details.`
    );
  } else if (hasRefImage) {
    sections.push(
      `[STYLE REFERENCE DNA EXTRACTION]` +
      `\nMeticulously extract from the attached reference:` +
      `\n• Color palette (exact values, ratios, application logic)` +
      `\n• Material language (surfaces, textures, finishes)` +
      `\n• Compositional rhythm (spacing, alignment, hierarchy)` +
      `\n• Atmospheric qualities (light quality, mood, depth)` +
      `\n• Design philosophy (minimalist vs. maximalist, organic vs. geometric)` +
      `\nRecreate a new image with ALL these DNA strands intact but fresh execution.`
    );
  }

  // ═══ 3. OUTPUT TYPE — DEEP SPECIALIZATION ═══
  const outputMap: Record<string, string> = {
    moodboard:
      `PROFESSIONAL MOODBOARD` +
      `\nCreate a curated collage of visual inspiration: textures close-ups, color swatches,` +
      ` reference photography, material samples, atmospheric imagery.` +
      `\nLayout: intentional grid with varied sizes — one hero image (40%), medium images (3-4 at 15% each),` +
      ` small detail shots (2-3 at 5% each). White or off-white gaps between images (2-4px).` +
      `\nThis should look like a designer's wall at a $1M branding project kickoff.` +
      `\nEvery element should reinforce the core concept cohesively.`,

    color_palette:
      `COLOR PALETTE STUDY` +
      `\nCreate a rich, detailed color exploration: large primary swatches (60%), secondary (30%), accent (10%).` +
      `\nShow gradient transitions between colors. Show colors IN CONTEXT: on surfaces, in lighting, on materials.` +
      `\nInclude: warm-cool relationships, complementary pairings, analogous harmonies.` +
      `\nMake it look like a Pantone studio mood board — each color feels considered and named.`,

    typography_ref:
      `TYPOGRAPHY REFERENCE STUDY` +
      `\nVisualize typographic personalities through environmental design — NOT actual readable text.` +
      `\nShow: weight variations, size hierarchies, spacing rhythms.` +
      `\nContext: display-quality letterforms as visual art objects — think poster design, editorial layout.` +
      `\nMaterials: letters cast in bronze, etched in glass, projected as light, carved in stone.`,

    brand_identity:
      `BRAND IDENTITY OVERVIEW` +
      `\nCreate a brand world snapshot: lifestyle visuals, material touches, color system in application.` +
      `\nLayout: professional brand manual page with clear zones for logo (blank), color system,` +
      ` material samples, lifestyle photography, brand personality imagery.` +
      `\nThis should look like page 3 of a $500K brand identity presentation from Collins or Base Design.`,

    texture_sheet:
      `MATERIAL & TEXTURE STUDY` +
      `\nMacro photography-style grid of material surfaces. Each cell: one specific material.` +
      `\nShow: light interaction (specular, diffuse, subsurface), surface imperfections, grain detail.` +
      `\nMaterials rendered at photorealistic quality — you should almost be able to FEEL them.` +
      `\nArranged in a clean grid with consistent lighting direction across all samples.`,

    lifestyle:
      `LIFESTYLE MOODBOARD` +
      `\nCurated scenes that define a target audience world: places, moments, objects, rituals.` +
      `\nEvery image should answer: "What does this person's IDEAL day look like?"` +
      `\nMix: architectural spaces, product details, atmospheric moments, fashion details.` +
      `\nTied together by consistent color grading and emotional temperature.`,
  };

  sections.push(`[OUTPUT FORMAT]\n${outputMap[outputType] || outputType}`);

  // ═══ 4. PROPORTION ═══
  const proportionMap: Record<string, string> = {
    '1:1': 'Square 1:1 — balanced, Instagram-ready',
    '4:3_h': '4:3 landscape — presentation-ready, horizontal emphasis',
    '4:3_v': '3:4 portrait — vertical hierarchy, print-ready',
    '16:9': '16:9 widescreen — panoramic overview, desktop wallpaper quality',
  };
  sections.push(`[PROPORTION] ${proportionMap[proportion] || proportion}`);

  // ═══ 5. CONCEPT ═══
  if (concept) {
    sections.push(
      `[CREATIVE CONCEPT] "${concept}"` +
      `\nEvery visual element must express this concept's essence — the colors should evoke it,` +
      ` the materials should embody it, the composition should breathe it.` +
      `\nThis concept is the gravitational center of every design decision.`
    );
  }

  // ═══ 6. GRAPHIC STYLE ═══
  const graphicStyleMap: Record<string, string> = {
    minimalist:    'Ultra-minimalist — maximum white space, 1-2 key elements, Swiss grid logic, silence as design.',
    bauhaus:       'Bauhaus — geometric primary forms, primary colors, functional beauty, bold sans-serif references.',
    swiss:         'International Swiss — clean grid, Helvetica-inspired, objective photography, mathematical precision.',
    neo_brutalist: 'Neo-brutalism — raw structure, stark contrast, architectural honesty, ugly-beautiful tension.',
    organic:       'Organic natural — biomorphic shapes, earth tones, nature textures, warmth and imperfection.',
    luxury:        'Ultra-luxury — rare materials, hand-finished quality, heritage, old-money visual restraint.',
    streetwear:    'Streetwear culture — bold graphics, limited-edition DNA, youth energy, graffiti influence.',
    tech:          'High-tech — precise engineering aesthetic, dark UI, data-viz elements, silicon valley meets design.',
    editorial:     'Editorial magazine — dramatic photo crops, typographic experiments, high-fashion meets art.',
    retro:         'Retro/vintage — aged texture, nostalgic palette, period typography, warm analog feeling.',
  };
  sections.push(`[DESIGN LANGUAGE] ${graphicStyleMap[graphicStyle] || graphicStyle}`);

  // ═══ 7. COLOR DIRECTION ═══
  const colorMap: Record<string, string> = {
    warm:       'Warm chromatic — amber, terracotta, burnt sienna, golden, earthy warmth',
    cold:       'Cold chromatic — icy blues, steel grays, arctic whites, frost palette',
    monochrome: 'Monochromatic — single hue full value range (near-black to near-white), tonal sophistication',
    vibrant:    'Vibrant saturated — maximum chroma, bold pure hues, energetic color stories',
    muted:      'Muted desaturated — dusty, faded, sophisticated restraint, Pantone-era classic',
    dark:       'Dark palette — deep shadows, midnight tones, subtle color variation in near-blacks',
    light:      'Light palette — creams, off-whites, pale pastels, airy, light-flooded studio feel',
  };
  let colorSection = `[CHROMATIC DIRECTION] ${colorMap[colorDirection] || colorDirection}`;
  if (era) {
    const eraMap: Record<string, string> = {
      contemporary: 'Contemporary (2024-2026 design zeitgeist — digital-first, AI-aware, post-minimalist)',
      '90s': '1990s (grunge, club culture, early digital, MTV generation, acid graphics)',
      '70s': '1970s (earth tones, macramé, psychedelia, warm film grain, analog warmth)',
      futuristic: 'Near-future (2035-2050 — speculative design, holographic, quantum-inspired)',
      timeless: 'Timeless classic — no era, pure design principle, eternal quality.',
    };
    colorSection += `\nDesign Era: ${eraMap[era] || era}`;
  }
  sections.push(colorSection);

  // ═══ 8. MATERIALS ═══
  if (materials && materials.filter(Boolean).length > 0) {
    const valid = materials.filter(Boolean);
    sections.push(
      `[MATERIAL PALETTE] Feature these materials as texture elements: ${valid.join(', ')}.` +
      `\nEach material: photorealistic accuracy — correct light interaction (subsurface, fresnel, diffuse),` +
      ` natural imperfections, correctly scaled texture grain, physically accurate surface response.`
    );
  }

  // ═══ 9. TARGET AUDIENCE ═══
  if (targetAudience) {
    sections.push(
      `[TARGET AUDIENCE] Designed for: ${targetAudience}.` +
      `\nAll visual choices must resonate with this audience's aspirations, cultural references, tastes.`
    );
  }

  // ═══ 10. KEYWORDS ═══
  if (keywords && keywords.filter(Boolean).length > 0) {
    sections.push(
      `[MOOD KEYWORDS] ${keywords.filter(Boolean).join(', ')}` +
      `\nEach keyword should be visually traceable in at least one element of the final image.`
    );
  }

  // ═══ 11. TECHNICAL RENDERING ═══
  sections.push(
    `[TECHNICAL SPECIFICATIONS — OCTANE / REDSHIFT / UNREAL 5.4]` +
    `\nResolution: 8K hyper-realistic. Zero compression artifacts.` +
    `\nMaterial Rendering: Full PBR textures with microscopic detail (imperfections, smudges, grain).` +
    `\nPhysics: Ray-traced reflections (Fresnel index 1.5-2.5), volumetric scattering for light beams.` +
    `\nColor: Balanced P3 gamut, professional color grading, zero digital mud.` +
    `\nFinal Output: This must look like a $500K brand design artifact from Pentagram or Collins.` +
    `\n\n--no amateur layout, unintentional gaps, misaligned elements, clipart quality,` +
    ` random imagery, stock photo look, inconsistent lighting across elements,` +
    ` low-resolution textures, generic placeholder imagery, watermarks.`
  );

  return sections.join('\n\n').slice(0, 6000).trim();
}
