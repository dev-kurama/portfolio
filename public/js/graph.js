/**
 * Animated infrastructure graph.
 *
 * A spec describes tiers of nodes; every node in a tier connects to every
 * node in the next tier. Packets travel the edges, Kubernetes nodes hold pods
 * that occasionally reschedule, and the whole thing tilts toward the cursor.
 * One builder powers the hero map, the interactive explorer, the cloud
 * topology and the AI diagram, so they all feel like the same system.
 */
import { reduced, finePointer, rand, pick, sleep, watch } from './util.js';

const NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}, parent) {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
}

const KIND = {
  edge: { w: 180, h: 34 },
  lb: { w: 210, h: 34 },
  k8s: { w: 200, h: 82 },
  svc: { w: 250, h: 34 },
  db: { w: 140, h: 36 },
  ai: { w: 200, h: 46 },
  prod: { w: 290, h: 46 },
  zone: { w: 200, h: 100 },
};
const PULSE = new Set(['lb', 'k8s', 'ai', 'prod']);
const STATUS = new Set(['lb', 'k8s', 'svc', 'db']);
const EDGE_COLOR = {
  db: '#00FF9C', svc: '#00FF9C', prod: '#00FF9C', ai: '#A78BFA',
  k8s: '#00D9FF', lb: '#00D9FF', edge: '#00D9FF', zone: '#00D9FF',
};
const POD_H = 16;
const SLOTS = 4;

function labelText(n) {
  return Array.isArray(n.label) ? n.label.join(' ') : n.label;
}

function computeLayout(spec, narrow) {
  const W = narrow ? 360 : 640;
  const padX = narrow ? 10 : 24;
  const gap = narrow ? spec.gapNarrow ?? 40 : spec.gap ?? 44;
  const padTop = spec.padTop ?? 22;
  const padBottom = spec.padBottom ?? 22;
  let y = padTop;
  const tiers = [];

  for (const tier of spec.tiers) {
    const n = tier.length;
    const spacing = (W - padX * 2) / n;
    const row = tier.map((def, i) => {
      const bk = def.kind.startsWith('zone') ? 'zone' : def.kind;
      const base = KIND[bk];
      const lines = Array.isArray(def.label) ? def.label.length : 1;
      const items = narrow && def.itemsNarrow ? def.itemsNarrow : def.items;
      let h = base.h;
      if (bk === 'k8s') h = narrow ? 104 : 82;
      else if (bk === 'zone') h = 52 + (items.length - 1) * 16 + 16;
      else if (lines > 1) h = base.h + (lines - 1) * 13;
      const w = Math.min(def.w ?? base.w, spacing - (n > 1 ? 12 : 0));
      return { ...def, bk, items, w, h, lines, cx: padX + spacing * (i + 0.5) };
    });
    const tierH = Math.max(...row.map((r) => r.h));
    row.forEach((r) => {
      r.x = r.cx - r.w / 2;
      r.y = y + (tierH - r.h) / 2;
    });
    tiers.push(row);
    y += tierH + gap;
  }
  return { W, H: y - gap + padBottom, tiers };
}

export function createGraph(svg, spec, opts = {}) {
  const mq = matchMedia('(max-width: 640px)');
  const host = svg.parentElement;

  let alive = true;
  let visible = false;
  let raf = 0;
  let last = 0;
  let deployToken = 0;
  let selectedKey = opts.selected ?? null;
  let hotKey = null;

  // per-build state
  let nodes = [];
  let entryEdges = [];
  let outEdges = new Map();
  let packets = [];
  let pods = [];
  let slotsByNode = [];
  let gPackets = null;
  let gPods = null;
  let spawnAcc = 0;
  let podTimer = rand(3.5, 6);

  // tilt state
  let tx = 0, ty = 0, cx = 0, cy = 0;

  /* ------------------------------------------------------------------ */
  function build() {
    svg.replaceChildren();
    nodes = [];
    entryEdges = [];
    outEdges = new Map();
    packets = [];
    pods = [];
    slotsByNode = [];

    const narrow = mq.matches;
    const L = computeLayout(spec, narrow);
    svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);

    const gEdges = svgEl('g', { class: 'g-edges' }, svg);
    gPackets = svgEl('g', { class: 'g-packets' }, svg);
    const gNodes = svgEl('g', { class: 'g-nodes' }, svg);
    gPods = svgEl('g', { class: 'g-pods' }, svg);

    // edges
    for (let t = 0; t < L.tiers.length - 1; t++) {
      for (const a of L.tiers[t]) {
        for (const b of L.tiers[t + 1]) {
          const x1 = a.cx, y1 = a.y + a.h, x2 = b.cx, y2 = b.y, ym = (y1 + y2) / 2;
          const d = `M${x1} ${y1}C${x1} ${ym} ${x2} ${ym} ${x2} ${y2}`;
          const color = EDGE_COLOR[b.bk] || '#00D9FF';
          svgEl('path', { class: 'g-edge', d }, gEdges);
          svgEl('path', { class: 'g-flow', d, style: `--ec:${color};animation-delay:${(-Math.random() * 5).toFixed(2)}s` }, gEdges);
          const path = svgEl('path', { d, fill: 'none', stroke: 'none' }, gEdges);
          const edge = { path, len: path.getTotalLength(), color, to: b.id };
          if (!outEdges.has(a.id)) outEdges.set(a.id, []);
          outEdges.get(a.id).push(edge);
          if (t === 0) entryEdges.push(edge);
        }
      }
    }

    // nodes
    let idx = 0;
    for (const tier of L.tiers) {
      for (const n of tier) {
        const g = svgEl('g', {
          class: 'g-node',
          'data-kind': n.kind,
          'data-id': n.id,
          transform: `translate(${n.x.toFixed(1)} ${n.y.toFixed(1)})`,
        }, gNodes);

        if (PULSE.has(n.bk) && !reduced) {
          svgEl('rect', { class: 'g-halo', width: n.w, height: n.h, rx: 9, style: `animation-delay:${((idx * 0.9) % 3.6).toFixed(2)}s` }, g);
        }
        svgEl('rect', { class: 'g-body', width: n.w, height: n.h, rx: 8 }, g);

        if (n.bk === 'zone') {
          const lab = svgEl('text', { class: 'g-label', x: n.w / 2, y: 22, 'text-anchor': 'middle' }, g);
          lab.textContent = labelText(n);
          svgEl('line', { class: 'g-edge', x1: 12, x2: n.w - 12, y1: 32, y2: 32 }, g);
          n.items.forEach((item, i) => {
            svgEl('circle', { class: 'g-item-dot', cx: 18, cy: 49 + i * 16, r: 2 }, g);
            const t = svgEl('text', { class: 'g-item', x: 28, y: 52 + i * 16 }, g);
            t.textContent = item;
          });
        } else if (n.bk === 'k8s') {
          const lab = svgEl('text', { class: 'g-label', x: n.w / 2, y: 20, 'text-anchor': 'middle' }, g);
          lab.textContent = labelText(n);
          const sub = svgEl('text', { class: 'g-sub', x: n.w / 2, y: 34, 'text-anchor': 'middle' }, g);
          sub.textContent = n.sub || '';
        } else if (n.lines > 1) {
          n.label.forEach((line, i) => {
            const t = svgEl('text', { class: 'g-label', x: n.w / 2, y: n.h / 2 - (n.lines - 1) * 7 + 4 + i * 14, 'text-anchor': 'middle' }, g);
            t.textContent = line;
          });
        } else {
          const lab = svgEl('text', { class: 'g-label', x: n.w / 2, y: n.sub ? n.h / 2 - 3 : n.h / 2 + 4, 'text-anchor': 'middle' }, g);
          lab.textContent = labelText(n);
          if (n.sub) {
            const sub = svgEl('text', { class: 'g-sub', x: n.w / 2, y: n.h / 2 + 11, 'text-anchor': 'middle' }, g);
            sub.textContent = n.sub;
          }
        }

        if (STATUS.has(n.bk)) svgEl('circle', { class: 'g-status', cx: n.w - 10, cy: 10, r: 2.4 }, g);

        // pod slots + pods
        if (n.bk === 'k8s') {
          const cols = narrow ? 2 : 4;
          const slotW = (n.w - 20 - (cols - 1) * 4) / cols;
          const slots = [];
          for (let s = 0; s < SLOTS; s++) {
            const sx = n.x + 10 + (s % cols) * (slotW + 4);
            const sy = n.y + 46 + Math.floor(s / cols) * (POD_H + 4);
            slots.push({ x: sx, y: sy, used: false });
            svgEl('rect', { class: 'g-slot', x: sx - n.x, y: sy - n.y, width: slotW, height: POD_H, rx: 3 }, g);
          }
          const nodeIndex = slotsByNode.length;
          slotsByNode.push({ slots, slotW, id: n.id });
          (n.pods || []).forEach((name, s) => addPod(name, nodeIndex, s));
        }

        if (opts.interactive && n.detail) {
          g.classList.add('is-click');
          g.setAttribute('role', 'button');
          g.setAttribute('tabindex', '0');
          g.setAttribute('aria-label', `${labelText(n)}: show details`);
          g.addEventListener('click', () => opts.onSelect?.(n.detail));
          g.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              opts.onSelect?.(n.detail);
            }
          });
        }
        if (opts.onHover) {
          g.addEventListener('pointerenter', () => opts.onHover(n.id));
          g.addEventListener('pointerleave', () => opts.onHover(null));
          g.addEventListener('focus', () => opts.onHover(n.id));
          g.addEventListener('blur', () => opts.onHover(null));
        }
        nodes.push({ ...n, g });
        idx++;
      }
    }
    applyMarks();
  }

  function addPod(name, nodeIndex, slotIndex) {
    const info = slotsByNode[nodeIndex];
    const slot = info.slots[slotIndex];
    slot.used = true;
    const g = svgEl('g', { class: 'pod', style: `transform:translate(${slot.x}px,${slot.y}px)` }, gPods);
    svgEl('rect', { width: info.slotW, height: POD_H, rx: 3 }, g);
    const t = svgEl('text', { x: info.slotW / 2, y: POD_H / 2 + 0.5 }, g);
    t.textContent = name;
    const pod = { g, name, node: nodeIndex, slot: slotIndex };
    pods.push(pod);
    return pod;
  }

  function applyMarks() {
    nodes.forEach((n) => {
      n.g.classList.toggle('is-selected', !!selectedKey && n.detail === selectedKey);
      n.g.classList.toggle('is-hot', !!hotKey && (n.id === hotKey || n.detail === hotKey));
    });
  }

  /* ------------------------------------------------------------------ */
  function spawn(edge) {
    if (packets.length > 26) return;
    const g = svgEl('g', { class: 'g-packet', style: `--pc:${edge.color}` }, gPackets);
    svgEl('circle', { r: 6, opacity: 0.16 }, g);
    svgEl('circle', { r: 2.5 }, g);
    packets.push({ g, edge, d: 0, speed: rand(85, 135) });
  }

  function movePod() {
    if (slotsByNode.length < 2 || !pods.length) return;
    const p = pick(pods);
    const targets = slotsByNode
      .map((info, i) => ({ info, i }))
      .filter(({ info, i }) => i !== p.node && info.slots.some((s) => !s.used));
    if (!targets.length) return;
    const t = pick(targets);
    const free = t.info.slots.findIndex((s) => !s.used);
    slotsByNode[p.node].slots[p.slot].used = false;
    t.info.slots[free].used = true;
    p.node = t.i;
    p.slot = free;
    const s = t.info.slots[free];
    p.g.classList.add('is-roll');
    p.g.style.transform = `translate(${s.x}px,${s.y}px)`;
    setTimeout(() => p.g.classList.remove('is-roll'), 1000);
  }

  async function deploy(step) {
    const token = ++deployToken;
    const total = slotsByNode.length;
    for (let i = 0; i < total; i++) {
      if (token !== deployToken || !alive) return;
      step?.(i + 1, total);
      const ps = pods.filter((p) => p.node === i);
      ps.forEach((p) => p.g.classList.add('is-roll'));
      await sleep(950);
      ps.forEach((p) => p.g.classList.remove('is-roll'));
      await sleep(220);
    }
    if (token === deployToken && alive) step?.(total + 1, total);
  }

  /* ------------------------------------------------------------------ */
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;

    // new requests enter at the top of the graph
    spawnAcc += dt;
    const rate = mq.matches ? 0.5 : 0.38;
    while (spawnAcc > rate) {
      spawnAcc -= rate;
      if (entryEdges.length) spawn(pick(entryEdges));
    }

    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      p.d += p.speed * dt;
      if (p.d >= p.edge.len) {
        const next = outEdges.get(p.edge.to);
        if (next && next.length) {
          const e = pick(next);
          p.edge = e;
          p.d = 0;
          p.g.style.setProperty('--pc', e.color);
        } else {
          p.g.remove();
          packets.splice(i, 1);
          continue;
        }
      }
      const pt = p.edge.path.getPointAtLength(p.d);
      p.g.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
    }

    if (opts.pods !== false) {
      podTimer -= dt;
      if (podTimer <= 0) {
        movePod();
        podTimer = rand(4.5, 8);
      }
    }

    if (opts.tilt && finePointer) {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      svg.style.transform = `rotateX(${(-cy * 3.4).toFixed(2)}deg) rotateY(${(cx * 4.2).toFixed(2)}deg)`;
    }
  }

  function start() {
    if (reduced || raf || !alive || !visible || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
  }

  /* ------------------------------------------------------------------ */
  build();
  mq.addEventListener('change', build);

  const io = watch(svg, {
    threshold: 0.05,
    rootMargin: '80px',
    onEnter: () => { visible = true; start(); },
    onLeave: () => { visible = false; stop(); },
  });
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);

  if (opts.tilt && finePointer && !reduced) {
    if (!getComputedStyle(host).perspective || getComputedStyle(host).perspective === 'none') host.style.perspective = '900px';
    host.addEventListener('pointermove', (e) => {
      const r = host.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    host.addEventListener('pointerleave', () => { tx = ty = 0; });
  }

  return {
    select(key) { selectedKey = key; applyMarks(); },
    hot(key) { hotKey = key; applyMarks(); },
    deploy,
    podCount: () => pods.length,
    destroy() {
      alive = false;
      stop();
      io.disconnect();
      mq.removeEventListener('change', build);
      document.removeEventListener('visibilitychange', onVis);
    },
  };
}
