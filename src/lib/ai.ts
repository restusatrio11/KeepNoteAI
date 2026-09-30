// src/lib/ai.ts
import { AIResponseSchema, AIHealthSchema, AINotulenSchema, AIReviewSchema, AIDossierSchema, AIDossierData } from './validations';
import { z } from 'zod';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const SITE_NAME = 'KeepNoteAI';

/**
 * Core helper to call OpenRouter with Zod validation and Self-Correction Loop
 */
async function callOpenRouter<T>(
  prompt: string | any[], 
  schema: z.ZodSchema<T>, 
  systemPrompt: string,
  retries: number = 2,
  overrideModel?: string
): Promise<T> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not defined. Mohon atur OPENROUTER_API_KEY di file .env');

  const selectedModel = overrideModel || process.env.AI_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b:free';
  let lastError = '';

  for (let i = 0; i <= retries; i++) {
    try {
      const fullSystemPrompt = lastError 
        ? `${systemPrompt}\n\nIMPORTANT: Your previous response failed validation with error: ${lastError}. Please fix the JSON format and ensure it strictly follows the schema.`
        : systemPrompt;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': SITE_URL,
          'X-Title': SITE_NAME,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: fullSystemPrompt },
            { role: 'user', content: prompt },
          ],
          response_format: { type: 'json_object' }
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message || 'OpenRouter API Error');
      
      const rawContent = data.choices?.[0]?.message?.content || '';
      // Strip reasoning tokens (<think>...</think>) if model produces internal thinking
      let cleanedContent = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      cleanedContent = cleanedContent.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
      
      try {
        const parsed = JSON.parse(cleanedContent);
        return schema.parse(parsed);
      } catch (parseErr: any) {
        // Fallback: try extracting JSON block if surrounded by extra text
        const jsonMatch = cleanedContent.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            return schema.parse(parsed);
          } catch (nestedErr: any) {
            lastError = nestedErr.message;
          }
        } else {
          lastError = parseErr.message;
        }

        if (i === retries) throw parseErr;
        console.warn(`AI Validation failed (Attempt ${i+1}/${retries+1}): ${lastError}. Retrying...`);
      }
    } catch (error: any) {
      if (i === retries) throw error;
      lastError = error.message;
    }
  }
  throw new Error('Failed to get valid response from AI after multiple attempts');
}

/**
 * Prompt system resmi BPS (Badan Pusat Statistik) dengan anti-halusinasi ketat
 */
export function getBpsReportSystemPrompt(context?: { tim?: string | null; rencana?: string | null; iki?: string | null }) {
  const contextLines = [
    context?.tim ? `- Tim Kerja: ${context.tim}` : null,
    context?.rencana ? `- Rencana Kinerja (Program): ${context.rencana}` : null,
    context?.iki ? `- Indikator Kinerja Individu (IKI): ${context.iki}` : null,
  ].filter(Boolean).join('\n');

  return `Anda adalah asisten pelaporan resmi khusus pegawai Badan Pusat Statistik (BPS) Republik Indonesia.
Tugas Anda: Mengubah catatan pekerjaan harian yang kasual atau singkat menjadi redaksi laporan kedinasan standar e-Kinerja / SKP BPS.

${contextLines ? `LINGKUP KERJA PEGAWAI:\n${contextLines}\n` : 'LINGKUP KERJA: Pegawai Badan Pusat Statistik (BPS).\n'}
ATURAN KETAT ANTI-HALUSINASI (WAJIB DIPATUHI):
1. DILARANG MENGARANG FAKTA: Jangan pernah menambahkan angka kuantitas, target numerik, nama orang, wilayah (desa/kecamatan/kabupaten), atau rincian kegiatan yang TIDAK ADA pada catatan asli pengguna.
2. DILARANG MELEBIH-LEBIHKAN: Jika pengguna hanya menulis "ikut rapat", catat sebagai mengikuti rapat, jangan mengarang bahwa pengguna memimpin rapat atau mengambil keputusan besar.
3. PERTAHANKAN MAKSUD ASLI: Cukup rapikan struktur kalimat, perbaiki ejaan/EYD, dan gunakan peristilahan kedinasan yang wajar tanpa menambah tugas fiktif.
4. JIKA CATATAN SANGAT SINGKAT: Buat kalimat ringkas yang tetap relevan dan aman tanpa detail khayalan.

PANDUAN TERMINOLOGI & GLOSARIUM BPS:
- Survei/Sensus: Susenas, Sakernas, KSA (Kerangka Sampel Area), Sensus Pertanian (ST), Sensus Penduduk (SP), Sensus Ekonomi (SE), SBH, HKD, VHTS, VHTL, Survei Ubinan, Updating Direktori Usaha/Pasar.
- Moda & Sistem: Fasih, CAPI, PAPI, CAWI, KipApp, SIMBAT, SIKD, Web Entry, Portal Mitra.
- Tahapan Kerja Statistik:
  * Lapangan: Listing/updating muatan blok sensus, pencacahan sampel rumah tangga/usaha, pengawasan/supervisi PML, verifikasi lapangan.
  * Pengolahan: Pemeriksaan dokumen (editing-coding), entri data aplikasi CAPI/web, validasi konfirmasi anomali data, kliring data.
  * Nerwilis & Analisis: Rekonsiliasi PDRB (tahunan/triwulanan), penyusunan Berita Resmi Statistik (BRS), kompilasi tabel publikasi Daerah Dalam Angka (DDA), analisis indikator statistik.
  * Bagian Umum: Pengelolaan arsip persuratan, administrasi SPPD/keuangan, pengelolaan BMN, kepegawaian.

FORMULA FORMAT LAPORAN E-KINERJA:
- "kegiatan": Diawali KATA KERJA OPERASIONAL AKTIF terukur (misal: "Melakukan entri data...", "Melakukan verifikasi dan validasi anomali...", "Melaksanakan pengawasan lapangan...", "Mengikuti rapat koordinasi...", "Menyusun draf rekapitulasi...").
- "capaian": Menggambarkan OUTPUT TERUKUR yang realistis (misal: "Terselesaikannya entri data sampel target ke dalam aplikasi sistem.", "Tervalidasinya data dan terselesaikannya konfirmasi anomali.", "Tersusunnya notulen dan draf tindak lanjut hasil rapat.").

CONTOH SEBELUM & SESUDAH:
- Input: "ngentri ksa blok 12"
  Output: { "kegiatan": "Melakukan entri data amatan Survei Kerangka Sampel Area (KSA) segmen 12", "capaian": "Data amatan KSA segmen 12 berhasil dientri ke dalam sistem pengolahan." }
- Input: "briefing mitra sakernas tadi pagi"
  Output: { "kegiatan": "Mengikuti briefing dan pembekalan teknis bagi petugas mitra lapangan Survei Angkatan Kerja Nasional (Sakernas)", "capaian": "Tersampaikannya pemahaman metodologi dan SOP pencacahan Sakernas." }
- Input: "cek anomali susenas di web fasih"
  Output: { "kegiatan": "Melakukan pemeriksaan dan validasi anomali data Survei Sosial Ekonomi Nasional (Susenas) pada web Fasih", "capaian": "Daftar dokumen anomali telah diperiksa dan dikonfirmasi sesuai kondisi lapangan." }

Kembalikan HANYA format JSON valid:
{
  "kegiatan": "string",
  "capaian": "string"
}`;
}

/**
 * Prompt analisis gambar bukti BPS
 */
export function getBpsImageSystemPrompt(rencanaContext?: string | null) {
  return `Anda adalah asisten analisis bukti laporan kinerja pegawai Badan Pusat Statistik (BPS) Republik Indonesia.
Tugas Anda: Menganalisis gambar atau dokumen bukti kerja (misal: foto pencacahan lapangan BPS, tangkapan layar aplikasi CAPI/Fasih/Web Entry, dokumen instrumen sensus/survei, absensi rapat, atau nota dinas) dan merumuskan deskripsi kegiatan serta capaian formal standar e-Kinerja BPS.
${rencanaContext ? `Konteks Rencana Kinerja BPS: ${rencanaContext}\n` : ''}
ATURAN KETAT ANTI-HALUSINASI:
1. DILARANG MENGARANG: Hanya simpulkan apa yang benar-benar tampak pada gambar/dokumen. Jangan membuat angka, nama pegawai, atau detail yang tidak terlihat.
2. Gunakan peristilahan baku BPS (pencacahan, pengawasan, entri data, verifikasi anomali, rapat pembahasan, dll.).
3. Format output HANYA JSON:
{
  "kegiatan": "string diawali kata kerja operasional aktif (Melakukan/Mengikuti/Menyusun...)",
  "capaian": "string hasil capaian realistis (Terselesaikannya/Terlaksananya...)"
}`;
}

/**
 * Generate professional report with Context (Memory) for BPS
 */
export async function generateReport(
  deskripsi: string, 
  timContext?: string, 
  rencanaContext?: string,
  history?: string
) {
  const systemPrompt = getBpsReportSystemPrompt({
    tim: timContext,
    rencana: rencanaContext,
  });

  const userPrompt = `
  ${history ? `Referensi Gaya Penulisan Sebelumnya (Memory):\n${history}\n\n` : ''}
  Catatan Pekerjaan Pegawai BPS: "${deskripsi}"
  
  Rumuskan kegiatan dan capaian resmi standar BPS berdasarkan catatan di atas.`;

  return callOpenRouter(userPrompt, AIResponseSchema, systemPrompt);
}

/**
 * Analyze work quality (Agentic Supervisor)
 */
export async function reviewReport(kegiatan: string, progress: string, capaian: string) {
  const systemPrompt = `You are a strict work supervisor. 
  Analyze if the work description matches the progress percentage and achievement quality.
  Provide feedback in Indonesian.
  Respond ONLY with a JSON object.
  Format: { "isAppropriate": boolean, "feedback": "string", "suggestions": "string" }`;

  const userPrompt = `
  Activity: ${kegiatan}
  Progress: ${progress}
  Achievement: ${capaian}
  
  Is this report high quality and realistic?`;

  return callOpenRouter(userPrompt, AIReviewSchema, systemPrompt);
}

/**
 * Health check AI
 */
export async function analyzeHealth(reportSummary: string) {
  const systemPrompt = `Analyze health markers and give professional performance advice based on report history.
  Respond ONLY with a JSON object.
  Format: { "status": "string", "message": "string", "score": number }`;
  
  return callOpenRouter(reportSummary, AIHealthSchema, systemPrompt);
}

/**
 * Parse raw report from OCR/Chat
 */
export async function parseRawReport(text: string) {
  const systemPrompt = `Extract work activities from unstructured text.
  Respond ONLY with a JSON object.
  Format: { "kegiatan": "string", "capaian": "string", "progress": "string" }`;

  return callOpenRouter(text, AIResponseSchema, systemPrompt);
}

/**
 * Parse a pasted curl / raw request (from DevTools "Copy as cURL") and extract
 * the e-Kinerja/SKP portal credentials needed to fill the integration form.
 */
const PortalCurlSchema = z.object({
  portalUrl: z.string(),
  cookie: z.string(),
  xAuth: z.string(),
  skpid: z.string().optional().default(''),
});

export async function parsePortalCurl(text: string) {
  const systemPrompt = `You are an expert at parsing HTTP requests (curl commands, browser DevTools "Copy as cURL", or raw request text) captured from a web portal such as e-Kinerja/SKP BPS.
Extract these fields and return ONLY a JSON object:
{
  "portalUrl": "base URL of the portal including scheme and host, e.g. https://kipapp.bps.go.id (do NOT include path or query string)",
  "cookie": "the full verbatim value of the Cookie request header",
  "xAuth": "the value of the X-Auth header (include the 'Bearer ' prefix if present, otherwise add it)",
  "skpid": "the numeric SKP ID if visible in the URL query (?skpid=...) or request body, otherwise empty string"
}
If a field is not present, use an empty string. Preserve the Cookie and X-Auth values exactly.`;

  return callOpenRouter(text, PortalCurlSchema, systemPrompt, 1);
}

/**
 * Map local "Rencana Kinerja" (our database) to portal "Rencana Kinerja" items
 * using semantic similarity. Returns one entry per local item with the best
 * matching portal rkid, or null if no reasonable match.
 */
const RencanaMapSchema = z.array(z.object({
  id: z.string(),
  rkid: z.string().nullable(),
}));

export async function mapRencanaToPortal(
  rencana: { id: string; nama: string; kode: string }[],
  portal: { rkid: string; rencanakinerja: string }[]
) {
  const systemPrompt = `You are an expert at matching work-plan items between two systems.
We have a list of local "Rencana Kinerja" items (our database) and a list of "Rencana Kinerja" items from the e-Kinerja/SKP portal.
Match each local item to the most semantically similar portal item by meaning of the activity name (ignore codes).
Return a JSON array where every local item id appears exactly once, with the best matching portal "rkid", or null if no reasonable match exists (similarity below ~70%).
Respond ONLY with a JSON array.`;

  const userPrompt = `LOCAL_RENCANA (our database, key "id" is the identifier):
${JSON.stringify(rencana, null, 2)}

PORTAL_RENCANA (e-Kinerja/SKP portal, key "rkid" is the identifier):
${JSON.stringify(portal, null, 2)}

Return JSON array: [{ "id": "<local id>", "rkid": "<portal rkid or null>" }] (one entry per local item).`;

  return callOpenRouter(userPrompt, RencanaMapSchema, systemPrompt, 1);
}

/**
 * Analyze image or document for activity report (OCR + Description) for BPS
 */
export async function analyzeImageReport(base64Image: string, contentType: string, rencanaContext?: string) {
  const systemPrompt = getBpsImageSystemPrompt(rencanaContext);

  const userPrompt = [
    { type: 'text', text: `Konteks: ${rencanaContext || 'Pekerjaan Badan Pusat Statistik (BPS)'}. Analisis bukti ini dan rumuskan deskripsi kegiatan serta capaian formalnya.` },
    { type: 'image_url', image_url: { url: `data:${contentType};base64,${base64Image}` } }
  ];

  const visionModel = process.env.AI_VISION_MODEL || 'google/gemini-2.0-flash-lite-preview-02-05:free';
  return callOpenRouter(userPrompt, AIResponseSchema, systemPrompt, 2, visionModel);
}

/**
 * Generate meeting notes from text
 */
export async function generateMeetingNotes(text: string, metadata?: any) {
  const systemPrompt = `You are a professional meeting minute taker.
  Format: { "judul": "string", "kesimpulan": "string", "pembahasan": [{ "topik": "string", "items": [{ "deskripsi": "string", "solusi": "string" }] }], "insights": ["string"] }`;

  const userPrompt = `
  Meeting Info: ${JSON.stringify(metadata || {})}
  Notes/Transcript: ${text}
  
  Please provide a structured professional meeting summary.`;

  return callOpenRouter(userPrompt, AINotulenSchema, systemPrompt);
}

/**
 * Audio transcription and summarization (Multimodal)
 */
export async function processMeetingAudio(base64Audio: string, contentType: string, metadata?: any) {
  const systemPrompt = `You are an AI that analyzes meeting audio recordings.
  Transcribe and then summarize the meeting into structured professional notes.
  Respond ONLY with a JSON object.
  Format: { "judul": "string", "kesimpulan": "string", "pembahasan": [{ "topik": "string", "items": [{ "deskripsi": "string", "solusi": "string" }] }], "insights": ["string"] }`;

  const userPrompt = [
    { type: 'text', text: `Meeting Context: ${JSON.stringify(metadata || {})}. Analyze the audio and provide minutes.` },
    { 
      type: 'input_file', 
      input_file: { 
        data: base64Audio, 
        mime_type: contentType 
      } 
    }
  ];
  
  // Audio requires audio-capable model (defaults to Gemini on OpenRouter, configurable via AI_AUDIO_MODEL)
  const audioModel = process.env.AI_AUDIO_MODEL || 'google/gemini-2.5-flash-lite';
  return callOpenRouter(userPrompt as any, AINotulenSchema, systemPrompt, 2, audioModel);
}

/**
 * Prompt system resmi BPS untuk penyusunan Jurnal / Dossier Kegiatan Harian
 */
export function getBpsDossierSystemPrompt(context?: { tim?: string | null; rencana?: string | null; pelaksana?: string | null }) {
  const contextLines = [
    context?.tim ? `- Tim Kerja: ${context.tim}` : null,
    context?.rencana ? `- Rencana Kinerja / Program: ${context.rencana}` : null,
    context?.pelaksana ? `- Pegawai: ${context.pelaksana}` : null,
  ].filter(Boolean).join('\n');

  return `Anda adalah asisten khusus penyusunan Jurnal & Laporan Kerja Harian resmi Badan Pusat Statistik (BPS) Republik Indonesia.
Tugas Anda: Mengubah catatan mentah aktivitas kerja harian pegawai (misal: "tadi pagi briefing mitra sakernas, siang turun ke desa sukajadi ngecek anomali fasih, sore rekap kuesioner") menjadi laporan kedinasan/jurnal kerja harian formal yang rapi, berbobot, dan berstandar publikasi kedinasan BPS.

${contextLines ? `KONTEKS UNIT KERJA PEGAWAI:\n${contextLines}\n` : 'KONTEKS: Pegawai Badan Pusat Statistik (BPS).\n'}

PRINSIP KETAT ANTI-HALUSINASI (WAJIB DIPATUHI):
1. JANGAN PERNAH mengarang angka target, jumlah responden numerik, atau lokasi yang tidak disebutkan pengguna.
2. JANGAN mengubah peran pegawai atau menambahkan kegiatan fiktif di luar catatan pengguna.
3. Ubah redaksi informal/singkat menjadi bahasa formal kedinasan (EYD/PUEBI yang baik, baku, santun, dan lugas).
4. Susun alur kegiatan secara terstruktur dan kronologis (persiapan/koordinasi -> pelaksanaan teknis lapangan/pengolahan -> evaluasi/rekapitulasi -> tindak lanjut).

STRUKTUR OUTPUT JSON:
{
  "judul": "Judul resmi yang spesifik dan representatif (misal: Laporan Pelaksanaan Verifikasi Anomali dan Rekapitulasi Data Sakernas)",
  "ringkasan": "Ringkasan eksekutif 1-2 kalimat padat yang merangkum tujuan utama dan hasil pokok kegiatan hari ini.",
  "latarBelakang": "1-2 kalimat konteks mengapa kegiatan ini dilaksanakan dalam mendukung capaian kinerja BPS.",
  "uraianKegiatan": [
    "Poin langkah 1: Tahap persiapan/koordinasi/briefing (kata kerja aktif: Melakukan..., Mempersiapkan..., dsb.)",
    "Poin langkah 2: Tahap pelaksanaan inti teknis/lapangan/pengolahan secara runtut",
    "Poin langkah 3: Tahap pemeriksaan/pencatatan/penyelesaian"
  ],
  "capaianOutput": [
    "Poin output konkret terukur (misal: Terselesaikannya verifikasi dokumen...", "Terkonfirmasinya data anomali pada sistem Fasih...", "Tersusunnya draf rekapitulasi...")
  ],
  "kendalaTindakLanjut": "Catatan singkat kendala yang dihadapi (jika ada pada catatan) serta langkah tindak lanjut berikutnya."
}`;
}

/**
 * Merapikan catatan mentah kegiatan harian menjadi struktur jurnal formal kedinasan BPS
 */
export async function polishDailyDossier(
  deskripsi: string,
  meta?: { tim?: string; rencana?: string; pelaksana?: string; judul?: string; lokasi?: string }
): Promise<AIDossierData> {
  const systemPrompt = getBpsDossierSystemPrompt({
    tim: meta?.tim,
    rencana: meta?.rencana,
    pelaksana: meta?.pelaksana,
  });

  const userPrompt = `
Judul/Topik yang diberikan pengguna: "${meta?.judul || 'Laporan Pelaksanaan Kegiatan Harian'}"
Lokasi Kegiatan: "${meta?.lokasi || '-'}"
Catatan Mentah Kegiatan Hari Ini ("Ngapain aja"):
"""
${deskripsi}
"""

Rapikan dan susun menjadi struktur Jurnal Kerja Kedinasan BPS yang profesional sesuai schema JSON.`;

  return callOpenRouter(userPrompt, AIDossierSchema, systemPrompt);
}

