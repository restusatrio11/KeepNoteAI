import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  WidthType,
  ImageRun,
  ShadingType,
  Footer,
  PageNumber,
} from 'docx';
import * as fs from 'fs';
import * as path from 'path';
import { DossierDocumentPayload } from './validations';

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

async function resolveImageToBuffer(imageSource: string): Promise<Buffer | null> {
  try {
    if (!imageSource) return null;

    // Base64 Data URL
    if (imageSource.startsWith('data:image/')) {
      const parts = imageSource.split(',');
      if (parts.length > 1) {
        return Buffer.from(parts[1], 'base64');
      }
    }

    // Local file path
    if (imageSource.startsWith('/')) {
      const localPath = path.join(process.cwd(), 'public', imageSource);
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }
    }

    // Google Drive URL
    let fetchUrl = imageSource;
    const driveMatch = imageSource.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      fetchUrl = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }

    const res = await fetch(fetchUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch (err) {
    console.warn('Failed to resolve image to buffer:', err);
    return null;
  }
}

function noBorder() {
  return { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
}

function thinBorder(color = 'CBD5E1') {
  return { style: BorderStyle.SINGLE, size: 4, color };
}

function createMetaRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 32, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: 'F8FAFC' },
        margins: { top: 100, bottom: 100, left: 140, right: 140 },
        children: [
          new Paragraph({
            children: [new TextRun({ text: label, bold: true, size: 20, font: 'Calibri' })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 68, type: WidthType.PERCENTAGE },
        margins: { top: 100, bottom: 100, left: 140, right: 140 },
        children: [
          new Paragraph({
            children: [new TextRun({ text: value || '-', size: 20, font: 'Calibri' })],
          }),
        ],
      }),
    ],
  });
}

function createSectionHeading(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 22,
        font: 'Calibri',
        color: '003366',
      }),
    ],
  });
}

export async function generateDailyDossierDocx(data: DossierDocumentPayload): Promise<Buffer> {
  // Load BPS Logo
  let logoBuffer: Buffer | null = null;
  try {
    const logoPath = path.join(process.cwd(), 'public', 'Logo BPS Prov (3).png');
    if (fs.existsSync(logoPath)) {
      logoBuffer = fs.readFileSync(logoPath);
    }
  } catch (e) {
    console.warn('Logo BPS not loaded:', e);
  }

  const children: any[] = [];

  // 1. KOP HEADER RESMI BPS
  const headerRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: noBorder(),
            bottom: noBorder(),
            left: noBorder(),
            right: noBorder(),
          },
          children: [
            logoBuffer
              ? new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new ImageRun({
                      data: logoBuffer,
                      transformation: { width: 380, height: 85 },
                    } as any),
                  ],
                })
              : new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: 'BADAN PUSAT STATISTIK',
                      bold: true,
                      size: 28,
                      font: 'Calibri',
                      color: '003366',
                    }),
                  ],
                }),
          ],
        }),
      ],
    }),
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: noBorder(),
        bottom: noBorder(),
        left: noBorder(),
        right: noBorder(),
        insideHorizontal: noBorder(),
        insideVertical: noBorder(),
      },
      rows: headerRows,
    })
  );

  // Garis Pembatas Kop Ganda
  children.push(
    new Paragraph({
      border: { bottom: { color: '003366', style: BorderStyle.DOUBLE, size: 12, space: 1 } },
      children: [],
      spacing: { before: 120, after: 200 },
    })
  );

  // 2. JUDUL DOKUMEN & TANGGAL
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 60 },
      children: [
        new TextRun({
          text: 'LAPORAN PELAKSANAAN KEGIATAN HARIAN',
          bold: true,
          size: 24,
          font: 'Calibri',
          color: '003366',
        }),
      ],
    })
  );

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [
        new TextRun({
          text: (data.judul || 'JURNAL KEGIATAN KERJA').toUpperCase(),
          bold: true,
          size: 20,
          font: 'Calibri',
          color: '1E293B',
        }),
      ],
    })
  );

  // 3. TABEL METADATA PELAKSANAAN
  const metaRows: TableRow[] = [
    createMetaRow('Hari / Tanggal', formatDateIndo(data.tanggal)),
    createMetaRow('Waktu Pelaksanaan', data.waktu || 'Hari Kerja Kedinasan'),
    createMetaRow('Tempat / Lokasi', data.tempat || 'Kantor / Wilayah Tugas BPS'),
    createMetaRow('Tim Kerja', data.timKerja || 'BPS Kabupaten / Provinsi'),
    createMetaRow('Rencana Kinerja (SKP)', data.rencanaKinerja || 'Pelaksanaan Tugas Kedinasan BPS'),
    createMetaRow(
      'Pelaksana Kegiatan',
      data.nipPelaksana ? `${data.pelaksana} (NIP. ${data.nipPelaksana})` : data.pelaksana
    ),
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: thinBorder(),
        bottom: thinBorder(),
        left: thinBorder(),
        right: thinBorder(),
        insideHorizontal: thinBorder('E2E8F0'),
        insideVertical: thinBorder('E2E8F0'),
      },
      rows: metaRows,
    })
  );

  children.push(new Paragraph({ spacing: { before: 200 } }));

  // 4. RINGKASAN EKSEKUTIF (Callout Box)
  if (data.ringkasan) {
    const summaryCell = new TableCell({
      borders: {
        top: thinBorder('93C5FD'),
        bottom: thinBorder('93C5FD'),
        left: { style: BorderStyle.SINGLE, size: 24, color: '0284C7' },
        right: thinBorder('93C5FD'),
      },
      shading: { type: ShadingType.CLEAR, fill: 'F0F7FF' },
      margins: { top: 160, bottom: 160, left: 200, right: 200 },
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: 'RINGKASAN EKSEKUTIF',
              bold: true,
              size: 20,
              font: 'Calibri',
              color: '0369A1',
            }),
          ],
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: data.ringkasan,
              size: 20,
              font: 'Calibri',
              color: '1E293B',
            }),
          ],
        }),
      ],
    });

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [new TableRow({ children: [summaryCell] })],
      })
    );
  }

  // 5. LATAR BELAKANG & TUJUAN (Jika Ada)
  if (data.latarBelakang) {
    children.push(createSectionHeading('I. LATAR BELAKANG & TUJUAN'));
    children.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 140 },
        children: [
          new TextRun({
            text: data.latarBelakang,
            size: 20,
            font: 'Calibri',
          }),
        ],
      })
    );
  }

  // 6. URAIAN PELAKSANAAN KEGIATAN
  children.push(
    createSectionHeading(data.latarBelakang ? 'II. URAIAN PELAKSANAAN KEGIATAN' : 'I. URAIAN PELAKSANAAN KEGIATAN')
  );

  if (Array.isArray(data.uraianKegiatan) && data.uraianKegiatan.length > 0) {
    data.uraianKegiatan.forEach((uraian, idx) => {
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: 400, hanging: 300 },
          spacing: { after: 100 },
          children: [
            new TextRun({
              text: `${idx + 1}. `,
              bold: true,
              size: 20,
              font: 'Calibri',
            }),
            new TextRun({
              text: uraian,
              size: 20,
              font: 'Calibri',
            }),
          ],
        })
      );
    });
  } else {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Tidak ada rincian kegiatan khusus.', size: 20, font: 'Calibri' })],
      })
    );
  }

  // 7. HASIL & CAPAIAN OUTPUT
  const secCapTitle = data.latarBelakang ? 'III. HASIL & CAPAIAN OUTPUT' : 'II. HASIL & CAPAIAN OUTPUT';
  children.push(createSectionHeading(secCapTitle));

  if (Array.isArray(data.capaianOutput) && data.capaianOutput.length > 0) {
    data.capaianOutput.forEach((capaian) => {
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          indent: { left: 400, hanging: 240 },
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: '•  ',
              bold: true,
              size: 20,
              font: 'Calibri',
              color: '003366',
            }),
            new TextRun({
              text: capaian,
              size: 20,
              font: 'Calibri',
            }),
          ],
        })
      );
    });
  }

  // 8. KENDALA & TINDAK LANJUT
  if (data.kendalaTindakLanjut) {
    const secKendalaTitle = data.latarBelakang
      ? 'IV. KENDALA & RENCANA TINDAK LANJUT'
      : 'III. KENDALA & RENCANA TINDAK LANJUT';
    children.push(createSectionHeading(secKendalaTitle));
    children.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 140 },
        children: [
          new TextRun({
            text: data.kendalaTindakLanjut,
            size: 20,
            font: 'Calibri',
          }),
        ],
      })
    );
  }

  // 9. DOKUMENTASI FOTO KEGIATAN (2-COLUMN JOURNAL GRID)
  if (Array.isArray(data.photos) && data.photos.length > 0) {
    const secPhotoTitle = data.latarBelakang
      ? data.kendalaTindakLanjut
        ? 'V. DOKUMENTASI KEGIATAN'
        : 'IV. DOKUMENTASI KEGIATAN'
      : data.kendalaTindakLanjut
      ? 'IV. DOKUMENTASI KEGIATAN'
      : 'III. DOKUMENTASI KEGIATAN';

    children.push(createSectionHeading(secPhotoTitle));
    children.push(
      new Paragraph({
        spacing: { after: 160 },
        children: [
          new TextRun({
            text: 'Dokumentasi visual pelaksanaan kegiatan kedinasan:',
            italics: true,
            size: 19,
            font: 'Calibri',
            color: '64748B',
          }),
        ],
      })
    );

    // Resolve all image buffers concurrently
    const resolvedBuffers = await Promise.all(
      data.photos.map(async (p) => {
        const buf = await resolveImageToBuffer(p.dataUrl);
        return { buffer: buf, caption: p.caption };
      })
    );

    const validPhotos = resolvedBuffers.filter((p) => p.buffer !== null) as {
      buffer: Buffer;
      caption: string;
    }[];

    const galleryRows: TableRow[] = [];

    // Pair up photos into 2 columns
    for (let i = 0; i < validPhotos.length; i += 2) {
      const p1 = validPhotos[i];
      const p2 = validPhotos[i + 1];

      const cell1Children: Paragraph[] = [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: p1.buffer,
              transformation: { width: 250, height: 170 },
            } as any),
          ],
          spacing: { before: 80, after: 60 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: `Gambar ${i + 1}: ${p1.caption || 'Dokumentasi Kegiatan'}`,
              italics: true,
              size: 17,
              font: 'Calibri',
              color: '334155',
            }),
          ],
          spacing: { after: 100 },
        }),
      ];

      const cell2Children: Paragraph[] = p2
        ? [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: p2.buffer,
                  transformation: { width: 250, height: 170 },
                } as any),
              ],
              spacing: { before: 80, after: 60 },
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: `Gambar ${i + 2}: ${p2.caption || 'Dokumentasi Kegiatan'}`,
                  italics: true,
                  size: 17,
                  font: 'Calibri',
                  color: '334155',
                }),
              ],
              spacing: { after: 100 },
            }),
          ]
        : [new Paragraph({ children: [] })];

      galleryRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: {
                top: thinBorder('E2E8F0'),
                bottom: thinBorder('E2E8F0'),
                left: thinBorder('E2E8F0'),
                right: thinBorder('E2E8F0'),
              },
              shading: { type: ShadingType.CLEAR, fill: 'FAFAFA' },
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              children: cell1Children,
            }),
            new TableCell({
              width: { size: 50, type: WidthType.PERCENTAGE },
              borders: p2
                ? {
                    top: thinBorder('E2E8F0'),
                    bottom: thinBorder('E2E8F0'),
                    left: thinBorder('E2E8F0'),
                    right: thinBorder('E2E8F0'),
                  }
                : { top: noBorder(), bottom: noBorder(), left: noBorder(), right: noBorder() },
              shading: p2 ? { type: ShadingType.CLEAR, fill: 'FAFAFA' } : undefined,
              margins: { top: 100, bottom: 100, left: 100, right: 100 },
              children: cell2Children,
            }),
          ],
        })
      );
    }

    if (galleryRows.length > 0) {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: noBorder(),
            bottom: noBorder(),
            left: noBorder(),
            right: noBorder(),
            insideHorizontal: noBorder(),
            insideVertical: noBorder(),
          },
          rows: galleryRows,
        })
      );
    }
  }

  // 10. LEMBAR PENGESAHAN / TANDA TANGAN
  children.push(new Paragraph({ spacing: { before: 360 } }));

  const tempatTgl = `${data.tempat?.split('/')[0]?.trim() || 'Tempat Tugas'}, ${formatDateIndo(data.tanggal)}`;
  const namaPenanggungJawab = data.penanggungJawab || 'Ketua Tim Kerja';
  const jabatanPenanggungJawab = data.jabatanPenanggungJawab || 'Penanggung Jawab / Ketua Tim';

  let ttdBuffer: Buffer | null = null;
  if (data.tandaTanganUrl) {
    ttdBuffer = await resolveImageToBuffer(data.tandaTanganUrl);
  }

  const pelaksanaCellChildren: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: tempatTgl, size: 20, font: 'Calibri' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Pelaksana Kegiatan,', bold: true, size: 20, font: 'Calibri' })],
      spacing: ttdBuffer ? { after: 100 } : { after: 160 },
    }),
  ];

  if (ttdBuffer) {
    pelaksanaCellChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: ttdBuffer,
            transformation: { width: 130, height: 55 },
          } as any),
        ],
        spacing: { before: 60, after: 100 },
      })
    );
  }

  pelaksanaCellChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `( ${data.pelaksana} )`,
          bold: true,
          size: 20,
          font: 'Calibri',
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: data.nipPelaksana ? `NIP. ${data.nipPelaksana}` : 'NIP. ........................................',
          size: 19,
          font: 'Calibri',
        }),
      ],
    })
  );

  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: noBorder(),
      bottom: noBorder(),
      left: noBorder(),
      right: noBorder(),
      insideHorizontal: noBorder(),
      insideVertical: noBorder(),
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Mengetahui,', size: 20, font: 'Calibri' })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: jabatanPenanggungJawab, bold: true, size: 20, font: 'Calibri' })],
                spacing: { after: 800 }, // Space for signature
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `( ${namaPenanggungJawab} )`,
                    bold: true,
                    size: 20,
                    font: 'Calibri',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: data.nipPenanggungJawab ? `NIP. ${data.nipPenanggungJawab}` : 'NIP. ........................................',
                    size: 19,
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: pelaksanaCellChildren,
          }),
        ],
      }),
    ],
  });

  children.push(signatureTable);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Calibri', size: 20 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, // 1 inch margins
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'KeepNoteAI - Badan Pusat Statistik RI | Halaman ',
                    size: 16,
                    color: '94A3B8',
                    font: 'Calibri',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 16,
                    color: '94A3B8',
                    font: 'Calibri',
                  }),
                  new TextRun({
                    text: ' dari ',
                    size: 16,
                    color: '94A3B8',
                    font: 'Calibri',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 16,
                    color: '94A3B8',
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
