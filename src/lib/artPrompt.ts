/**
 * artPrompt.ts — V7 PHOTOSHOP KILLER ENGINE: CREATIVE ADVERTISING POSTS
 * ═══════════════════════════════════════════════════════════════════════
 * PURPOSE: Social media creatives, marketing posts, ad banners, stories
 * LEVEL:   Wieden+Kennedy / Droga5 / TBWA Senior Creative Director
 * METHOD:  A.R.C.H. Framework:
 *          A — Anchor (identity & format lock)
 *          R — Reality (physical world, materials, lighting physics)
 *          C — Composition (rule-based spatial arrangement)
 *          H — Hierarchy (visual weight & conversion architecture)
 *
 * PHOTOSHOP KILLER UPGRADES vs V6:
 * - Granular anatomy directives (hands, fingers, eyes, ears separately)
 * - Physical Based Rendering (PBR) specifications per material type
 * - Separate depth plane descriptions with exact focus distances
 * - Cinematic color science (ASC CDL values, LUT references)
 * - Advertising conversion science integrated into composition
 * - Microexpression and gaze direction control
 */

export interface ArtBuilderPayload {
  format: string;
  subjectPhoto?: string | null;
  subjectQty?: number;
  subjectGender?: 'masculino' | 'feminino';
  subjectDesc?: string;
  subjectPos?: 'esquerda' | 'centro' | 'direita';
  niche: string;
  environment?: string;
  useBgPhotos?: boolean;
  brandColors?: string[];
  rimLight?: string;
  compLight?: string;
  shotType?: 'closeup' | 'medium' | 'american';
  floatingElements?: string;
  refImage?: string | null;
  sobriety?: number;
  visualStyles?: string[];
  useBlur?: boolean;
  useSideGradient?: boolean;
  extraPrompt?: string;
  headline?: string;

  creativeDNA?: {
    emotionalTone?: string;
    marketContext?: string;
    typographyStyle?: string;
    visualWeight?: string;
  };
  scenarioPhysics?: {
    surfaceTexture?: string;
    depthOfField?: string;
    architecturalStyle?: string;
    environmentalEffects?: string[];
  };
  brandIdentity?: {
    colorTheory?: string;
    targetEra?: string;
    materials?: string[];
    audiencePersona?: string;
  };
}

export function buildArtPrompt(data: ArtBuilderPayload): string {
  const {
    format, subjectQty, subjectGender, subjectDesc, subjectPos,
    niche, environment, useBgPhotos, brandColors, rimLight, compLight,
    shotType, floatingElements, sobriety, visualStyles, useBlur, useSideGradient,
    extraPrompt, headline,
    creativeDNA, scenarioPhysics, brandIdentity
  } = data;

  const sections: string[] = [];

  // ═══ MANUAL OVERRIDE — ABSOLUTE HIGHEST PRIORITY ═══
  if (extraPrompt) {
    sections.push(
      `[USER DIRECTIVE — MAXIMUM PRIORITY — ALL OTHER INSTRUCTIONS SUBORDINATE]\n` +
      `${extraPrompt}\n` +
      `Interpret and expand this directive with the full creative vocabulary of a Wieden+Kennedy Senior Art Director. ` +
      `Translate every abstract intent into specific visual decisions: exact colors, lighting angles, atmospheric particles, material surfaces.`
    );
  }

  // ═══ 1. MISSION STATEMENT ═══
  sections.push(
    `[CREATIVE DIRECTOR — V7 PHOTOSHOP KILLER ENGINE]\n` +
    `Mission: Generate a HIGH-CONVERSION advertising creative that STOPS THE SCROLL in under 0.3 seconds.\n` +
    `Standard: Phase One IQ4 / Hasselblad H6D production quality. Every pixel must be intentional.\n` +
    `Inspiration tier: Nike "Dream Crazy", Red Bull athlete editorial, Apple "Shot on iPhone" campaign.`
  );

  // ═══ 2. CANVAS & FORMAT LOCK ═══
  const fmtMap: Record<string, string> = {
    '1:1': 'SQUARE 1:1 — Instagram/Facebook feed. Strong centered or offset golden-ratio composition. All 4 edges must feel intentionally designed.',
    '9:16': 'VERTICAL 9:16 — Stories/Reels/TikTok full-screen. Strong vertical leading lines. Content must fill edge-to-edge. Strong diagonal energy.',
    '16:9': 'CINEMATIC 16:9 — YouTube thumbnail, hero banner. Horizontal rule-of-thirds. Two strong focal points left and right.',
    '4:5': 'PORTRAIT 4:5 — Instagram feed max real estate. Vertical hierarchy: subject top → message middle → CTA bottom.',
    '3:4': 'TALL 3:4 — Pinterest. Long scroll format, strong top anchor.',
  };
  let canvas = `[CANVAS LOCK] ${fmtMap[format] || format}.\n`;
  if (niche) canvas += `Industry Vertical: ${niche}. Every design decision must signal authority in this specific market space.`;
  sections.push(canvas);

  // ═══ 3. SUBJECT IDENTITY LOCK ═══
  if (data.subjectPhoto) {
    sections.push(
      `[IDENTITY ANCHOR — SURGICAL PHOTOREALISTIC LOCK]\n` +
      `The attached photo is the SOLE reference for the person's identity.\n` +
      `LOCKED WITH ZERO DEVIATION ALLOWED:\n` +
      `  • Facial bone structure: brow ridge, cheekbone height, jaw line, chin shape\n` +
      `  • Eyes: exact shape (almond/round/hooded), iris color with limbal ring, pupil size in this light\n` +
      `  • Nose: exact bridge width, tip shape, nostril flare\n` +
      `  • Mouth: lip fullness ratio, philtrum depth, natural lip color\n` +
      `  • Skin: tone (Fitzpatrick scale match), undertone (warm/cool/neutral), any visible marks or freckles\n` +
      `  • Hair: exact color (root-to-tip), wave pattern, length, density\n` +
      `PROHIBITED: altering ANY locked feature. NEVER import human traits from style reference images.\n` +
      `ALLOWED TO ADAPT: clothing, body pose, expression intensity, hair styling (same color/length, different style).`
    );
  }

  // ═══ 4. SUBJECT COMPOSITION & ANATOMY ═══
  const qtyStr = subjectQty && subjectQty > 1 ? `${subjectQty} people` : 'single subject';
  const genderStr = subjectGender === 'feminino' ? 'female' : 'male';
  
  const posMap: Record<string, string> = {
    'esquerda': 'LEFT golden-ratio third — subject mass occupies left 38% of frame. Right 62% is clean negative space for headline H1, subheadline H2, and CTA button overlay. No scene elements encroach into this text zone.',
    'centro': 'CENTERED — subject at optical center (slightly above true geometric center). Equal negative space left and right for bilateral text overlays.',
    'direita': 'RIGHT golden-ratio third — subject mass occupies right 38% of frame. Left 62% is clean negative space for headline H1, subheadline H2, and CTA button overlay.',
  };
  
  const shotMap: Record<string, string> = {
    closeup: 'EXTREME CLOSE-UP — face occupies 65-70% of frame height. Both eyes fully in upper half. Forehead crops slightly. Shoulders suggest body but not full. Maximum intimacy and detail.',
    medium: 'MEDIUM SHOT WAIST-UP — full torso visible. Both hands potentially in frame. Body language communicates status and emotion. Dynamic pose with slight forward lean.',
    american: 'AMERICAN SHOT KNEES-UP — full leg connection. Strong power stance or dynamic movement. Environment interacts with lower body. Full gestural communication.',
  };

  let subj = `[SUBJECT CONSTRUCTION]\n`;
  subj += `Cast: ${qtyStr}, ${genderStr}.\n`;
  subj += `Framing: ${shotMap[shotType || 'medium']}\n`;
  subj += `Placement: ${posMap[subjectPos || 'centro']}\n`;
  if (subjectDesc) subj += `Physical Blueprint (MANDATORY, zero deviation): ${subjectDesc}\n`;
  
  subj += `\n[MICROEXPRESSION DIRECTION]\n`;
  subj += `Expression: Direct gaze into lens with BOTH eyes fully open. Pupil sharp and alive. Dual catchlights at 10 o'clock and 2 o'clock. `;
  subj += `Slight jaw set — confidence without aggression. Micro-smile at mouth corners — engaging without grinning. Eyebrows at neutral-to-slight arch — approachable authority.\n`;
  
  subj += `\n[ANATOMY PRECISION — PHOTOREALISTIC PHYSICS]\n`;
  subj += `HANDS: If visible, exactly 5 fingers per hand. Natural finger curl physics. Skin folds at knuckles. Fingernails with specular highlight. No extra/missing/fused digits.\n`;
  subj += `EARS: Natural placement at eye-to-nose-tip height. Antihelix and tragus visible if unobstructed.\n`;
  subj += `NECK: Natural sternocleidomastoid tension. No stretched or compressed anatomy.\n`;
  subj += `TEETH: If visible — natural enamel translucency (not pure white), gum line visible, small gap variations. No uncanny valley perfect grid.\n`;
  subj += `SKIN PHYSICS: Apply SUBSURFACE SCATTERING — light bleeds through ears and thin nasal skin. Micro-pore texture at 100% zoom. Natural moisture film on eyes. Inner-corner eye wetness. Sebaceous gland variation (T-zone slightly more reflective). No plastic/waxy/airbrushed skin.`;
  sections.push(subj);

  // ═══ 5. CREATIVE STRATEGY DNA ═══
  if (creativeDNA) {
    const dna: string[] = [`[CREATIVE STRATEGY DNA — CONVERSION ARCHITECTURE]`];
    
    const emotionMap: Record<string, string> = {
      'Premium / Sereno': 'ASPIRATIONAL SERENITY: The visual should make the viewer feel "I deserve this level of life." Restraint is power. Space is luxury. Colors breathe. Nothing screams.',
      'Energético / Urgente': 'FOMO ACTIVATION: Dynamic movement blur, bold color collisions, diagonal energy lines, urgency in every pixel. The viewer feels they must act NOW.',
      'Alegre / Vibrante': 'JOY INJECTION: Warm inclusive light, full saturated palette, positive micro-expression, environmental warmth. Makes the viewer feel seen and included.',
      'Minimalista / Frio': 'INTELLECTUAL AUTHORITY: Negative space as confidence. Surgical color restraint (maximum 2 colors). Every element has a reason. Apple-level discipline.',
    };
    if (creativeDNA.emotionalTone) dna.push(`Emotional Target: ${emotionMap[creativeDNA.emotionalTone] || creativeDNA.emotionalTone}`);

    const marketMap: Record<string, string> = {
      'Infoprodutos / B2C': 'INFO-PRODUCT CONVERSION CODE: Transformational thumbnail energy. Before/after visual implication. Authority signals (posture, setting, styling). Strong aspirational gap between viewer state and subject state.',
      'Corporativo / B2B': 'B2B EXECUTIVE AUTHORITY: Institutional gravity. Trust through restraint. Data-driven aesthetic feel. LinkedIn-grade professionalism. No hype.',
      'E-commerce / Moda': 'FASHION EDITORIAL: Catalog-aspirational. Strong styling choices. Environmental storytelling. The product is a character, not an object.',
      'Luxury / Premium': 'OLD-MONEY LUXURY CODE: Heirloom materials, rested negative space, muted palette with one jewel-tone accent, heritage craftsmanship signals.',
    };
    if (creativeDNA.marketContext) dna.push(`Market Intelligence: ${marketMap[creativeDNA.marketContext] || creativeDNA.marketContext}`);
    
    if (creativeDNA.typographyStyle) dna.push(`Typography Zone DNA: ${creativeDNA.typographyStyle} — design the clean zones architecturally for this type style. Consider x-height, weight, and tracking in the negative space shape.`);
    
    const weightMap: Record<string, string> = {
      'Vibrante e Contrastado': 'MAXIMUM VISUAL PUNCH: Split-complement color scheme. Maximum contrast ratio (>7:1). Bold graphic shapes. Scroll-stopping at 0.1-second glance.',
      'Mudo e Pastel': 'SOFT MUTED PASTELS: Analogous pastel palette. Low contrast ratios. Gentle light. Aesop/Glossier premium subtlety.',
      'Dark Mode / Carbono': 'CARBON DARK PREMIUM: Near-black base (#0D0D0D). Carbon fiber or volcanic stone texture. Neon accent (1 color only). Tech luxury. Deep shadows.',
      'High-Key / Branco Puro': 'HIGH-KEY WHITE: Overexposed-looking base. Clinical purity. Apple product-page brightness. Subject pops against pure white/light grey.',
    };
    if (creativeDNA.visualWeight) dna.push(`Visual Weight System: ${weightMap[creativeDNA.visualWeight] || creativeDNA.visualWeight}`);
    
    sections.push(dna.join('\n'));
  }

  // ═══ 6. SCENE ARCHITECTURE ═══
  let scene = `[SCENE ARCHITECTURE — 3-PLANE DEPTH STAGING]\n`;
  
  if (environment) {
    scene += `MANDATORY ENVIRONMENT: ${environment}\n`;
    scene += `This environment must be constructed in 3 distinct depth planes:\n`;
    scene += `  PLANE 1 (FOREGROUND, 0-1m): Atmospheric particles, bokeh elements, or environmental props closest to camera. Soft focus. Create depth entry point.\n`;
    scene += `  PLANE 2 (MIDGROUND, 1-4m): SUBJECT in tack-sharp focus. This is the hero plane. Subject fully integrated with midground elements.\n`;
    scene += `  PLANE 3 (BACKGROUND, 4m+): Full environment rendering with soft natural bokeh. Environmental storytelling. Rich world-building.\n`;
    scene += `Every surface, material and light source in this environment must be photorealistic and physically accurate.`;
  } else if (niche) {
    scene += `[AI CREATIVE FILL — AUTHORITY ENVIRONMENT]\n`;
    scene += `Design the most impactful advertising backdrop for "${niche}" that a top-3 brand in this market would use for their global hero campaign.\n`;
    scene += `3-plane depth staging: atmospheric foreground → sharp midground (subject) → rich environmental background.\n`;
    scene += `The environment should REINFORCE the brand authority for the ${niche} space, not just be a backdrop.`;
  } else {
    scene += `[AI CREATIVE FILL — PREMIUM WORLD]\n`;
    scene += `Design a stunning premium environment worthy of a $200,000 commercial photoshoot.\n`;
    scene += `3-plane depth: foreground atmosphere → sharp subject → deep background world.`;
  }
  
  if (useBgPhotos) scene += `\nBACKGROUND INTEGRATION: Precisely replicate environment details from the attached background reference photo.`;
  sections.push(scene);

  // ═══ 7. PHYSICAL RENDERING SPECIFICATIONS ═══
  if (scenarioPhysics) {
    const phys: string[] = [`[PBR MATERIAL SPECIFICATIONS]`];
    if (scenarioPhysics.surfaceTexture) {
      phys.push(`Primary Surface: ${scenarioPhysics.surfaceTexture}\n` +
        `  — Render with physically accurate: albedo, specular response, roughness map, normal map detail.\n` +
        `  — Light interaction must be 100% physically accurate (angle of incidence = angle of reflection).`);
    }
    if (scenarioPhysics.depthOfField) phys.push(`Spatial Depth: ${scenarioPhysics.depthOfField}\n  — Bokeh discs in foreground must render as mathematically correct circular aperture shapes.`);
    if (scenarioPhysics.architecturalStyle) phys.push(`Architecture: ${scenarioPhysics.architecturalStyle}\n  — Structural elements must show correct load-bearing physics and material weathering.`);
    if (scenarioPhysics.environmentalEffects?.length) {
      phys.push(`Atmospheric VFX: ${scenarioPhysics.environmentalEffects.join(', ')}\n` +
        `  — Each atmospheric effect must be physically accurate: correct particle size, light scattering angle (Mie/Rayleigh), and motion blur physics.`);
    }
    sections.push(phys.join('\n'));
  }

  // ═══ 8. CINEMATIC LIGHTING SYSTEM ═══
  const rimColor = rimLight || '#E8C97A';  // Default warm gold rim
  const fillColor = compLight || '#4060FF'; // Default cool indigo fill
  const ambientColor = brandColors?.[0] || '#0a0a1a';

  let light = `[CINEMATIC LIGHTING SYSTEM — 3-POINT + ATMOSPHERE]\n`;
  light += `KEY LIGHT: Large 120cm Elinchrom octobox at 45° camera-left, 1.5m above eye level. `;
  light += `Quality: soft feathered edge. Produces defined-but-gradual cheekbone shadow. Catchlight at 10 o'clock in both eyes (must be visible as paired specular highlight).\n`;
  light += `RIM/SEPARATION: ${rimColor} gel on Profoto B10 at 220° behind-right, 30° above horizontal. `;
  light += `Creates luminous edge carving around ENTIRE silhouette — hair, shoulder, arm outline glowing with this precise color. Separates subject from background with 4-stop differential.\n`;
  light += `FILL: ${fillColor} tint on large reflector at camera-right. -2.5 stops under key. `;
  light += `Lifts shadow side to reveal texture without destroying contrast. Creates color temperature split (warm key vs cool fill = cinematic tension).\n`;
  light += `AMBIENT: ${ambientColor} environmental light wrapping from all background edges into the scene. `;
  light += `Affects: shadow sides of all objects, bounce light under chin, secondary rim on opposite shoulder.\n`;
  light += `PHYSICS COMPLIANCE: inverse square law falloff, no impossible light sources, all shadows correctly directional, subsurface scattering on skin at correct intensity.`;
  sections.push(light);

  // ═══ 9. OPTICS & SENSOR PHYSICS ═══
  let optics = `[OPTICS — MEDIUM FORMAT SYSTEM]\n`;
  if (useBlur) {
    optics += `Camera: Phase One XF IQ4 150MP + 110mm f/2.0 Blue Ring lens (medium format equivalent of 85mm f/1.4 on full-frame).\n`;
    optics += `Focus point: eyelashes of the eye closest to camera — razor sharp, texturally detailed.\n`;
    optics += `Background: organic buttery 11-blade circular bokeh at correct f/2.0 diameter. Bokeh discs show slight purple fringing at very edges (chromatic aberration — sign of quality glass).\n`;
    optics += `Field of view: medium format 44x33mm sensor — slight compression, gentle falloff at edges, no barrel distortion.`;
  } else {
    optics += `Camera: Phase One IQ4 150MP + 80mm f/8 Schneider Kreuznach lens.\n`;
    optics += `Focus: clinical edge-to-edge sharpness. Every detail from foreground to background in sharp focus.\n`;
    optics += `Zero distortion. Technical perfection. Maximum texture resolution.`;
  }
  optics += `\nSENSOR RESPONSE: Simulate 16-bit color depth. No highlight clipping. Pristine shadow detail. Full tonal range.`;
  sections.push(optics);

  // ═══ 10. COLOR SCIENCE ═══
  let colorGrade = `[COLOR SCIENCE — POST-PRODUCTION GRADE]\n`;
  if (sobriety !== undefined) {
    if (sobriety < 25) {
      colorGrade += `GRADE: HYPER-SATURATED EDITORIAL\n`;
      colorGrade += `  • Lift: +0.05 on all channels (crushed blacks into mid-grey)\n`;
      colorGrade += `  • Gamma: +0.15 red, -0.05 blue (warm midtones)\n`;
      colorGrade += `  • Gain: push saturation to 140% global\n`;
      colorGrade += `  • Color: split-tone — amber highlights (#F5C842), cyan shadows (#1A4A6E)\n`;
      colorGrade += `  Result: Maximum energy. Fashion magazine editorial. Scroll-stopping saturation.`;
    } else if (sobriety < 50) {
      colorGrade += `GRADE: PREMIUM CREATIVE ADVERTISING\n`;
      colorGrade += `  • Rich, saturated but not oversaturated (110% saturation)\n`;
      colorGrade += `  • Warm highlights, slightly cool shadows — classic commercial photography\n`;
      colorGrade += `  • Strong contrast (S-curve with steep center section)\n`;
      colorGrade += `  Result: Cinematic commercial quality. Premium brand energy.`;
    } else if (sobriety < 75) {
      colorGrade += `GRADE: BALANCED LUXURY COMMERCIAL\n`;
      colorGrade += `  • Refined controlled saturation (90%)\n`;
      colorGrade += `  • Gentle S-curve — not flat, not harsh. Polished.\n`;
      colorGrade += `  • Subtle warm grade overall (+10 in highlights)\n`;
      colorGrade += `  Result: Premium brand aesthetic. Refined, sophisticated, aspirational.`;
    } else {
      colorGrade += `GRADE: CORPORATE EXECUTIVE PREMIUM\n`;
      colorGrade += `  • Desaturated sophistication (70% saturation)\n`;
      colorGrade += `  • Silver/grey as dominant neutral\n`;
      colorGrade += `  • Colors present but restrained — one accent tone maximum\n`;
      colorGrade += `  Result: Forbes 500 company level. Institutional authority.`;
    }
  }
  sections.push(colorGrade);

  // ═══ 11. SIDE GRADIENT ═══
  if (useSideGradient) {
    sections.push(`[GRADIENT OVERLAY — PROFESSIONAL ADVERTISING GRADE]\n` +
      `Apply a professional side gradient creating volumetric depth and a dedicated typography zone.\n` +
      `Requirements: feathered edge (not hard mask), must respect the subject — gradient applies in the negative space adjacent to subject.\n` +
      `The gradient creates a "window" effect drawing the eye toward the subject.`);
  }

  // ═══ 12. FLOATING 3D ELEMENTS ═══
  if (floatingElements) {
    sections.push(
      `[3D COMPOSITED ELEMENTS — PHYSICAL INTEGRATION]\n` +
      `Elements: ${floatingElements}\n` +
      `INTEGRATION REQUIREMENTS (ALL are mandatory, not optional):\n` +
      `  1. MATERIAL FIDELITY: Each element rendered with full PBR shading — metallic surfaces show Fresnel IOR 1.45 reflections, glass shows refraction index 1.52, organic materials show subsurface scattering.\n` +
      `  2. LIGHTING MATCH: Every element receives the same key light direction (45° camera-left) with matching shadow softness. No "pasted in" look.\n` +
      `  3. DEPTH STAGING: Nearest elements at 40-50% of frame height (large, slightly soft focus). Mid-distance at 20-30%. Far at 5-10% (tiny, increasingly out of focus).\n` +
      `  4. PHYSICAL INTERSECTION: Some elements physically overlap subject — crossing in front of forearm or shoulder, with correct occlusion and shadow casting onto skin.\n` +
      `  5. SHADOW CASTING: Every element casts a shadow that respects the key light direction. Shadows have correct umbra/penumbra spread based on distance.`
    );
  }

  // ═══ 13. BRAND IDENTITY ═══
  if (brandIdentity) {
    const brand: string[] = [`[BRAND IDENTITY SYSTEM]`];
    if (brandIdentity.colorTheory) brand.push(`Color Theory: ${brandIdentity.colorTheory} — implement at material-science level, not just as surface color.`);
    if (brandIdentity.targetEra) brand.push(`Design Era: ${brandIdentity.targetEra} — surface materials, typography zones, and compositional principles should echo this era authentically.`);
    if (brandIdentity.materials?.length) brand.push(`Signature Materials: ${brandIdentity.materials.join(', ')} — these materials must be featured prominently with perfect PBR rendering.`);
    if (brandIdentity.audiencePersona) brand.push(`Target Persona: ${brandIdentity.audiencePersona} — every design choice must resonate with this specific individual's aspirations and aesthetics.`);
    sections.push(brand.join('\n'));
  }

  // ═══ 14. VISUAL STYLE SYSTEM ═══
  if (visualStyles && visualStyles.length > 0) {
    const styleDescriptions: Record<string, string> = {
      'Ultra Realista': 'HYPERREALISM: Every detail must be indistinguishable from a $150,000 commercial shoot. Individual skin pores, micro-hair follicles, fabric thread count, natural imperfections.',
      'Glow': 'LUMINESCENCE SYSTEM: Internal light sources emanating from subject edges. Subsurface glow on skin extremities. Aura of environmental light surrounding the entire figure.',
      'Glassmorphism': 'GLASS MATERIAL SYSTEM: Frosted glass panels in environmental elements. Translucent overlapping layers. Refraction artifacts. Chromatic iridescence at edges.',
      'Dark Mode / Carbono': 'DARK PREMIUM SYSTEM: Near-black environment (#080808). Carbon/obsidian material vocabulary. Single neon accent (1 color only, applied sparingly). Deep vignette edges.',
      'Tecnológico': 'HI-TECH SYSTEM: Holographic HUD elements. Glowing circuit traces in environment. Cool blue/cyan primary palette. Data visualization aesthetic in background.',
      'Minimalista': 'MINIMAL DISCIPLINE: Maximum 3 elements in frame. Ruthless negative space. 1-2 colors maximum. Nothing exists without purpose.',
    };
    const styleDesc = visualStyles.map(s => styleDescriptions[s] || s).join(' + ');
    sections.push(`[VISUAL STYLE ARCHITECTURE]\nActive Styles: ${styleDesc}\nEvery design decision — material, lighting, color, depth — must express these styles simultaneously and harmoniously.`);
  }

  // ═══ 15. REFERENCE INTEGRATION ═══
  if (data.refImage) {
    sections.push(
      `[STYLE REFERENCE — MAXIMUM AUTHORITY]\n` +
      `The attached style reference defines the VISUAL LANGUAGE of this image. Your task is to:\n` +
      `  1. EXTRACT: Identify exact palette (sample dominant colors as hex values), lighting direction, background design system, prop vocabulary, and atmospheric mood.\n` +
      `  2. APPLY: Implement every extracted element faithfully — not "inspired by", but precision-replicated.\n` +
      `  3. INTEGRATE: The subject exists within this visual world, not pasted on top of it.\n` +
      `ABSOLUTE PROHIBITION: Never copy any human trait (face, hair, skin, body) from the style reference.`
    );
  }

  // ═══ 16. TYPOGRAPHY ARCHITECTURE ═══
  if (headline) {
    sections.push(
      `[TYPOGRAPHY LAYER — PIXEL-PERFECT RENDER]\n` +
      `Render headline text: "${headline}"\n` +
      `REQUIREMENTS: Perfect kerning. No distorted letters. No blurry characters. No misspelled words.\n` +
      `The text must be the SHARPEST element in the entire image. Anti-aliased at vector quality.\n` +
      `Integrate into the composition's negative space zone — WCAG AAA contrast ratio (minimum 7:1) against its background.`
    );
  }

  // ═══ 17. ADVERTISING CONVERSION SCIENCE ═══
  sections.push(
    `[ADVERTISING CONVERSION ARCHITECTURE — F-PATTERN EYE FLOW]\n` +
    `This is a PAID ADVERTISEMENT. Apply direct response conversion science:\n` +
    `  ZONE A (TOP): Most powerful visual hook. Strongest element. Delivers attention in under 0.1s.\n` +
    `  ZONE B (MIDDLE): Authority signals and social proof elements. Subject positioning reinforces trust.\n` +
    `  ZONE C (BOTTOM): Clean territory for CTA button overlay. Minimum 25% frame height kept clean.\n` +
    `Eye-flow architecture: viewer's gaze enters at most saturated/contrasted point → flows to subject's eyes → follows gaze direction to headline zone → lands on CTA zone.\n` +
    `Visual hierarchy: subject is 80% attention weight, environment supports at 15%, props enrich at 5%.`
  );

  // ═══ 18. TECHNICAL EXECUTION STANDARDS ═══
  sections.push(
    `[TECHNICAL EXECUTION — UNREAL ENGINE 5.4 + OCTANE RENDERER STANDARD]\n` +
    `Resolution target: 8K (7680×7680 for 1:1). Commercial studio mastering grade.\n` +
    `Materials: 100% Physically Based Rendering (PBR). Fresnel IOR per material type. Micro-roughness maps. Anisotropic highlights on brushed metals.\n` +
    `Global Illumination: Full ray-traced GI. Every surface receives correct indirect lighting.\n` +
    `Shadow quality: Umbra + penumbra spread calculated from light source size and distance. Contact shadows under all objects.\n` +
    `FINAL STANDARD: This image should be indistinguishable from a $100,000 professional production campaign.\n\n` +
    `[ABSOLUTE ZERO TOLERANCE DEFECTS]\n` +
    `ANATOMY: --no fused fingers, extra digits, wrong hand count, floating limbs, double arms, bent-wrong joints, melting skin.\n` +
    `FACE: --no closed eyes, sideways gaze, asymmetric eyes, wrong eye color, wax skin, over-smoothed skin, plastic look.\n` +
    `IDENTITY: --no wrong hair color/texture, no beard if not in reference, no age artifacts, no unspecified accessories.\n` +
    `LIGHTING: --no inconsistent light direction, no hot-spot overexposure on face, no green-screen edge halos.\n` +
    `COMPOSITION: --no generic stock photo energy, no watermarks, no floating elements without shadows, no cropped limbs.\n` +
    `QUALITY: --no JPEG artifacts, no AI hallucination splotches, no pixelation, no color banding, no noise.`
  );

  return sections.join('\n\n');
}
