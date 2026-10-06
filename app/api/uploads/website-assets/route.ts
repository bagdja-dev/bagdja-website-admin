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
  const websiteId = incoming.get('website_id');
  if (!file || !(file instanceof Blob) || typeof websiteId !== 'string' || !websiteId) {
    return NextResponse.json({ error: 'File and website_id are required' }, { status: 400 });
  }

  const outgoing = new FormData();
  outgoing.append('file', file, file instanceof File ? file.name : 'asset');
  outgoing.append('name', String(incoming.get('name') ?? ''));
  outgoing.append('is_public', String(incoming.get('is_public') ?? 'false'));
  outgoing.append('description', String(incoming.get('description') ?? ''));
  outgoing.append('asset_type', String(incoming.get('asset_type') ?? 'downloadable'));

  try {
    const response = await fetch(`${API_BASE}/api/websites/${encodeURIComponent(websiteId)}/assets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: outgoing,
    });
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
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 502 },
    );
  }
}

export async function PATCH(request: NextRequest) {
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
  const websiteId = incoming.get('website_id');
  const assetId = incoming.get('asset_id');
  if (!file || !(file instanceof Blob) || typeof websiteId !== 'string' || typeof assetId !== 'string') {
    return NextResponse.json({ error: 'File, website_id, and asset_id are required' }, { status: 400 });
  }

  const outgoing = new FormData();
  outgoing.append('file', file, file instanceof File ? file.name : 'asset');
  try {
    const response = await fetch(
      `${API_BASE}/api/websites/${encodeURIComponent(websiteId)}/assets/${encodeURIComponent(assetId)}/file`,
      { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: outgoing },
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
      { error: error instanceof Error ? error.message : 'Asset replacement failed' },
      { status: 502 },
    );
  }
}