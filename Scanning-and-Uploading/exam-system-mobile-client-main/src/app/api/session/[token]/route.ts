import { NextResponse } from 'next/server';

const BACKEND_API_URL =
  process.env.BACKEND_API_URL || 'http://localhost:5000';

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const token = decodeURIComponent(params.token || '');

  if (!token) {
    return NextResponse.json(
      { error: 'Missing scan session token' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `${BACKEND_API_URL}/api/scan/sessions/${encodeURIComponent(token)}`,
      {
        method: 'GET',
        cache: 'no-store',
      }
    );

    const payload = await response.json().catch(() => ({}));

    return NextResponse.json(payload, {
      status: response.status,
    });
  } catch (error) {
    console.error('[api/session] Failed to validate scan session:', error);
    return NextResponse.json(
      { error: 'Could not reach the scan session service' },
      { status: 502 }
    );
  }
}
