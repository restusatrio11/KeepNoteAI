export async function generateLaporanAI(deskripsi: string, rencanaContext?: string, timContext?: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.AI_MODEL || 'qwen/qwen3.6-plus:free';

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const contextStr = [
    timContext ? `Tim Kerja: ${timContext}` : '',
    rencanaContext ? `Program Kerja: ${rencanaContext}` : ''
  ].filter(Boolean).join('\n');

  const prompt = `Ubah deskripsi pekerjaan berikut menjadi laporan kerja profesional dalam Bahasa Indonesia.
${contextStr ? `Konteks Pekerjaan:\n${contextStr}\n` : ''}
Deskripsi Tugas Dasar dari user: "${deskripsi}"

Gunakan konteks Tim dan Program di atas untuk menyesuaikan kosa kata dan standar profesionalitas hasil laporan.

Format Output (JSON):
{
  "kegiatan": "Hasil ringkasan kegiatan formal",
  "capaian": "Target/hasil yang dicapai dari kegiatan tersebut"
}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://antigravity-reporting.com',
      'X-Title': 'KeepNoteAI'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'Anda adalah asisten pelaporan kerja profesional.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenRouter Error:', errorBody);
    throw new Error('Failed to generate AI response');
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch (e) {
    console.error('Failed to parse AI JSON:', content);
    return { kegiatan: content, capaian: '-' };
  }
}

export async function analyzeImageAI(base64Image: string, contentType: string, rencanaContext: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = 'qwen/qwen3.6-plus:free'; // Always use the free model for vision as requested

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const prompt = `Analisis gambar berikut berdasarkan konteks Rencana Kerja: "${rencanaContext}".
Berikan uraian kegiatan formal dan capaian profesional yang sesuai dengan apa yang terlihat di gambar tersebut dan hubungkan dengan rencana kerja yang dipilih.

Format Output (JSON):
{
  "kegiatan": "Hasil ringkasan kegiatan formal berdasarkan visual",
  "capaian": "Target/hasil nyata yang terlihat/tercapai"
}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://antigravity-reporting.com',
      'X-Title': 'KeepNoteAI'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { 
              type: 'image_url', 
              image_url: { 
                url: `data:${contentType};base64,${base64Image}` 
              } 
            }
          ]
        }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenRouter Error:', errorBody);
    throw new Error('Failed to analyze image with AI');
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch (e) {
    console.error('Failed to parse AI JSON:', content);
    return { kegiatan: content, capaian: '-' };
  }
}

export async function analyzeDocumentAI(documentText: string, rencanaContext: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.AI_MODEL || 'qwen/qwen3.6-plus:free';

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const prompt = `Analisis isi dokumen berikut berdasarkan konteks Rencana Kerja: "${rencanaContext}".
Isi Dokumen:
---
${documentText.substring(0, 6000)} 
---
Berikan uraian kegiatan formal dan capaian profesional yang sesuai dengan isi dokumen tersebut dan hubungkan dengan rencana kerja yang dipilih.

Format Output (JSON):
{
  "kegiatan": "Hasil ringkasan kegiatan formal berdasarkan isi dokumen",
  "capaian": "Target/hasil nyata yang tercapai dari dokumen tersebut"
}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://antigravity-reporting.com',
      'X-Title': 'KeepNoteAI'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'Anda adalah asisten pelaporan profesional yang ahli merangkum dokumen.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenRouter Error:', errorBody);
    throw new Error('Failed to analyze document with AI');
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch (e) {
    console.error('Failed to parse AI JSON:', content);
    return { kegiatan: content, capaian: '-' };
  }
}

export async function analyzeReportHealthAI(reportSummary: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.AI_MODEL || 'qwen/qwen3.6-plus:free';

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const prompt = `Analisis riwayat laporan berikut dan berikan evaluasi "Kesehatan Laporan".
Riwayat Laporan:
---
${reportSummary}
---
Berikan skor (angka 0-100), status singkat (misal: "Sangat Baik"), dan pesan motivasi/evaluasi dalam Bahasa Indonesia (maksimal 2 kalimat).

Format Output (JSON):
{
  "score": 85,
  "status": "Baik",
  "message": "Pesan motivasi Anda..."
}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://antigravity-reporting.com',
      'X-Title': 'KeepNoteAI'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'Anda adalah pakar manajemen performa kerja yang memberikan feedback konstruktif.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenRouter Error:', errorBody);
    throw new Error('Failed to analyze health with AI');
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch (e) {
    console.error('Failed to parse AI JSON:', content);
    return { 
      score: 50, 
      status: 'Cukup', 
      message: 'Terus tingkatkan konsistensi pelaporan Anda setiap hari.' 
    };
  }
}

export async function generateNotulenAI(rawNotes: string, metadata: { judul?: string; topik?: string }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.AI_MODEL || 'google/gemini-2.0-flash-exp:free';

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const prompt = `Anda adalah asisten notulensi profesional. Tugas Anda adalah mengubah catatan rapat yang kasar/informal menjadi notulen yang rapi, profesional, dan enak dibaca dalam Bahasa Indonesia.

Informasi Rapat:
Judul: ${metadata.judul || 'Rapat'}
Topik Utama: ${metadata.topik || '-'}

Catatan Kasar:
---
${rawNotes}
---

Instruksi:
1. Gunakan Bahasa Indonesia formal (EYD) yang sangat profesional dan sopan.
2. Identifikasi poin-poin pembahasan utama secara teratur.
3. Untuk setiap poin, jika ada keputusan atau solusi yang disebutkan, pisahkan sebagai "solusi" yang jelas.
4. Buat ringkasan "kesimpulan" yang mencakup inti dari seluruh pertemuan secara eksekutif.
5. Tambahkan "insights" berupa daftar poin penting atau rekomendasi strategis yang bisa diambil dari hasil rapat tersebut untuk kemajuan tim.
6. Pastikan kosa kata yang digunakan mencerminkan standar profesionalitas tinggi (misal: menggunakan kata 'tersebut', 'berkenaan', 'implementasi', dsb).

Format Output (JSON):
{
  "pembahasan": [
    {
      "topik": "Nama Topik/Agenda",
      "items": [
        {
          "deskripsi": "Penjelasan detail poin pembahasan",
          "solusi": "Langkah tindak lanjut atau keputusan yang diambil"
        }
      ]
    }
  ],
  "kesimpulan": "Ringkasan eksekutif rapat...",
  "insights": [
    "Poin insight/rekomendasi 1",
    "Poin insight/rekomendasi 2"
  ]
}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://antigravity-reporting.com',
      'X-Title': 'KeepNoteAI'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: 'Anda adalah pakar notulensi profesional.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenRouter Error:', errorBody);
    throw new Error('Failed to generate notulen with AI');
  }

  const data = await response.json();
  
  if (!data.choices || data.choices.length === 0) {
    console.error('AI Provider Response Error:', data);
    const apiError = data.error?.message || 'AI Provider returned no results.';
    throw new Error(`${apiError} (Model: ${model})`);
  }

  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch (e) {
    console.error('Failed to parse AI JSON:', content);
    throw new Error('AI output was not valid JSON. Please try again.');
  }
}
