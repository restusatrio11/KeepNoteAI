import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyPlanning } from '@/db/schema';
import { auth } from '@/auth';
import { desc, eq, and, gte, lte } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dateStr = req.nextUrl.searchParams.get('date');

  try {
    let whereClause;
    if (dateStr) {
      whereClause = and(
        eq(dailyPlanning.userId, session.user.id as string),
        eq(dailyPlanning.tanggal, dateStr)
      );
    } else {
      whereClause = eq(dailyPlanning.userId, session.user.id as string);
    }

    const data = await db.query.dailyPlanning.findMany({
      where: whereClause,
      orderBy: [desc(dailyPlanning.createdAt)],
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch planning' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    if (!data.content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const result = await db.insert(dailyPlanning).values({
      userId: session.user.id as string,
      tanggal: data.tanggal, // Store local date from client
      content: data.content,
      color: data.color || 'yellow',
      reminderTime: data.reminderTime ? new Date(data.reminderTime) : null,
      isDone: false,
    }).returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create planning' }, { status: 500 });
  }
}
