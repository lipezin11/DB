// src/app/api/validate-key/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { apiKey } = await req.json();

    if (!apiKey || apiKey.length < 8) {
      return NextResponse.json({ error: 'Chave muito curta' }, { status: 400 });
    }

    // Testa com um modelo de texto simples
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Responda apenas "OK" se esta chave funcionar.' }] }],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('[ValidateKey] Erro da API:', data);
      return NextResponse.json(
        { error: data.error?.message || 'Chave API inválida' },
        { status: 401 }
      );
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (text.includes('OK')) {
      return NextResponse.json({ ok: true });
    } else {
      return NextResponse.json({ error: 'Resposta inesperada' }, { status: 401 });
    }
  } catch (error: any) {
    console.error('[ValidateKey] Erro:', error.message);
    return NextResponse.json({ error: 'Erro ao validar chave' }, { status: 500 });
  }
}