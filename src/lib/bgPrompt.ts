/**
 * bgPrompt.ts — V3 SPECIALIZED ENGINE: WEB BACKGROUNDS & UI BACKDROPS
 * ═══════════════════════════════════════════════════════════════════════
 * PURPOSE: Website hero backgrounds, banners, app UI backdrops, gradient meshes
 * LEVEL:   Senior UI/UX Art Director at Apple / Stripe / Linear / Notion
 * METHOD:  UI-First Design + Gradient Science + Atmospheric Depth
 *          CRITICAL: NO PEOPLE, NO TEXT, NO LOGOS — pure atmosphere
 */

export interface BgBuilderPayload {
  destination: string;      // 'hero_web' | 'banner' | 'app_bg' | 'section_bg' | 'card_bg'
  style: string;            // 'gradient_mesh' | 'abstract' | 'bokeh' | 'dark_premium' | 'glassmorphism' | 'aurora'
  colors: string[];
  complexity: number;       // 0-100
  safeZone: boolean;
  safeZonePosition: string; // 'center' | 'top' | 'bottom' | 'left' | 'right'
  format: string;
  mood: string;             // 'dark' | 'light' | 'vibrant' | 'muted'
  theme: string;            // niche/concept
  extraPrompt?: string;
  refImage?: string | null;
  refInstruction?: string;
  hasRefImage?: boolean;
  // Extended V3
  environment?: string;
  scenarioPhysics?: {
    surfaceTexture?: string;
    depthOfField?: string;
    architecturalStyle?: string;
    environmentalEffects?: string[];
  };
  visualStyles?: string[];
}

export function buildBgPrompt(data: BgBuilderPayload): string {
  const {
    destination, style, colors, complexity, safeZone, safeZonePosition,
    format, mood, theme, extraPrompt, hasRefImage, refInstruction,
    environment, scenarioPhysics, visualStyles
  } = data;

  const sections: string[] = [];

  // ═══ OVERRIDE ═══
  if (extraPrompt) {
    sections.push(`[CREATIVE OVERRIDE — MAXIMUM PRIORITY]\n${extraPrompt}\nAll instructions below are subordinate to this directive.`);
  }

  // ═══ 1. ROLE & MISSION ═══
  sections.push(
    `[UI/UX BACKGROUND ARCHITECT — SPECIALIST V4]` +
    `\nYou are a Senior Visual Designer at Apple's HIG team / Stripe's design studio / Linear's product team.` +
    `\nMission: Create a world-class digital BACKDROP designed specifically for UI overlay.` +
    `\nThis image will sit BEHIND text, buttons, cards, and navigation elements.` +
    `\nCRITICAL SCENE PHYSICS:` +
    `\n• LIGHTING: Implement ARCHITECTURAL LIGHTING with IES-profile accuracy. Motivated light sources only.` +
    `\n• ATMOSPHERE: Apply MIE SCATTERING and RAYLEIGH SCATTERING for realistic volumetric depth.` +
    `\n• MATERIALS: Use PBR (Physical Based Rendering) for glass (refraction), liquids (caustics), and metals (anisotropic).` +
    `\n• PROHIBITED: ZERO human figures, ZERO text, ZERO logos, ZERO recognizable distracting objects.`
  );

  // ═══ 2. DESTINATION & FORMAT ═══
  const destMap: Record<string, string> = {
    hero_web: 'Website Hero Section — the first thing visitors see. Full-bleed immersive. Must feel premium and load fast visually.',
    banner: 'Digital Banner / Ad Background — designed to frame content. Clean edges, gradient-safe for text overlay.',
    app_bg: 'App UI Background — dark-mode optimized, low visual noise, high performance feel.',
    section_bg: 'Website Section Divider — creates visual separation between content blocks.',
    card_bg: 'Card/Component Background — small-scale texture, works at 300-800px. Subtle depth.',
  };
  const fmtMap: Record<string, string> = {
    '16:9': 'Widescreen 16:9 — standard web hero / banner aspect ratio',
    '1:1': 'Square 1:1 — social media / feature section',
    '9:16': 'Vertical 9:16 — mobile-first full-screen',
    '21:9': 'Ultrawide 21:9 — cinematic desktop hero, dual-monitor support',
    '4:3': 'Classic 4:3 — presentation / documentation',
  };

  sections.push(
    `[CANVAS] ${fmtMap[format] || format}.` +
    `\nDestination: ${destMap[destination] || destination}.` +
    `\nTheme/Concept: ${theme || 'Premium Digital'}.` +
    `\nMood: ${mood}.`
  );

  // ═══ 3. BACKGROUND STYLE — DEEP SPECIALIZATION ═══
  const styleMap: Record<string, string> = {
    gradient_mesh:
      `GRADIENT MESH MASTERCLASS` +
      `\nCreate fluid, organic, flowing color transitions — like silk being poured.` +
      `\nMultiple gradient nodes with smooth interpolation between colors.` +
      `\nCritical: colors must BLEND, not just sit next to each other.` +
      `\nAdd subtle noise/grain (2-4%) for premium texture that prevents banding.` +
      `\nReference quality: Apple macOS wallpapers, Stripe.com hero, mesh gradient by Dennis Snellenberg.` +
      `\nThe transitions between colors should feel liquid, not linear. Use organic blob shapes as gradient containers.`,

    abstract:
      `ABSTRACT GEOMETRIC/ORGANIC MASTERPIECE` +
      `\nComplex layered composition with extreme depth — foreground shapes, midground gradients, background glow.` +
      `\nBlend between organic fluid forms and precise geometric elements.` +
      `\nLight interaction: volumetric rays passing through translucent shapes, caustic reflections.` +
      `\nMaterial variety: frosted glass panels, metallic spheres, soft glowing orbs, liquid chrome.` +
      `\nReference quality: Behance top-of-feed CGI art, Cinema4D + Octane Render aesthetic.`,

    bokeh:
      `CINEMATIC BOKEH DREAMSCAPE` +
      `\nCreate a field of out-of-focus light points — circular bokeh discs of varying sizes.` +
      `\nEach disc has: soft edge falloff, internal color gradient, subtle hexagonal aperture shape.` +
      `\nLayer bokeh at multiple depth levels: large close foreground, medium midground, tiny distant.` +
      `\nAtmospheric haze between layers creates depth. Gentle color shift from warm to cool across frame.` +
      `\nReference quality: portrait photography background, IMAX lens bokeh, anamorphic flare.`,

    dark_premium:
      `DARK STEALTH LUXURY` +
      `\nDeep true blacks (#020202 to #0a0a0a range) as the dominant tone.` +
      `\nSubtle matte textures visible only at certain angles — carbon fiber, volcanic sand, brushed dark metal.` +
      `\nMinimal light: a single soft light source creating barely-perceptible gradient across the surface.` +
      `\nMicro-texture: fine noise/grain that gives the darkness physical presence.` +
      `\nReference quality: Porsche configurator background, Vertu phone website, matte black product photography.`,

    glassmorphism:
      `GLASSMORPHISM DEPTH SYSTEM` +
      `\nCreate multiple LAYERED translucent panels floating in 3D space.` +
      `\nEach panel: frosted glass texture, realistic light refraction, soft inner shadow, 1px white border highlight.` +
      `\nBehind the glass: colorful gradient mesh visible but out-of-focus (gaussian blur).` +
      `\nLight behavior: edge-lit highlights on glass corners, subtle caustic patterns from refraction.` +
      `\nPanels at different depths create parallax effect. Apple visionOS / macOS Sonoma quality.` +
      `\nReference quality: Apple.com glassmorphic UI elements, iOS notification center blur.`,

    aurora:
      `ETHEREAL AURORA LIGHT FLOW` +
      `\nFlowing bands of light moving across a deep dark sky.` +
      `\nColors shift smoothly: cyan → emerald → violet → magenta in natural aurora patterns.` +
      `\nLight behavior: soft volumetric glow, light scattering through atmospheric particles.` +
      `\nStars visible in the darkest areas — tiny, sharp, natural distribution.` +
      `\nThe aurora should feel like it's MOVING — captured in a long exposure.` +
      `\nReference quality: National Geographic aurora photography, Scandinavian night sky.`,
  };

  sections.push(`[BACKGROUND STYLE]\n${styleMap[style] || style}`);

  // ═══ 4. COLOR PSYCHOLOGY & PALETTE ═══
  if (colors && colors.filter(Boolean).length > 0) {
    const validColors = colors.filter(Boolean);
    sections.push(
      `[COLOR SYSTEM — UI OPTIMIZED]` +
      `\nPrimary palette: ${validColors.join(', ')}.` +
      `\nColor application rules:` +
      `\n• Each color should occupy proportionally: 60% dominant / 30% secondary / 10% accent.` +
      `\n• Transitions between colors must be SMOOTH — no hard edges or abrupt changes.` +
      `\n• Dark areas must remain deep enough for white text overlay (WCAG AAA contrast).` +
      `\n• Bright areas should not exceed 70% luminance to avoid eye strain.` +
      `\n• Add color temperature variation: warm highlights, cool shadows (or vice versa) for depth.`
    );
  }

  // ═══ 5. COMPLEXITY & VISUAL DENSITY ═══
  let complexDesc = '';
  if (complexity < 20) {
    complexDesc = 'ULTRA-MINIMAL — almost monochromatic, single subtle gradient, vast negative space. Less is more.';
  } else if (complexity < 40) {
    complexDesc = 'CLEAN — 2-3 gradient nodes, one or two subtle shapes, restrained but sophisticated.';
  } else if (complexity < 60) {
    complexDesc = 'BALANCED — moderate visual activity, multiple gradient transitions, some geometric/organic elements.';
  } else if (complexity < 80) {
    complexDesc = 'RICH — complex layering, multiple shapes, atmospheric particles, detailed texture work.';
  } else {
    complexDesc = 'MAXIMALIST — dense visual tapestry, many elements, extreme detail, every zone has activity.';
  }
  sections.push(`[COMPLEXITY: ${complexity}/100] ${complexDesc}`);

  // ═══ 6. UI SAFE ZONE ═══
  if (safeZone) {
    const safeMap: Record<string, string> = {
      center: 'CENTER — the central 40% of the image must be visually quieter and lower contrast. Standardize luminance to 25-45% for perfect white text (WCAG AAA) readability.',
      top: 'TOP — the upper 30% should be darkened/subdued for navigation bars. Fade to deep neutral (L<20%).',
      bottom: 'BOTTOM — the lower 30% should be darkened/subdued for footer content. Fade to deep neutral (L<20%).',
      left: 'LEFT — the left 40% should be a "clean zone" for typography overlays. Constant luminance and low frequency textures.',
      right: 'RIGHT — the right 40% should be a "clean zone" for typography overlays. Constant luminance and low frequency textures.',
    };
    sections.push(
      `[UI SAFE ZONE — ${(safeZonePosition || 'center').toUpperCase()}]` +
      `\n${safeMap[safeZonePosition] || safeMap.center}` +
      `\nThis zone must be REFINED — ZERO high-frequency noise, ZERO sharp contrast shifts. ` +
      `\nGradually increase visual complexity OUTSIDE this zone.`
    );
  }

  // ═══ 7. ENVIRONMENT (if specified) ═══
  if (environment) {
    sections.push(
      `[ENVIRONMENTAL DIRECTION — LITERAL CINEMATIC SCENE]` +
      `\nRendering Directive: FULLY RENDER the following environment as a cinematic background: ${environment}.` +
      `\nThis is NOT abstract. Draw the actual location with photorealistic detail, atmospheric depth, and professional lighting.` +
      `\nEnsure surfaces show material accuracy (dust, moisture, reflections).`
    );
  } else {
    sections.push(
      `[ATMOSPHERIC FOCUS]` +
      `\nExtract the MOOD and FEEL of ${theme || 'Premium Digital'} into its atmospheric essence — lighting, color temperature, depth cues.` +
      `\nAbstract this into geometric or organic forms. Do NOT render literal objects.`
    );
  }

  // ═══ 8. SCENARIO PHYSICS ═══
  if (scenarioPhysics) {
    const phys: string[] = ['[PHYSICAL RENDERING]'];
    if (scenarioPhysics.surfaceTexture) phys.push(`Surface Material: ${scenarioPhysics.surfaceTexture} — render with photorealistic material accuracy, correct specular response.`);
    if (scenarioPhysics.depthOfField) phys.push(`Spatial Depth: ${scenarioPhysics.depthOfField}.`);
    if (scenarioPhysics.architecturalStyle) phys.push(`Architectural Language: ${scenarioPhysics.architecturalStyle} — abstract into geometric forms.`);
    if (scenarioPhysics.environmentalEffects?.length) phys.push(`Atmospheric Effects: ${scenarioPhysics.environmentalEffects.join(', ')}.`);
    sections.push(phys.join('\n'));
  }

  // ═══ 9. VISUAL STYLES ═══
  if (visualStyles && visualStyles.length > 0) {
    sections.push(`[STYLE KEYWORDS] ${visualStyles.join(', ')} — apply these aesthetic languages to the background composition.`);
  }

  // ═══ 10. REFERENCE ═══
  if (hasRefImage && refInstruction) {
    sections.push(`[STYLE REFERENCE DIRECTIVE] ${refInstruction}\nExtract: color palette, gradient flow, depth layers, atmospheric density from reference.`);
  } else if (hasRefImage) {
    sections.push(`[STYLE REFERENCE] Extract the visual DNA from the attached reference — color harmony, gradient style, depth technique, atmospheric quality. Apply to this background.`);
  }

  // ═══ 11. TECHNICAL & RENDER ═══
  sections.push(
    `[TECHNICAL RENDERING — OCTANE + REDSHIFT AESTHETIC]` +
    `\nResolution: 8K ultra-high definition. Zero compression artifacts.` +
    `\nColor: Wide gamut P3, balanced histogram, zero clipping in shadows.` +
    `\nPhysics: 100% ray-traced accuracy for all glossy/matte/refractive surfaces.` +
    `\nFinal feel: This should look like a $50,000 CGI set render from a top creative studio (e.g. Tendril, ManvsMachine).` +
    `\n\n--no people, human figures, faces, body parts, animals, text, letters, numbers, logos,` +
    ` symbols, recognizable objects, stock photo elements, flat solid colors, banding artifacts,` +
    ` harsh edges, visible grid lines, watermarks, signatures.`
  );

  return sections.join('\n\n');
}
