import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import {
  exchangeCode,
  getUserEmail,
  getDriveClientFromTokens,
  createFolder,
} from '@/lib/drive';
import { encryptSecret } from '@/lib/portal/crypto';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/settings?drive=error', req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const cookieState = req.cookies.get('drive_oauth_state')?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL('/settings?drive=error', req.url));
  }

  try {
    const tokens = await exchangeCode(code);
    const accessToken = tokens.access_token ? encryptSecret(tokens.access_token) : null;
    const refreshToken = tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null;
    const email = tokens.access_token ? await getUserEmail(tokens.access_token) : '';

    let folderId: string | null = null;
    if (refreshToken && tokens.access_token) {
      const drive = await getDriveClientFromTokens(tokens.access_token, tokens.refresh_token);
      folderId = await createFolder('KeepNoteAI', drive);
    }

    await db.insert(userSettings)
      .values({
        userId: session.user.id,
        driveRefreshToken: refreshToken,
        driveAccessToken: accessToken,
        driveEmail: email,
        driveFolderId: folderId,
      })
      .onConflictDoUpdate({
        target: userSettings.userId,
        set: {
          driveRefreshToken: refreshToken,
          driveAccessToken: accessToken,
          driveEmail: email,
          driveFolderId: folderId,
          updatedAt: new Date(),
        },
      });

    const res = NextResponse.redirect(new URL('/settings?drive=connected', req.url));
    res.cookies.delete('drive_oauth_state');
    return res;
  } catch (e) {
    console.error('Drive callback error:', e);
    return NextResponse.redirect(new URL('/settings?drive=error', req.url));
  }
}
