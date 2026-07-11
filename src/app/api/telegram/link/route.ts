import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const expiry = new Date(Date.now() + 5 * 60 * 1000);

  await db.update(users).set({
    verificationCode: code,
    verificationExpiry: expiry,
  }).where(eq(users.id, userId as any));

  const [user] = await db.select().from(users).where(eq(users.id, userId as any)).limit(1);

  return NextResponse.json({
    code,
    expiry: expiry.toISOString(),
    botUsername: process.env.TELEGRAM_BOT_USERNAME || 'KipappAIbot',
    isLinked: !!user?.telegramChatId,
    chatId: user?.telegramChatId || null,
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await db.update(users).set({ telegramChatId: null as any }).where(eq(users.id, session.user.id as any));

  return NextResponse.json({ success: true });
}
