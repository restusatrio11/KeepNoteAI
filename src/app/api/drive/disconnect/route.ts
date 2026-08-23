import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await db.update(userSettings)
    .set({
      driveRefreshToken: null,
      driveAccessToken: null,
      driveEmail: null,
      updatedAt: new Date(),
    })
    .where(eq(userSettings.userId, session.user.id));

  return NextResponse.json({ success: true });
}
