// src/app/api/refine/route.ts — NanoBanana API
import { NextResponse } from 'next/server';

const NB_BASE = 'https://api.nanobananaapi.ai/api/v1';

async function pollTask(taskId: string, apiKey: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 4000));
    const res = await fetch(
      `${NB_BASE}/nanobanana/record-info?taskId=${encodeURIComponent(taskId)}`,
      { headers: { 'Authorization': `Bearer ${apiKey}` } }
    );
    const json = await res.json();
    const flag = json?.data?.successFlag;
    console.log(`[Refine Poll] ${i + 1}: flag=${flag}`);
    if (flag === 2 || flag === 3) throw new Error(`Refine failed: ${json?.data?.errorMessage}`);
    if (flag === 1) {
      const url = json?.data?.response?.resultImageUrl || json?.data?.response?.originImageUrl;
      if (url) return url;
    }
  }
  throw new Error('Refine timed out');
}

export async function POST(req: Request) {
  try {
    const { originalPrompt, instructions } = await req.json();
    const apiKey = req.headers.get('x-api-key') || process.env.IMAGE_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 });

    const refinedPrompt = `${originalPrompt.slice(0, 2400)} ${instructions}`.slice(0, 2800);
    console.log('[Refine] Instructions:', instructions);

    const res = await fetch(`${NB_BASE}/nanobanana/generate`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: refinedPrompt,
        numImages: 1,
        type: 'TEXTTOIAMGE',
        image_size: '1:1',
        callBackUrl: 'https://design-builder.vercel.app/api/callback',
      }),
    });

    if (!res.ok) throw new Error(`Refine failed: ${res.status} — ${await res.text()}`);
    const taskId = (await res.json())?.data?.taskId;
    if (!taskId) throw new Error('No task ID');

    const imageUrl = await pollTask(taskId, apiKey);
    return NextResponse.json({ id: Math.random().toString(36).slice(2), url: imageUrl, prompt: refinedPrompt });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}