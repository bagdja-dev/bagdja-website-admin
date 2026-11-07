import { NextRequest, NextResponse } from 'next/server';

import { toStudioPath } from '@/studio/lib/notification-route';

/** URL dashboard lama dialihkan ke halaman Studio yang setara. */
export function middleware(request: NextRequest) {
  const legacyPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const studioPath = toStudioPath(legacyPath);
  return NextResponse.redirect(new URL(studioPath, request.url));
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
