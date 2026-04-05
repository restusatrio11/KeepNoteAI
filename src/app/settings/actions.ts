'use server';

import { db } from '@/db';
import { userSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';

export async function saveSettings(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const rawDriveLink = formData.get('driveLink') as string;
  let folderId = rawDriveLink;

  // Extract ID from URL if it's a link
  const match = rawDriveLink.match(/folders\/([a-zA-Z0-9-_]+)/);
  if (match) {
    folderId = match[1];
  }

  const userId = session.user.id;

  const existing = await db.select().from(userSettings).where(eq(userSettings.userId, userId)).limit(1);

  if (existing.length > 0) {
    await db.update(userSettings)
      .set({ driveFolderId: folderId, updatedAt: new Date() })
      .where(eq(userSettings.userId, userId));
  } else {
    await db.insert(userSettings).values({
      userId,
      driveFolderId: folderId,
    });
  }

  revalidatePath('/settings');
  return { success: true, folderId };
}

export async function getSettings() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [settings] = await db.select().from(userSettings).where(eq(userSettings.userId, session.user.id)).limit(1);
  return settings || null;
}
