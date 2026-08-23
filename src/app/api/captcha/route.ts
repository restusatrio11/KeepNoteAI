import { NextResponse } from 'next/server';
import { generateCaptcha } from '@/lib/captcha';

function buildSvg(code: string) {
  const width = 240;
  const height = 72;
  const colors = ['#60a5fa', '#34d399', '#f472b6', '#fbbf24', '#a78bfa'];
  const n = code.length;
  let chars = '';
  for (let i = 0; i < n; i++) {
    const ch = code[i];
    const x = 28 + i * ((width - 56) / n);
    const y = height / 2 + 10 + (Math.random() * 12 - 6);
    const rot = (Math.random() * 44 - 22).toFixed(1);
    const size = 34 + Math.floor(Math.random() * 10);
    const fill = colors[i % colors.length];
    chars += `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-family="monospace" font-size="${size}" font-weight="700" fill="${fill}" transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})" text-anchor="middle">${ch}</text>`;
  }
  let lines = '';
  for (let i = 0; i < 5; i++) {
    const x1 = (Math.random() * width).toFixed(1);
    const y1 = (Math.random() * height).toFixed(1);
    const x2 = (Math.random() * width).toFixed(1);
    const y2 = (Math.random() * height).toFixed(1);
    const c = colors[Math.floor(Math.random() * colors.length)];
    lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="1.5" opacity="0.35" />`;
  }
  let dots = '';
  for (let i = 0; i < 30; i++) {
    const cx = (Math.random() * width).toFixed(1);
    const cy = (Math.random() * height).toFixed(1);
    const c = colors[Math.floor(Math.random() * colors.length)];
    dots += `<circle cx="${cx}" cy="${cy}" r="1.2" fill="${c}" opacity="0.5" />`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet"><rect width="100%" height="100%" fill="#0f0f15" rx="12"/>${lines}${dots}${chars}</svg>`;
}

export async function GET() {
  const { token, code } = generateCaptcha();
  const svg = buildSvg(code);
  return NextResponse.json({ token, svg });
}
