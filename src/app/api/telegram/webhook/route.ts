import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, masterRencana, laporan } from '@/db/schema';
import { eq, like } from 'drizzle-orm';
import crypto from 'crypto';

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const LINK_SECRET = process.env.TELEGRAM_LINK_SECRET || process.env.AUTH_SECRET || 'default-secret';

function tgFetch(method: string, body: any) {
  return fetch(`https://api.telegram.org/bot${TG_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function sendMsg(chatId: string | number, text: string, extra?: any) {
  return tgFetch('sendMessage', { chat_id: String(chatId), text, parse_mode: 'Markdown', ...extra });
}

function generateDeepLink(userId: string): string {
  const ts = Date.now().toString();
  const payload = `${userId}:${ts}`;
  const hmac = crypto.createHmac('sha256', LINK_SECRET).update(payload).digest('hex').substring(0, 10);
  const param = Buffer.from(`${payload}:${hmac}`).toString('base64url');
  const botUser = process.env.TELEGRAM_BOT_USERNAME || 'your_bot';
  return `https://t.me/${botUser}?start=${param}`;
}

async function verifyDeepLink(param: string): Promise<string | null> {
  try {
    const decoded = Buffer.from(param, 'base64url').toString();
    const [userId, ts, hmac] = decoded.split(':');
    if (!userId || !ts || !hmac) return null;
    const expected = crypto.createHmac('sha256', LINK_SECRET).update(`${userId}:${ts}`).digest('hex').substring(0, 10);
    if (hmac !== expected) return null;
    if (Date.now() - parseInt(ts) > 10 * 60 * 1000) return null;
    return userId;
  } catch { return null; }
}

async function getUser(chatId: string) {
  const [user] = await db.select().from(users).where(eq(users.telegramChatId, chatId)).limit(1);
  return user || null;
}

async function getUserRencana(userId: string) {
  return db.select().from(masterRencana).where(eq(masterRencana.userId, userId as any));
}

function findBestRencana(rencanaList: any[], hint: string) {
  if (rencanaList.length === 0) return null;
  if (rencanaList.length === 1) return rencanaList[0];
  const hl = hint.toLowerCase();
  let best = rencanaList[0], bestScore = 0;
  for (const r of rencanaList) {
    let score = 0;
    for (const w of hl.split(' ')) {
      if (w.length > 2 && r.nama.toLowerCase().includes(w)) score++;
      if (r.kode?.toLowerCase().includes(w)) score += 2;
    }
    if (score > bestScore) { bestScore = score; best = r; }
  }
  return best;
}

async function callAI(messages: any[]) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'openai/gpt-oss-120b:free',
      messages,
      response_format: { type: 'json_object' },
    }),
  });
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(content);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const msg = body?.message;
  if (!msg) return NextResponse.json({ ok: true });

  const chatId = String(msg.chat.id);
  const text = msg.text || '';
  const caption = msg.caption || '';

  // --- COMMAND HANDLERS ---
  if (text.startsWith('/')) {
    const [cmd, ...args] = text.split(' ');
    const param = args.join(' ');

    if (cmd === '/start' && param) {
      const userId = await verifyDeepLink(param);
      if (userId) {
        await db.update(users).set({ telegramChatId: chatId }).where(eq(users.id, userId as any));
        await sendMsg(chatId, '✅ Akun Telegram berhasil dihubungkan!\n\nSekarang kamu bisa kirim foto, dokumen, atau teks kegiatan, dan saya akan otomatis membuat laporan untukmu.');
      } else {
        await sendMsg(chatId, '❌ Link tidak valid atau sudah kedaluwarsa. Generate ulang dari halaman Settings.');
      }
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/start') {
      const existing = await getUser(chatId);
      if (existing) {
        await sendMsg(chatId, `👋 Halo *${existing.name}*! Akun kamu sudah terhubung. Kirim foto, dokumen, atau teks kegiatan untuk membuat laporan.`);
      } else {
        await sendMsg(chatId, '👋 Halo! Untuk menggunakan bot ini:\n\n1. Buka *Settings* di web KipApp\n2. Klik *"Hubungkan dengan Telegram"*\n3. Klik link yang muncul\n\nAtau kirim /help untuk bantuan.');
      }
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/help') {
      await sendMsg(chatId, '📋 *Cara Penggunaan Bot*\n\n📸 *Kirim Foto/Dokumen* — Saya analisis + buat laporan\n📝 *Kirim Teks* — Deskripsikan kegiatan\n🔗 /status — Cek status koneksi\n🔌 /unlink — Putuskan koneksi');
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/status') {
      const user = await getUser(chatId);
      if (user) await sendMsg(chatId, `✅ Terhubung sebagai *${user.name}* (${user.email})`);
      else await sendMsg(chatId, '❌ Belum terhubung. Buka Settings > Hubungkan dengan Telegram.');
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/unlink') {
      await db.update(users).set({ telegramChatId: null as any }).where(eq(users.telegramChatId, chatId));
      await sendMsg(chatId, '🔌 Akun Telegram berhasil diputuskan.');
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  }

  // --- AUTH CHECK ---
  const user = await getUser(chatId);
  if (!user) {
    // Silently ignore non-linked users
    return NextResponse.json({ ok: true });
  }

  // --- PHOTO HANDLER ---
  if (msg.photo) {
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    await handleFile(chatId, user, fileId, caption);
    return NextResponse.json({ ok: true });
  }

  // --- DOCUMENT HANDLER ---
  if (msg.document) {
    await handleFile(chatId, user, msg.document.file_id, caption);
    return NextResponse.json({ ok: true });
  }

  // --- TEXT HANDLER ---
  if (text) {
    await handleText(chatId, user, text);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

async function handleFile(chatId: string, user: any, fileId: string, caption: string) {
  await sendMsg(chatId, '⏳ Mengunduh dan menganalisis file...');

  try {
    const fileRes = await tgFetch('getFile', { file_id: fileId });
    const fileData = await fileRes.json();
    if (!fileData.ok || !fileData.result?.file_path) {
      await sendMsg(chatId, '❌ Gagal mengunduh file.');
      return;
    }

    const fileUrl = `https://api.telegram.org/file/bot${TG_TOKEN}/${fileData.result.file_path}`;
    const resp = await fetch(fileUrl);
    const buffer = Buffer.from(await resp.arrayBuffer());
    const base64 = buffer.toString('base64');
    const filePath = fileData.result.file_path;
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
    const mime = isImage ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : 'application/octet-stream';

    await sendMsg(chatId, '🧠 AI sedang menganalisis...');

    const aiResult = await callAI([
      {
        role: 'system',
        content: 'Analyze the work document/image. Return JSON: { "kegiatan": "professional activity in Indonesian", "capaian": "achievement description in Indonesian", "rencanaHint": "suggested program name" }'
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: caption || 'Analyze this work activity.' },
          { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } }
        ]
      }
    ]);

    if (!aiResult.kegiatan) {
      await sendMsg(chatId, '❌ Gagal menganalisis. Pastikan file berisi kegiatan kerja.');
      return;
    }

    const rencanaList = await getUserRencana(user.id);
    const rencana = findBestRencana(rencanaList, aiResult.rencanaHint || aiResult.kegiatan);

    if (!rencana) {
      await sendMsg(chatId,
        `📋 *Hasil Analisis:*\n\n*Kegiatan:* ${aiResult.kegiatan}\n*Capaian:* ${aiResult.capaian || '-'}\n\n` +
        '⚠️ Tidak ada Rencana Kerja yang cocok. Buat dulu di web > Rencana.'
      );
      return;
    }

    await sendMsg(chatId, '📤 Mengunggah ke Google Drive...');

    let buktiUrls = '';
    try {
      const { uploadToDrive } = await import('@/lib/drive');
      const { getUserSettings } = await import('@/lib/drive');
      // Get user's drive folder
      const [settings] = await db.select().from((await import('@/db/schema')).userSettings)
        .where(eq((await import('@/db/schema')).userSettings.userId, user.id as any)).limit(1);
      
      // Upload via drive lib directly
      if (settings?.driveFolderId) {
        const result = await uploadToDrive(buffer, filePath.split('/').pop() || 'file', mime, settings.driveFolderId);
        if (result?.link) buktiUrls = JSON.stringify([result.link]);
      }
    } catch (e) {
      console.error('Upload error:', e);
    }

    const today = new Date().toISOString().split('T')[0];
    await db.insert(laporan).values({
      userId: user.id,
      tanggalMulai: today,
      tanggalSelesai: today,
      rencanaId: rencana.id,
      kegiatan: aiResult.kegiatan,
      progress: 100,
      capaian: aiResult.capaian || 'Tercapai sesuai target.',
      buktiUrls: buktiUrls || null,
    });

    await sendMsg(chatId,
      `✅ *Laporan Berhasil Dibuat!*\n\n*Program:* ${rencana.nama} (${rencana.kode})\n*Kegiatan:* ${aiResult.kegiatan}\n*Capaian:* ${aiResult.capaian || 'Tercapai'}\n*Progres:* 100%\n\n📊 Lihat di web: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/laporan`
    );

  } catch (e) {
    console.error('File handler error:', e);
    await sendMsg(chatId, '❌ Terjadi kesalahan. Coba lagi nanti.');
  }
}

async function handleText(chatId: string, user: any, text: string) {
  await sendMsg(chatId, '⏳ Memproses deskripsi kegiatan...');

  try {
    const aiResult = await callAI([
      {
        role: 'system',
        content: 'Convert casual work descriptions into professional Indonesian. Return JSON: { "kegiatan": "professional activity description", "capaian": "achievement description", "rencanaHint": "suggested program name matching the work" }'
      },
      { role: 'user', content: text }
    ]);

    if (!aiResult.kegiatan) {
      await sendMsg(chatId, '❌ Gagal memproses. Coba deskripsikan lebih detail.');
      return;
    }

    const rencanaList = await getUserRencana(user.id);
    const rencana = findBestRencana(rencanaList, aiResult.rencanaHint || aiResult.kegiatan);

    if (!rencana) {
      await sendMsg(chatId,
        `📋 *Hasil Analisis:*\n\n*Kegiatan:* ${aiResult.kegiatan}\n*Capaian:* ${aiResult.capaian || '-'}\n\n` +
        '⚠️ Tidak ada Rencana Kerja yang cocok. Buat dulu di web > Rencana.'
      );
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    await db.insert(laporan).values({
      userId: user.id,
      tanggalMulai: today,
      tanggalSelesai: today,
      rencanaId: rencana.id,
      kegiatan: aiResult.kegiatan,
      progress: 100,
      capaian: aiResult.capaian || 'Tercapai sesuai target.',
    });

    await sendMsg(chatId,
      `✅ *Laporan Berhasil Dibuat!*\n\n*Program:* ${rencana.nama} (${rencana.kode})\n*Kegiatan:* ${aiResult.kegiatan}\n*Capaian:* ${aiResult.capaian || 'Tercapai'}\n*Progres:* 100%\n\n📊 Lihat di web: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/laporan`
    );

  } catch (e) {
    console.error('Text handler error:', e);
    await sendMsg(chatId, '❌ Terjadi kesalahan. Coba lagi nanti.');
  }
}

export const GET = POST;
