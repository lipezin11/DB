import fs from 'fs';
import path from 'path';

export interface DesignPattern {
  id: string;
  name: string;
  description: string;
  prompt_injection: string;
}

export function getRandomPattern(category: string): DesignPattern | null {
  try {
    const filePath = path.join(process.cwd(), 'src/lib/designPatterns', `${category}.json`);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent);
    
    if (data.patterns && data.patterns.length > 0) {
      const randomIndex = Math.floor(Math.random() * data.patterns.length);
      return data.patterns[randomIndex];
    }
  } catch (error) {
    console.error(`Failed to read pattern category ${category}:`, error);
  }
  return null;
}

export function enhanceBriefWithPatterns(baseBrief: string, contextNiche: string): string {
  // Simulate the RAG behavior by extracting relevant patterns based on the context/needs.
  // In a full RAG system, this would search for semantic similarity to the prompt.
  // Here we use the local library to inject professional patterns.

  const compPattern = getRandomPattern('composition_patterns');
  const lightPattern = getRandomPattern('lighting_patterns');
  const colorPattern = getRandomPattern('color_palettes');
  const stylePattern = getRandomPattern('advertising_styles');
  const safeAreaPattern = getRandomPattern('text_safe_areas');

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
