/**
 * promptInference.ts
 * 
 * Smart defaults engine: when fields are empty/generic, this module
 * infers professional-grade values based on context clues from other fields.
 * 
 * Priority: Subject > Explicit User Input > Reference > Inference
 */

export interface InferenceContext {
  subjectMode: 'pessoa' | 'produto';
  subjectDescription: string;
  niche: string;
  environment: string;
  style: string;
  sobriety: number;
  extraPrompt: string;
  refInstruction: string;
  hasPhoto: boolean;
  hasRefImage: boolean;
  lightingAmbient: string;
  lightingRim: string;
  lightingFill: string;
  framing: string;
  floatingElements: string;
  gender: string;
  position: string;
}

export interface InferredFields {
  environment: string | null;
  lightingSetup: string | null;
  lightingMood: string | null;
  composition: string | null;
  styleAesthetic: string | null;
  cameraSetup: string | null;
  colorPalette: string | null;
  mood: string | null;
  reasons: string[];
}

// ──────────────────────────────────────────────
// Niche-based inference rules
// ──────────────────────────────────────────────

interface NicheProfile {
  keywords: string[];
  environment: string;
  lighting: string;
  lightingMood: string;
  composition: string;
  aesthetic: string;
  mood: string;
  camera: string;
  colors: string;
}

const NICHE_PROFILES: NicheProfile[] = [
  {
    keywords: ['fitness', 'gym', 'workout', 'atleta', 'esporte', 'sport', 'crossfit', 'musculação', 'bodybuilding'],
    environment: 'Industrial gym environment with dark concrete walls, dramatic mist, and spotlights cutting through haze',
    lighting: 'High-contrast dramatic side lighting with strong rim light defining muscle definition, volumetric light beams through atmospheric haze',
    lightingMood: 'powerful and dramatic',
    composition: 'Dynamic action-ready pose with strong diagonal lines conveying power and movement',
    aesthetic: 'Nike/Under Armour campaign aesthetic — raw, powerful, high-contrast sports advertising',
    mood: 'Powerful, determined, gritty, motivational, elite athlete energy',
    camera: 'Sony A1, 70-200mm f/2.8 telephoto at 135mm, high-speed capture, aggressive color grade',
    colors: 'Deep blacks, desaturated midtones, punchy accent colors on highlights',
  },
  {
    keywords: ['luxo', 'luxury', 'premium', 'elegante', 'elegant', 'sofisticado', 'sophisticated', 'haute', 'joalheria', 'jewelry'],
    environment: 'Minimalist dark studio with polished reflective surfaces and subtle golden accents',
    lighting: 'Soft butterfly lighting with delicate rim highlights, controlled specular reflections, subtle warm fill',
    lightingMood: 'opulent and refined',
    composition: 'Centered subject with generous negative space, symmetrical balance, clean lines',
    aesthetic: 'Cartier/Dior editorial — refined, opulent, understated luxury, fashion house quality',
    mood: 'Exclusive, aspirational, timeless elegance, quiet luxury',
    camera: 'Phase One IQ4 150MP, 120mm f/4 macro, focus stacking, pristine sharpness',
    colors: 'Deep blacks, warm golds, champagne tones, muted earth tones',
  },
  {
    keywords: ['tech', 'tecnologia', 'technology', 'saas', 'software', 'app', 'digital', 'startup', 'ai', 'ia'],
    environment: 'Clean futuristic environment with holographic UI elements and subtle tech textures',
    lighting: 'Clean soft light with cool blue accent tones and subtle neon edge lighting',
    lightingMood: 'innovative and clean',
    composition: 'Modern asymmetric layout with clean geometrical elements and tech-inspired framing',
    aesthetic: 'Apple/Google campaign — clean, minimal, futuristic, cutting-edge tech advertising',
    mood: 'Innovative, forward-thinking, clean, trustworthy, cutting-edge',
    camera: 'Canon R5, 50mm f/1.2, shallow DoF on subject with crisp interface elements',
    colors: 'Cool blues, clean whites, dark mode blacks, electric cyan accents',
  },
  {
    keywords: ['trader', 'finance', 'finança', 'investimento', 'investment', 'crypto', 'forex', 'mercado', 'market', 'bolsa', 'bitcoin', 'money', 'dinheiro'],
    environment: 'Sleek executive office with multiple trading monitors showing green charts, dark mahogany and glass surfaces',
    lighting: 'Dramatic cinematic lighting with monitor glow as ambient, strong key light creating authority shadows',
    lightingMood: 'authoritative and prosperous',
    composition: 'Power pose framing, slightly low-angle to convey authority, rule of thirds with space for financial graphics',
    aesthetic: 'Wall Street / Bloomberg campaign — sophisticated, powerful, money-in-motion aesthetic',
    mood: 'Confident, wealthy, authoritative, successful, elite',
    camera: 'Sony A7R V, 85mm f/1.4, cinematic color grading with teal-orange split toning',
    colors: 'Deep navy, emerald green, gold accents, dark charcoal',
  },
  {
    keywords: ['food', 'comida', 'gastronomia', 'restaurante', 'restaurant', 'chef', 'culinária', 'culinary', 'receita', 'recipe'],
    environment: 'Rustic-modern kitchen setting with warm wood countertops, fresh herbs, and steam rising from dishes',
    lighting: 'Warm golden-hour side lighting creating appetizing shadows on food textures, soft backlight through window',
    lightingMood: 'warm and appetizing',
    composition: 'Overhead flat-lay or 45-degree angle showcasing textures and garnishes, shallow depth of field',
    aesthetic: 'Bon Appétit / food editorial — sensory, warm, appetite-triggering, artisanal quality',
    mood: 'Warm, inviting, artisanal, fresh, sensory',
    camera: 'Canon R5, 100mm f/2.8 macro, warm white balance, food-grade color science',
    colors: 'Warm oranges, deep reds, fresh greens, cream whites, natural wood tones',
  },
  {
    keywords: ['moda', 'fashion', 'roupa', 'clothing', 'estilo', 'streetwear', 'urban', 'urbano'],
    environment: 'Urban street setting with graffiti walls, neon signs, and gritty textures or sleek fashion studio',
    lighting: 'Editorial fashion lighting — strong key with dramatic shadows, colored gels for mood, ring light for beauty',
    lightingMood: 'editorial and bold',
    composition: 'Full body or three-quarter shot showcasing the outfit, strong body language, editorial pose',
    aesthetic: 'Vogue/GQ editorial — high-fashion, trend-setting, editorial quality, runway-to-street',
    mood: 'Confident, trendy, edgy, aspirational, fashion-forward',
    camera: 'Hasselblad X2D, 90mm f/2.8, medium format quality, fashion-grade retouching',
    colors: 'Bold contrasting colors, monochrome palettes, or curated color blocking',
  },
  {
    keywords: ['saúde', 'health', 'wellness', 'bem-estar', 'wellbeing', 'yoga', 'meditação', 'meditation', 'spa', 'natural'],
    environment: 'Serene natural setting with soft morning light, lush greenery, or minimalist zen-inspired spa interior',
    lighting: 'Soft diffused natural light, gentle golden-hour warmth, minimal harsh shadows',
    lightingMood: 'calming and natural',
    composition: 'Balanced symmetrical framing with breathing room, calm poses, connection with nature',
    aesthetic: 'Goop/wellness brand — clean, organic, serene, aspirational health lifestyle',
    mood: 'Peaceful, balanced, rejuvenating, pure, mindful',
    camera: 'Sony A7C, 35mm f/1.8, natural tones, minimal post-processing',
    colors: 'Sage greens, soft whites, warm beiges, lavender, natural earth tones',
  },
  {
    keywords: ['nike', 'adidas', 'puma', 'reebok', 'new balance'],
    environment: 'Urban athletic environment — concrete walls, dramatic fog, stadium tunnel, or dynamic motion blur background',
    lighting: 'High-contrast dramatic rim lighting creating athletic silhouette, strong backlight with volumetric atmosphere',
    lightingMood: 'powerful and cinematic',
    composition: 'Dynamic action composition with diagonal lines, aggressive cropping, movement blur on edges',
    aesthetic: 'Nike "Just Do It" campaign — powerful, aspirational, raw athletic energy, broadcast-quality',
    mood: 'Determined, powerful, unstoppable, athletic excellence',
    camera: 'Red Komodo 6K, cinema lens 50mm T1.5, high-speed capture, broadcast color grade',
    colors: 'High contrast blacks, electric accent colors, desaturated skin tones with vivid brand colors',
  },
  {
    keywords: ['perfume', 'fragrance', 'fragrância', 'cosmético', 'cosmetic', 'beauty', 'beleza', 'skincare', 'makeup', 'maquiagem'],
    environment: 'Ultra-minimalist dark studio with glass reflections, liquid droplets, and ethereal smoke wisps',
    lighting: 'Soft sculpting light with precise specular highlights on glass/liquid surfaces, subtle rim separation',
    lightingMood: 'sensual and mysterious',
    composition: 'Central product hero shot with intimate close framing, reflective surface, floating particles',
    aesthetic: 'Chanel/Tom Ford campaign — sensual, mysterious, ultra-premium fragrance advertising',
    mood: 'Seductive, mysterious, luxurious, intimate, desire',
    camera: 'Phase One IQ4, 120mm macro with bellows, extreme detail, focus stacking',
    colors: 'Deep blacks, amber golds, rich burgundy, crystal reflections',
  },
];

// ──────────────────────────────────────────────
// Style keyword mapping
// ──────────────────────────────────────────────

const STYLE_KEYWORDS: Record<string, { aesthetic: string; mood: string; lighting: string }> = {
  cinematic: {
    aesthetic: 'Cinematic film still quality with anamorphic lens characteristics and Hollywood color grading',
    mood: 'Dramatic, narrative, emotionally charged',
    lighting: 'Cinematic 3-point lighting with motivated practical light sources and atmospheric haze',
  },
  editorial: {
    aesthetic: 'High-fashion editorial quality, magazine cover worthy, Harper\'s Bazaar aesthetic',
    mood: 'Sophisticated, refined, fashion-forward',
    lighting: 'Beauty dish key light with dramatic shadows, editorial fashion lighting setup',
  },
  minimal: {
    aesthetic: 'Ultra-clean minimalist design, Apple-inspired, vast negative space, less-is-more philosophy',
    mood: 'Clean, focused, modern, sophisticated simplicity',
    lighting: 'Even soft diffused lighting, almost shadowless, pristine clean illumination',
  },
  neon: {
    aesthetic: 'Cyberpunk neon-soaked aesthetic, Blade Runner inspired, futuristic urban nights',
    mood: 'Futuristic, edgy, electric, nocturnal energy',
    lighting: 'Vibrant neon color gels, cool and warm neon edge lighting, specular reflections on wet surfaces',
  },
  vintage: {
    aesthetic: 'Analog film aesthetic, warm grain, Kodak Portra 400 color science, retro charm',
    mood: 'Nostalgic, warm, timeless, analog warmth',
    lighting: 'Warm soft window light, golden hour tones, gentle lens flare',
  },
  dark: {
    aesthetic: 'Low-key dramatic dark aesthetic, chiaroscuro inspired, Caravaggio meets modern advertising',
    mood: 'Mysterious, powerful, dramatic, intense',
    lighting: 'Extreme contrast low-key lighting, single hard light source, deep blacks with selective illumination',
  },
};

// ──────────────────────────────────────────────
// Main inference function
// ──────────────────────────────────────────────

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // remove accents
    .trim();
}

function matchNiche(context: InferenceContext): NicheProfile | null {
  const searchText = normalizeText(
    `${context.niche} ${context.subjectDescription} ${context.extraPrompt} ${context.refInstruction} ${context.environment}`
  );

  // Score each profile by keyword matches
  let bestProfile: NicheProfile | null = null;
  let bestScore = 0;

  for (const profile of NICHE_PROFILES) {
    let score = 0;
    for (const keyword of profile.keywords) {
      if (searchText.includes(normalizeText(keyword))) {
        score += keyword.length; // longer keyword matches = more specific = higher score
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestProfile = profile;
    }
  }

  return bestScore > 0 ? bestProfile : null;
}

function matchStyle(context: InferenceContext): { aesthetic: string; mood: string; lighting: string } | null {
  const searchText = normalizeText(
    `${context.style} ${context.extraPrompt} ${context.refInstruction} ${context.niche}`
  );

  for (const [keyword, profile] of Object.entries(STYLE_KEYWORDS)) {
    if (searchText.includes(keyword)) {
      return profile;
    }
  }
  return null;
}

function isDefaultColor(color: string, defaultColor: string): boolean {
  return !color || color === defaultColor;
}

function isEmptyOrDefault(value: string | undefined | null): boolean {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  return v === '' || v === 'default' || v === 'padrão' || v === 'padrao';
}

export function inferMissingFields(context: InferenceContext): InferredFields {
  const result: InferredFields = {
    environment: null,
    lightingSetup: null,
    lightingMood: null,
    composition: null,
    styleAesthetic: null,
    cameraSetup: null,
    colorPalette: null,
    mood: null,
    reasons: [],
  };

  const nicheProfile = matchNiche(context);
  const styleProfile = matchStyle(context);

  // ── Environment inference ──
  if (isEmptyOrDefault(context.environment)) {
    if (nicheProfile) {
      result.environment = nicheProfile.environment;
      result.reasons.push(`Ambiente inferido do nicho detectado: "${context.niche || context.subjectDescription}"`);
    } else if (context.subjectMode === 'produto') {
      result.environment = 'Ultra-clean minimalist studio with subtle reflective surface and controlled professional lighting';
      result.reasons.push('Ambiente inferido: estúdio minimalista para fotografia de produto');
    } else {
      result.environment = 'Professional photography studio with controlled lighting and clean backdrop';
      result.reasons.push('Ambiente inferido: estúdio profissional (padrão)');
    }
  }

  // ── Lighting inference ──
  const isDefaultLighting = 
    isDefaultColor(context.lightingAmbient, '#1e1b4b') &&
    isDefaultColor(context.lightingRim, '#a3e635') &&
    isDefaultColor(context.lightingFill, '#8b5cf6');

  if (isDefaultLighting) {
    if (nicheProfile) {
      result.lightingSetup = nicheProfile.lighting;
      result.lightingMood = nicheProfile.lightingMood;
      result.reasons.push(`Iluminação inferida do nicho: ${nicheProfile.lightingMood}`);
    } else if (styleProfile) {
      result.lightingSetup = styleProfile.lighting;
      result.lightingMood = 'professional';
      result.reasons.push(`Iluminação inferida do estilo: ${context.style}`);
    } else if (context.sobriety > 66) {
      result.lightingSetup = 'Clean professional studio lighting, soft even illumination with gentle shadows';
      result.lightingMood = 'professional and clean';
      result.reasons.push('Iluminação inferida: profissional clean (sobriedade alta)');
    } else if (context.sobriety < 33) {
      result.lightingSetup = 'Creative dramatic lighting with colored gels and strong contrast';
      result.lightingMood = 'creative and dramatic';
      result.reasons.push('Iluminação inferida: dramática criativa (sobriedade baixa)');
    }
  }

  // ── Style aesthetic inference ──
  if (nicheProfile) {
    result.styleAesthetic = nicheProfile.aesthetic;
    result.reasons.push(`Estética inferida do nicho detectado`);
  }
  if (styleProfile) {
    // Style keyword takes precedence for aesthetic
    result.styleAesthetic = styleProfile.aesthetic;
    result.mood = styleProfile.mood;
    result.reasons.push(`Estética refinada pelo estilo: "${context.style}"`);
  }

  // ── Composition inference ──
  if (nicheProfile && isEmptyOrDefault(context.framing)) {
    result.composition = nicheProfile.composition;
    result.reasons.push('Composição inferida do nicho');
  }

  // ── Camera setup inference ──
  if (nicheProfile) {
    result.cameraSetup = nicheProfile.camera;
  } else if (context.subjectMode === 'produto') {
    result.cameraSetup = 'Phase One IQ4 150MP, 120mm macro lens, f/8 for maximum sharpness, focus stacking';
  } else {
    result.cameraSetup = 'Sony A7R V, 85mm f/1.4 GM lens, shallow depth of field with creamy bokeh';
  }

  // ── Color palette inference ──
  if (nicheProfile) {
    result.colorPalette = nicheProfile.colors;
    result.reasons.push('Paleta de cores inferida do nicho');
  }

  // ── Mood inference ──
  if (nicheProfile && !result.mood) {
    result.mood = nicheProfile.mood;
  }

  return result;
}

/**
 * Parse free-text reference instructions and extract structured aspects.
 * Handles both PT-BR and EN descriptions.
 */
export function parseReferenceInstruction(refInstruction: string): {
  wantsBackground: boolean;
  wantsLighting: boolean;
  wantsColors: boolean;
  wantsComposition: boolean;
  wantsStyle: boolean;
  wantsElements: boolean;
  extractedBackground: string | null;
  extractedLighting: string | null;
  extractedStyle: string | null;
} {
  const text = normalizeText(refInstruction);

  const result = {
    wantsBackground: false,
    wantsLighting: false,
    wantsColors: false,
    wantsComposition: false,
    wantsStyle: false,
    wantsElements: false,
    extractedBackground: null as string | null,
    extractedLighting: null as string | null,
    extractedStyle: null as string | null,
  };

  // Detect what aspects the user wants from the reference
  if (/fundo|cenario|background|scene/.test(text)) result.wantsBackground = true;
  if (/ilumina|luz|light|glow|neon|bright|dark/.test(text)) result.wantsLighting = true;
  if (/cor|color|paleta|palette|tons|tones/.test(text)) result.wantsColors = true;
  if (/composi|layout|enquadra|framing|angulo|angle/.test(text)) result.wantsComposition = true;
  if (/estilo|style|visual|estetica|aesthetic/.test(text)) result.wantsStyle = true;
  if (/elemento|element|flutuante|floating|objeto|object/.test(text)) result.wantsElements = true;

  // Extract specific background descriptions
  const bgMatch = refInstruction.match(/fundo\s+(preto|branco|escuro|claro|azul|vermelho|verde|cinza|negro|dark|black|white)/i);
  if (bgMatch) {
    const colorMap: Record<string, string> = {
      preto: 'pure solid black',
      negro: 'pure solid black',
      black: 'pure solid black',
      dark: 'very dark',
      escuro: 'very dark',
      branco: 'pure solid white',
      white: 'pure solid white',
      claro: 'bright and light',
      azul: 'deep blue',
      vermelho: 'deep red',
      verde: 'deep green',
      cinza: 'neutral gray',
    };
    result.extractedBackground = colorMap[bgMatch[1].toLowerCase()] || bgMatch[1];
    result.wantsBackground = true;
  }

  // Extract lighting descriptions
  const lightMatch = refInstruction.match(/luz\s+(dramatica|suave|neon|natural|quente|fria|lateral|dramatic|soft|warm|cold)/i);
  if (lightMatch) {
    const lightMap: Record<string, string> = {
      dramatica: 'high-contrast dramatic lighting with deep shadows',
      dramatic: 'high-contrast dramatic lighting with deep shadows',
      suave: 'soft diffused lighting with gentle shadows',
      soft: 'soft diffused lighting with gentle shadows',
      neon: 'vibrant neon edge lighting with color spill',
      natural: 'natural daylight with organic shadows',
      quente: 'warm golden lighting',
      warm: 'warm golden lighting',
      fria: 'cool blue-toned lighting',
      cold: 'cool blue-toned lighting',
      lateral: 'dramatic side lighting with strong key light',
    };
    result.extractedLighting = lightMap[normalizeText(lightMatch[1])] || lightMatch[1];
    result.wantsLighting = true;
  }

  // Extract style references (brand names, aesthetic descriptors)
  const styleMatch = refInstruction.match(/(nike|adidas|apple|chanel|dior|vogue|editorial|cinematic|vintage|neon|cyberpunk|minimalista|minimal)/i);
  if (styleMatch) {
    result.extractedStyle = styleMatch[1];
    result.wantsStyle = true;
  }

  return result;
}
