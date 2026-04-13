import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyPlanning } from '@/db/schema';
import { auth } from '@/auth';
import { eq, and, gte, lte } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dateStr = req.nextUrl.searchParams.get('date');
  if (!dateStr) return NextResponse.json({ error: 'Date is required' }, { status: 400 });

  try {
    const targetDate = new Date(dateStr);
    const start = new Date(targetDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(targetDate);
    end.setHours(23, 59, 59, 999);

    const plans = await db.query.dailyPlanning.findMany({
      where: and(
        eq(dailyPlanning.userId, session.user.id as string),
        eq(dailyPlanning.isDone, true),
        gte(dailyPlanning.createdAt, start),
        lte(dailyPlanning.createdAt, end)
      ),
    });

    const combinedContent = plans.map(p => p.content).join('\n- ');
    const result = combinedContent ? `- ${combinedContent}` : '';

    return NextResponse.json({ draft: result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 });
  }
}
