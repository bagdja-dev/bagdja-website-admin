import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '../../../../../lib/session';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5003';

async function proxyApiResponse(response: Response) {
  const raw = await response.text();
  let data: unknown;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { error: raw || response.statusText };
  }
  return NextResponse.json(data, { status: response.status });
}

export async function POST(
  request: NextRequest,
  context: { params: { websiteId: string; assetType: string } },
) {
  const { token } = await getSession();
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  let incoming: FormData;
  try {
    incoming = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }
  const file = incoming.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Android image file is required' }, { status: 400 });
  }
  const outgoing = new FormData();
  outgoing.append('file', file, file.name);

  try {
    const response = await fetch(
      `${API_BASE}/api/websites/${encodeURIComponent(context.params.websiteId)}/android-app/assets/${encodeURIComponent(context.params.assetType)}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: outgoing,
        cache: 'no-store',
      },
    );
    return proxyApiResponse(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Android image upload failed' },
      { status: 502 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: { websiteId: string; assetType: string } },
) {
  const { token } = await getSession();
  if (!token) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const response = await fetch(
      `${API_BASE}/api/websites/${encodeURIComponent(context.params.websiteId)}/android-app/assets/${encodeURIComponent(context.params.assetType)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      },
    );
    return proxyApiResponse(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Android image removal failed' },
      { status: 502 },
    );
  }
}
