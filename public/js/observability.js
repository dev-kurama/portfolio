/**
 * Grafana / Loki inspired panels. Everything here is generated in the browser
 * for illustration; nothing is connected to real telemetry.
 */
import { $, $$, rand, pick, watch, once, reduced, clamp } from './util.js';

const SERVICES = ['api', 'worker', 'nginx', 'auth', 'scheduler'];
const ROUTES = ['GET /v1/campaigns', 'POST /v1/events', 'GET /v1/insights', 'GET /healthz', 'POST /v1/chat', 'GET /v1/budgets'];

function sizeCanvas(canvas) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(r.width * dpr));
  canvas.height = Math.max(1, Math.round(r.height * dpr));
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height };
}

/* ------------------------------------------------------------------ */
function initChart(canvas) {
  const N = 60;
  const STEP_MS = 900;
  const req = Array.from({ length: N + 2 }, (_, i) => 0.72 + 0.05 * Math.sin(i * 0.4) + rand(-0.025, 0.025));
  const lat = Array.from({ length: N + 2 }, (_, i) => 0.34 + 0.04 * Math.sin(i * 0.3 + 1) + rand(-0.02, 0.02));
  let size = sizeCanvas(canvas);
  let raf = 0, lastPush = performance.now();

  function draw(now) {
    const { ctx, w, h } = size;
    ctx.clearRect(0, 0, w, h);
    const padL = 44, padR = 14, padT = 34, padB = 22;
    const gw = w - padL - padR, gh = h - padT - padB;
    const frac = reduced ? 0 : clamp((now - lastPush) / STEP_MS, 0, 1);
    const stepX = gw / (N - 1);

    // grid
    ctx.strokeStyle = 'rgba(255,255,255,.06)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#7D8795';
    ctx.font = '10px "JetBrains Mono Variable", ui-monospace, monospace';
    ctx.textAlign = 'right';
    [0, 0.5, 1].forEach((k) => {
      const y = padT + gh * k;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
      ctx.fillText(`${Math.round(140 - k * 140)}K`, padL - 8, y + 3);
    });

    const xy = (arr, i) => [padL + (i - frac) * stepX, padT + gh * (1 - arr[i])];
    const path = (arr) => {
      ctx.beginPath();
      for (let i = 1; i < arr.length; i++) {
        const [x, y] = xy(arr, i);
        i === 1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
    };

    ctx.save();
    ctx.beginPath(); ctx.rect(padL, 0, gw, h); ctx.clip();

    // requests: filled line
    path(req);
    ctx.lineTo(padL + (N - frac) * stepX, padT + gh);
    ctx.lineTo(padL + (1 - frac) * stepX, padT + gh);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, padT, 0, padT + gh);
    g.addColorStop(0, 'rgba(0,255,156,.28)');
    g.addColorStop(1, 'rgba(0,255,156,0)');
    ctx.fillStyle = g;
    ctx.fill();
    path(req);
    ctx.strokeStyle = '#00FF9C';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = 'rgba(0,255,156,.6)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // latency
    path(lat);
    ctx.strokeStyle = '#00D9FF';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();

    // legend
    const last = req[req.length - 2];
    ctx.textAlign = 'left';
    ctx.font = '11px "JetBrains Mono Variable", ui-monospace, monospace';
    ctx.fillStyle = '#00FF9C';
    ctx.fillText(`● requests/min  ${(last * 140).toFixed(1)}K`, padL, 18);
    ctx.fillStyle = '#00D9FF';
    ctx.fillText('● latency  stable', padL + 190, 18);
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - lastPush >= STEP_MS) {
      lastPush = now;
      req.shift(); req.push(clamp(req[req.length - 1] + rand(-0.035, 0.035) + (0.72 - req[req.length - 1]) * 0.15, 0.55, 0.86));
      lat.shift(); lat.push(clamp(lat[lat.length - 1] + rand(-0.03, 0.03) + (0.34 - lat[lat.length - 1]) * 0.15, 0.2, 0.5));
    }
    draw(now);
  }

  new ResizeObserver(() => { size = sizeCanvas(canvas); draw(performance.now()); }).observe(canvas);
  draw(performance.now());
  if (reduced) return;
  watch(canvas, {
    threshold: 0.05,
    onEnter: () => { lastPush = performance.now(); raf = requestAnimationFrame(frame); },
    onLeave: () => cancelAnimationFrame(raf),
  });
}

/* ------------------------------------------------------------------ */
function initLogs(box) {
  const pad = (n) => String(n).padStart(2, '0');
  function make() {
    const d = new Date();
    const t = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    const svc = pick(SERVICES);
    const warn = Math.random() < 0.07;
    const route = pick(ROUTES);
    const ms = warn ? Math.round(rand(620, 980)) : Math.round(rand(4, 48));
    const status = warn ? 200 : Math.random() < 0.05 ? 304 : 200;
    const el = document.createElement('div');
    el.innerHTML = `<span class="t">${t}</span> <span class="${warn ? 'lv-w' : 'lv-i'}">${warn ? 'WARN' : 'INFO'}</span> <span class="svc">${svc}</span> ${route} ${status} ${ms}ms${warn ? ' slow upstream' : ''}`;
    return el;
  }
  const push = () => {
    box.appendChild(make());
    while (box.children.length > 10) box.firstChild.remove();
  };
  for (let i = 0; i < 9; i++) push();
  if (reduced) return;
  let timer = 0;
  watch(box, {
    threshold: 0.1,
    onEnter: () => { if (!timer) timer = setInterval(push, 750); },
    onLeave: () => { clearInterval(timer); timer = 0; },
  });
}

/* ------------------------------------------------------------------ */
export function initObservability() {
  const bars = $('#obsBars');
  if (bars) once(bars, () => $$('s[data-w]', bars).forEach((s, i) => setTimeout(() => (s.style.width = `${s.dataset.w}%`), i * 140)), { threshold: 0.4 });
  const chart = $('#obsChart');
  if (chart) initChart(chart);
  const logs = $('#obsLogs');
  if (logs) initLogs(logs);
}

/** Scrolling request-rate line behind the 100K+ metric. */
export function initSparkline(canvas) {
  if (!canvas) return;
  const N = 48;
  const data = Array.from({ length: N + 2 }, (_, i) => 0.55 + 0.18 * Math.sin(i * 0.5) + rand(-0.05, 0.05));
  let size = sizeCanvas(canvas);
  let raf = 0, lastPush = performance.now();
  const STEP = 700;

  function draw(now) {
    const { ctx, w, h } = size;
    ctx.clearRect(0, 0, w, h);
    const frac = reduced ? 0 : clamp((now - lastPush) / STEP, 0, 1);
    const step = w / (N - 1);
    const pt = (i) => [(i - frac) * step, h * 0.12 + h * 0.76 * (1 - data[i])];
    ctx.beginPath();
    for (let i = 1; i < data.length; i++) {
      const [x, y] = pt(i);
      i === 1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#00FF9C');
    g.addColorStop(1, '#00D9FF');
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.lineTo(w + step, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const f = ctx.createLinearGradient(0, 0, 0, h);
    f.addColorStop(0, 'rgba(0,255,156,.16)');
    f.addColorStop(1, 'rgba(0,255,156,0)');
    ctx.fillStyle = f;
    ctx.fill();
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - lastPush >= STEP) {
      lastPush = now;
      data.shift();
      data.push(clamp(data[data.length - 1] + rand(-0.09, 0.09) + (0.58 - data[data.length - 1]) * 0.12, 0.25, 0.85));
    }
    draw(now);
  }
  new ResizeObserver(() => { size = sizeCanvas(canvas); draw(performance.now()); }).observe(canvas);
  draw(performance.now());
  if (reduced) return;
  watch(canvas, {
    threshold: 0.05,
    onEnter: () => { lastPush = performance.now(); raf = requestAnimationFrame(frame); },
    onLeave: () => cancelAnimationFrame(raf),
  });
}
