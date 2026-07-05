import { NextResponse } from 'next/server';

import { backendFetch } from '../../../lib/backend-api';

export async function GET() {
  const result = await backendFetch('/api/user/websites');

  if (result.status === 401) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (!result.data) {
    return NextResponse.json(
      { error: result.error ?? 'Failed to fetch websites' },
      { status: result.status },
    );
  }

  return NextResponse.json(result.data);
}
