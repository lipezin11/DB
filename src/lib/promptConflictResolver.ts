/**
 * promptConflictResolver.ts
 * 
 * Detects and resolves contradictions between user inputs.
 * When conflicts are found, resolves them using priority order:
 * 1. Explicit user instructions (highest)
 * 2. Subject requirements
 * 3. Reference-derived values
 * 4. AI inference (lowest)
 */

export interface ConflictReport {
  conflicts: ConflictItem[];
  resolutions: string[];
}

export interface ConflictItem {
  type: string;
  description: string;
  resolution: string;
  fieldAffected: string;
}

export interface ResolverInput {
  // Environment
  environment: string;
  environmentSource: 'explicit' | 'inferred' | 'reference';

  // Lighting
  lightingAmbientColor: string;
  lightingRimColor: string;
  lightingFillColor: string;
  lightingSetup: string;
  lightingSource: 'explicit' | 'inferred' | 'reference';

  // Style
  sobriety: number; // 0-100
  styleAesthetic: string;

  // Composition
  subjectPosition: string;
  textPosition: string;
  hasText: boolean;

  // Background
  explicitBackground: string | null; // from reference parsing

  // Extra prompt
  extraPrompt: string;
  refInstruction: string;
}

function getColorBrightness(hex: string): number {
  // Convert hex to perceived brightness (0-255)
  const color = hex.replace('#', '');
  if (color.length !== 6) return 128; // unknown
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  // Perceived brightness formula
  return (r * 299 + g * 587 + b * 114) / 1000;
}

function isColorNeon(hex: string): boolean {
  const color = hex.replace('#', '');
  if (color.length !== 6) return false;
  const r = parseInt(color.substring(0, 2), 16);
  const g = parseInt(color.substring(2, 4), 16);
  const b = parseInt(color.substring(4, 6), 16);
  // Neon colors tend to have one very high channel and one or more low channels
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max > 200 && (max - min) > 150;
}

export function resolveConflicts(input: ResolverInput): ConflictReport {
  const conflicts: ConflictItem[] = [];
  const resolutions: string[] = [];

  // ── CONFLICT 1: Dark background with bright ambient lighting ──
  if (input.explicitBackground && input.explicitBackground.includes('black')) {
    const ambientBrightness = getColorBrightness(input.lightingAmbientColor);
    if (ambientBrightness > 150) {
      conflicts.push({
        type: 'background_vs_lighting',
        description: `User requested dark/black background but ambient light color (${input.lightingAmbientColor}) is bright`,
        resolution: 'Keeping black background as explicitly requested. Adjusting lighting description to use dark ambient with accent lighting for separation.',
        fieldAffected: 'lighting',
      });
      resolutions.push('Fundo preto mantido (explícito). Iluminação ajustada para preservar contraste com fundo escuro.');
    }
  }

  // ── CONFLICT 2: High sobriety with neon/creative lighting ──
  if (input.sobriety > 70) {
    const hasNeonLighting = isColorNeon(input.lightingRimColor) || isColorNeon(input.lightingFillColor);
    const isNeonStyle = /neon|cyberpunk|futurist/i.test(input.styleAesthetic || '');
    
    if (hasNeonLighting || isNeonStyle) {
      conflicts.push({
        type: 'sobriety_vs_creative_lighting',
        description: `High sobriety (${input.sobriety}) conflicts with neon/creative lighting choices`,
        resolution: 'Toning down neon intensity to refined accent lighting. Keeping professional aesthetic with subtle color accents.',
        fieldAffected: 'style',
      });
      resolutions.push('Sobriedade alta detectada com cores neon. Convertendo neon intenso em acentos cromáticos refinados.');
    }
  }

  // ── CONFLICT 3: Low sobriety with corporate/professional style ──
  if (input.sobriety < 30 && /corporate|professional|clean|minimal/i.test(input.styleAesthetic || '')) {
    conflicts.push({
      type: 'sobriety_vs_professional_style',
      description: 'Low sobriety (creative) conflicts with professional/corporate style',
      resolution: 'Interpreting as "creative professional" — keeping dynamic elements but with refined execution.',
      fieldAffected: 'style',
    });
    resolutions.push('Sobriedade criativa + estilo profissional = profissional criativo com execução refinada.');
  }

  // ── CONFLICT 4: Subject and text position overlap ──
  if (input.hasText && input.subjectPosition === input.textPosition) {
    conflicts.push({
      type: 'position_overlap',
      description: `Subject position (${input.subjectPosition}) overlaps with text position (${input.textPosition})`,
      resolution: 'Moving text to opposite side or adding depth separation with layering.',
      fieldAffected: 'composition',
    });
    
    // Auto-resolve: move text to opposite side
    const oppositeMap: Record<string, string> = {
      esquerda: 'direita',
      direita: 'esquerda',
      centro: 'esquerda', // if both center, move text to left
    };
    const newTextPos = oppositeMap[input.textPosition] || 'esquerda';
    resolutions.push(`Conflito de posição: sujeito e texto na mesma posição. Texto movido para "${newTextPos}".`);
  }

  // ── CONFLICT 5: Bright environment with dark/dramatic lighting mood ──
  if (input.environment && input.lightingSetup) {
    const envIsBright = /bright|white|clean|light|claro|branco/i.test(input.environment);
    const lightIsDark = /dramatic|dark|moody|shadow|escuro|dramatico/i.test(input.lightingSetup);
    
    if (envIsBright && lightIsDark && input.environmentSource !== 'explicit') {
      conflicts.push({
        type: 'environment_vs_lighting_mood',
        description: 'Bright environment conflicts with dramatic/dark lighting setup',
        resolution: 'Prioritizing lighting mood (higher creative impact). Adjusting environment to support dramatic lighting.',
        fieldAffected: 'environment',
      });
      resolutions.push('Ambiente claro conflita com iluminação dramática. Ajustando ambiente para suportar a atmosfera desejada.');
    }
  }

  // ── CONFLICT 6: Reference instructions vs explicit form values ──
  // When reference says one thing but form says another, explicit form wins
  if (input.explicitBackground && input.environmentSource === 'explicit') {
    // No conflict - explicit always wins, but note it
    resolutions.push('Campo de ambiente explícito detectado — terá prioridade sobre inferências.');
  }

  return { conflicts, resolutions };
}

/**
 * Generate a sobriety-adjusted style description
 */
export function getSobrietyStyle(sobriety: number, baseAesthetic: string): string {
  if (sobriety > 75) {
    return `${baseAesthetic}. Executive premium finish — clean lines, restrained color palette, corporate-grade polish, sophisticated minimalism.`;
  } else if (sobriety > 50) {
    return `${baseAesthetic}. Balanced professional-creative approach — modern advertising quality, refined yet visually engaging, polished execution.`;
  } else if (sobriety > 25) {
    return `${baseAesthetic}. Creative editorial style — bold visual choices, dynamic composition, artistic flair with commercial viability.`;
  } else {
    return `${baseAesthetic}. Maximum creative impact — experimental, avant-garde, rule-breaking visual language, high-contrast, bold artistic expression.`;
  }
}
