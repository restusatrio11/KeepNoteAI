import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, masterRencana, laporan } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

function sendMsg(chatId: string | number, text: string, extra?: any) {
  return fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: String(chatId), text, parse_mode: 'Markdown', ...extra }),
  });
}

function tgFetch(method: string, body: any) {
  return fetch(`https://api.telegram.org/bot${TG_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
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
  const body: any = {
    model: process.env.AI_MODEL || 'openai/gpt-oss-120b:free',
    messages,
  };
  const lastMsg = messages[messages.length - 1];
  const hasImage = Array.isArray(lastMsg?.content) && lastMsg.content.some((c: any) => c.type === 'image_url');
  if (!hasImage) {
    body.response_format = { type: 'json_object' };
  }
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
  return JSON.parse(cleaned);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const msg = body?.message;
  if (!msg) return NextResponse.json({ ok: true });

  const chatId = String(msg.chat.id);
  const text = msg.text || '';
  const caption = msg.caption || '';

  if (text.startsWith('/')) {
    const parts = text.split(' ');
    const cmd = parts[0];
    const param = parts.slice(1).join(' ').trim();

    if (cmd === '/link' && param) {
      const [found] = await db.select().from(users)
        .where(and(
          eq(users.verificationCode, param),
          gt(users.verificationExpiry as any, new Date())
        ))
        .limit(1);

      if (found) {
        await db.update(users).set({
          telegramChatId: chatId,
          verificationCode: null as any,
          verificationExpiry: null as any,
        }).where(eq(users.id, found.id as any));

        await sendMsg(chatId,
          `✅ *Berhasil terhubung!* Halo *${found.name}*!\n\n` +
          `Sekarang kirim foto, dokumen, atau teks kegiatan untuk membuat laporan otomatis.`
        );
      } else {
        await sendMsg(chatId, '❌ Kode tidak valid atau sudah kedaluwarsa. Generate ulang dari halaman Settings.');
      }
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/start') {
      const existing = await getUser(chatId);
      if (existing) {
        await sendMsg(chatId, `👋 Halo *${existing.name}*! Akun sudah terhubung. Kirim kegiatan untuk membuat laporan.`);
      } else {
        await sendMsg(chatId,
          '👋 Halo! Untuk menghubungkan akun:\n\n' +
          '1. Buka *Settings* di web KipApp\n' +
          '2. Klik *"Generate Kode"*\n' +
          '3. Ketik /link <kode> di sini\n\n' +
          'Contoh: `/link ABC123`'
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/rk') {
      const user = await getUser(chatId);
      if (!user) { await sendMsg(chatId, '❌ Akun belum terhubung. Ketik /start'); return NextResponse.json({ ok: true }); }

      const list = await getUserRencana(user.id);
      if (list.length === 0) {
        await sendMsg(chatId, '📭 Belum ada Rencana Kerja. Buat dulu di web > Rencana.');
        return NextResponse.json({ ok: true });
      }

      if (param) {
        const matched = list.find((r: any) => r.kode?.toLowerCase() === param.toLowerCase());
        if (!matched) {
          await sendMsg(chatId, `❌ Kode *${param}* tidak ditemukan.\n\nKetik /rk untuk lihat daftar RK.`);
          return NextResponse.json({ ok: true });
        }
        await db.update(users).set({ selectedRencanaId: matched.id }).where(eq(users.id, user.id as any));
        await sendMsg(chatId,
          `✅ *Target RK diperbarui!*\n\n` +
          `*${matched.kode}* — ${matched.nama}\n\n` +
          `Laporan selanjutnya akan otomatis mengarah ke RK ini.`
        );
      } else {
        const activeRk = user.selectedRencanaId
          ? list.find((r: any) => r.id === user.selectedRencanaId)
          : null;
        let msg = `📋 *Daftar Rencana Kerja (${list.length})*\n\n`;
        for (const r of list) {
          const active = activeRk && r.id === activeRk.id ? ' ✅ *(aktif)*' : '';
          msg += `▸ *${r.kode}* — ${r.nama}${active}\n`;
        }
        msg += `\nGunakan: \`/rk KODE\` untuk memilih target RK.`;
        await sendMsg(chatId, msg);
      }
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/help') {
      await sendMsg(chatId,
        '📋 *Bantuan*\n\n' +
        '🔗 /link KODE — Hubungkan akun\n' +
        '📋 /rk — Lihat daftar Rencana Kerja\n' +
        '🎯 /rk KODE — Pilih target RK\n' +
        '🔍 /status — Cek status koneksi\n' +
        '🔌 /unlink — Putuskan koneksi\n\n' +
        '📸 Kirim *foto/dokumen* — Analisis + buat laporan\n' +
        '📝 Kirim *teks* — Deskripsikan kegiatan'
      );
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/status') {
      const user = await getUser(chatId);
      if (user) {
        const activeRk = user.selectedRencanaId
          ? (await db.select().from(masterRencana).where(eq(masterRencana.id, user.selectedRencanaId as any)).limit(1))[0]
          : null;
        let s = `✅ Terhubung sebagai *${user.name}* (${user.email})`;
        if (activeRk) s += `\n🎯 RK aktif: *${activeRk.kode}* — ${activeRk.nama}`;
        else s += '\nℹ️ Belum pilih RK. Ketik /rk untuk lihat daftar.';
        await sendMsg(chatId, s);
      } else {
        await sendMsg(chatId, '❌ Belum terhubung. Ketik /start untuk bantuan.');
      }
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/unlink') {
      await db.update(users).set({ telegramChatId: null as any }).where(eq(users.telegramChatId, chatId));
      await sendMsg(chatId, '🔌 Akun berhasil diputuskan.');
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  }

  const user = await getUser(chatId);
  if (!user) return NextResponse.json({ ok: true });

  if (msg.photo) {
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    await handleFile(chatId, user, fileId, caption);
    return NextResponse.json({ ok: true });
  }

  if (msg.document) {
    await handleFile(chatId, user, msg.document.file_id, caption);
    return NextResponse.json({ ok: true });
  }

  if (text) {
    await handleText(chatId, user, text);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}

async function getActiveRencana(user: any) {
  if (user.selectedRencanaId) {
    const [r] = await db.select().from(masterRencana).where(eq(masterRencana.id, user.selectedRencanaId as any)).limit(1);
    if (r) return r;
  }
  return null;
}

async function handleFile(chatId: string, user: any, fileId: string, caption: string) {
  await sendMsg(chatId, '⏳ Mengunduh file...');
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
    const filePath = fileData.result.file_path;
    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
      : ext === 'png' ? 'image/png'
      : ext === 'pdf' ? 'application/pdf'
      : 'application/octet-stream';

    await sendMsg(chatId, '📤 Mengunggah ke Google Drive...');

    let buktiUrls = '';
    try {
      const { uploadToDrive } = await import('@/lib/drive');
      const { userSettings } = await import('@/db/schema');
      const [settings] = await db.select().from(userSettings)
        .where(eq(userSettings.userId, user.id as any)).limit(1);
      if (settings?.driveFolderId) {
        const result = await uploadToDrive(buffer, filePath.split('/').pop() || 'file', mime, settings.driveFolderId);
        if (result?.link) buktiUrls = JSON.stringify([result.link]);
      }
    } catch (e) { console.error('Upload error:', e); }

    let kegiatan = caption?.trim();
    let capaian = 'Tercapai sesuai target.';

    if (!kegiatan) {
      await sendMsg(chatId, '🧠 AI menganalisis gambar...');
      const base64 = buffer.toString('base64');
      const aiResult = await callAI([
        { role: 'system', content: 'Analyze this work document/image. Return JSON: { "kegiatan": "professional activity in Indonesian", "capaian": "achievement description in Indonesian" }' },
        { role: 'user', content: [{ type: 'text', text: 'Describe this work activity.' }, { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } }] },
      ]);
      kegiatan = aiResult.kegiatan;
      capaian = aiResult.capaian || capaian;
      if (!kegiatan) {
        await sendMsg(chatId, '❌ Tidak ada deskripsi. Kirim foto dengan caption atau ketik deskripsi kegiatan.');
        return;
      }
    }

    const activeRk = await getActiveRencana(user);
    let rencana = activeRk;
    if (!rencana) {
      const rencanaList = await getUserRencana(user.id);
      const rkCodes = rencanaList.map((r: any) => `${r.kode}: ${r.nama}`).join('\n');
      const aiHint = await callAI([
        { role: 'system', content: `Match the activity to one of these RK. Return JSON: { "rencanaHint": "the RK code" }\nAvailable RK:\n${rkCodes}` },
        { role: 'user', content: kegiatan },
      ]);
      rencana = findBestRencana(rencanaList, aiHint.rencanaHint || kegiatan);
    }

    if (!rencana) {
      await sendMsg(chatId, `📋 *Kegiatan:* ${kegiatan}\n\n⚠️ Tidak ada RK yang cocok. Ketik /rk untuk memilih target RK.`);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    await db.insert(laporan).values({
      userId: user.id, tanggalMulai: today, tanggalSelesai: today, rencanaId: rencana.id,
      kegiatan, progress: 100, capaian,
      buktiUrls: buktiUrls || null,
    });

    await sendMsg(chatId, `✅ *Laporan Berhasil Dibuat!*\n\n*Program:* ${rencana.nama} (${rencana.kode})\n*Kegiatan:* ${kegiatan}\n*Capaian:* ${capaian}\n*Progres:* 100%\n\n📊 Lihat di web: https://keep-note-ai.vercel.app/laporan`);
  } catch (e) {
    console.error('File handler error:', e);
    await sendMsg(chatId, '❌ Terjadi kesalahan. Coba lagi nanti.');
  }
}

async function handleText(chatId: string, user: any, text: string) {
  const activeRk = await getActiveRencana(user);
  const rkContext = activeRk
    ? `\n\nLaporan ini harus masuk ke RK: *${activeRk.kode}* — ${activeRk.nama}.`
    : '';

  await sendMsg(chatId, '⏳ Memproses deskripsi kegiatan...');
  try {
    const aiResult = await callAI([
      {
        role: 'system',
        content: `Convert casual work descriptions into professional Indonesian. Return JSON: { "kegiatan": "professional activity description", "capaian": "achievement description" }${rkContext}`,
      },
      { role: 'user', content: text },
    ]);

    if (!aiResult.kegiatan) {
      await sendMsg(chatId, '❌ Gagal memproses. Coba deskripsikan lebih detail.');
      return;
    }

    let rencana = activeRk;
    if (!rencana) {
      const rencanaList = await getUserRencana(user.id);
      const rkCodes = rencanaList.map((r: any) => `${r.kode}: ${r.nama}`).join('\n');
      const aiHint = await callAI([
        { role: 'system', content: `Match the activity to one of these RK. Return JSON: { "rencanaHint": "the RK code" }\nAvailable RK:\n${rkCodes}` },
        { role: 'user', content: text },
      ]);
      rencana = findBestRencana(rencanaList, aiHint.rencanaHint || aiResult.kegiatan);
    }

    if (!rencana) {
      await sendMsg(chatId, `📋 *Hasil Analisis:*\n\n*Kegiatan:* ${aiResult.kegiatan}\n*Capaian:* ${aiResult.capaian || '-'}\n\n⚠️ Tidak ada Rencana Kerja yang cocok. Ketik /rk untuk memilih target RK.`);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    await db.insert(laporan).values({
      userId: user.id, tanggalMulai: today, tanggalSelesai: today, rencanaId: rencana.id,
      kegiatan: aiResult.kegiatan, progress: 100, capaian: aiResult.capaian || 'Tercapai sesuai target.',
    });

    await sendMsg(chatId, `✅ *Laporan Berhasil Dibuat!*\n\n*Program:* ${rencana.nama} (${rencana.kode})\n*Kegiatan:* ${aiResult.kegiatan}\n*Capaian:* ${aiResult.capaian || 'Tercapai'}\n*Progres:* 100%\n\n📊 Lihat di web: https://keep-note-ai.vercel.app/laporan`);
  } catch (e) {
    console.error('Text handler error:', e);
    await sendMsg(chatId, '❌ Terjadi kesalahan. Coba lagi nanti.');
  }
}

export const GET = POST;
