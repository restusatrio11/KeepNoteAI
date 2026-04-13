import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyPlanning } from '@/db/schema';
import { auth } from '@/auth';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    
    const result = await db.update(dailyPlanning)
      .set({
        isDone: data.isDone !== undefined ? data.isDone : undefined,
        content: data.content || undefined,
        color: data.color || undefined,
        reminderTime: data.reminderTime ? new Date(data.reminderTime) : undefined,
      })
      .where(and(eq(dailyPlanning.id, id), eq(dailyPlanning.userId, session.user.id as string)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Planning not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update planning' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await db.delete(dailyPlanning)
      .where(and(eq(dailyPlanning.id, id), eq(dailyPlanning.userId, session.user.id as string)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Planning not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Planning deleted successfully' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to delete planning' }, { status: 500 });
  }
}
