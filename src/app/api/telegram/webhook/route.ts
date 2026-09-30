import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, masterRencana, timKerja, laporan, telegramUpdates, userSettings } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { getBpsReportSystemPrompt, getBpsImageSystemPrompt, polishDailyDossier } from '@/lib/ai';
import { generateDailyDossierPdf } from '@/lib/daily-dossier-pdf';
import { generateDailyDossierDocx } from '@/lib/daily-dossier-docx';
import { DossierDocumentPayload } from '@/lib/validations';

const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

function extractUrls(text: string): string[] {
  return (text.match(URL_REGEX) || []).map((u) => u.replace(/[)\]]+$/, ''));
}

async function sendMsg(chatId: string | number, text: string, extra?: any) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: String(chatId), text, parse_mode: 'Markdown', ...extra }),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok && data.description?.toLowerCase().includes('parse')) {
      // Fallback without parse_mode if markdown has formatting collision
      return fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: String(chatId), text: text.replace(/[*_`]/g, ''), ...extra }),
      });
    }
    return res;
  } catch (e) {
    console.error('sendMsg error:', e);
  }
}

function tgFetch(method: string, body: any) {
  return fetch(`https://api.telegram.org/bot${TG_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}

function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return fetch(`https://api.telegram.org/bot${TG_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  });
}

async function editMsgText(chatId: string | number, messageId: string | number, text: string, extra?: any) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: String(chatId), message_id: Number(messageId), text, parse_mode: 'Markdown', ...extra }),
    });
    const data = await res.json().catch(() => ({}));
    if (!data.ok && data.description?.toLowerCase().includes('parse')) {
      return fetch(`https://api.telegram.org/bot${TG_TOKEN}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: String(chatId), message_id: Number(messageId), text: text.replace(/[*_`]/g, ''), ...extra }),
      });
    }
    return res;
  } catch (e) {
    console.error('editMsgText error:', e);
  }
}

async function sendTgDocument(chatId: string | number, fileBuffer: Uint8Array | Buffer, filename: string, caption?: string) {
  const formData = new FormData();
  formData.append('chat_id', String(chatId));
  if (caption) {
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');
  }
  const blob = new Blob([new Uint8Array(fileBuffer)]);
  formData.append('document', blob, filename);

  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendDocument`, {
    method: 'POST',
    body: formData,
  });
  return res.json();
}

function formatDateIndo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

async function getUser(chatId: string) {
  const [user] = await db.select().from(users).where(eq(users.telegramChatId, chatId)).limit(1);
  return user || null;
}

async function getUserRencana(userId: string) {
  return db
    .select({
      id: masterRencana.id,
      nama: masterRencana.nama,
      kode: masterRencana.kode,
      iki: masterRencana.iki,
      timId: masterRencana.timId,
      timNama: timKerja.nama,
    })
    .from(masterRencana)
    .leftJoin(timKerja, eq(masterRencana.timId, timKerja.id))
    .where(eq(masterRencana.userId, userId as any))
    .orderBy(masterRencana.kode);
}

async function getUserTim(userId: string) {
  return db
    .select({
      id: timKerja.id,
      nama: timKerja.nama,
    })
    .from(timKerja)
    .where(eq(timKerja.userId, userId as any))
    .orderBy(timKerja.nama);
}

function buildRkListView({
  list,
  activeRkId,
  page = 1,
  pageSize = 5,
  timFilter = 'all',
  timList = [],
}: {
  list: any[];
  activeRkId?: string | null;
  page?: number;
  pageSize?: number;
  timFilter?: string;
  timList?: any[];
}) {
  let filteredList = list;
  let activeTimNama = '';

  if (timFilter && timFilter !== 'all') {
    filteredList = list.filter((r) => r.timId === timFilter);
    const t = timList.find((tm) => tm.id === timFilter);
    if (t) activeTimNama = t.nama;
  }

  const totalItems = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentItems = filteredList.slice(startIndex, endIndex);

  let msg = '';
  if (activeTimNama) {
    msg += `📋 *Daftar RK — Tim ${activeTimNama}*\n`;
  } else {
    msg += `📋 *Daftar Rencana Kerja BPS*\n`;
  }

  msg += `_Menampilkan ${totalItems === 0 ? 0 : startIndex + 1} - ${endIndex} dari total ${totalItems} RK (Hal ${currentPage}/${totalPages})_\n\n`;

  if (currentItems.length === 0) {
    msg += `_Tidak ada Rencana Kerja yang ditemukan untuk filter ini._\n\n`;
  } else {
    currentItems.forEach((r, idx) => {
      const globalNumber = startIndex + idx + 1;
      const isActive = activeRkId && r.id === activeRkId;
      const activeBadge = isActive ? ' ⭐ *(AKTIF)*' : '';
      const cleanNama = (r.nama || '').replace(/\*/g, '');
      const cleanTim = (r.timNama || 'BPS').replace(/_/g, ' ');

      msg += `*${globalNumber}.* *${cleanNama}*${activeBadge}\n`;
      msg += `     🏷️ \`${r.kode}\``;
      if (!activeTimNama) {
        msg += ` • 👥 _${cleanTim}_`;
      }
      msg += `\n\n`;
    });
  }

  msg += `👉 *Sentuh nomor tombol di bawah untuk memilih RK:*`;

  // Numbered buttons grid (up to 3 per row for large touch targets)
  const inlineKeyboard: any[] = [];
  let row: any[] = [];

  currentItems.forEach((r, idx) => {
    const globalNumber = startIndex + idx + 1;
    const isActive = activeRkId && r.id === activeRkId;
    const btnLabel = isActive ? `✅ ${globalNumber}` : `🔘 ${globalNumber}`;

    row.push({
      text: btnLabel,
      callback_data: `setrk:${r.id}`,
    });

    if (row.length === 3) {
      inlineKeyboard.push(row);
      row = [];
    }
  });

  if (row.length > 0) {
    inlineKeyboard.push(row);
  }

  // Navigation Row (if multiple pages)
  const navRow: any[] = [];
  if (currentPage > 1) {
    navRow.push({
      text: `⬅️ Hal ${currentPage - 1}`,
      callback_data: `rkpage:${currentPage - 1}:${timFilter}`,
    });
  }
  if (currentPage < totalPages) {
    navRow.push({
      text: `Hal ${currentPage + 1} ➡️`,
      callback_data: `rkpage:${currentPage + 1}:${timFilter}`,
    });
  }
  if (navRow.length > 0) {
    inlineKeyboard.push(navRow);
  }

  // Filter & Action Buttons
  const actionRow: any[] = [];
  if (timList.length > 1) {
    actionRow.push({
      text: timFilter !== 'all' ? '🌐 Semua Tim' : '👥 Filter Tim',
      callback_data: timFilter !== 'all' ? `rkpage:1:all` : 'rktim:menu',
    });
  }
  actionRow.push({
    text: !activeRkId ? '🤖 Auto AI (Aktif)' : '🤖 Deteksi Otomatis AI',
    callback_data: 'setrk:auto',
  });
  inlineKeyboard.push(actionRow);

  return { text: msg, reply_markup: { inline_keyboard: inlineKeyboard } };
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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://keep-note-ai.vercel.app';
const SITE_NAME = 'KeepNoteAI';

function deriveDefaultCapaian(kegiatan: string): string {
  if (!kegiatan) return 'Tercapai sesuai target.';
  const lower = kegiatan.trim().toLowerCase();
  if (lower.startsWith('melakukan ') || lower.startsWith('melaksanakan ')) {
    return 'Terlaksananya ' + kegiatan.slice(lower.startsWith('melakukan ') ? 10 : 13).trim();
  }
  if (lower.startsWith('menyusun ') || lower.startsWith('membuat ')) {
    return 'Tersusunnya ' + kegiatan.slice(lower.startsWith('menyusun ') ? 9 : 8).trim();
  }
  if (lower.startsWith('mengikuti ') || lower.startsWith('menghadiri ')) {
    return 'Terlaksananya keikutsertaan dalam ' + kegiatan.slice(lower.startsWith('mengikuti ') ? 10 : 11).trim();
  }
  if (lower.startsWith('memeriksa ') || lower.startsWith('mengecek ') || lower.startsWith('validasi ')) {
    return 'Terselesaikannya pemeriksaan dan validasi ' + kegiatan.replace(/^(memeriksa|mengecek|validasi)\s*/i, '').trim();
  }
  if (lower.startsWith('mengentri ') || lower.startsWith('entri ')) {
    return 'Terselesaikannya entri data ' + kegiatan.replace(/^(mengentri|entri)\s*(data)?\s*/i, '').trim();
  }
  return `Terselesaikannya kegiatan ${kegiatan.toLowerCase().replace(/^(melakukan|melaksanakan)\s*/i, '')}.`;
}

async function callAI(messages: any[], expectJson = true, modelOverride?: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('OPENROUTER_API_KEY is not configured.');
    return { kegiatan: '' };
  }

  const selectedModel = modelOverride || process.env.AI_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free';
  const body: any = {
    model: selectedModel,
    messages,
  };
  if (expectJson) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': SITE_URL,
      'X-Title': SITE_NAME,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (data.error) {
    console.error('OpenRouter API error in Telegram bot:', data.error);
    throw new Error(data.error.message || 'OpenRouter API Error');
  }

  let raw = data.choices?.[0]?.message?.content || '';
  // Strip reasoning tokens (<think>...</think>) if present
  raw = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  if (!expectJson) return { kegiatan: raw };
  const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {}
    }
    const obj: any = {};
    const matchK = cleaned.match(/"kegiatan"\s*:\s*"([^"]+)"/);
    if (matchK) obj.kegiatan = matchK[1];
    const matchC = cleaned.match(/"capaian"\s*:\s*"([^"]+)"/);
    if (matchC) obj.capaian = matchC[1];
    const matchR = cleaned.match(/"rencanaHint"\s*:\s*"([^"]+)"/);
    if (matchR) obj.rencanaHint = matchR[1];
    if (obj.kegiatan || obj.rencanaHint) return obj;
    return { kegiatan: cleaned };
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  // 1. Handle Callback Query (e.g. interactive inline buttons for choosing RK)
  const cb = body?.callback_query;
  if (cb) {
    const cbChatId = String(cb.message?.chat?.id || cb.from?.id);
    const cbUser = await getUser(cbChatId);
    const data: string = cb.data || '';
    const cbMsgId = cb.message?.message_id;

    if (!cbUser) {
      await answerCallbackQuery(cb.id, 'Akun belum terhubung. Ketik /start');
      return NextResponse.json({ ok: true });
    }

    if (data.startsWith('setrk:')) {
      const targetId = data.replace('setrk:', '');

      if (targetId === 'auto') {
        await db
          .update(users)
          .set({ selectedRencanaId: null })
          .where(eq(users.id, cbUser.id as any));

        await answerCallbackQuery(cb.id, '🤖 Mode Deteksi Otomatis AI aktif');
        const text =
          `🤖 *Target RK: Deteksi Otomatis AI (Aktif)*\n\n` +
          `Setiap kali Anda mengirim catatan kegiatan atau foto, AI akan otomatis mendeteksi dan mengarahkan laporan ke RK yang paling cocok.\n\n` +
          `_Ketik /rk untuk memilih target RK spesifik kapan saja._`;

        if (cbMsgId) {
          await editMsgText(cbChatId, cbMsgId, text);
        } else {
          await sendMsg(cbChatId, text);
        }
        return NextResponse.json({ ok: true });
      }

      const list = await getUserRencana(cbUser.id);
      const matched = list.find((r: any) => r.id === targetId);

      if (matched) {
        await db
          .update(users)
          .set({ selectedRencanaId: matched.id })
          .where(eq(users.id, cbUser.id as any));

        await answerCallbackQuery(cb.id, `✅ Dipilih: ${matched.nama.slice(0, 30)}`);
        const confirmText =
          `✅ *Target RK Aktif Berhasil Diganti!*\n\n` +
          `📌 *${matched.nama}*\n` +
          `🏷️ Kode: \`${matched.kode}\`\n` +
          (matched.timNama ? `👥 Tim: ${matched.timNama}\n\n` : '\n') +
          `Laporan berikutnya akan otomatis dicatat ke RK ini.\n\n` +
          `_Ketik /rk kapan saja untuk ganti RK atau /rk auto untuk deteksi otomatis._`;

        if (cbMsgId) {
          await editMsgText(cbChatId, cbMsgId, confirmText);
        } else {
          await sendMsg(cbChatId, confirmText);
        }
      } else {
        await answerCallbackQuery(cb.id, 'RK tidak ditemukan.');
      }
      return NextResponse.json({ ok: true });
    }

    if (data.startsWith('rkpage:')) {
      const parts = data.split(':');
      const targetPage = parseInt(parts[1]) || 1;
      const timFilter = parts[2] || 'all';

      const list = await getUserRencana(cbUser.id);
      const timList = await getUserTim(cbUser.id);

      const view = buildRkListView({
        list,
        activeRkId: cbUser.selectedRencanaId,
        page: targetPage,
        pageSize: 5,
        timFilter,
        timList,
      });

      await answerCallbackQuery(cb.id);
      if (cbMsgId) {
        await editMsgText(cbChatId, cbMsgId, view.text, { reply_markup: view.reply_markup });
      } else {
        await sendMsg(cbChatId, view.text, { reply_markup: view.reply_markup });
      }
      return NextResponse.json({ ok: true });
    }

    if (data === 'rktim:menu') {
      const list = await getUserRencana(cbUser.id);
      const timList = await getUserTim(cbUser.id);

      let msg = `👥 *Pilih Tim Kerja untuk Menyaring RK:*\n\n` +
        `Silakan sentuh nama tim di bawah untuk menampilkan hanya RK dari tim tersebut:`;

      const timButtons: any[] = [];
      timList.forEach((tm: any) => {
        const count = list.filter((r) => r.timId === tm.id).length;
        timButtons.push([
          {
            text: `📁 ${tm.nama} (${count} RK)`,
            callback_data: `rkpage:1:${tm.id}`,
          },
        ]);
      });

      timButtons.push([
        {
          text: `🌐 Semua Tim (${list.length} RK)`,
          callback_data: `rkpage:1:all`,
        },
      ]);
      timButtons.push([
        {
          text: `⬅️ Kembali ke Daftar RK`,
          callback_data: `rkpage:1:all`,
        },
      ]);

      await answerCallbackQuery(cb.id);
      if (cbMsgId) {
        await editMsgText(cbChatId, cbMsgId, msg, { reply_markup: { inline_keyboard: timButtons } });
      } else {
        await sendMsg(cbChatId, msg, { reply_markup: { inline_keyboard: timButtons } });
      }
      return NextResponse.json({ ok: true });
    }

    await answerCallbackQuery(cb.id);
    return NextResponse.json({ ok: true });
  }

  const msg = body?.message;
  if (!msg) return NextResponse.json({ ok: true });

  // Deduplikasi: cegah Telegram mengirim ulang update yang sama
  // (mis. karena webhook lambat) membuat laporan duplikat/spam.
  const updateId =
    body.update_id != null
      ? String(body.update_id)
      : `${msg.chat.id}:${msg.message_id}`;
  try {
    const inserted = await db
      .insert(telegramUpdates)
      .values({
        updateId,
        chatId: String(msg.chat.id),
        messageId: String(msg.message_id),
      })
      .onConflictDoNothing()
      .returning();
    if (inserted.length === 0) {
      // Update sudah pernah diproses -> abaikan (balas 200 agar tidak dikirim ulang)
      return NextResponse.json({ ok: true });
    }
  } catch (e) {
    // Kalau tabel belum ada, lanjutkan saja (tidak memblokir)
    console.error('Telegram dedupe error:', e);
  }

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
      if (!user) {
        await sendMsg(chatId, '❌ Akun belum terhubung. Ketik /start');
        return NextResponse.json({ ok: true });
      }

      const list = await getUserRencana(user.id);
      if (list.length === 0) {
        await sendMsg(chatId, '📭 Belum ada Rencana Kerja. Buat dulu di web > Rencana.');
        return NextResponse.json({ ok: true });
      }

      if (param) {
        const cleanParam = param.trim().toLowerCase();

        // 1. Reset / Auto detection
        if (cleanParam === 'auto' || cleanParam === 'reset' || cleanParam === 'otomatis') {
          await db
            .update(users)
            .set({ selectedRencanaId: null })
            .where(eq(users.id, user.id as any));

          await sendMsg(
            chatId,
            `🤖 *Target RK: Deteksi Otomatis AI (Aktif)*\n\n` +
            `AI akan otomatis mencocokkan setiap laporan kegiatan ke Rencana Kerja yang paling sesuai.`
          );
          return NextResponse.json({ ok: true });
        }

        // 2. Short number shortcut: e.g. "/rk 1", "/rk 2"
        const numIndex = parseInt(cleanParam);
        let matched: any = null;

        if (!isNaN(numIndex) && numIndex >= 1 && numIndex <= list.length) {
          matched = list[numIndex - 1];
        }

        // 3. Exact code match
        if (!matched) {
          matched = list.find((r: any) => r.kode?.toLowerCase() === cleanParam);
        }

        // 4. Keyword / Name partial search
        if (!matched) {
          const candidates = list.filter((r: any) =>
            r.nama.toLowerCase().includes(cleanParam) ||
            r.kode.toLowerCase().includes(cleanParam)
          );

          if (candidates.length === 1) {
            matched = candidates[0];
          } else if (candidates.length > 1) {
            let candidatesMsg = `🔍 *Ditemukan ${candidates.length} RK untuk kata kunci "${param}":*\n\n`;
            const buttons: any[] = [];
            let rRow: any[] = [];

            candidates.forEach((r: any, idx: number) => {
              const num = idx + 1;
              const cleanNama = (r.nama || '').replace(/\*/g, '');
              const cleanTim = (r.timNama || 'BPS').replace(/_/g, ' ');
              candidatesMsg += `*${num}.* *${cleanNama}*\n     🏷️ \`${r.kode}\` • 👥 _${cleanTim}_\n\n`;
              rRow.push({
                text: `🔘 ${num}`,
                callback_data: `setrk:${r.id}`,
              });
              if (rRow.length === 3) {
                buttons.push(rRow);
                rRow = [];
              }
            });
            if (rRow.length > 0) buttons.push(rRow);

            candidatesMsg += `👉 *Sentuh nomor tombol di bawah untuk memilih:*`;

            await sendMsg(chatId, candidatesMsg, {
              reply_markup: { inline_keyboard: buttons },
            });
            return NextResponse.json({ ok: true });
          }
        }

        if (!matched) {
          await sendMsg(
            chatId,
            `❌ Tidak ditemukan RK yang cocok dengan "*${param}*".\n\n` +
            `Ketik \`/rk\` untuk melihat daftar lengkap dengan teks utuh & tombol nomor.`
          );
          return NextResponse.json({ ok: true });
        }

        await db
          .update(users)
          .set({ selectedRencanaId: matched.id })
          .where(eq(users.id, user.id as any));

        await sendMsg(
          chatId,
          `✅ *Target RK aktif diperbarui!*\n\n` +
          `📌 *${matched.nama}*\n` +
          `🏷️ Kode: \`${matched.kode}\`\n` +
          (matched.timNama ? `👥 Tim: ${matched.timNama}\n\n` : '\n') +
          `Laporan selanjutnya akan otomatis dicatat ke RK ini.`
        );
        return NextResponse.json({ ok: true });
      }

      // No param: Show full paginated list with numbered keypad buttons
      const timList = await getUserTim(user.id);
      const view = buildRkListView({
        list,
        activeRkId: user.selectedRencanaId,
        page: 1,
        pageSize: 5,
        timFilter: 'all',
        timList,
      });

      await sendMsg(chatId, view.text, {
        reply_markup: view.reply_markup,
      });
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/ai' || cmd === '/aion' || cmd === '/aioff' || cmd === '/ai_on' || cmd === '/ai_off') {
      const u = await getUser(chatId);
      if (!u) { await sendMsg(chatId, '❌ Akun belum terhubung. Ketik /start'); return NextResponse.json({ ok: true }); }

      let modeParam = param.toLowerCase();
      if (cmd === '/aion' || cmd === '/ai_on') modeParam = 'on';
      if (cmd === '/aioff' || cmd === '/ai_off') modeParam = 'off';

      if (modeParam === 'on' || modeParam === 'aktif' || modeParam === '1' || modeParam === 'enable') {
        await db.update(users).set({ telegramAiPolish: true }).where(eq(users.id, u.id as any));
        await sendMsg(chatId,
          '✨ *AI Merapikan Diaktifkan!*\n\n' +
          'Setiap teks catatan atau caption foto akan otomatis dianalisis dan dirapikan oleh AI menjadi deskripsi kegiatan formal & capaian profesional.\n\n' +
          'Ketik `/ai off` jika ingin menonaktifkannya kapan saja.'
        );
      } else if (modeParam === 'off' || modeParam === 'nonaktif' || modeParam === '0' || modeParam === 'disable') {
        await db.update(users).set({ telegramAiPolish: false }).where(eq(users.id, u.id as any));
        await sendMsg(chatId,
          '📝 *AI Merapikan Dinonaktifkan!*\n\n' +
          'Bot sekarang akan mencatat laporan kegiatan *langsung apa adanya* sesuai teks asli yang Anda kirim (tanpa diproses/dirapikan oleh AI).\n\n' +
          'Ketik `/ai on` jika ingin mengaktifkannya kembali.'
        );
      } else if (modeParam === 'toggle') {
        const nextState = !(u.telegramAiPolish !== false);
        await db.update(users).set({ telegramAiPolish: nextState }).where(eq(users.id, u.id as any));
        const statusText = nextState ? '✨ *Diaktifkan*' : '📝 *Dinonaktifkan*';
        await sendMsg(chatId, `🔄 Fitur AI Merapikan sekarang: ${statusText}`);
      } else {
        const isCurrentOn = u.telegramAiPolish !== false;
        await sendMsg(chatId,
          `🤖 *Pengaturan Fitur AI Merapikan*\n\n` +
          `Status saat ini: *${isCurrentOn ? '✅ AKTIF (Merapikan via AI)' : '⏸ NONAKTIF (Catat Langsung Teks Asli)'}*\n\n` +
          `Pilihan perintah:\n` +
          `• \`/ai on\` — Mengaktifkan AI untuk merapikan teks kegiatan & capaian\n` +
          `• \`/ai off\` — Menonaktifkan AI (catat persis teks apa adanya)\n` +
          `• \`/ai toggle\` — Ganti status aktif/nonaktif`
        );
      }
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/jurnal' || cmd === '/laporan_harian' || cmd === '/dossier') {
      const u = await getUser(chatId);
      if (!u) {
        await sendMsg(chatId, '❌ Akun belum terhubung. Ketik /start untuk menghubungkan akun.');
        return NextResponse.json({ ok: true });
      }
      await handleGenerateJurnal(chatId, u, param);
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/help') {
      await sendMsg(chatId,
        '📋 *Bantuan Bot KeepNoteAI*\n\n' +
        '🔗 /link KODE — Hubungkan akun\n' +
        '🎯 /rk — Pilih RK (tombol interaktif, nomor /rk 1, atau cari nama /rk sakernas)\n' +
        '🤖 /rk auto — Deteksi otomatis target RK oleh AI\n' +
        '🤖 /ai — Cek status fitur AI merapikan\n' +
        '✨ /ai on — Aktifkan AI merapikan deskripsi\n' +
        '📝 /ai off — Nonaktifkan AI (catat teks asli langsung)\n' +
        '📄 /jurnal — Generate Jurnal Kerja Harian resmi (PDF & Word)\n' +
        '📄 /jurnal <teks> — Buat jurnal langsung dari catatan cepat\n' +
        '🔍 /status — Cek status koneksi & fitur\n' +
        '🔌 /unlink — Putuskan koneksi\n' +
        '⏸ /stop — Jeda pembuatan laporan otomatis\n' +
        '▶️ /lanjut — Lanjutkan pembuatan laporan\n\n' +
        '📸 Kirim *foto/dokumen* — Analisis / simpan bukti + buat laporan\n' +
        '📝 Kirim *teks* — Catat kegiatan'
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
        s += `\n🤖 AI Merapikan: *${user.telegramAiPolish !== false ? 'Aktif' : 'Nonaktif'}* (ketik /ai)`;
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

    if (cmd === '/stop' || cmd === '/pause') {
      const u = await getUser(chatId);
      if (!u) { await sendMsg(chatId, '❌ Akun belum terhubung. Ketik /start'); return NextResponse.json({ ok: true }); }
      await db.update(users).set({ telegramPaused: true }).where(eq(users.id, u.id as any));
      await sendMsg(chatId, '⏸ Bot dijeda. Laporan tidak akan dibuat otomatis dari chat. Ketik /lanjut untuk melanjutkan.');
      return NextResponse.json({ ok: true });
    }

    if (cmd === '/lanjut' || cmd === '/resume') {
      const u = await getUser(chatId);
      if (!u) { await sendMsg(chatId, '❌ Akun belum terhubung. Ketik /start'); return NextResponse.json({ ok: true }); }
      await db.update(users).set({ telegramPaused: false }).where(eq(users.id, u.id as any));
      await sendMsg(chatId, '▶️ Bot dilanjutkan. Kirim foto/teks untuk membuat laporan.');
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

function parseTanggal(input: string): Date | null {
  if (!input) return null;
  const bulan: Record<string, number> = {
    januari: 0, februari: 1, maret: 2, april: 3, mei: 4, juni: 5,
    juli: 6, agustus: 7, september: 8, oktober: 9, november: 10, desember: 11,
  };
  const m1 = input.match(/\b(\d{1,2})\s+(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+(\d{4})\b/i);
  if (m1) {
    const d = parseInt(m1[1], 10), mo = bulan[m1[2].toLowerCase()], y = parseInt(m1[3], 10);
    if (d >= 1 && d <= 31 && mo !== undefined) return new Date(y, mo, d);
  }
  const m2 = input.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})\b/);
  if (m2) {
    const d = parseInt(m2[1], 10), mo = parseInt(m2[2], 10) - 1, y = parseInt(m2[3], 10);
    if (d >= 1 && d <= 31 && mo >= 0 && mo <= 11) return new Date(y, mo, d);
  }
  return null;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function getActiveRencana(user: any) {
  if (user.selectedRencanaId) {
    const [r] = await db
      .select({
        id: masterRencana.id,
        nama: masterRencana.nama,
        kode: masterRencana.kode,
        iki: masterRencana.iki,
        timId: masterRencana.timId,
        timNama: timKerja.nama,
      })
      .from(masterRencana)
      .leftJoin(timKerja, eq(masterRencana.timId, timKerja.id))
      .where(eq(masterRencana.id, user.selectedRencanaId as any))
      .limit(1);
    if (r) return r;
  }
  return null;
}

async function handleFile(chatId: string, user: any, fileId: string, caption: string) {
  if (user.telegramPaused) {
    await sendMsg(chatId, '⏸ Bot sedang dijeda. Ketik /lanjut untuk membuat laporan dari chat.');
    return;
  }
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

    // 1. Dapatkan Rencana Kerja aktif jika ada (untuk grounding konteks BPS)
    const activeRk = await getActiveRencana(user);

    // 2. Tentukan kegiatan & capaian
    let kegiatan = caption?.trim();
    let capaian = kegiatan ? deriveDefaultCapaian(kegiatan) : 'Tercapai sesuai target.';
    const isAiPolish = user.telegramAiPolish !== false;

    if (kegiatan) {
      if (isAiPolish) {
        await sendMsg(chatId, '🧠 AI merapikan deskripsi...');
        try {
          const systemPrompt = getBpsReportSystemPrompt({
            tim: activeRk?.timNama,
            rencana: activeRk ? `${activeRk.nama} (${activeRk.kode})` : undefined,
            iki: activeRk?.iki || undefined,
          });
          const aiResult = await callAI([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: kegiatan },
          ]);
          if (aiResult.kegiatan) { 
            kegiatan = aiResult.kegiatan; 
            capaian = aiResult.capaian || deriveDefaultCapaian(kegiatan); 
          }
        } catch (err) {
          console.error('AI polish error:', err);
        }
      }
    } else {
      if (isAiPolish) {
        await sendMsg(chatId, '🧠 AI menganalisis gambar...');
        const base64 = buffer.toString('base64');
        const systemPrompt = getBpsImageSystemPrompt(activeRk ? `${activeRk.nama} (${activeRk.kode})` : undefined);
        const visionModel = process.env.AI_VISION_MODEL || 'google/gemini-2.0-flash-lite-preview-02-05:free';
        const aiResult = await callAI([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: [
            { type: 'text', text: 'Analisis bukti dokumen/foto kegiatan pegawai BPS ini dan rumuskan deskripsi kegiatan serta capaian formalnya.' },
            { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } }
          ]},
        ], true, visionModel);
        kegiatan = aiResult.kegiatan;
        capaian = aiResult.capaian || (kegiatan ? deriveDefaultCapaian(kegiatan) : 'Tercapai sesuai target.');
        if (!kegiatan) {
          await sendMsg(chatId, '❌ Tidak ada deskripsi terdeteksi. Kirim foto dengan caption atau ketik deskripsi kegiatan.');
          return;
        }
      } else {
        await sendMsg(chatId, '⚠️ *Mode tanpa AI aktif*: Silakan kirim foto/dokumen disertai caption deskripsi kegiatan, atau ketik `/ai on` untuk mengaktifkan analisis AI otomatis.');
        return;
      }
    }

    // 3. Tentukan Rencana Kerja final
    let rencana = activeRk;
    if (!rencana) {
      const rencanaList = await getUserRencana(user.id);
      if (rencanaList.length > 0) {
        if (isAiPolish) {
          try {
            const rkCodes = rencanaList.map((r: any) => `${r.kode}: ${r.nama}`).join('\n');
            const aiHint = await callAI([
              { role: 'system', content: `Anda adalah asisten BPS. Cocokkan kegiatan statistik ini ke salah satu kode RK yang paling sesuai. Kembalikan JSON: { "rencanaHint": "KODE RK" }\nDaftar RK:\n${rkCodes}` },
              { role: 'user', content: kegiatan },
            ]);
            rencana = findBestRencana(rencanaList, aiHint.rencanaHint || kegiatan);
          } catch {
            rencana = findBestRencana(rencanaList, kegiatan);
          }
        } else {
          rencana = findBestRencana(rencanaList, kegiatan);
        }
      }
    }
    if (!rencana) {
      await sendMsg(chatId, `📋 *Kegiatan:* ${kegiatan}\n\n⚠️ Tidak ada RK yang cocok. Ketik /rk untuk memilih target RK.`);
      return;
    }

    // 3. Upload ke Drive (folder opsional -> otomatis KeepNoteAI)
    const tgl = parseTanggal(caption) || new Date();
    const today = toISODate(tgl);
    let buktiUrls: string | null = null;
    await sendMsg(chatId, '📤 Mengunggah ke Google Drive...');
    try {
      const { uploadToDrive, getDriveClientFromServiceAccount, getDriveClientForUser, buildEvidenceFileName } = await import('@/lib/drive');
      const { userSettings } = await import('@/db/schema');
      const [settings] = await db.select().from(userSettings)
        .where(eq(userSettings.userId, user.id as any)).limit(1);
      if (!settings?.driveRefreshToken && !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        await sendMsg(chatId, '⚠️ Google Drive belum dihubungkan. Hubungkan di Pengaturan agar bukti tersimpan.');
      } else {
        let drive;
        try {
          drive = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
            ? getDriveClientFromServiceAccount()
            : await getDriveClientForUser(user.id);
        } catch {
          drive = null;
          await sendMsg(chatId, '⚠️ Gagal menghubungkan ke Google Drive.');
        }
        if (drive) {
          const base = buildEvidenceFileName(user.name, today, rencana.kode, kegiatan);
          const fileName = `${base}.${ext || 'jpg'}`;
          const result = await uploadToDrive(buffer, fileName, mime, settings?.driveFolderId || '', drive);
          if (result?.link) buktiUrls = JSON.stringify([result.link]);
          const captionUrls = caption ? extractUrls(caption) : [];
          if (captionUrls.length) {
            const existing = buktiUrls ? JSON.parse(buktiUrls) : [];
            buktiUrls = JSON.stringify([...existing, ...captionUrls]);
          }
          if (result?.fallback) {
            await sendMsg(chatId, '⚠️ Folder tujuan Drive tidak bisa ditulis, file disimpan di folder KeepNoteAI Anda.');
          }
        }
      }
    } catch (e: any) {
      console.error('Upload error:', e);
      const msg = String(e?.response?.data?.error?.message || e?.message || e);
      await sendMsg(chatId, `⚠️ Gagal unggah ke Drive: ${msg}`);
    }

    // 4. Simpan laporan
    await db.insert(laporan).values({
      userId: user.id, tanggalMulai: today, tanggalSelesai: today, rencanaId: rencana.id,
      kegiatan, progress: 100, capaian,
      buktiUrls,
    });

    const modeTag = isAiPolish ? '' : '\n_Mode tanpa AI (teks asli dicatat langsung)_';
    await sendMsg(chatId, `✅ *Laporan Berhasil Dibuat!*\n\n*Program:* ${rencana.nama} (${rencana.kode})\n*Kegiatan:* ${kegiatan}\n*Capaian:* ${capaian}\n*Progres:* 100%${modeTag}\n\n📊 Lihat di web: https://keep-note-ai.vercel.app/laporan`);
  } catch (e) {
    console.error('File handler error:', e);
    await sendMsg(chatId, '❌ Terjadi kesalahan. Coba lagi nanti.');
  }
}

async function handleText(chatId: string, user: any, text: string) {
  if (user.telegramPaused) {
    await sendMsg(chatId, '⏸ Bot sedang dijeda. Ketik /lanjut untuk membuat laporan dari chat.');
    return;
  }
  const activeRk = await getActiveRencana(user);
  const urls = extractUrls(text);
  const buktiUrls = urls.length ? JSON.stringify(urls) : null;
  const rawText = text.replace(URL_REGEX, '').replace(/\s{2,}/g, ' ').trim();

  if (!rawText && !urls.length) {
    await sendMsg(chatId, '❌ Pesan kosong. Kirim teks kegiatan untuk membuat laporan.');
    return;
  }

  const isAiPolish = user.telegramAiPolish !== false;
  let kegiatan = rawText || 'Menyertakan bukti pendukung kegiatan.';
  let capaian = deriveDefaultCapaian(kegiatan);

  if (isAiPolish) {
    await sendMsg(chatId, '🧠 AI merapikan deskripsi kegiatan...');
    try {
      const systemPrompt = getBpsReportSystemPrompt({
        tim: activeRk?.timNama,
        rencana: activeRk ? `${activeRk.nama} (${activeRk.kode})` : undefined,
        iki: activeRk?.iki || undefined,
      });

      const aiResult = await callAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: kegiatan },
      ]);

      if (aiResult.kegiatan) {
        kegiatan = aiResult.kegiatan;
        capaian = aiResult.capaian || deriveDefaultCapaian(kegiatan);
      }
    } catch (e) {
      console.error('AI polish text error:', e);
    }
  }

  let rencana = activeRk;
  if (!rencana) {
    const rencanaList = await getUserRencana(user.id);
    if (rencanaList.length === 0) {
      await sendMsg(chatId, '📭 Belum ada Rencana Kerja. Buat dulu di web > Rencana.');
      return;
    }

    if (isAiPolish) {
      try {
        const rkCodes = rencanaList.map((r: any) => `${r.kode}: ${r.nama}`).join('\n');
        const aiHint = await callAI([
          { role: 'system', content: `Anda adalah asisten BPS. Cocokkan kegiatan statistik ini ke salah satu kode RK yang paling sesuai. Kembalikan JSON: { "rencanaHint": "KODE RK" }\nDaftar RK:\n${rkCodes}` },
          { role: 'user', content: kegiatan },
        ]);
        rencana = findBestRencana(rencanaList, aiHint.rencanaHint || kegiatan);
      } catch {
        rencana = findBestRencana(rencanaList, kegiatan);
      }
    } else {
      rencana = findBestRencana(rencanaList, kegiatan);
    }
  }

  if (!rencana) {
    await sendMsg(chatId, `📋 *Kegiatan:* ${kegiatan}\n\n⚠️ Tidak ada Rencana Kerja yang cocok. Ketik /rk untuk memilih target RK.`);
    return;
  }

  const tgl = parseTanggal(text) || new Date();
  const today = toISODate(tgl);
  await db.insert(laporan).values({
    userId: user.id, tanggalMulai: today, tanggalSelesai: today, rencanaId: rencana.id,
    kegiatan, progress: 100, capaian,
    buktiUrls,
  });

  const buktiNote = buktiUrls ? `\n*Bukti:* ${urls.length} tautan` : '';
  const modeTag = isAiPolish ? '' : '\n_Mode tanpa AI (teks asli dicatat langsung)_';
  await sendMsg(chatId, `✅ *Laporan Berhasil Dibuat!*\n\n*Program:* ${rencana.nama} (${rencana.kode})\n*Kegiatan:* ${kegiatan}\n*Capaian:* ${capaian}\n*Progres:* 100%${buktiNote}${modeTag}\n\n📊 Lihat di web: https://keep-note-ai.vercel.app/laporan`);
}

async function handleGenerateJurnal(chatId: string, user: any, param: string) {
  const todayDate = toISODate(new Date());
  let targetDate = todayDate;
  let rawDescription = '';

  const parsedDate = parseTanggal(param);
  if (parsedDate) {
    targetDate = toISODate(parsedDate);
  } else if (param.toLowerCase() === 'kemarin') {
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    targetDate = toISODate(yest);
  } else if (param.trim().length > 0 && param.trim().split(' ').length > 2) {
    // User typed an actual activity note directly!
    rawDescription = param.trim();
  }

  // If no manual description given in param, fetch from user's recorded reports for targetDate
  let photos: { dataUrl: string; caption: string }[] = [];
  if (!rawDescription) {
    const reports = await db
      .select({
        kegiatan: laporan.kegiatan,
        capaian: laporan.capaian,
        buktiUrls: laporan.buktiUrls,
      })
      .from(laporan)
      .where(and(eq(laporan.userId, user.id as any), eq(laporan.tanggalMulai, targetDate)))
      .orderBy(laporan.createdAt);

    if (reports.length === 0) {
      await sendMsg(
        chatId,
        `📭 *Belum ada catatan kegiatan untuk tanggal ${formatDateIndo(targetDate)}.*\n\n` +
        `Anda dapat membuat laporan dengan cara:\n` +
        `1. Kirim catatan kegiatan atau foto hari ini, lalu ketik \`/jurnal\`\n` +
        `2. Atau buat langsung dengan format:\n` +
        `\`/jurnal <tuliskan aktivitas Anda hari ini>\`\n\n` +
        `_Contoh:_\n` +
        `\`/jurnal Pagi briefing mitra Sakernas di aula. Siang verifikasi anomali Fasih di desa binaan. Sore rekap 15 dokumen.\``
      );
      return;
    }

    // Aggregate activities
    rawDescription = reports
      .map((r, i) => `${i + 1}. ${r.kegiatan} (Capaian: ${r.capaian})`)
      .join('\n');

    // Extract photos from buktiUrls
    for (const r of reports) {
      if (r.buktiUrls) {
        try {
          const urls = JSON.parse(r.buktiUrls);
          if (Array.isArray(urls)) {
            for (const u of urls) {
              if (typeof u === 'string' && u.startsWith('http')) {
                photos.push({
                  dataUrl: u,
                  caption: `Dokumentasi kegiatan ${formatDateIndo(targetDate)}`,
                });
              }
            }
          }
        } catch {}
      }
    }
  }

  await sendMsg(
    chatId,
    `⏳ *Sedang menyusun Jurnal Kerja Harian BPS (${formatDateIndo(targetDate)})...*\n` +
    `Mohon tunggu sebentar, dokumen PDF & Word sedang diproses.`
  );

  try {
    const activeRk = await getActiveRencana(user);
    const isAiPolish = user.telegramAiPolish !== false;

    let dossierData: any;
    if (isAiPolish) {
      dossierData = await polishDailyDossier(rawDescription, {
        tim: activeRk?.timNama || 'Tim Kerja BPS',
        rencana: activeRk ? `${activeRk.nama} (${activeRk.kode})` : undefined,
        pelaksana: user.name || 'Pegawai BPS',
        lokasi: 'Kantor / Wilayah Tugas BPS',
      });
    } else {
      const lines = rawDescription.split('\n').filter((l) => l.trim().length > 0);
      dossierData = {
        judul: 'Laporan Pelaksanaan Kegiatan Harian',
        ringkasan: lines[0] || rawDescription,
        latarBelakang: null,
        uraianKegiatan: lines.length > 1 ? lines : [rawDescription],
        capaianOutput: ['Target kegiatan terlaksana sesuai rencana kedinasan BPS.'],
        kendalaTindakLanjut: null,
      };
    }

    const payload: DossierDocumentPayload = {
      judul: dossierData.judul || 'Laporan Pelaksanaan Kegiatan Harian',
      tanggal: targetDate,
      waktu: '08.00 - 16.00 WIB',
      tempat: 'Kantor BPS & Wilayah Tugas',
      timKerja: activeRk?.timNama || 'Badan Pusat Statistik',
      rencanaKinerja: activeRk ? `${activeRk.nama} (${activeRk.kode})` : 'Pelaksanaan Tugas Kedinasan BPS',
      pelaksana: user.name || 'Pegawai BPS',
      nipPelaksana: undefined,
      ringkasan: dossierData.ringkasan || rawDescription,
      latarBelakang: dossierData.latarBelakang || undefined,
      uraianKegiatan:
        dossierData.uraianKegiatan?.length > 0
          ? dossierData.uraianKegiatan
          : [rawDescription],
      capaianOutput:
        dossierData.capaianOutput?.length > 0
          ? dossierData.capaianOutput
          : ['Kegiatan selesai dengan baik.'],
      kendalaTindakLanjut: dossierData.kendalaTindakLanjut || undefined,
      photos: photos.slice(0, 6),
    };

    // Generate PDF
    const pdfBytes = await generateDailyDossierPdf(payload);
    const safeTitle = (payload.judul || 'Jurnal_BPS')
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .slice(0, 30);
    const pdfFilename = `${safeTitle}_${targetDate}.pdf`;

    await sendTgDocument(
      chatId,
      pdfBytes,
      pdfFilename,
      `✅ *Jurnal Kegiatan Harian BPS Berhasil Dibuat!*\n\n` +
      `📅 *Tanggal:* ${formatDateIndo(targetDate)}\n` +
      `👤 *Pelaksana:* ${user.name}\n` +
      `🎯 *Program:* ${payload.rencanaKinerja}\n\n` +
      `📄 _Dokumen PDF resmi ber-Kop BPS siap cetak._`
    );

    // Generate DOCX
    const docxBuf = await generateDailyDossierDocx(payload);
    const docxFilename = `${safeTitle}_${targetDate}.docx`;

    // Upload PDF to Google Drive if configured
    let pdfDriveLink: string | null = null;
    try {
      const { uploadToDrive, getDriveClientFromServiceAccount, getDriveClientForUser, buildEvidenceFileName } = await import('@/lib/drive');
      const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, user.id as any))
        .limit(1);

      let drive = null;
      try {
        drive = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
          ? getDriveClientFromServiceAccount()
          : await getDriveClientForUser(user.id);
      } catch {}

      if (drive) {
        const base = buildEvidenceFileName(
          user.name || 'Pegawai_BPS',
          targetDate,
          activeRk?.kode || 'RK',
          payload.judul || 'Jurnal_Harian'
        );
        const fileName = `${base}.pdf`;
        const uploadResult = await uploadToDrive(
          pdfBytes,
          fileName,
          'application/pdf',
          settings?.driveFolderId || '',
          drive
        );
        if (uploadResult?.link) {
          pdfDriveLink = uploadResult.link;
        }
      }
    } catch (driveErr) {
      console.warn('Drive upload error for telegram jurnal pdf:', driveErr);
    }

    // Save to Laporan DB
    let targetRk: any = activeRk;
    if (!targetRk) {
      const rkList = await getUserRencana(user.id);
      if (rkList.length > 0) targetRk = rkList[0];
    }

    if (targetRk) {
      try {
        const buktiArr: string[] = [];
        if (pdfDriveLink) buktiArr.push(pdfDriveLink);
        for (const p of photos) {
          if (p.dataUrl && p.dataUrl.startsWith('http') && !buktiArr.includes(p.dataUrl)) {
            buktiArr.push(p.dataUrl);
          }
        }

        await db.insert(laporan).values({
          userId: user.id,
          tanggalMulai: targetDate,
          tanggalSelesai: targetDate,
          jamMulai: '08:00',
          jamSelesai: '16:00',
          rencanaId: targetRk.id,
          kegiatan: payload.judul || `Jurnal Kegiatan ${formatDateIndo(targetDate)}`,
          progress: 100,
          capaian: payload.capaianOutput?.join('; ') || payload.ringkasan || 'Jurnal harian terselesaikan',
          buktiUrls: buktiArr.length > 0 ? JSON.stringify(buktiArr) : null,
          masukanSkp: payload.ringkasan || null,
        });
      } catch (dbErr) {
        console.warn('DB insert error for telegram jurnal:', dbErr);
      }
    }

    const docxCaption = pdfDriveLink
      ? `📝 *Versi Word (.docx)* — Dokumen resmi siap diedit.\n\n☁️ *PDF Tersimpan di Google Drive & Menu Laporan:*\n🔗 [Buka PDF di Google Drive](${pdfDriveLink})\n📊 Tercatat di web: https://keep-note-ai.vercel.app/laporan`
      : `📝 *Versi Word (.docx)* — Dokumen resmi siap diedit.\n\n📊 Tercatat di web: https://keep-note-ai.vercel.app/laporan`;

    await sendTgDocument(
      chatId,
      docxBuf,
      docxFilename,
      docxCaption
    );
  } catch (err: any) {
    console.error('Error generating jurnal in Telegram:', err);
    await sendMsg(chatId, `❌ Gagal membuat dokumen jurnal: ${err?.message || 'Terjadi kesalahan sistem.'}`);
  }
}

export const GET = POST;

