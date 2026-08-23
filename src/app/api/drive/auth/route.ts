import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getAuthUrl } from '@/lib/drive';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const state = crypto.randomBytes(16).toString('hex');

  let authUrl: string;
  try {
    authUrl = getAuthUrl(state);
  } catch {
    return NextResponse.redirect(new URL('/settings?drive=config', req.url));
  }

  const res = NextResponse.redirect(authUrl);
  res.cookies.set('drive_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
  });
  return res;
}
