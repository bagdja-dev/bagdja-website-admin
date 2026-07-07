import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '../../../lib/session';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5003';

export async function POST(request: NextRequest) {
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
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'File logo wajib diunggah' }, { status: 400 });
  }

  const outgoing = new FormData();
  const filename = file instanceof File ? file.name : 'logo.png';
  outgoing.append('file', file, filename);

  const websiteId = incoming.get('website_id');
  if (websiteId && typeof websiteId === 'string') {
    outgoing.append('website_id', websiteId);
  }

  try {
    const res = await fetch(`${API_BASE}/api/uploads/logo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: outgoing,
    });

    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { error: text || res.statusText };
    }

    if (!res.ok) {
      const err = data as { message?: string; error?: string };
      return NextResponse.json(
        { error: err.message ?? err.error ?? 'Upload failed' },
        { status: res.status },
      );
    }

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    );
  }
}
