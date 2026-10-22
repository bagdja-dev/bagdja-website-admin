import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '../../../../lib/session';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5003';

export async function POST(
  request: NextRequest,
  context: { params: { websiteId: string } },
) {
  const { token } = await getSession();
  if (!token) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = incoming.get('file');
  const alias = incoming.get('alias');
  const storePassword = incoming.get('storePassword');
  const keyPassword = incoming.get('keyPassword');
  if (
    !(file instanceof File) ||
    typeof alias !== 'string' ||
    typeof storePassword !== 'string' ||
    typeof keyPassword !== 'string'
  ) {
    return NextResponse.json(
      { error: 'Keystore file, alias, and both passwords are required' },
      { status: 400 },
    );
  }

  const outgoing = new FormData();
  outgoing.append('file', file, file.name);
  outgoing.append('alias', alias);
  outgoing.append('storePassword', storePassword);
  outgoing.append('keyPassword', keyPassword);

  try {
    const response = await fetch(
      `${API_BASE}/api/websites/${encodeURIComponent(context.params.websiteId)}/android-app/keystore`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: outgoing,
        cache: 'no-store',
      },
    );
    const raw = await response.text();
    let data: unknown;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = { error: raw || response.statusText };
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Keystore upload failed' },
      { status: 502 },
    );
  }
}
