import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notulen } from '@/db/schema';
import { auth } from '@/auth';
import { eq, and } from 'drizzle-orm';
import { NotulenSchema } from '@/lib/validations';
import { z } from 'zod';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const [data] = await db
      .select()
      .from(notulen)
      .where(and(eq(notulen.id, id), eq(notulen.userId, session.user.id)))
      .limit(1);

    if (!data) {
      return NextResponse.json({ error: 'Notulen not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch notulen' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    
    const result = await db.delete(notulen)
      .where(and(eq(notulen.id, id), eq(notulen.userId, session.user.id)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Notulen not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE ERROR]:', error);
    return NextResponse.json({ error: 'Failed to delete notulen' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    
    // Validate input (allow partial updates)
    const validatedData = NotulenSchema.partial().parse(body);

    const result = await db.update(notulen)
      .set(validatedData)
      .where(and(eq(notulen.id, id), eq(notulen.userId, session.user.id)))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Notulen not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('[PATCH ERROR]:', error);
    return NextResponse.json({ error: 'Failed to update notulen' }, { status: 500 });
  }
}
