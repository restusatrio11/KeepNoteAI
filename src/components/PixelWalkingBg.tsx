'use client';

import { useEffect, useRef } from 'react';

const DARK_BLUE = '#1e3a8a';
const NAVY = '#172554';
const SKIN = '#f1c27d';
const HAIR = '#2b2b2b';
const SHOE = '#0a0a0a';
const WHITE = '#e5e7eb';

type Walker = { x: number; speed: number; scale: number; frame: number };

type Theme = {
  skyTop: string;
  skyBottom: string;
  ground: string;
  groundEdge: string;
  starAlpha: number;
  body: 'sun' | 'moon' | 'none';
  bodyColor: string;
  bodyGlow: string;
  bodyX: number;
  bodyY: number;
  building: string;
  window: string;
  cloud: string;
};

function getTheme(): Theme {
  const h = new Date().getHours();
  if (h >= 5 && h < 10) {
    return {
      skyTop: '#a5b4fc', skyBottom: '#fcd9b6', ground: '#3b3050', groundEdge: '#c9a36b',
      starAlpha: 0.15, body: 'sun', bodyColor: '#fff3c4', bodyGlow: 'rgba(255,221,150,0.55)',
      bodyX: 0.2, bodyY: 0.3, building: '#2a2342', window: 'rgba(255,220,170,0.22)',
      cloud: '#fde9d6',
    };
  }
  if (h >= 10 && h < 15) {
    return {
      skyTop: '#38bdf8', skyBottom: '#cdeffd', ground: '#2a3b66', groundEdge: '#7db4e8',
      starAlpha: 0, body: 'sun', bodyColor: '#fff7d6', bodyGlow: 'rgba(255,247,200,0.6)',
      bodyX: 0.5, bodyY: 0.16, building: '#1c2c54', window: 'rgba(180,210,255,0.25)',
      cloud: '#ffffff',
    };
  }
  if (h >= 15 && h < 18) {
    return {
      skyTop: '#60a5fa', skyBottom: '#fdba74', ground: '#394a6b', groundEdge: '#e0a76a',
      starAlpha: 0.06, body: 'sun', bodyColor: '#ffd28a', bodyGlow: 'rgba(255,180,90,0.5)',
      bodyX: 0.75, bodyY: 0.24, building: '#243353', window: 'rgba(255,200,140,0.22)',
      cloud: '#ffe2c2',
    };
  }
  if (h >= 18 && h < 20) {
    return {
      skyTop: '#7c3aed', skyBottom: '#fb923c', ground: '#3a2a4a', groundEdge: '#c2642f',
      starAlpha: 0.3, body: 'sun', bodyColor: '#ff8a4c', bodyGlow: 'rgba(255,120,60,0.55)',
      bodyX: 0.82, bodyY: 0.34, building: '#2a1f3e', window: 'rgba(255,170,90,0.28)',
      cloud: '#f7b7a8',
    };
  }
  return {
    skyTop: '#05070f', skyBottom: '#0b1228', ground: '#0a1020', groundEdge: '#24304f',
    starAlpha: 0.9, body: 'moon', bodyColor: '#e8eefc', bodyGlow: 'rgba(200,220,255,0.35)',
      bodyX: 0.78, bodyY: 0.18, building: '#0e1733', window: 'rgba(130,170,255,0.18)',
      cloud: '#39466e',
    };
}

export default function PixelWalkingBg() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let W = 0;
    let H = 0;
    let groundY = 0;
    let theme: Theme = getTheme();
    const walkers: Walker[] = [];
    const clouds: { x: number; y: number; scale: number; speed: number }[] = [];
    let stars: { x: number; y: number; s: number }[] = [];

    function px(x: number, y: number, w: number, h: number, color: string) {
      ctx!.fillStyle = color;
      ctx!.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    }

    function resize() {
      W = canvas.clientWidth;
      H = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.imageSmoothingEnabled = false;
      groundY = H - Math.max(50, H * 0.1);
      theme = getTheme();

      stars = [];
      const count = Math.floor((W * H) / 11000);
      for (let i = 0; i < count; i++) {
        stars.push({ x: Math.random() * W, y: Math.random() * (groundY - 20), s: Math.random() < 0.2 ? 3 : 2 });
      }

      walkers.length = 0;
      const wc = Math.max(5, Math.floor(W / 280));
      for (let i = 0; i < wc; i++) {
        walkers.push({
          x: (W / wc) * i + Math.random() * 120,
          speed: 26 + Math.random() * 30,
          scale: 2 + Math.random() * 1.2,
          frame: Math.random() * 2,
        });
      }

      clouds.length = 0;
      const cc = Math.max(3, Math.floor(W / 420));
      for (let i = 0; i < cc; i++) {
        clouds.push({
          x: Math.random() * W,
          y: 20 + Math.random() * (groundY * 0.5),
          scale: 1.5 + Math.random() * 1.8,
          speed: 5 + Math.random() * 12,
        });
      }
    }

    function building(cx: number, bw: number, bh: number) {
      px(cx, groundY - bh, bw, bh, theme.building);
      ctx!.fillStyle = theme.window;
      for (let yy = groundY - bh + 6; yy < groundY - 6; yy += 9) {
        for (let xx = cx + 5; xx < cx + bw - 5; xx += 9) {
          ctx!.fillRect(Math.round(xx), Math.round(yy), 4, 4);
        }
      }
      px(cx, groundY - bh, bw, 3, '#15224a');
    }

    function drawCelestial() {
      if (theme.body === 'none') return;
      const cx = theme.bodyX * W;
      const cy = theme.bodyY * H;
      const r = Math.max(16, W * 0.022);
      const g = ctx!.createRadialGradient(cx, cy, 0, cx, cy, r * 3.2);
      g.addColorStop(0, theme.bodyGlow);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx!.fillStyle = g;
      ctx!.beginPath();
      ctx!.arc(cx, cy, r * 3.2, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.fillStyle = theme.bodyColor;
      ctx!.beginPath();
      ctx!.arc(cx, cy, r, 0, Math.PI * 2);
      ctx!.fill();
      if (theme.body === 'moon') {
        ctx!.fillStyle = theme.building;
        ctx!.beginPath();
        ctx!.arc(cx + r * 0.45, cy - r * 0.3, r * 0.7, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function drawCloud(cx: number, cy: number, s: number, color: string) {
      px(cx + 2 * s, cy, 10 * s, 5 * s, color);
      px(cx, cy + 3 * s, 16 * s, 4 * s, color);
      px(cx + 4 * s, cy - 3 * s, 7 * s, 4 * s, color);
      px(cx + 8 * s, cy - 1 * s, 6 * s, 4 * s, color);
    }

    function drawPerson(x: number, baseY: number, s: number, frame: number, dir: number) {
      ctx!.save();
      ctx!.translate(Math.round(x), Math.round(baseY));
      ctx!.scale(dir, 1);

      const f = Math.floor(frame) % 2;
      const dx = 0.7 * s;

      px(1 * s, -13 * s, 4 * s, 4 * s, SKIN);
      px(1 * s, -13 * s, 4 * s, 1 * s, HAIR);
      px(0.5 * s, -10 * s, 5 * s, 1 * s, SKIN);

      px(0.5 * s, -9 * s, 5 * s, 6 * s, DARK_BLUE);
      px(2 * s, -9 * s, 2 * s, 1 * s, WHITE);
      px(2.6 * s, -8 * s, 0.8 * s, 3 * s, NAVY);

      px(-0.5 * s, -9 * s, 1 * s, 5 * s, DARK_BLUE);
      px(5 * s, -9 * s, 1 * s, 5 * s, DARK_BLUE);

      const xA = 1 * s + (f === 0 ? -dx : dx);
      const xB = 3 * s + (f === 0 ? dx : -dx);
      px(xA, -2 * s, 1.4 * s, 2 * s, NAVY);
      px(xB, -2 * s, 1.4 * s, 2 * s, NAVY);
      px(xA - 0.2 * s, 0, 1.8 * s, 0.8 * s, SHOE);
      px(xB - 0.2 * s, 0, 1.8 * s, 0.8 * s, SHOE);

      ctx!.restore();
    }

    function drawScene(advance: number) {
      const g = ctx!.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, theme.skyTop);
      g.addColorStop(1, theme.skyBottom);
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, W, H);

      drawCelestial();

      if (theme.starAlpha > 0) {
        ctx!.globalAlpha = theme.starAlpha;
        ctx!.fillStyle = '#ffffff';
        for (const st of stars) ctx!.fillRect(st.x, st.y, st.s, st.s);
        ctx!.globalAlpha = 1;
      }

      for (const c of clouds) {
        if (advance > 0) {
          c.x += c.speed * advance;
          if (c.x > W + 60) c.x = -60;
        }
        drawCloud(c.x, c.y, c.scale, theme.cloud);
      }

      building(W * 0.1, 90, 120);
      building(W * 0.8, 110, 170);

      px(0, groundY, W, H - groundY, theme.ground);
      px(0, groundY, W, 2, theme.groundEdge);

      for (const w of walkers) {
        if (advance > 0) {
          w.x += w.speed * advance;
          w.frame += advance * 9;
          if (w.x > W + 50) w.x = -50;
        }
        drawPerson(w.x, groundY, w.scale, w.frame, 1);
      }
    }

    resize();
    if (reduce) {
      drawScene(0);
    } else {
      let raf = 0;
      let last = performance.now();
      const loop = (now: number) => {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        drawScene(dt);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
    }

    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none', display: 'block' }}
    />
  );
}
