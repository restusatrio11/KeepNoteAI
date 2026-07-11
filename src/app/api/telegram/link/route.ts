import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const LINK_SECRET = process.env.TELEGRAM_LINK_SECRET || process.env.AUTH_SECRET || 'default-secret';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = session.user.id;
  const ts = Date.now().toString();
  const payload = `${userId}:${ts}`;
  const hmac = crypto.createHmac('sha256', LINK_SECRET).update(payload).digest('hex').substring(0, 10);
  const param = Buffer.from(`${payload}:${hmac}`).toString('base64url');
  const botUser = process.env.TELEGRAM_BOT_USERNAME || 'your_bot';
  const link = `https://t.me/${botUser}?start=${param}`;

  // Check if already linked
  const [user] = await db.select().from(users).where(eq(users.id, userId as any)).limit(1);

  return NextResponse.json({
    link,
    botUsername: botUser,
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
