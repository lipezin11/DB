/**
 * promptEngine.ts
 *
 * Main orchestrator for the Advanced Prompt Engineering System.
 * Replaces naive concatenation with a 3-phase intelligent pipeline:
 *
 * Phase 1: INTERPRET — transform raw form inputs into structured semantics
 * Phase 2: RESOLVE & INFER — detect conflicts, fill missing fields
 * Phase 3: ASSEMBLE — build cinema-grade prompt with professional structure
 *
 * Priority order: Subject > Explicit instructions > Reference > Inference
 */

import {
  inferMissingFields,
  parseReferenceInstruction,
  type InferenceContext,
} from './promptInference';

import {
  resolveConflicts,
  getSobrietyStyle,
  type ResolverInput,
} from './promptConflictResolver';

import { getRelevantPattern } from './ragSystem';

// ──────────────────────────────────────────
// Types
// ──────────────────────────────────────────

export interface InterpretedBrief {
  subject: {
    description: string;
    identity_notes: string;
    priority: 'highest';
    mode: 'pessoa' | 'produto';
    count: string;
    gender: string;
    position: string;
    hasPhoto: boolean;
  };
  environment: {
    description: string;
    source: 'explicit' | 'inferred' | 'reference';
  };
  lighting: {
    setup: string;
    mood: string;
    ambientColor: string;
    rimColor: string;
    fillColor: string;
    source: 'explicit' | 'inferred' | 'reference';
  };
  style: {
    aesthetic: string;
    mood: string;
    sobriety: number;
    source: 'explicit' | 'reference' | 'inferred';
    typographyPath: string | null;
  };
  composition: {
    framing: string;
    position: string;
    dynamic_elements: string;
    textLayout: string | null;
    aspect_ratio: string;
  };
  quality: {
    camera: string;
    detail_level: string;
    dimensions: string;
  };
  user_instructions: string[];
  reference_analysis: {
    hasRefImage: boolean;
    aspects: string[];
    extractedValues: Record<string, string>;
  };
  missing_fields_filled: string[];
}

export interface PromptEngineResult {
  interpretation: InterpretedBrief;
  prompt: string;
  decisions: string[];
}

// ──────────────────────────────────────────
// Phase 1: INTERPRET
// ──────────────────────────────────────────

function interpretInputs(data: any): InterpretedBrief {
  const subject = data.subject || {};
  const text = data.text || {};
  const context = data.context || {};
  const lighting = data.lighting || {};
  const composition = data.composition || {};
  const style = data.style || {};
  const dimensions = data.dimensions || '16:9';
  const hasText = data.hasText !== false;

  const isProduto = subject.subjectMode === 'produto';
  const hasPhoto = !!subject.photo;
  const hasRefImage = Array.isArray(style.styleRefImages) ? style.styleRefImages.length > 0 : !!style.refImage;
  const refImages = Array.isArray(style.styleRefImages) ? style.styleRefImages : (style.refImage ? [style.refImage] : []);

  // ── Subject interpretation ──
  const genderMap: Record<string, string> = {
    male: 'handsome man',
    female: 'beautiful woman',
  };
  const genderDesc = genderMap[subject.gender] || 'person';

  let subjectDescription: string;
  let identityNotes: string;

  if (isProduto) {
    subjectDescription = subject.description
      ? `Premium product: ${subject.description}`
      : 'A luxury product';
    identityNotes = hasPhoto
      ? 'Preserve the EXACT product appearance, branding, colors, shape, and details from the provided photo. The product must be identical to the reference.'
      : 'Render with highest-quality product photography standards.';
  } else {
    // Identity vs Clothing distinction
    const clothDesc = subject.description || 'formal elegant attire';
    
    subjectDescription = subject.description
      ? `${subject.count || '1'} ${genderDesc}, wearing ${clothDesc}`
      : `${subject.count || '1'} ${genderDesc}`;
      
    identityNotes = hasPhoto
      ? `CRITICAL IDENTITY LOCK: Reproduce the EXACT facial features, skin tone, hair texture, and body type of the person in the reference photo. 
         STYLING OVERRIDE: Regardless of what the person in the reference photo is wearing, transform their outfit into: ${clothDesc}. 
         The face must be a 100% clone, but the clothing must be updated to match the description above.`
      : 'Generate a photorealistic person with natural features.';
  }

  // ── Framing interpretation ──
  const framingMap: Record<string, string> = {
    'Close-up': 'close-up portrait showing face and shoulders with intimate framing',
    'Medium': 'medium shot from waist up showing torso and face',
    'Plano Americano': 'american shot (cowboy shot) from knees up showing full body language',
  };
  const framing = framingMap[composition.framing] || 'medium shot from waist up';

  // ── Position interpretation ──
  const positionMap: Record<string, string> = {
    esquerda: 'left third of the frame',
    centro: 'dead center of the frame',
    direita: 'right third of the frame',
  };
  const subjectPos = positionMap[subject.position] || 'right third of the frame';

  // ── Reference analysis ──
  const refAnalysis = {
    hasRefImage: hasRefImage,
    aspects: [] as string[],
    extractedValues: {} as Record<string, string>,
  };

  if (style.refInstruction) {
    const parsed = parseReferenceInstruction(style.refInstruction);
    if (parsed.wantsBackground) refAnalysis.aspects.push('background');
    if (parsed.wantsLighting) refAnalysis.aspects.push('lighting');
    if (parsed.wantsColors) refAnalysis.aspects.push('colors');
    if (parsed.wantsComposition) refAnalysis.aspects.push('composition');
    if (parsed.wantsStyle) refAnalysis.aspects.push('style');
    if (parsed.wantsElements) refAnalysis.aspects.push('elements');
    if (parsed.extractedBackground) refAnalysis.extractedValues['background'] = parsed.extractedBackground;
    if (parsed.extractedLighting) refAnalysis.extractedValues['lighting'] = parsed.extractedLighting;
    if (parsed.extractedStyle) refAnalysis.extractedValues['style'] = parsed.extractedStyle;
  }

  // ── Environment interpretation ──
  let envDescription = context.environment || '';
  let envSource: 'explicit' | 'inferred' | 'reference' = envDescription ? 'explicit' : 'inferred';

  // If reference mentions background, it affects environment
  if (refAnalysis.extractedValues['background'] && !envDescription) {
    envDescription = `${refAnalysis.extractedValues['background']} background`;
    envSource = 'reference';
  }

  // ── Lighting interpretation ──
  const isDefaultLighting =
    (!lighting.ambient || lighting.ambient === '#1e1b4b') &&
    (!lighting.rim || lighting.rim === '#a3e635') &&
    (!lighting.fill || lighting.fill === '#8b5cf6');

  let lightSetup = '';
  let lightMood = '';
  let lightSource: 'explicit' | 'inferred' | 'reference' = 'inferred';

  if (!isDefaultLighting) {
    lightSetup = `Custom 3-point lighting: ambient mood ${lighting.ambient}, rim highlight ${lighting.rim}, fill ${lighting.fill}`;
    lightMood = 'custom user-defined';
    lightSource = 'explicit';
  }

  if (refAnalysis.extractedValues['lighting'] && isDefaultLighting) {
    lightSetup = refAnalysis.extractedValues['lighting'];
    lightSource = 'reference';
  }

  // ── Text layout ──
  const textPos = positionMap[text.position] || null;
  let textLayout: string | null = null;
  if (hasText && (text.headline || text.subheadline || text.cta)) {
    textLayout = `Position the typography primarily in the ${textPos || 'left third of the frame'}`;
  }

  // ── User instructions collection ──
  const userInstructions: string[] = [];
  if (style.extraPrompt) userInstructions.push(style.extraPrompt);
  if (style.blur) userInstructions.push('Apply cinematic depth-of-field with gaussian bokeh on the background');
  if (style.gradient) userInstructions.push(`Apply ${style.gradientColor || 'black'} to transparent gradient from bottom edge, covering 30% of frame`);

  return {
    subject: {
      description: subjectDescription,
      identity_notes: identityNotes,
      priority: 'highest',
      mode: isProduto ? 'produto' : 'pessoa',
      count: subject.count || '1',
      gender: subject.gender || 'male',
      position: subjectPos,
      hasPhoto: hasPhoto,
    },
    environment: {
      description: envDescription,
      source: envSource,
    },
    lighting: {
      setup: lightSetup,
      mood: lightMood,
      ambientColor: lighting.ambient || '#1e1b4b',
      rimColor: lighting.rim || '#a3e635',
      fillColor: lighting.fill || '#8b5cf6',
      source: lightSource,
    },
    style: {
      aesthetic: '',
      mood: '',
      sobriety: style.sobriety ?? 50,
      source: 'inferred',
      typographyPath: style.typographyRefImage || null,
    },
    composition: {
      framing,
      position: subjectPos,
      dynamic_elements: composition.floatingElements || '',
      textLayout,
      aspect_ratio: dimensions,
    },
    quality: {
      camera: '',
      detail_level: 'Ultra high quality, 8K detail, no artifacts, no text distortion',
      dimensions,
    },
    user_instructions: userInstructions,
    reference_analysis: refAnalysis,
    missing_fields_filled: [],
  };
}

// ──────────────────────────────────────────
// Phase 2: RESOLVE & INFER
// ──────────────────────────────────────────

function resolveAndInfer(brief: InterpretedBrief, data: any): { brief: InterpretedBrief; decisions: string[] } {
  const decisions: string[] = [];
  const subject = data.subject || {};
  const context = data.context || {};
  const style = data.style || {};

  // ── Step 1: Infer missing fields ──
  const inferenceContext: InferenceContext = {
    subjectMode: brief.subject.mode,
    subjectDescription: subject.description || '',
    niche: context.niche || '',
    environment: brief.environment.description,
    style: style.core || '',
    sobriety: brief.style.sobriety,
    extraPrompt: style.extraPrompt || '',
    refInstruction: style.refInstruction || '',
    hasPhoto: brief.subject.hasPhoto,
    hasRefImage: brief.reference_analysis.hasRefImage,
    lightingAmbient: brief.lighting.ambientColor,
    lightingRim: brief.lighting.rimColor,
    lightingFill: brief.lighting.fillColor,
    framing: data.composition?.framing || '',
    floatingElements: brief.composition.dynamic_elements,
    gender: brief.subject.gender,
    position: subject.position || '',
  };

  const inferred = inferMissingFields(inferenceContext);

  // Apply inferred values ONLY where fields are empty/default
  if (inferred.environment && brief.environment.source !== 'explicit' && brief.environment.source !== 'reference') {
    brief.environment.description = inferred.environment;
    brief.environment.source = 'inferred';
    brief.missing_fields_filled.push('environment');
  }

  if (inferred.lightingSetup && brief.lighting.source !== 'explicit' && brief.lighting.source !== 'reference') {
    brief.lighting.setup = inferred.lightingSetup;
    brief.lighting.mood = inferred.lightingMood || 'professional';
    brief.lighting.source = 'inferred';
    brief.missing_fields_filled.push('lighting');
  }

  if (inferred.styleAesthetic) {
    brief.style.aesthetic = inferred.styleAesthetic;
    brief.style.source = brief.reference_analysis.hasRefImage ? 'reference' : 'inferred';
    brief.missing_fields_filled.push('style_aesthetic');
  }

  if (inferred.mood) {
    brief.style.mood = inferred.mood;
  }

  if (inferred.cameraSetup) {
    brief.quality.camera = inferred.cameraSetup;
    brief.missing_fields_filled.push('camera');
  }

  if (inferred.composition && !brief.composition.framing) {
    brief.composition.framing = inferred.composition;
    brief.missing_fields_filled.push('composition');
  }

  // Apply sobriety adjustment to style
  if (brief.style.aesthetic) {
    brief.style.aesthetic = getSobrietyStyle(brief.style.sobriety, brief.style.aesthetic);
  }

  // Merge inference reasons into decisions
  decisions.push(...inferred.reasons);

  // ── Step 2: Resolve conflicts ──
  const resolverInput: ResolverInput = {
    environment: brief.environment.description,
    environmentSource: brief.environment.source,
    lightingAmbientColor: brief.lighting.ambientColor,
    lightingRimColor: brief.lighting.rimColor,
    lightingFillColor: brief.lighting.fillColor,
    lightingSetup: brief.lighting.setup,
    lightingSource: brief.lighting.source,
    sobriety: brief.style.sobriety,
    styleAesthetic: brief.style.aesthetic,
    subjectPosition: data.subject?.position || 'direita',
    textPosition: data.text?.position || 'esquerda',
    hasText: data.hasText !== false,
    explicitBackground: brief.reference_analysis.extractedValues['background'] || null,
    extraPrompt: style.extraPrompt || '',
    refInstruction: style.refInstruction || '',
  };

  const conflictReport = resolveConflicts(resolverInput);

  if (conflictReport.conflicts.length > 0) {
    decisions.push(`⚠️ ${conflictReport.conflicts.length} conflito(s) detectado(s) e resolvido(s):`);
    decisions.push(...conflictReport.resolutions);
  }

  return { brief, decisions };
}

// ──────────────────────────────────────────
// Phase 3: ASSEMBLE
// ──────────────────────────────────────────

function assemblePrompt(brief: InterpretedBrief, data: any): string {
  const text = data.text || {};
  const hasText = data.hasText !== false;
  const isProduto = brief.subject.mode === 'produto';
  const style = data.style || {};
  const appType = data.appType || 'design'; // 'design', 'art', 'bg', 'ref'

  let promptBody = '';

  // ── APP TYPE: BACKGROUND BUILDER ──
  if (appType === 'bg') {
    promptBody += `[AGENT: CINEMATIC SET DESIGNER] PROJECT: ${brief.environment.description}. NO HUMANS. NO PERSONS. NO BIOLOGICAL ENTITIES. `;
    promptBody += `Create a world-class architectural or textural background specifically designed for advertising hero sections. `;
    promptBody += `Lighting: ${brief.lighting.setup}. Moody and deep with ${brief.lighting.ambientColor} ambient. `;
    promptBody += `Space Architecture: Pristine clean negative space for UI overlays. Masterpiece textures. `;
    if (data.extraPrompt) promptBody += `\n[MANDATORY COMMAND OVERRIDE]: ${data.extraPrompt}\n`;
    return promptBody + ` 8k resolution, razor-sharp focus, cinematic volume, premium minimal set design.`;
  }

  // ── APP TYPE: REFERENCE BUILDER ──
  if (appType === 'ref') {
    promptBody += `[AGENT: MASTER DESIGN SYNTHESIZER] GOAL: MERGE AND EVOLVE ALL ATTACHED STYLE REFERENCES. `;
    promptBody += `Do NOT create a grid. Create a SINGLE, COHERENT, BOLD composition that synthesizes the lighting, color DNA, and structural geometry of all provided reference images. `;
    promptBody += `The scene is: ${brief.subject.description || brief.environment.description}. `;
    promptBody += `Maintain the precise lighting mood (${brief.lighting.setup}) and the aesthetic direction: ${brief.style.aesthetic}. `;
    promptBody += `Create an ultra-high-end visual that looks like the definitive evolution of the provided concepts. `;
    if (data.extraPrompt) promptBody += `\n[MANDATORY COMMAND OVERRIDE]: ${data.extraPrompt}\n`;
    return promptBody + ` Masterpiece synthesis, 8k, flawless depth, photorealistic material DNA, elite advertising quality.`;
  }

  // ── APP TYPE: ART BUILDER (Social Media & High-Conversion Ad) ──
  if (appType === 'art') {
    promptBody += `[AGENT: ADVERTISING MASTERMIND] MISSION: FORGE A HIGH-CONVERSION CREATIVE ASSET. `;
    promptBody += `Tone: Manipulative, punchy, aggressive commercial aesthetic designed to stop the scroll. `;
    
    if (isProduto) {
      promptBody += `The EXACT product from the reference, rendered with heroic lighting, positioned in the ${brief.composition.position}. `;
    } else {
      promptBody += `The EXACT person from the reference, displays an intense, magnetizing, and authoritative gaze, positioned in the ${brief.composition.position}. `;
    }
    
    promptBody += `The background is ${brief.environment.description}, optimized with aggressive negative space for high-impact headlines. `;
    promptBody += `Creative Intention: ${data.context?.creativeIntention || 'Maximum viral engagement'}. `;
    promptBody += `Lighting: ${brief.lighting.setup}. Glossy, high-contrast, premium finish. `;
    
    if (brief.composition.dynamic_elements) {
      promptBody += `Explosive floating elements (${brief.composition.dynamic_elements}) bursting around the subject to create extreme 3D depth. `;
    }

    if (hasText && text.headline) {
      promptBody += `TYPOGRAPHY: Perfectly rendered bold advertising text reading "${text.headline}${text.subheadline ? ' | ' + text.subheadline : ''}". Ultra-legible. `;
    }

    if (data.extraPrompt) promptBody += `\n[MANDATORY COMMAND OVERRIDE]: ${data.extraPrompt}\n`;

    return promptBody + ` 8k, master-tier advertising agency quality, cinematic grading, peak sharpness, zero AI artifacts.`;
  }

  // ── APP TYPE: DESIGN BUILDER (Default Generic Pipeline) ──
  // 1. Subject & Position
  if (isProduto) {
    promptBody += `The EXACT product from the primary reference image, perfectly preserved in branding and shape, ${brief.subject.description}, positioned in the ${brief.composition.position}. `;
  } else {
    // Enhanced emotional reaction logic: tie it to common actions
    const reactionStyle = brief.subject.description.toLowerCase().includes('punch') || brief.subject.description.toLowerCase().includes('action')
      ? 'intense feral aggression, veins popping, absolute focus'
      : 'striking professional model expression, high-fashion intensity, magnetic gaze';
      
    promptBody += `The EXACT person from the primary reference image, preserving their facial identity, skin tone, hair texture, and physical structure, but TRANSFORMING their appearance to match: ${brief.subject.description}, displaying a ${reactionStyle}, positioned in the ${brief.composition.position}. `;
  }

  // 2. Background & Dynamic Elements
  const bgDetail = brief.style.sobriety > 66 
    ? `The world is ${brief.environment.description}, rendered with pristine architectural clarity, sharp lines, and professional studio-grade atmosphere. `
    : `The world is ${brief.environment.description}, rich with atmospheric depth, volumetric lighting, cinematic haze, and immersive environmental textures. `;
    
  promptBody += bgDetail;
  
  if (brief.composition.dynamic_elements) {
    promptBody += `Scattered dynamically in the scene are ${brief.composition.dynamic_elements}, adding depth, energy, and localized 3D volume. `;
  }

  // 3. Aspect Ratio & Dimensions (NATURAL LANGUAGE)
  const arTag = brief.composition.aspect_ratio || '9:16';
  promptBody += `Masterpiece shot in ${arTag === '16:9' ? 'cinematic widescreen 16:9 aspect ratio' : 'portrait 9:16 aspect ratio'}. `;

  // 4. Typography Integration
  if (hasText && text.headline) {
    const fullText = text.subheadline ? `${text.headline} | ${text.subheadline}` : text.headline;
    promptBody += `Overlayed and integrated diegetically in the ${brief.composition.textLayout} are bold, premium typography elements. They MUST clearly and fully display the exact text content: "${fullText}". The characters should have realistic lighting and shadows cast seamlessly onto the scene. `;
  }

  // 5. Style Reference Extraction Fusion
  if (brief.reference_analysis.hasRefImage && data.style?.extractedVisionPrompt) {
    promptBody += `The lighting, mood, color grading, and environmental aesthetics strictly follow this specific visual blueprint: ${data.style.extractedVisionPrompt.replace(/\[|\]/g, '')}. `;
  } else {
    promptBody += `Contemporary, ${brief.style.aesthetic || 'cinematic'} style, with a strong, premium visual narrative, evoking a ${brief.style.mood || 'epic'} mood. `;
  }

  if (style.refInstruction) {
    promptBody += `CRITICAL STYLING COMMAND: ${style.refInstruction}. `;
  }

  // 6. Lighting Details
  if (brief.lighting.source === 'explicit') {
    promptBody += `Dramatic high-contrast lighting with an intense ambient ${brief.lighting.ambientColor} glow. A striking ${brief.lighting.rimColor} rim light physically wraps around the edges of the subject, naturally blending them into the scene, while a ${brief.lighting.fillColor} fill light illuminates the front. `;
  } else {
    promptBody += `${brief.lighting.setup}, with realistic light bouncing off the background onto the subject to ensure perfect environmental integration. `;
  }

  // 7. Camera, Blending & Tech Specs
  const cameraSpecs = brief.style.sobriety > 66
    ? `Photographed with a Phase One IQ4 150MP Digital Back, 80mm f/8 lens for maximum edge-to-edge sharpness and zero distortion. Studio-grade focus. `
    : `Photographed with a Sony A1, 85mm f/1.2 G-Master lens, creating a buttery smooth cinematic bokeh and organic filmic texture. Dynamic perspective. `;

  promptBody += `${cameraSpecs} ${brief.composition.framing}, high-impact professional commercial photography. `;
  
  if (style.gradient) {
     promptBody += `A highly cinematic ${style.gradientColor} gradient haze seamlessly blends the subject and background, enveloping the lower frame in thick atmospheric volume. `;
  }

  // 7b. Typography Reference Fusion (New)
  if (data.style?.extractedTypographyPrompt) {
    promptBody += `TYPOGRAPHY AESTHETIC: The font choice, weight, and integration of the text MUST follow this visual blueprint: ${data.style.extractedTypographyPrompt.replace(/\\[|\\]/g, '')}. `;
  }

  promptBody += `Master-level precision with ultra-fine resolution on every single pixel. Micro-textures such as skin pores, hair follicles, and high-end fabric weaves are rendered with maximum clarity. Perfectly coherent 3D volumetric lighting wrap on the subject with zero artifacts. Absolutely no copy-paste or artificial filtering look; everything feels beautifully grounded and organically fused in Super-Resolution definition. Professional color grade, razor-sharp focus, master-tier high-impact high-resolution commercial photography masterpiece.`;

  if (brief.user_instructions.length > 0) {
    promptBody += ` SPECIAL INSTRUCTIONS: ${brief.user_instructions.join(', ')}.`;
  }

  // 8. Suffix (NATURAL LANGUAGE)
  promptBody += ` This is a professional masterpiece with no distortions, no artifacts, and perfect anatomy. Master-tier commercial imagery.`;

  return promptBody;
}

// ──────────────────────────────────────────
// Main exported function
// ──────────────────────────────────────────

export function generateProfessionalPrompt(data: any): PromptEngineResult {
  // Phase 1: Interpret raw inputs
  const interpretation = interpretInputs(data);

  // Phase 2: Resolve conflicts and infer missing fields
  const { brief: resolvedBrief, decisions } = resolveAndInfer(interpretation, data);

  // Phase 3: Assemble the final prompt
  const prompt = assemblePrompt(resolvedBrief, data);

  return {
    interpretation: resolvedBrief,
    prompt,
    decisions,
  };
}
