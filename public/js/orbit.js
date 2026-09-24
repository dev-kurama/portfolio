/**
 * Technology constellation: DEVOPS at the centre, technologies orbiting at
 * different speeds. Hovering (or focusing) one freezes the system, pulls it
 * forward, draws a link from the core and fills the info panel.
 * On small screens the same data renders as a horizontal card strip (CSS).
 */
import { TECH, CAT } from './content.js';
import { $, watch, reduced } from './util.js';

const RINGS = [
  { r: 0.22, period: 70, dir: 1 },
  { r: 0.355, period: 105, dir: -1 },
  { r: 0.485, period: 150, dir: 1 },
];
const CAT_LABEL = {
  ops: 'PLATFORM & OPS',
  cloud: 'CLOUD',
  data: 'DATA',
  obs: 'OBSERVABILITY',
  lang: 'LANGUAGE / FRAMEWORK',
};

export function initOrbit() {
  const host = $('#orbit');
  if (!host) return;
  const info = { cat: $('#orbitCat'), name: $('#orbitName'), blurb: $('#orbitBlurb') };

  // mobile strip
  $('#orbitScroll').innerHTML = TECH.map(
    (t) => `<article class="o-card" style="--oc:${CAT[t.cat]}"><b>${t.name}</b><p>${t.blurb}</p></article>`
  ).join('');

  RINGS.forEach(({ r }) => {
    const d = document.createElement('div');
    d.className = 'orbit-ring';
    d.style.width = d.style.height = `${r * 200}%`;
    host.appendChild(d);
  });

  host.insertAdjacentHTML(
    'beforeend',
    `<svg class="orbit-link" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;overflow:visible">
       <line x1="50" y1="50" x2="50" y2="50" stroke="#00FF9C" stroke-width="1.4" vector-effect="non-scaling-stroke" opacity="0" style="transition:opacity .25s"/>
     </svg>
     <div class="orbit-core" aria-hidden="true">DEVOPS</div>`
  );
  const link = $('.orbit-link line', host);

  const items = [];
  const byRing = RINGS.map(() => []);
  TECH.forEach((t) => byRing[t.ring].push(t));
  byRing.forEach((list, ri) =>
    list.forEach((t, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'o-item';
      b.textContent = t.name;
      b.style.setProperty('--oc', CAT[t.cat]);
      host.appendChild(b);
      items.push({ b, t, ri, a: (i / list.length) * Math.PI * 2 + ri * 0.7, w: 0, h: 0 });
    })
  );

  let hover = null;
  let dirty = true;
  let raf = 0;
  let last = 0;

  function measure() {
    items.forEach((it) => { it.w = it.b.offsetWidth; it.h = it.b.offsetHeight; });
    dirty = true;
  }

  function place() {
    const S = host.clientWidth;
    items.forEach((it) => {
      const R = RINGS[it.ri].r * S;
      it.cx = S / 2 + Math.cos(it.a) * R;
      it.cy = S / 2 + Math.sin(it.a) * R;
      // individual `translate` property so the hover `scale` stays centred on the pill
      it.b.style.translate = `${(it.cx - it.w / 2).toFixed(1)}px ${(it.cy - it.h / 2).toFixed(1)}px`;
    });
    dirty = false;
    if (hover) aim(hover);
  }

  function aim(it) {
    const S = host.clientWidth;
    link.setAttribute('x2', ((it.cx / S) * 100).toFixed(2));
    link.setAttribute('y2', ((it.cy / S) * 100).toFixed(2));
  }

  function enter(it) {
    hover = it;
    it.b.classList.add('is-front');
    info.cat.textContent = CAT_LABEL[it.t.cat];
    info.name.textContent = it.t.name;
    info.blurb.textContent = it.t.blurb;
    link.setAttribute('stroke', CAT[it.t.cat]);
    aim(it);
    link.setAttribute('opacity', '.8');
  }
  function leave(it) {
    if (hover === it) hover = null;
    it.b.classList.remove('is-front');
    link.setAttribute('opacity', '0');
  }
  items.forEach((it) => {
    it.b.addEventListener('pointerenter', () => enter(it));
    it.b.addEventListener('pointerleave', () => leave(it));
    it.b.addEventListener('focus', () => enter(it));
    it.b.addEventListener('blur', () => leave(it));
  });

  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    if (!hover) {
      items.forEach((it) => { it.a += ((Math.PI * 2) / RINGS[it.ri].period) * RINGS[it.ri].dir * dt; });
      dirty = true;
    }
    if (dirty) place();
  }

  const ready = document.fonts?.ready ?? Promise.resolve();
  ready.then(() => { measure(); place(); });
  new ResizeObserver(() => { if (host.clientWidth) { measure(); place(); } }).observe(host);

  if (!reduced) {
    watch(host, {
      threshold: 0.1,
      onEnter: () => { last = performance.now(); raf = requestAnimationFrame(frame); },
      onLeave: () => cancelAnimationFrame(raf),
    });
  }
}
