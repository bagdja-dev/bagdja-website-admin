import { NextResponse } from 'next/server';
import { clearSession } from '../../lib/session';

export async function GET() {
  await clearSession();
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_REDIRECT_URI ?? 'http://localhost:5004'));
}
