/**
 * KUBERNETES // PRODUCTION board.
 * Pods drift between nodes on their own; the two buttons let a visitor trigger
 * a rolling update or kill a pod and watch the cluster reschedule it.
 * All numbers are simulated and labelled as such.
 */
import { $, $$, rand, pick, sleep, watch, reduced } from './util.js';

const LAYOUT = [
  ['api', 'worker', 'nginx'],
  ['api', 'worker', 'redis'],
  ['api', 'worker', 'monitoring'],
];
const MAX_PER_NODE = 4;
const hash = () => Math.random().toString(36).slice(2, 7);

export function initK8s() {
  const host = $('#k8sNodes');
  if (!host) return;

  const btnRoll = $('#k8sRollout');
  const btnKill = $('#k8sKill');
  const el = {
    cpu: $('#kCpu'), cpuBar: $('#kCpuBar'),
    mem: $('#kMem'), memBar: $('#kMemBar'),
    pods: $('#kPods'), status: $('#kStatus'),
  };

  const nodes = LAYOUT.map((types, i) => {
    const node = document.createElement('div');
    node.className = 'k8s-node';
    node.innerHTML = `<div class="k8s-node-head"><span>Node 0${i + 1}</span><span>● Ready</span></div><div class="k8s-pods" style="min-height:186px"></div>`;
    host.appendChild(node);
    const podsEl = $('.k8s-pods', node);
    types.forEach((t) => podsEl.appendChild(makePod(t)));
    return { node, podsEl };
  });

  const caption = document.createElement('p');
  caption.className = 'tiny muted mono';
  caption.style.marginTop = '22px';
  caption.textContent = 'sample workloads per node · 42 pods across the cluster';
  host.parentElement.appendChild(caption);

  function makePod(type, state = 'Running') {
    const p = document.createElement('div');
    p.className = 'kpod';
    p.dataset.podType = type;
    p.innerHTML = `<span>${type}-${hash()}</span><small>${state}</small>`;
    return p;
  }
  const allPods = () => $$('.kpod', host);
  const setState = (pod, text) => { $('small', pod).textContent = text; };

  /** FLIP: move things in the DOM, then animate every pod from where it was. */
  function flip(mutate) {
    const first = new Map(allPods().map((p) => [p, p.getBoundingClientRect()]));
    mutate();
    if (reduced) return;
    for (const p of allPods()) {
      const f = first.get(p);
      if (!f) continue;
      const l = p.getBoundingClientRect();
      const dx = f.left - l.left, dy = f.top - l.top;
      if (dx || dy) p.animate(
        [{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }],
        { duration: 800, easing: 'cubic-bezier(.6,0,.2,1)' }
      );
    }
  }

  let busy = false;
  const setBusy = (b) => { busy = b; btnRoll.disabled = b; btnKill.disabled = b; };

  function setStatus(text, warn = false) {
    el.status.textContent = text;
    el.status.classList.toggle('ok', !warn);
    el.status.style.color = warn ? 'var(--amber)' : '';
  }

  function rebalance() {
    if (busy) return;
    const sources = nodes.filter((n) => n.podsEl.children.length > 2);
    const targets = nodes.filter((n) => n.podsEl.children.length < MAX_PER_NODE);
    if (!sources.length || !targets.length) return;
    const from = pick(sources);
    const to = pick(targets.filter((t) => t !== from));
    if (!to) return;
    const pod = pick([...from.podsEl.children]);
    pod.classList.add('is-roll');
    flip(() => to.podsEl.appendChild(pod));
    setTimeout(() => pod.classList.remove('is-roll'), 1000);
  }

  async function killPod() {
    if (busy) return;
    setBusy(true);
    const pod = pick(allPods());
    const type = pod.dataset.podType;
    pod.classList.add('is-dying');
    setState(pod, 'Terminating');
    setStatus('RESCHEDULING', true);
    el.pods.textContent = '41';
    await sleep(1150);
    pod.style.opacity = '0';
    await sleep(320);
    flip(() => pod.remove());
    await sleep(350);

    const target = [...nodes].sort((a, b) => a.podsEl.children.length - b.podsEl.children.length)[0];
    const fresh = makePod(type, 'Creating');
    fresh.classList.add('is-start', 'appear');
    target.podsEl.appendChild(fresh);
    await sleep(1300);
    fresh.classList.remove('is-start');
    setState(fresh, 'Running');
    el.pods.textContent = '42';
    setStatus('HEALTHY');
    setBusy(false);
  }

  async function rollout() {
    if (busy) return;
    setBusy(true);
    setStatus('ROLLING UPDATE', true);
    for (const n of nodes) {
      const ps = [...n.podsEl.children];
      ps.forEach((p) => { p.classList.add('is-roll'); setState(p, 'Updating'); });
      await sleep(850);
      ps.forEach((p) => {
        p.classList.remove('is-roll');
        $('span', p).textContent = `${p.dataset.podType}-${hash()}`;
        setState(p, 'Running');
      });
      await sleep(250);
    }
    setStatus('HEALTHY');
    setBusy(false);
  }

  btnRoll.addEventListener('click', rollout);
  btnKill.addEventListener('click', killPod);

  // idle life: stats wobble, pods occasionally move
  let cpu = 42, mem = 61, timer = 0, moveTick = 0;
  function tick() {
    cpu += rand(-2.5, 2.5); cpu = Math.min(52, Math.max(34, cpu));
    mem += rand(-1, 1); mem = Math.min(66, Math.max(57, mem));
    el.cpu.textContent = `${Math.round(cpu)}%`;
    el.mem.textContent = `${Math.round(mem)}%`;
    el.cpuBar.style.width = `${cpu}%`;
    el.memBar.style.width = `${mem}%`;
    if (++moveTick % 5 === 0) rebalance();
  }

  watch($('#k8sBoard'), {
    threshold: 0.25,
    onEnter: () => {
      tick();
      if (!reduced && !timer) timer = setInterval(tick, 1400);
    },
    onLeave: () => { clearInterval(timer); timer = 0; },
  });
}
