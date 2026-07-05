import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  buildAuthorizeUrl,
} from '../../lib/auth';

export async function GET() {
  const codeVerifier = generateCodeVerifier();
  const state = generateState();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const jar = await cookies();
  jar.set('oauth_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 min
  });
  jar.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });

  const authorizeUrl = buildAuthorizeUrl(state, codeChallenge);
  return NextResponse.redirect(authorizeUrl);
}
