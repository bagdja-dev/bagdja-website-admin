import { NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5003';

export async function GET() {
  try {
    const response = await fetch(`${API_BASE}/api/subscriptions/plans`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return NextResponse.json(
        { message: text || 'Failed to fetch subscription plans' },
        { status: response.status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Upstream unreachable';
    return NextResponse.json({ message }, { status: 502 });
  }
}
