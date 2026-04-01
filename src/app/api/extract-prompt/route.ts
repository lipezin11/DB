// src/app/api/extract-prompt/route.ts
import { NextResponse } from 'next/server';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Specialized Experimental Nexus Array (Ordered by reliability)
const VISION_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.1-flash-image-preview',
  'gemini-1.5-flash-latest', 
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

async function callNeuralMotor(model: string, body: any, apiKey: string) {
  const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Neural connection failed.');
  return data;
}

export async function POST(req: Request) {
  try {
    const { images, mode = 'design' } = await req.json();
    const apiKey = req.headers.get('x-api-key') || process.env.GOOGLE_AI_KEY;

    if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    if (!images || !Array.isArray(images) || images.length === 0)
      return NextResponse.json({ error: 'Missing images array' }, { status: 400 });

    const imageParts = images.map(img => {
      const match = img.match(/^data:([^;]+);base64,(.+)$/);
      return { inline_data: { mime_type: match?.[1] || 'image/jpeg', data: match?.[2] || img } };
    });

    const expertTraining: Record<string, string> = {
      art: `EXTRACTOR EXPERT: CREATIVES & ADS. Analyze hierarchy, CTA, color psychology.`,
      bg: `EXTRACTOR EXPERT: SCENARIO & ENVIRONMENTS. 100% textures, NO PEOPLE.`,
      ref: `EXTRACTOR EXPERT: NEURAL FUSION. Fused aesthetic DNA merge.`,
      design: `EXTRACTOR EXPERT: GENERAL DESIGN.`
    };

    const analysisPrompt = `${expertTraining[mode] || expertTraining.design}\n\nTask: Extract visual DNA for master prompt.`;

    // SMART NEURAL FALLBACK & RELIABILITY LOOP
    let analysis = '';
    let lastErr = '';

    for (const model of VISION_MODELS) {
      try {
        console.log(`[Nexus] Attempting DNA Extraction with ${model}...`);
        const data = await callNeuralMotor(model, {
           contents: [{ role: 'user', parts: [...imageParts, { text: analysisPrompt }] }],
           generationConfig: { temperature: 0.1 }
        }, apiKey);
        
        analysis = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (analysis) break;
      } catch (err: any) {
        lastErr = err.message;
        console.warn(`[Nexus] Model ${model} failed/overloaded. Jumping to next...`);
        // If it's a 400 (Bad Request), it might be model not found, keep trying others.
        // If it's 503 (Overloaded), definitely try others.
      }
    }

    if (!analysis) throw new Error(`Neural Nexus Overload: ${lastErr}. Tente novamente em instantes.`);

    // STEP 2: FORGING MASTER PROMPT (Using the same successful model pipeline logic)
    const promptRequest = `Convert this DNA analysis into a surgical image prompt starting with "[" and ending with "]".\n\nANALYSIS:\n${analysis}`;
    
    // We try to use the same models for text generation for the final prompt forge
    let finalPrompt = '';
    for (const model of VISION_MODELS) {
      try {
        const data = await callNeuralMotor(model, {
          contents: [{ role: 'user', parts: [{ text: promptRequest }] }],
          generationConfig: { 
            temperature: 0.1,
            responseMimeType: "application/json",
            responseSchema: {
               type: "OBJECT",
               properties: { extractedPrompt: { type: "STRING" } },
               required: ["extractedPrompt"]
            }
          }
        }, apiKey);
        
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          finalPrompt = JSON.parse(text).extractedPrompt;
          break;
        }
      } catch (err) {}
    }

    if (!finalPrompt) throw new Error('Cérebro falhou na forja final do DNA.');

    return NextResponse.json({ prompt: finalPrompt.trim() });

  } catch (error: any) {
    console.error('Extraction Fatality:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '50mb' } } };
