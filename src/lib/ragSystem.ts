import fs from 'fs';
import path from 'path';

export interface DesignPattern {
  id: string;
  name: string;
  description: string;
  prompt_injection: string;
}

interface PatternContext {
  niche: string;
  sobriety: number;
  lightingMood: string;
  isProduto: boolean;
}

function loadPatterns(category: string): DesignPattern[] {
  try {
    const filePath = path.join(process.cwd(), 'src/lib/designPatterns', `${category}.json`);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    return data.patterns || [];
  } catch (error) {
    console.error(`Failed to read pattern category ${category}:`, error);
    return [];
  }
}

/**
 * Context-aware pattern selection.
 * Instead of random selection, picks patterns that best match
 * the current creative context (niche, sobriety, lighting mood, etc).
 */
export function getRelevantPattern(
  category: string,
  context: PatternContext
): DesignPattern | null {
  const patterns = loadPatterns(category);
  if (patterns.length === 0) return null;

  // Score each pattern based on context relevance
  const scored = patterns.map(pattern => {
    let score = 0;
    const pid = pattern.id.toLowerCase();
    const pDesc = (pattern.description + ' ' + pattern.prompt_injection).toLowerCase();

    // ── Composition scoring ──
    if (category === 'composition_patterns') {
      if (context.isProduto && pid.includes('close')) score += 3;
      if (!context.isProduto && pid.includes('medium')) score += 2;
      if (context.isProduto && pDesc.includes('product')) score += 3;
      if (context.sobriety > 66 && pDesc.includes('clean')) score += 2;
      if (context.sobriety < 33 && pDesc.includes('dynamic')) score += 2;
    }

    // ── Lighting scoring ──
    if (category === 'lighting_patterns') {
      if (context.lightingMood.includes('dramatic') && pid.includes('cinematic')) score += 3;
      if (context.lightingMood.includes('clean') && pid.includes('studio')) score += 3;
      if (context.lightingMood.includes('neon') && pid.includes('neon')) score += 3;
      if (context.sobriety > 66 && pid.includes('studio')) score += 2;
      if (context.sobriety < 33 && (pid.includes('neon') || pid.includes('cinematic'))) score += 2;
    }

    // ── Advertising style scoring ──
    if (category === 'advertising_styles') {
      if (context.isProduto && pDesc.includes('commercial')) score += 2;
      if (!context.isProduto && pDesc.includes('social')) score += 1;
      if (context.sobriety > 66 && pDesc.includes('premium')) score += 2;
      if (context.sobriety > 66 && pDesc.includes('sophisticated')) score += 2;
    }

    // Niche relevance boost
    if (context.niche) {
      const nicheNorm = context.niche.toLowerCase();
      if (pDesc.includes(nicheNorm)) score += 5;
    }

    return { pattern, score };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Return the best match, or first pattern if no context matches
  return scored[0].pattern;
}

// Keep backward compatibility
export function getRandomPattern(category: string): DesignPattern | null {
  const patterns = loadPatterns(category);
  if (patterns.length === 0) return null;
  return patterns[Math.floor(Math.random() * patterns.length)];
}

export function enhanceBriefWithPatterns(baseBrief: string, contextNiche: string): string {
  const context: PatternContext = {
    niche: contextNiche,
    sobriety: 50,
    lightingMood: 'professional',
    isProduto: false,
  };

  const compPattern = getRelevantPattern('composition_patterns', context);
  const lightPattern = getRelevantPattern('lighting_patterns', context);
  const colorPattern = getRelevantPattern('color_palettes', context);
  const stylePattern = getRelevantPattern('advertising_styles', context);
  const safeAreaPattern = getRelevantPattern('text_safe_areas', context);

  return `
${baseBrief}

--- RAG DESIGN INTELLIGENCE ENHANCEMENTS ---
(Extracted from Reference Library for ${contextNiche} marketing design)

COMPOSITION PATTERN APPLIED:
${compPattern?.prompt_injection || 'Balanced composition layout.'}

LIGHTING PATTERN APPLIED:
${lightPattern?.prompt_injection || 'Professional studio lighting.'}

COLOR PATTERN APPLIED:
${colorPattern?.prompt_injection || 'Cohesive brand color scheme.'}

ADVERTISING STYLE APPLIED:
${stylePattern?.prompt_injection || 'Premium commercial aesthetic.'}

TEXT SAFE AREA STRATEGY:
${safeAreaPattern?.prompt_injection || 'Clean negative space for typography overlay.'}
`;
}
