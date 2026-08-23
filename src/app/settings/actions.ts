'use server';

import { db } from '@/db';
import { userSettings, portalCredentials, masterRencana } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { encryptSecret, decryptSecret } from '@/lib/portal/crypto';
import { portalRequest, buildPortalHeaders } from '@/lib/portal/http';

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
  if (!settings) return null;
  return {
    driveFolderId: settings.driveFolderId,
    driveEmail: settings.driveEmail || null,
    driveConnected: !!settings.driveRefreshToken,
  };
}

export async function savePortalCredentials(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const portalUrl = (formData.get('portalUrl') as string)?.trim() || '';
  const cookie = (formData.get('portalCookie') as string)?.trim() || '';
  const xAuth = (formData.get('portalXAuth') as string)?.trim() || '';
  const skpid = (formData.get('portalSkpid') as string)?.trim() || '';

  if (!portalUrl) throw new Error('URL portal wajib diisi');
  if (!cookie) throw new Error('Cookie sesi wajib diisi');
  if (!xAuth) throw new Error('Token X-Auth (JWT) wajib diisi');

  try {
    new URL(portalUrl);
  } catch {
    throw new Error('URL portal tidak valid');
  }

  const userId = session.user.id;
  const cookieEnc = encryptSecret(cookie);
  const xAuthEnc = encryptSecret(xAuth);

  const existing = await db.select().from(portalCredentials).where(eq(portalCredentials.userId, userId)).limit(1);

  if (existing.length > 0) {
    await db.update(portalCredentials)
      .set({ portalUrl, cookieEnc, xAuthEnc, skpid: skpid || null, updatedAt: new Date() })
      .where(eq(portalCredentials.userId, userId));
  } else {
    await db.insert(portalCredentials).values({ userId, portalUrl, cookieEnc, xAuthEnc, skpid: skpid || null });
  }

  revalidatePath('/settings');
  return { success: true };
}

export async function getPortalCredentials() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const [row] = await db.select().from(portalCredentials).where(eq(portalCredentials.userId, session.user.id)).limit(1);
  if (!row) return null;
  return {
    portalUrl: row.portalUrl || '',
    skpid: row.skpid || '',
    hasCookie: true,
    hasXAuth: true,
    updatedAt: row.updatedAt,
  };
}

export async function getPortalRencanaList() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const [row] = await db.select().from(portalCredentials).where(eq(portalCredentials.userId, session.user.id)).limit(1);
  if (!row || !row.cookieEnc || !row.xAuthEnc) throw new Error('Kredensial portal belum diisi (simpan Cookie & X-Auth dulu)');
  if (!row.skpid) throw new Error('SKP ID belum diisi di pengaturan portal');

  const cookie = decryptSecret(row.cookieEnc);
  const xAuth = decryptSecret(row.xAuthEnc);
  if (!cookie || !xAuth) throw new Error('Cookie atau X-Auth kosong — simpan ulang kredensial portal');

  const base = (row.portalUrl || 'https://kipapp.bps.go.id').replace(/\/$/, '');
  const headers = buildPortalHeaders(cookie, xAuth);

  const res = await portalRequest({
    method: 'GET',
    url: `${base}/api/v1/skp/rk?skpid=${encodeURIComponent(row.skpid)}&direct=1`,
    headers,
  });

  if (!res.ok || !res.ctype.includes('json')) {
    const snippet = res.body.slice(0, 200).replace(/\s+/g, ' ');
    throw new Error(
      `Portal mengembalikan halaman (bukan JSON), status ${res.status}, url=${res.url}, ctype=${res.ctype}. Respons: ${snippet}`,
    );
  }
  let data: any;
  try {
    data = JSON.parse(res.body);
  } catch {
    throw new Error('Gagal mem-parsing respons portal (bukan JSON).');
  }
  const list = Array.isArray(data) ? data : [];
  return list
    .map((x: any) => ({ rkid: String(x.rkid), rencanakinerja: x.rencanakinerja || '' }))
    .filter((x: any) => x.rkid);
}

export async function saveRencanaPortalMapping(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('Unauthorized');

  const rencanaId = (formData.get('rencanaId') as string)?.trim() || '';
  const rkid = (formData.get('rkid') as string)?.trim() || '';

  if (!rencanaId) throw new Error('Rencana tidak valid');

  await db
    .update(masterRencana)
    .set({ portalRkid: rkid || null })
    .where(eq(masterRencana.id, rencanaId));

  revalidatePath('/settings');
  return { success: true };
}

