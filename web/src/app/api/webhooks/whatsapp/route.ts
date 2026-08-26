import { NextRequest, NextResponse } from 'next/server';

/**
 * Fallback Next.js — utile si Meta / un proxy touche le front avant Express.
 * En prod Vercel (experimentalServices), /api est normalement servi par Express.
 */
export const dynamic = 'force-dynamic';

function expectedToken(): string {
  return (process.env.WHATSAPP_VERIFY_TOKEN || '').trim();
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode') ?? '';
  const token = (req.nextUrl.searchParams.get('hub.verify_token') ?? '').trim();
  const challenge = req.nextUrl.searchParams.get('hub.challenge') ?? '';
  const expected = expectedToken();

  if (!expected) {
    return new NextResponse('Verify token not configured', { status: 503 });
  }
  if (mode === 'subscribe' && token === expected && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST() {
  return NextResponse.json({ ok: true });
}
