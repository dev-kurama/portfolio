/**
 * Ambient background: a fine dot grid that reacts to the cursor, drifts with
 * scroll, gets an occasional diagonal "scan" and a handful of slow particles.
 * Deliberately quiet; it should never compete with the content.
 */
import { reduced, finePointer, clamp } from './util.js';

export function initBackground(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let W = 0, H = 0, dpr = 1, gap = 38;
  const mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999 };
  const parts = [];
  let raf = 0;
  const R = 150; // cursor influence radius

  function seedParticles() {
    parts.length = 0;
    const n = W < 700 ? 5 : 14;
    for (let i = 0; i < n; i++) parts.push(spawn(true));
  }
  function spawn(anywhere) {
    return {
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : H + 10,
      vy: 6 + Math.random() * 12,
      vx: (Math.random() - 0.5) * 5,
      r: 0.9 + Math.random() * 1.2,
      c: Math.random() < 0.6 ? '0,255,156' : '0,217,255',
      a: 0.25 + Math.random() * 0.35,
    };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    gap = W < 700 ? 32 : 38;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedParticles();
    if (reduced) draw(0, 0);
  }

  function draw(t, dt) {
    ctx.clearRect(0, 0, W, H);
    mouse.sx += (mouse.x - mouse.sx) * 0.2;
    mouse.sy += (mouse.y - mouse.sy) * 0.2;

    const off = (window.scrollY * 0.14) % gap;
    const scan = ((t * 0.00007) % 1.9) - 0.45; // diagonal band travelling across the page
    const diag = W + H;

    ctx.fillStyle = 'rgba(170,190,210,.15)';
    const near = [];

    for (let y = -off; y < H + gap; y += gap) {
      for (let x = gap / 2; x < W + gap; x += gap) {
        const dx = x - mouse.sx, dy = y - mouse.sy;
        const d2 = dx * dx + dy * dy;
        if (d2 < R * R) {
          near.push(x, y, Math.sqrt(d2));
          continue;
        }
        const band = Math.abs((x + y) / diag - scan);
        if (band < 0.035) {
          ctx.fillStyle = `rgba(0,255,156,${0.1 + (0.035 - band) * 8})`;
          ctx.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
          ctx.fillStyle = 'rgba(170,190,210,.15)';
        } else {
          ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
        }
      }
    }

    // Dots near the cursor swell, turn green and are pushed slightly outward.
    for (let i = 0; i < near.length; i += 3) {
      const x = near[i], y = near[i + 1], d = near[i + 2];
      const k = 1 - d / R;
      const push = k * k * 9;
      const ang = Math.atan2(y - mouse.sy, x - mouse.sx);
      const px = x + Math.cos(ang) * push;
      const py = y + Math.sin(ang) * push;
      ctx.fillStyle = `rgba(0,255,156,${0.18 + k * 0.6})`;
      ctx.beginPath();
      ctx.arc(px, py, 0.9 + k * 1.9, 0, 6.2832);
      ctx.fill();
    }

    // Particles
    for (const p of parts) {
      p.y -= p.vy * dt;
      p.x += p.vx * dt;
      if (p.y < -10) Object.assign(p, spawn(false));
      const fade = clamp(p.y / (H * 0.25), 0, 1);
      ctx.fillStyle = `rgba(${p.c},${(p.a * fade).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.2832);
      ctx.fill();
    }
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  if (reduced) {
    window.addEventListener('scroll', () => draw(0, 0), { passive: true });
    return;
  }

  if (finePointer) {
    window.addEventListener('pointermove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    document.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
  }

  let last = performance.now();
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    draw(now, dt);
  }
  raf = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); }
  });
}
