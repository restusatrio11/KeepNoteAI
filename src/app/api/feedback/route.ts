import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { feedback } from '@/db/schema';
import { auth } from '@/auth';
import { desc } from 'drizzle-orm';
import { z } from 'zod';

export async function GET() {
  try {
    const rows = await db
      .select({
        id: feedback.id,
        name: feedback.name,
        comment: feedback.comment,
        rating: feedback.rating,
        createdAt: feedback.createdAt,
      })
      .from(feedback)
      .orderBy(desc(feedback.createdAt))
      .limit(50);
    return NextResponse.json({ feedback: rows });
  } catch (error) {
    console.error('Get feedback error:', error);
    return NextResponse.json({ feedback: [] });
  }
}

const FeedbackSchema = z.object({
  comment: z.string().min(1, 'Komentar wajib diisi').max(1000),
  rating: z.number().int().min(1).max(5),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Login diperlukan untuk memberi feedback.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { comment, rating } = FeedbackSchema.parse(body);

    await db.insert(feedback).values({
      userId: session.user.id as string,
      name: session.user.name || 'Pengguna',
      comment,
      rating,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    console.error('Post feedback error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan feedback.' }, { status: 500 });
  }
}
