/**
 * Deployment pipeline. A packet travels stage to stage when the section
 * scrolls into view (and again on demand), ending on a green production node.
 */
import { $, $$, sleep, once, reduced } from './util.js';

const STEPS = [
  { log: ['g', '$ git commit -m "ship a change"'] },
  { log: ['g', '$ git push origin main'] },
  { log: ['c', 'github actions: workflow triggered'] },
  { log: ['c', 'build: compiling artifacts'] },
  { log: ['c', 'docker: image built and pushed'] },
  { log: ['c', 'test: all checks passed'] },
  { log: ['c', 'deploy: rollout started'] },
  { log: ['c', 'kubernetes: new pods ready, old pods drained'] },
  { log: ['g', 'production: live'] },
];

export function initPipeline() {
  const root = $('#pipe');
  if (!root) return;
  const track = $('#pipeTrack');
  const stages = $$('#pipeStages li');
  const fill = $('#pipeFill');
  const line = $('.pipe-line', root);
  const packet = $('#pipePacket');
  const log = $('#pipeLog');
  const result = $('#pipeResult');
  const title = $('#pipeResultTitle');
  const sub = $('#pipeResultSub');
  const runBtn = $('#pipeRun');
  const vertical = matchMedia('(max-width: 900px)');

  stages.forEach((li) => li.insertAdjacentHTML('afterbegin', '<i class="pn"></i>'));
  stages[stages.length - 1].classList.add('is-final');

  let token = 0;

  function center(i) {
    const li = stages[i];
    const pn = $('.pn', li);
    return {
      x: li.offsetLeft + li.offsetWidth / 2,
      y: li.offsetTop + pn.offsetTop + pn.offsetHeight / 2,
    };
  }

  /** Line + packet geometry depends on whether the pipeline is horizontal or vertical. */
  function layoutLine() {
    if (vertical.matches) {
      const a = center(0), b = center(stages.length - 1);
      line.style.top = `${a.y}px`;
      line.style.bottom = 'auto';
      line.style.height = `${b.y - a.y}px`;
    } else {
      line.style.top = line.style.bottom = line.style.height = '';
    }
  }

  function movePacket(i, animate = true) {
    const c = center(i);
    if (!animate) packet.style.transition = 'none';
    if (vertical.matches) packet.style.top = `${c.y - 6}px`;
    else { packet.style.left = `${c.x}px`; packet.style.top = ''; }
    if (!animate) { void packet.offsetWidth; packet.style.transition = ''; }
    const pct = (i / (stages.length - 1)) * 100;
    if (vertical.matches) { fill.style.height = `${pct}%`; fill.style.width = ''; }
    else { fill.style.width = `${pct}%`; fill.style.height = ''; }
  }

  function addLog([kind, text]) {
    const d = document.createElement('div');
    d.className = kind;
    d.textContent = text;
    log.appendChild(d);
    while (log.children.length > 9) log.firstChild.remove();
  }

  function reset() {
    stages.forEach((li) => li.classList.remove('is-run', 'is-done'));
    log.innerHTML = '';
    fill.style.width = '0';
    fill.style.height = '0';
    packet.classList.remove('on');
    result.classList.remove('ok-state');
    title.textContent = 'PIPELINE RUNNING';
    sub.textContent = 'A change is on its way to production.';
    runBtn.disabled = true;
  }

  function finish() {
    result.classList.add('ok-state');
    title.textContent = '✓ DEPLOYMENT SUCCESSFUL';
    sub.textContent = 'Production rollout completed. Zero-touch deployment pipeline.';
    runBtn.disabled = false;
    packet.classList.remove('on');
  }

  async function run() {
    const my = ++token;
    layoutLine();
    reset();
    if (reduced) {
      stages.forEach((li) => li.classList.add('is-done'));
      STEPS.forEach((st) => addLog(st.log));
      fill.style[vertical.matches ? 'height' : 'width'] = '100%';
      finish();
      return;
    }
    movePacket(0, false);
    packet.classList.add('on');
    for (let i = 0; i < STEPS.length; i++) {
      if (my !== token) return;
      if (i > 0) movePacket(i);
      stages[i].classList.add('is-run');
      addLog(STEPS[i].log);
      await sleep(i === 0 ? 650 : 780);
      if (my !== token) return;
      stages[i].classList.remove('is-run');
      stages[i].classList.add('is-done');
    }
    if (my === token) finish();
  }

  runBtn.addEventListener('click', run);
  vertical.addEventListener('change', layoutLine);
  window.addEventListener('resize', layoutLine, { passive: true });
  once(root, run, { threshold: 0.45 });
}
