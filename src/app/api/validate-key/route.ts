// src/app/api/validate-key/route.ts — valida Google AI Studio key
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json();
    if (!apiKey || apiKey.length < 8) {
      return NextResponse.json({ error: 'Invalid key format' }, { status: 400 });
    }

    const safeKey = apiKey.trim().replace(/[^\x20-\x7E]/g, '');

    // Testa com uma chamada leve ao Gemini — lista de modelos
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${safeKey}&pageSize=1`,
      { method: 'GET' }
    );

    const text = await res.text();
    console.log('[ValidateKey] Status:', res.status, text.slice(0, 150));

    if (res.status === 400 || res.status === 403) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    if (res.status === 401) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    return NextResponse.json({ ok: true, provider: 'Google AI Studio' });

  } catch (error: any) {
    // Se der erro de rede, aceita mesmo assim
    return NextResponse.json({ ok: true });
  }
}
