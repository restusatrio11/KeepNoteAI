'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import {
  FileText,
  Sparkles,
  Download,
  Image as ImageIcon,
  Plus,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Users,
  Target,
  User,
  CheckCircle2,
  Loader2,
  Eye,
  Edit3,
  RotateCcw,
  UploadCloud,
  FileCheck,
  ChevronRight,
  AlertCircle,
  Save,
  FileSignature,
  Paperclip,
  File as FileIcon,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/providers/ToastProvider';
import SearchableSelect from '@/components/SearchableSelect';
import { DossierAttachment } from '@/lib/validations';

interface PhotoItem {
  id: string;
  dataUrl: string;
  caption: string;
}

function processSignatureImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        // Export as PNG so transparency is preserved (prevents black box background)
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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

export default function JurnalPage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Tab: 'form' | 'preview'
  const [activeTab, setActiveTab] = useState<'form' | 'preview'>('form');

  // Master Options
  const [timOptions, setTimOptions] = useState<any[]>([]);
  const [rencanaOptions, setRencanaOptions] = useState<any[]>([]);

  // Metadata State
  const todayStr = new Date().toISOString().split('T')[0];
  const [tanggal, setTanggal] = useState(todayStr);
  const [waktu, setWaktu] = useState('08.00 - 16.00 WIB');
  const [tempat, setTempat] = useState('Kantor BPS & Lapangan');
  const [selectedTimId, setSelectedTimId] = useState('');
  const [selectedRencanaId, setSelectedRencanaId] = useState('');
  const [pelaksana, setPelaksana] = useState('');
  const [nipPelaksana, setNipPelaksana] = useState('');
  const [tandaTangan, setTandaTangan] = useState<string | null>(null);
  const ttdInputRef = useRef<HTMLInputElement>(null);

  // Raw Activity Input & AI Mode
  const [rawText, setRawText] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);
  const [aiPolished, setAiPolished] = useState(false);

  // Structured Dossier Content
  const [judul, setJudul] = useState('Laporan Pelaksanaan Kegiatan Harian');
  const [ringkasan, setRingkasan] = useState('');
  const [latarBelakang, setLatarBelakang] = useState('');
  const [uraianKegiatan, setUraianKegiatan] = useState<string[]>([]);
  const [capaianOutput, setCapaianOutput] = useState<string[]>([]);
  const [kendalaTindakLanjut, setKendalaTindakLanjut] = useState('');

  // Photos
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Lampiran Documents (PDF / Docs)
  const [lampiranList, setLampiranList] = useState<DossierAttachment[]>([]);
  const [isUploadingLampiran, setIsUploadingLampiran] = useState(false);
  const lampiranInputRef = useRef<HTMLInputElement>(null);

  // Export Loading States
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isSavingDb, setIsSavingDb] = useState(false);
  const [lastSavedDriveUrl, setLastSavedDriveUrl] = useState<string | null>(null);

  // Initialize user name
  useEffect(() => {
    if (session?.user?.name && !pelaksana) {
      setPelaksana(session.user.name);
    }
  }, [session, pelaksana]);

  // Load Tim and Rencana options
  useEffect(() => {
    async function loadOptions() {
      try {
        const [resTim, resRencana] = await Promise.all([
          fetch('/api/tim'),
          fetch('/api/rencana'),
        ]);
        if (resTim.ok) {
          const tims = await resTim.json();
          setTimOptions(tims);
          if (tims.length > 0 && !selectedTimId) {
            setSelectedTimId(tims[0].id);
          }
        }
        if (resRencana.ok) {
          const rencanas = await resRencana.json();
          setRencanaOptions(rencanas);
          if (rencanas.length > 0 && !selectedRencanaId) {
            setSelectedRencanaId(rencanas[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load options:', err);
      }
    }
    loadOptions();
  }, []);

  const getSelectedTimName = () => {
    const found = timOptions.find((t) => t.id === selectedTimId);
    return found ? found.nama : 'Tim Kerja BPS';
  };

  const getSelectedRencanaName = () => {
    const found = rencanaOptions.find((r) => r.id === selectedRencanaId);
    return found ? found.nama : 'Pelaksanaan Tugas Kedinasan BPS';
  };

  const filteredRencanaOptions = useMemo(() => {
    if (!selectedTimId) return rencanaOptions;
    const filtered = rencanaOptions.filter((r) => r.timId === selectedTimId);
    return filtered.length > 0 ? filtered : rencanaOptions;
  }, [rencanaOptions, selectedTimId]);


  // Polish with AI
  const handlePolishWithAI = async () => {
    if (!rawText.trim()) {
      showToast('Tuliskan catatan aktivitas kegiatan terlebih dahulu', 'error');
      return;
    }

    setIsPolishing(true);
    try {
      const res = await fetch('/api/ai/polish-dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deskripsi: rawText,
          meta: {
            tim: getSelectedTimName(),
            rencana: getSelectedRencanaName(),
            pelaksana: pelaksana || session?.user?.name || 'Pegawai BPS',
            judul: judul !== 'Laporan Pelaksanaan Kegiatan Harian' ? judul : undefined,
            lokasi: tempat,
          },
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Gagal memproses dengan AI');
      }

      const d = resData.data;
      if (d.judul) setJudul(d.judul);
      if (d.ringkasan) setRingkasan(d.ringkasan);
      if (d.latarBelakang) setLatarBelakang(d.latarBelakang);
      if (Array.isArray(d.uraianKegiatan) && d.uraianKegiatan.length > 0) {
        setUraianKegiatan(d.uraianKegiatan);
      }
      if (Array.isArray(d.capaianOutput) && d.capaianOutput.length > 0) {
        setCapaianOutput(d.capaianOutput);
      }
      if (d.kendalaTindakLanjut) setKendalaTindakLanjut(d.kendalaTindakLanjut);

      setAiPolished(true);
      showToast('Laporan berhasil dirapikan dengan standar BPS!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menghubungi AI', 'error');
    } finally {
      setIsPolishing(false);
    }
  };

  // Convert raw text directly without AI
  const handleUseRawText = () => {
    if (!rawText.trim()) {
      showToast('Tuliskan catatan aktivitas kegiatan terlebih dahulu', 'error');
      return;
    }

    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    setJudul('Laporan Pelaksanaan Kegiatan Harian');
    setRingkasan(lines[0] || rawText);
    setLatarBelakang('');
    setUraianKegiatan(lines.length > 1 ? lines : [rawText]);
    setCapaianOutput(['Kegiatan harian telah terlaksana sesuai rencana kerja.']);
    setKendalaTindakLanjut('');
    setAiPolished(false);
    showToast('Teks asli diterapkan ke dalam laporan.', 'info');
  };

  // Handle Signature Upload (Optional)
  const handleTtdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Format tanda tangan harus gambar (PNG, JPG, atau WEBP)', 'error');
      return;
    }
    try {
      const processedTtd = await processSignatureImage(file);
      setTandaTangan(processedTtd);
      showToast('Tanda tangan pelaksana berhasil diunggah!', 'success');
    } catch (err) {
      showToast('Gagal memproses tanda tangan', 'error');
    }
    if (ttdInputRef.current) ttdInputRef.current.value = '';
  };

  const removeTtd = () => {
    setTandaTangan(null);
    showToast('Tanda tangan dihapus. Dokumen akan diekspor tanpa sematan tanda tangan.', 'info');
  };

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingPhoto(true);
    try {
      const newItems: PhotoItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const compressedBase64 = await compressImage(file);
        const indexNumber = photos.length + newItems.length + 1;
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          dataUrl: compressedBase64,
          caption: `Dokumentasi pelaksanaan kegiatan #${indexNumber}`,
        });
      }

      setPhotos((prev) => [...prev, ...newItems]);
      showToast(`${newItems.length} foto berhasil ditambahkan`, 'success');
    } catch (err) {
      showToast('Gagal memproses gambar', 'error');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const updateCaption = (id: string, caption: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === id ? { ...p, caption } : p))
    );
  };

  // Handle Lampiran Documents Upload (PDF, docs)
  const handleLampiranUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingLampiran(true);
    try {
      const newItems: DossierAttachment[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const indexNumber = lampiranList.length + newItems.length + 1;
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          nama: file.name,
          tipe: file.type || 'application/pdf',
          ukuran: file.size,
          dataUrl,
          keterangan: `Lampiran ${indexNumber}: ${cleanName}`,
        });
      }

      setLampiranList((prev) => [...prev, ...newItems]);
      showToast(`${newItems.length} berkas lampiran berhasil ditambahkan!`, 'success');
    } catch (err) {
      showToast('Gagal memproses berkas lampiran', 'error');
    } finally {
      setIsUploadingLampiran(false);
      if (lampiranInputRef.current) lampiranInputRef.current.value = '';
    }
  };

  const removeLampiran = (id: string) => {
    setLampiranList((prev) => prev.filter((l) => l.id !== id));
  };

  const updateLampiranKeterangan = (id: string, keterangan: string) => {
    setLampiranList((prev) =>
      prev.map((l) => (l.id === id ? { ...l, keterangan } : l))
    );
  };

  const previewLampiran = (item: DossierAttachment) => {
    if (!item.dataUrl) return;
    if (item.dataUrl.startsWith('http')) {
      window.open(item.dataUrl, '_blank');
      return;
    }
    try {
      const parts = item.dataUrl.split(',');
      const byteString = atob(parts[1]);
      const mimeString = parts[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch {
      window.open(item.dataUrl, '_blank');
    }
  };

  // Dynamic Array Handlers
  const addUraianItem = () => {
    setUraianKegiatan((prev) => [...prev, 'Melaksanakan kegiatan koordinasi / teknis...']);
  };

  const updateUraianItem = (index: number, val: string) => {
    setUraianKegiatan((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const removeUraianItem = (index: number) => {
    setUraianKegiatan((prev) => prev.filter((_, i) => i !== index));
  };

  const addCapaianItem = () => {
    setCapaianOutput((prev) => [...prev, 'Terselesaikannya output kegiatan harian']);
  };

  const updateCapaianItem = (index: number, val: string) => {
    setCapaianOutput((prev) => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const removeCapaianItem = (index: number) => {
    setCapaianOutput((prev) => prev.filter((_, i) => i !== index));
  };

  // Build Payload
  const getPayload = () => {
    return {
      judul,
      tanggal,
      waktu,
      tempat,
      timKerja: getSelectedTimName(),
      rencanaKinerja: getSelectedRencanaName(),
      pelaksana: pelaksana || 'Pegawai BPS',
      nipPelaksana: nipPelaksana || undefined,
      ringkasan: ringkasan || rawText || 'Kegiatan kedinasan telah terlaksana.',
      latarBelakang: latarBelakang || undefined,
      uraianKegiatan:
        uraianKegiatan.length > 0 ? uraianKegiatan : [rawText || 'Melaksanakan tugas kedinasan.'],
      capaianOutput:
        capaianOutput.length > 0 ? capaianOutput : ['Tercapainya target kegiatan harian.'],
      kendalaTindakLanjut: kendalaTindakLanjut || undefined,
      tandaTanganUrl: tandaTangan || undefined,
      photos: photos.map((p) => ({ dataUrl: p.dataUrl, caption: p.caption })),
      lampiran: lampiranList,
    };
  };

  // Download Document
  const handleDownload = async (format: 'docx' | 'pdf') => {
    if (!tanggal || !pelaksana) {
      showToast('Tanggal dan nama pelaksana wajib diisi', 'error');
      return;
    }

    const isPdf = format === 'pdf';
    if (isPdf) setIsExportingPdf(true);
    else setIsExportingDocx(true);

    try {
      const payload = getPayload();
      const res = await fetch(`/api/laporan/generate-doc?format=${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Gagal mengunduh dokumen ${format.toUpperCase()}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeTitle = (judul || 'Laporan_Harian_BPS').replace(/[^a-zA-Z0-9_\-]/g, '_');
      a.href = url;
      a.download = `${safeTitle}_${tanggal}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast(`Dokumen ${format.toUpperCase()} berhasil diunduh!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan saat mengunduh', 'error');
    } finally {
      if (isPdf) setIsExportingPdf(false);
      else setIsExportingDocx(false);
    }
  };

  // Save to Laporan DB & Upload DOCX to Drive
  const handleSaveToDb = async () => {
    if (!selectedRencanaId) {
      showToast('Pilih Program / Rencana Kinerja terlebih dahulu', 'error');
      return;
    }
    if (!tanggal || !pelaksana) {
      showToast('Tanggal dan nama pelaksana wajib diisi', 'error');
      return;
    }

    setIsSavingDb(true);
    try {
      const payload = getPayload();
      const res = await fetch('/api/laporan/save-jurnal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dossier: payload,
          rencanaId: selectedRencanaId,
          waktu,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menyimpan laporan ke histori database');
      }

      if (data.pdfDriveLink || data.docxDriveLink) {
        setLastSavedDriveUrl(data.pdfDriveLink || data.docxDriveLink);
      }

      showToast(data.message || 'Laporan berhasil disimpan ke Menu Laporan!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Gagal menyimpan', 'error');
    } finally {
      setIsSavingDb(false);
    }
  };

  return (
    <div className="animate-in" style={{ paddingBottom: '5rem' }}>
      {/* HEADER SECTION */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(14, 165, 233, 0.2))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(59, 130, 246, 0.3)',
              }}
            >
              <FileCheck size={22} color="var(--primary)" />
            </div>
            <h1 style={{ fontWeight: 800, fontSize: '1.8rem', letterSpacing: '-0.5px' }}>
              Jurnal & Laporan Kerja Harian
            </h1>
          </div>
          <p className="text-muted" style={{ fontSize: '0.95rem' }}>
            Buat dossier kegiatan harian BPS berstandar jurnal publikasi dengan foto dokumentasi, AI polish, dan ekspor Word & PDF.
          </p>
        </div>

        {/* Tab Switcher & Quick Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'flex',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '4px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
            }}
          >
            <button
              onClick={() => setActiveTab('form')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'form' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'form' ? '#fff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s',
              }}
            >
              <Edit3 size={15} />
              <span>Input & Susun</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'preview' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'preview' ? '#fff' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s',
              }}
            >
              <Eye size={15} />
              <span>Pratinjau Jurnal</span>
            </button>
          </div>

          <button
            onClick={handleSaveToDb}
            disabled={isSavingDb}
            className="btn btn-primary"
            style={{
              width: 'auto',
              background: 'linear-gradient(135deg, #059669, #10b981)',
              borderColor: '#059669',
            }}
          >
            {isSavingDb ? <Loader2 size={16} className="spin" /> : <UploadCloud size={16} />}
            <span>Simpan ke Laporan & Drive</span>
          </button>

          <button
            onClick={() => handleDownload('docx')}
            disabled={isExportingDocx}
            className="btn glass"
            style={{
              width: 'auto',
              background: 'rgba(59, 130, 246, 0.1)',
              borderColor: 'rgba(59, 130, 246, 0.3)',
              color: '#93c5fd',
            }}
          >
            {isExportingDocx ? <Loader2 size={16} className="spin" /> : <FileText size={16} />}
            <span>Download Word</span>
          </button>

          <button
            onClick={() => handleDownload('pdf')}
            disabled={isExportingPdf}
            className="btn glass"
            style={{ width: 'auto' }}
          >
            {isExportingPdf ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
            <span>Download PDF</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      {activeTab === 'form' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 0.75fr)', gap: '1.75rem' }}>
          {/* LEFT COLUMN: Activity Notes, AI Controls & Structured Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {/* CARD 1: Catatan Mentah & AI Polish Controller */}
            <div className="card glass" style={{ border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Sparkles size={16} color="var(--primary)" />
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    1. Catatan Mentah Kegiatan ("Ngapain Aja")
                  </h3>
                </div>

                {aiPolished && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '20px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <CheckCircle2 size={13} />
                    Standar BPS Diterapkan
                  </span>
                )}
              </div>

              <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                Tuliskan aktivitas harian Anda secara santai atau poin-poin. Anda bebas memilih untuk merapikannya dengan AI berstandar BPS atau langsung memakai teks asli.
              </p>

              <textarea
                className="input-base"
                rows={4}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Contoh: Pagi jam 8 briefing mitra Sakernas di aula BPS. Jam 10 turun ke Desa Sukamaju verifikasi dokumen anomali di aplikasi Fasih. Siang diskusi dengan PML. Sore rekap 15 dokumen dan input log harian."
                style={{
                  resize: 'vertical',
                  fontSize: '0.9rem',
                  lineHeight: '1.5',
                  marginBottom: '1rem',
                  borderColor: aiPolished ? 'rgba(59, 130, 246, 0.4)' : undefined,
                }}
              />

              {/* Action Buttons for AI vs Raw */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handlePolishWithAI}
                  disabled={isPolishing || !rawText.trim()}
                  className="btn btn-primary"
                  style={{
                    flex: '1 1 220px',
                    background: 'linear-gradient(135deg, #2563eb, #0284c7)',
                    fontSize: '0.88rem',
                    padding: '0.75rem 1.25rem',
                  }}
                >
                  {isPolishing ? (
                    <>
                      <Loader2 size={16} className="spin" />
                      <span>Merapikan Standar BPS...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>✨ Rapikan dengan AI (Standar BPS)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleUseRawText}
                  disabled={!rawText.trim()}
                  className="btn glass"
                  style={{
                    flex: '1 1 180px',
                    fontSize: '0.88rem',
                    padding: '0.75rem 1.25rem',
                  }}
                >
                  <RotateCcw size={15} />
                  <span>Gunakan Teks Asli (Tanpa AI)</span>
                </button>
              </div>
            </div>

            {/* CARD 2: Struktur Jurnal Kedinasan (Editable Preview) */}
            <div className="card glass">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Edit3 size={16} color="var(--primary)" />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  2. Redaksi Laporan & Struktur Jurnal
                </h3>
              </div>

              {/* Judul Laporan */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e2e8f0' }}>
                  Judul Dokumen Laporan
                </label>
                <input
                  type="text"
                  className="input-base"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  placeholder="Misal: Laporan Pelaksanaan Verifikasi Anomali dan Rekapitulasi Data Sakernas"
                />
              </div>

              {/* Ringkasan Eksekutif */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e2e8f0' }}>
                  Ringkasan Eksekutif (Abstrak Singkat)
                </label>
                <textarea
                  className="input-base"
                  rows={2}
                  value={ringkasan}
                  onChange={(e) => setRingkasan(e.target.value)}
                  placeholder="Ringkasan 1-2 kalimat mengenai esensi kegiatan dan hasil pokok hari ini..."
                  style={{ resize: 'vertical', fontSize: '0.88rem' }}
                />
              </div>

              {/* Latar Belakang & Tujuan (Opsional) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e2e8f0' }}>
                  Latar Belakang & Tujuan <span className="text-muted" style={{ fontWeight: 400 }}>(Opsional)</span>
                </label>
                <textarea
                  className="input-base"
                  rows={2}
                  value={latarBelakang}
                  onChange={(e) => setLatarBelakang(e.target.value)}
                  placeholder="Konteks pelaksanaan tugas dalam kerangka program kerja BPS..."
                  style={{ resize: 'vertical', fontSize: '0.88rem' }}
                />
              </div>

              {/* Uraian Pelaksanaan Kegiatan (Dynamic List) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
                    Uraian Rinci Pelaksanaan Kegiatan ({uraianKegiatan.length} Poin)
                  </label>
                  <button
                    type="button"
                    onClick={addUraianItem}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                    }}
                  >
                    <Plus size={14} />
                    <span>Tambah Poin</span>
                  </button>
                </div>

                {uraianKegiatan.length === 0 ? (
                  <p className="text-muted" style={{ fontSize: '0.82rem', fontStyle: 'italic', padding: '0.5rem 0' }}>
                    Belum ada uraian kegiatan. Tuliskan di atas lalu klik "Rapikan dengan AI" atau "Gunakan Teks Asli".
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {uraianKegiatan.map((uraian, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'var(--primary)',
                            flexShrink: 0,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          className="input-base"
                          value={uraian}
                          onChange={(e) => updateUraianItem(idx, e.target.value)}
                          style={{ fontSize: '0.85rem', padding: '0.55rem 0.85rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => removeUraianItem(idx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '0.4rem',
                            opacity: 0.7,
                            transition: 'opacity 0.2s',
                          }}
                          title="Hapus poin"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hasil & Capaian Output (Dynamic List) */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#e2e8f0' }}>
                    Hasil & Capaian Output ({capaianOutput.length} Output)
                  </label>
                  <button
                    type="button"
                    onClick={addCapaianItem}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--primary)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                    }}
                  >
                    <Plus size={14} />
                    <span>Tambah Output</span>
                  </button>
                </div>

                {capaianOutput.length === 0 ? (
                  <p className="text-muted" style={{ fontSize: '0.82rem', fontStyle: 'italic', padding: '0.5rem 0' }}>
                    Belum ada capaian output.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {capaianOutput.map((cap, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ color: 'var(--primary)', fontSize: '1rem', fontWeight: 700, padding: '0 4px' }}>
                          •
                        </span>
                        <input
                          type="text"
                          className="input-base"
                          value={cap}
                          onChange={(e) => updateCapaianItem(idx, e.target.value)}
                          style={{ fontSize: '0.85rem', padding: '0.55rem 0.85rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => removeCapaianItem(idx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '0.4rem',
                            opacity: 0.7,
                          }}
                          title="Hapus capaian"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Kendala & Tindak Lanjut */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: '#e2e8f0' }}>
                  Kendala & Rencana Tindak Lanjut <span className="text-muted" style={{ fontWeight: 400 }}>(Opsional)</span>
                </label>
                <textarea
                  className="input-base"
                  rows={2}
                  value={kendalaTindakLanjut}
                  onChange={(e) => setKendalaTindakLanjut(e.target.value)}
                  placeholder="Catatan hambatan di lapangan atau agenda rencana tindak lanjut hari berikutnya..."
                  style={{ resize: 'vertical', fontSize: '0.88rem' }}
                />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Metadata & Multi-Photo Upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {/* CARD 3: Metadata Kegiatan */}
            <div className="card glass">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Calendar size={16} color="var(--primary)" />
                </div>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                  3. Informasi & Verifikasi
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Tanggal & Waktu */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                      Tanggal
                    </label>
                    <input
                      type="date"
                      className="input-base"
                      value={tanggal}
                      onChange={(e) => setTanggal(e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                      Waktu Pelaksanaan
                    </label>
                    <input
                      type="text"
                      className="input-base"
                      value={waktu}
                      onChange={(e) => setWaktu(e.target.value)}
                      placeholder="08.00 - 16.00 WIB"
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Lokasi / Tempat */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                    Tempat / Lokasi Kegiatan
                  </label>
                  <input
                    type="text"
                    className="input-base"
                    value={tempat}
                    onChange={(e) => setTempat(e.target.value)}
                    placeholder="Kantor BPS / Wilayah Lapangan"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                {/* Tim Kerja */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                    Tim Kerja
                  </label>
                  <SearchableSelect
                    options={timOptions}
                    value={selectedTimId}
                    onChange={(val) => {
                      setSelectedTimId(val);
                      if (val) {
                        const inTeam = rencanaOptions.filter((r) => r.timId === val);
                        if (inTeam.length > 0 && !inTeam.some((r) => r.id === selectedRencanaId)) {
                          setSelectedRencanaId(inTeam[0].id);
                        }
                      }
                    }}
                    placeholder="Cari & pilih Tim Kerja BPS..."
                  />
                </div>

                {/* Rencana Kinerja (SKP) */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                    Rencana Kinerja (Program / SKP)
                  </label>
                  <SearchableSelect
                    options={filteredRencanaOptions}
                    value={selectedRencanaId}
                    onChange={(val) => {
                      setSelectedRencanaId(val);
                      const matchRk = rencanaOptions.find((r) => r.id === val);
                      if (matchRk?.timId && (!selectedTimId || selectedTimId !== matchRk.timId)) {
                        setSelectedTimId(matchRk.timId);
                      }
                    }}
                    placeholder="Cari kode atau nama Rencana Kinerja..."
                  />
                </div>

                {/* Pelaksana & NIP */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                      Nama Pelaksana
                    </label>
                    <input
                      type="text"
                      className="input-base"
                      value={pelaksana}
                      onChange={(e) => setPelaksana(e.target.value)}
                      placeholder="Nama Lengkap Pegawai"
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem', color: 'var(--text-muted)' }}>
                      NIP Pelaksana
                    </label>
                    <input
                      type="text"
                      className="input-base"
                      value={nipPelaksana}
                      onChange={(e) => setNipPelaksana(e.target.value)}
                      placeholder="199..."
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                </div>


                {/* Tanda Tangan Pelaksana (Opsional) */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.85rem', marginTop: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <FileSignature size={15} color="var(--primary)" />
                      <span>Tanda Tangan / Paraf Pelaksana</span>
                    </label>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '4px' }}>
                      Opsional
                    </span>
                  </div>

                  <input
                    ref={ttdInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleTtdUpload}
                    style={{ display: 'none' }}
                  />

                  {tandaTangan ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.85rem',
                        background: 'rgba(59, 130, 246, 0.08)',
                        borderRadius: '10px',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <img
                          src={tandaTangan}
                          alt="Tanda Tangan Pelaksana"
                          style={{
                            height: '36px',
                            maxWidth: '90px',
                            objectFit: 'contain',
                            background: '#ffffff',
                            borderRadius: '4px',
                            padding: '2px',
                          }}
                        />
                        <div>
                          <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#93c5fd' }}>Tanda tangan aktif</p>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Akan disematkan di dokumen</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          onClick={() => ttdInputRef.current?.click()}
                          className="btn glass"
                          style={{ width: 'auto', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          Ganti
                        </button>
                        <button
                          type="button"
                          onClick={removeTtd}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '0.3rem',
                            opacity: 0.8,
                          }}
                          title="Hapus Tanda Tangan"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => ttdInputRef.current?.click()}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        border: '1px dashed var(--border)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        background: 'rgba(255, 255, 255, 0.01)',
                        transition: 'all 0.2s',
                      }}
                    >
                      <FileSignature size={16} color="var(--primary)" />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                        Unggah Gambar Tanda Tangan
                      </span>
                    </div>
                  )}
                  <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: '0.35rem', fontStyle: 'italic' }}>
                    * Jika tidak diunggah, dokumen akan dicetak tanpa sematan tanda tangan digital.
                  </p>
                </div>
              </div>
            </div>

            {/* CARD 4: Multi-Photo Uploader */}
            <div className="card glass">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ImageIcon size={16} color="var(--primary)" />
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    4. Dokumentasi Foto ({photos.length})
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="btn glass"
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.8rem',
                    width: 'auto',
                  }}
                >
                  <Plus size={14} />
                  <span>Tambah Foto</span>
                </button>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: '14px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  transition: 'all 0.2s',
                  marginBottom: '1rem',
                }}
              >
                {isUploadingPhoto ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <Loader2 size={24} className="spin" color="var(--primary)" />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Mengompresi dan memproses foto...
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                    <UploadCloud size={28} color="var(--primary)" style={{ opacity: 0.8 }} />
                    <p style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                      Klik atau seret foto dokumentasi di sini
                    </p>
                    <p className="text-muted" style={{ fontSize: '0.78rem' }}>
                      Format JPG, PNG, WEBP didukung. Otomatis dikompres tajam untuk dokumen.
                    </p>
                  </div>
                )}
              </div>

              {/* Photos List with Captions */}
              {photos.length === 0 ? (
                <p className="text-muted" style={{ fontSize: '0.82rem', textAlign: 'center', fontStyle: 'italic' }}>
                  Belum ada foto dokumentasi. Unggah beberapa foto untuk dimasukkan ke galeri 2-kolom dokumen.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {photos.map((item, index) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        gap: '0.75rem',
                        alignItems: 'center',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border)',
                        padding: '0.6rem',
                        borderRadius: '12px',
                      }}
                    >
                      <img
                        src={item.dataUrl}
                        alt={`Dokumentasi ${index + 1}`}
                        style={{
                          width: '54px',
                          height: '54px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: 'var(--primary)',
                              textTransform: 'uppercase',
                            }}
                          >
                            Gambar {index + 1}
                          </span>
                        </div>
                        <input
                          type="text"
                          className="input-base"
                          value={item.caption}
                          onChange={(e) => updateCaption(item.id, e.target.value)}
                          placeholder="Keterangan gambar..."
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '8px',
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removePhoto(item.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '0.4rem',
                          opacity: 0.8,
                        }}
                        title="Hapus foto"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CARD 5: Lampiran Dokumen PDF & Berkas */}
            <div className="card glass">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Paperclip size={16} color="var(--primary)" />
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                    5. Lampiran Dokumen PDF ({lampiranList.length})
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => lampiranInputRef.current?.click()}
                  disabled={isUploadingLampiran}
                  className="btn glass"
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.8rem',
                    width: 'auto',
                  }}
                >
                  <Plus size={14} />
                  <span>Tambah Berkas</span>
                </button>
              </div>

              {/* Hidden File Input for Lampiran */}
              <input
                ref={lampiranInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                onChange={handleLampiranUpload}
                style={{ display: 'none' }}
              />

              {/* Upload Dropzone */}
              <div
                onClick={() => lampiranInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: '14px',
                  padding: '1.25rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  transition: 'all 0.2s',
                  marginBottom: '1rem',
                }}
              >
                {isUploadingLampiran ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <Loader2 size={24} className="spin" color="var(--primary)" />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Memproses berkas lampiran...
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
                    <Paperclip size={26} color="var(--primary)" style={{ opacity: 0.8 }} />
                    <p style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                      Klik atau seret dokumen PDF lampiran di sini
                    </p>
                    <p className="text-muted" style={{ fontSize: '0.78rem' }}>
                      Contoh: Surat Tugas, SPT, Bahan Paparan, Instrumen Sensus/Survei, atau Berita Acara.
                    </p>
                  </div>
                )}
              </div>

              {/* Lampiran List */}
              {lampiranList.length === 0 ? (
                <p className="text-muted" style={{ fontSize: '0.82rem', textAlign: 'center', fontStyle: 'italic' }}>
                  Belum ada dokumen lampiran. Berkas PDF yang dilampirkan akan otomatis digabung ke dalam dokumen PDF utuh.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {lampiranList.map((item, index) => {
                    const isPdf = item.tipe === 'application/pdf' || item.nama.toLowerCase().endsWith('.pdf');
                    const sizeFormatted = item.ukuran ? `${Math.round(item.ukuran / 1024)} KB` : '';
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: 'flex',
                          gap: '0.75rem',
                          alignItems: 'center',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border)',
                          padding: '0.75rem 0.85rem',
                          borderRadius: '12px',
                        }}
                      >
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '8px',
                            background: isPdf ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: isPdf ? '#f87171' : '#60a5fa',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontWeight: 800,
                            fontSize: '0.7rem',
                            border: `1px solid ${isPdf ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                          }}
                        >
                          <FileText size={16} />
                          <span>{isPdf ? 'PDF' : 'DOC'}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.2rem' }}>
                            <span
                              style={{
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                color: '#f1f5f9',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                              title={item.nama}
                            >
                              {item.nama}
                            </span>
                            {sizeFormatted && (
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                                {sizeFormatted}
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            className="input-base"
                            value={item.keterangan || ''}
                            onChange={(e) => updateLampiranKeterangan(item.id, e.target.value)}
                            placeholder="Keterangan lampiran (misal: Surat Tugas / SPT)..."
                            style={{
                              fontSize: '0.78rem',
                              padding: '0.3rem 0.6rem',
                              borderRadius: '6px',
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', flexShrink: 0 }}>
                          {item.dataUrl && (
                            <button
                              type="button"
                              onClick={() => previewLampiran(item)}
                              className="btn glass"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', width: 'auto' }}
                              title="Buka / Pratinjau berkas"
                            >
                              <ExternalLink size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeLampiran(item.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '0.35rem',
                              opacity: 0.8,
                            }}
                            title="Hapus lampiran"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Save to Histori & Google Drive */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                padding: '1.1rem 1.25rem',
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <UploadCloud size={16} color="#10b981" />
                    <span>Simpan ke Laporan & Upload PDF ke Drive</span>
                  </p>
                  <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                    Otomatis generate berkas PDF resmi (lengkap dengan lampiran), upload ke Google Drive sebagai bukti kegiatan, dan catat ke riwayat Laporan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSaveToDb}
                  disabled={isSavingDb}
                  className="btn btn-primary"
                  style={{
                    width: 'auto',
                    padding: '0.55rem 1.1rem',
                    fontSize: '0.82rem',
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    borderColor: '#059669',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isSavingDb ? <Loader2 size={15} className="spin" /> : <Save size={15} />}
                  <span>Simpan & Upload</span>
                </button>
              </div>

              {lastSavedDriveUrl && (
                <div
                  style={{
                    padding: '0.65rem 0.9rem',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} color="#34d399" />
                    <span style={{ fontSize: '0.8rem', color: '#6ee7b7' }}>Dokumen PDF terunggah di Google Drive</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <a
                      href={lastSavedDriveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn glass"
                      style={{ width: 'auto', padding: '0.2rem 0.6rem', fontSize: '0.75rem', color: '#a7f3d0' }}
                    >
                      Buka PDF di Drive
                    </a>
                    <a
                      href="/laporan"
                      className="btn glass"
                      style={{ width: 'auto', padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
                    >
                      Buka Laporan
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* PRATINJAU JURNAL DOKUMEN (A4 REALISTIC SHEET) */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          {/* Action Bar at Top of Preview */}
          <div
            style={{
              width: '100%',
              maxWidth: '850px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              background: 'rgba(255, 255, 255, 0.04)',
              padding: '1rem 1.5rem',
              borderRadius: '14px',
              border: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Eye size={18} color="var(--primary)" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                Pratinjau Lembar Dokumen Publikasi A4
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleSaveToDb}
                disabled={isSavingDb}
                className="btn btn-primary"
                style={{
                  width: 'auto',
                  padding: '0.55rem 1.1rem',
                  fontSize: '0.85rem',
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  borderColor: '#059669',
                }}
              >
                {isSavingDb ? <Loader2 size={15} className="spin" /> : <UploadCloud size={15} />}
                <span>Simpan ke Laporan & Drive</span>
              </button>

              <button
                onClick={() => handleDownload('docx')}
                disabled={isExportingDocx}
                className="btn glass"
                style={{
                  width: 'auto',
                  padding: '0.55rem 1.1rem',
                  fontSize: '0.85rem',
                  color: '#93c5fd',
                  borderColor: 'rgba(59, 130, 246, 0.3)',
                }}
              >
                {isExportingDocx ? <Loader2 size={15} className="spin" /> : <FileText size={15} />}
                <span>Unduh Word (.docx)</span>
              </button>

              <button
                onClick={() => handleDownload('pdf')}
                disabled={isExportingPdf}
                className="btn glass"
                style={{ width: 'auto', padding: '0.55rem 1.1rem', fontSize: '0.85rem' }}
              >
                {isExportingPdf ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
                <span>Unduh PDF (.pdf)</span>
              </button>
            </div>
          </div>

          {/* REALISTIC A4 PAPER CONTAINER */}
          <div
            style={{
              width: '100%',
              maxWidth: '850px',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              borderRadius: '6px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 1px rgba(0, 0, 0, 0.2)',
              padding: '3rem 3.5rem',
              fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
              lineHeight: 1.5,
              fontSize: '14px',
            }}
          >
            {/* 1. KOP BPS DENGAN LOGO */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <img
                src="/Logo BPS Prov (3).png"
                alt="Logo BPS"
                style={{ height: '70px', objectFit: 'contain', margin: '0 auto 0.5rem' }}
              />
              <div
                style={{
                  borderBottom: '3px double #003366',
                  marginTop: '0.5rem',
                  marginBottom: '1.25rem',
                }}
              />
            </div>

            {/* 2. JUDUL DOKUMEN */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2
                style={{
                  fontSize: '17px',
                  fontWeight: 800,
                  color: '#003366',
                  letterSpacing: '0.5px',
                  marginBottom: '0.2rem',
                }}
              >
                LAPORAN PELAKSANAAN KEGIATAN HARIAN
              </h2>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#1e293b',
                  textTransform: 'uppercase',
                }}
              >
                {judul || 'JURNAL KEGIATAN KERJA'}
              </h3>
            </div>

            {/* 3. METADATA TABLE */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                marginBottom: '1.5rem',
                fontSize: '13px',
              }}
            >
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ width: '32%', padding: '6px 10px', fontWeight: 700, background: '#f8fafc', color: '#1e293b' }}>
                    Hari / Tanggal
                  </td>
                  <td style={{ padding: '6px 10px', color: '#334155' }}>{formatDateIndo(tanggal)}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 700, background: '#f8fafc', color: '#1e293b' }}>
                    Waktu Pelaksanaan
                  </td>
                  <td style={{ padding: '6px 10px', color: '#334155' }}>{waktu || 'Hari Kerja'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 700, background: '#f8fafc', color: '#1e293b' }}>
                    Tempat / Lokasi
                  </td>
                  <td style={{ padding: '6px 10px', color: '#334155' }}>{tempat || '-'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 700, background: '#f8fafc', color: '#1e293b' }}>
                    Tim Kerja
                  </td>
                  <td style={{ padding: '6px 10px', color: '#334155' }}>{getSelectedTimName()}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 700, background: '#f8fafc', color: '#1e293b' }}>
                    Rencana Kinerja (SKP)
                  </td>
                  <td style={{ padding: '6px 10px', color: '#334155' }}>{getSelectedRencanaName()}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px 10px', fontWeight: 700, background: '#f8fafc', color: '#1e293b' }}>
                    Pelaksana Kegiatan
                  </td>
                  <td style={{ padding: '6px 10px', color: '#334155' }}>
                    {nipPelaksana ? `${pelaksana} (NIP. ${nipPelaksana})` : pelaksana || '-'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 4. RINGKASAN EKSEKUTIF */}
            {ringkasan && (
              <div
                style={{
                  background: '#f0f7ff',
                  border: '1px solid #bae6fd',
                  borderLeft: '4px solid #0284c7',
                  borderRadius: '4px',
                  padding: '10px 14px',
                  marginBottom: '1.5rem',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0369a1', marginBottom: '4px' }}>
                  RINGKASAN EKSEKUTIF
                </div>
                <div style={{ fontSize: '13px', color: '#1e293b', textAlign: 'justify' }}>
                  {ringkasan}
                </div>
              </div>
            )}

            {/* 5. LATAR BELAKANG & TUJUAN */}
            {latarBelakang && (
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#003366', marginBottom: '4px' }}>
                  I. LATAR BELAKANG & TUJUAN
                </h4>
                <p style={{ fontSize: '13px', color: '#334155', textAlign: 'justify' }}>
                  {latarBelakang}
                </p>
              </div>
            )}

            {/* 6. URAIAN PELAKSANAAN KEGIATAN */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#003366', marginBottom: '6px' }}>
                {latarBelakang ? 'II. URAIAN PELAKSANAAN KEGIATAN' : 'I. URAIAN PELAKSANAAN KEGIATAN'}
              </h4>
              {uraianKegiatan.length > 0 ? (
                <ol style={{ paddingLeft: '20px', margin: 0 }}>
                  {uraianKegiatan.map((item, idx) => (
                    <li key={idx} style={{ fontSize: '13px', color: '#334155', marginBottom: '4px', textAlign: 'justify' }}>
                      {item}
                    </li>
                  ))}
                </ol>
              ) : (
                <p style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                  {rawText || 'Tidak ada uraian rincian.'}
                </p>
              )}
            </div>

            {/* 7. HASIL & CAPAIAN OUTPUT */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#003366', marginBottom: '6px' }}>
                {latarBelakang ? 'III. HASIL & CAPAIAN OUTPUT' : 'II. HASIL & CAPAIAN OUTPUT'}
              </h4>
              {capaianOutput.length > 0 ? (
                <ul style={{ paddingLeft: '18px', margin: 0 }}>
                  {capaianOutput.map((item, idx) => (
                    <li key={idx} style={{ fontSize: '13px', color: '#334155', marginBottom: '4px', textAlign: 'justify' }}>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                  Target output harian telah tercapai.
                </p>
              )}
            </div>

            {/* 8. KENDALA & TINDAK LANJUT */}
            {kendalaTindakLanjut && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#003366', marginBottom: '4px' }}>
                  {latarBelakang ? 'IV. KENDALA & RENCANA TINDAK LANJUT' : 'III. KENDALA & RENCANA TINDAK LANJUT'}
                </h4>
                <p style={{ fontSize: '13px', color: '#334155', textAlign: 'justify' }}>
                  {kendalaTindakLanjut}
                </p>
              </div>
            )}

            {/* 9. GALERI DOKUMENTASI FOTO (2-COLUMN GRID) */}
            {photos.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 800, color: '#003366', marginBottom: '8px' }}>
                  {latarBelakang
                    ? kendalaTindakLanjut
                      ? 'V. DOKUMENTASI KEGIATAN'
                      : 'IV. DOKUMENTASI KEGIATAN'
                    : kendalaTindakLanjut
                    ? 'IV. DOKUMENTASI KEGIATAN'
                    : 'III. DOKUMENTASI KEGIATAN'}
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                  }}
                >
                  {photos.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '4px',
                        padding: '6px',
                        background: '#fafafa',
                        textAlign: 'center',
                      }}
                    >
                      <img
                        src={item.dataUrl}
                        alt={item.caption}
                        style={{
                          width: '100%',
                          height: '140px',
                          objectFit: 'cover',
                          borderRadius: '2px',
                          marginBottom: '4px',
                        }}
                      />
                      <div
                        style={{
                          fontSize: '11px',
                          fontStyle: 'italic',
                          color: '#475569',
                          lineHeight: '1.3',
                        }}
                      >
                        Gambar {idx + 1}: {item.caption}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 10. LEMBAR PENGESAHAN & TANDA TANGAN (Hanya Pelaksana Kegiatan) */}
            <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', textAlign: 'center' }}>
              <div style={{ minWidth: '220px' }}>
                <div style={{ fontSize: '13px', color: '#334155' }}>
                  {tempat?.split('/')[0]?.trim() || 'Tempat Tugas'}, {formatDateIndo(tanggal)}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', marginBottom: tandaTangan ? '6px' : '14px' }}>
                  Pelaksana Kegiatan,
                </div>
                {tandaTangan ? (
                  <div style={{ height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px' }}>
                    <img
                      src={tandaTangan}
                      alt="Tanda Tangan Pelaksana"
                      style={{ maxHeight: '46px', maxWidth: '120px', objectFit: 'contain' }}
                    />
                  </div>
                ) : (
                  <div style={{ height: '40px' }} />
                )}
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                  ( {pelaksana || 'Pegawai BPS'} )
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  {nipPelaksana ? `NIP. ${nipPelaksana}` : 'NIP. ........................................'}
                </div>
              </div>
            </div>

            {/* Footer Halaman 1 */}
            <div
              style={{
                marginTop: '3rem',
                borderTop: '1px solid #e2e8f0',
                paddingTop: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: '#94a3b8',
              }}
            >
              <span>KeepNoteAI - Badan Pusat Statistik RI</span>
              <span>Halaman 1 (Laporan Utama)</span>
            </div>

            {/* SEPARATOR & LAMPIRAN PDF PAGES VISUALIZATION */}
            {lampiranList.filter(l => l.tipe === 'application/pdf' || l.nama?.toLowerCase().endsWith('.pdf') || l.dataUrl?.startsWith('data:application/pdf')).map((att, idx) => (
              <div
                key={`preview-pdf-${att.id}`}
                style={{
                  marginTop: '2.5rem',
                  paddingTop: '2rem',
                  borderTop: '2px dashed #94a3b8',
                }}
              >
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div
                      style={{
                        background: 'rgba(239, 68, 68, 0.12)',
                        color: '#dc2626',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontWeight: 800,
                        fontSize: '11px',
                      }}
                    >
                      LAMPIRAN {idx + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        {att.nama}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                        {att.keterangan || 'Dokumen lampiran PDF pendukung kegiatan'} {att.ukuran ? `(${Math.round(att.ukuran / 1024)} KB)` : ''}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => previewLampiran(att)}
                    className="btn glass"
                    style={{
                      padding: '0.35rem 0.85rem',
                      fontSize: '0.78rem',
                      width: 'auto',
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: '#0284c7',
                      borderColor: 'rgba(59, 130, 246, 0.3)',
                    }}
                  >
                    <ExternalLink size={13} />
                    <span>Lihat Dokumen Asli</span>
                  </button>
                </div>

                {/* Embedded PDF iframe / viewer if dataUrl is available */}
                {att.dataUrl && (
                  <div
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      height: '520px',
                      background: '#525659',
                    }}
                  >
                    <iframe
                      src={att.dataUrl}
                      title={`Lampiran ${idx + 1}: ${att.nama}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                      }}
                    />
                  </div>
                )}

                <div
                  style={{
                    marginTop: '1rem',
                    borderTop: '1px solid #e2e8f0',
                    paddingTop: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '11px',
                    color: '#94a3b8',
                  }}
                >
                  <span>KeepNoteAI - Badan Pusat Statistik RI</span>
                  <span>Halaman Lampiran {idx + 1} (Tergabung)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
