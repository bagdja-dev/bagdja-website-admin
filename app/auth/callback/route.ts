import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { setSession } from '../../lib/session';

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? 'http://localhost:4001';
const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID ?? 'website-builder-admin';
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET ?? '';
const REDIRECT_URI =
  process.env.NEXT_PUBLIC_REDIRECT_URI ?? 'http://localhost:5004/auth/callback';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/?error=auth_denied', request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/?error=missing_params', request.url));
  }

  const jar = await cookies();
  const savedState = jar.get('oauth_state')?.value;
  const codeVerifier = jar.get('oauth_code_verifier')?.value;

  if (state !== savedState) {
    return NextResponse.redirect(new URL('/?error=state_mismatch', request.url));
  }

  if (!codeVerifier) {
    return NextResponse.redirect(new URL('/?error=missing_verifier', request.url));
  }

  try {
    const tokenRes = await fetch(`${AUTH_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('Token exchange failed:', errBody);
      return NextResponse.redirect(new URL('/?error=token_failed', request.url));
    }

    const data = await tokenRes.json();
    const accessToken: string = data.access_token;

    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64').toString(),
    );

    await setSession(accessToken, {
      userId: payload.sub ?? payload.userId,
      email: payload.email,
      username: payload.username,
    });

    jar.delete('oauth_code_verifier');
    jar.delete('oauth_state');

    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (err) {
    console.error('OAuth callback error:', err);
    return NextResponse.redirect(new URL('/?error=server_error', request.url));
  }
}
