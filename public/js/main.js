import { PROFILE, INFRA_DETAILS } from './content.js';
import { $, $$, reduced, finePointer, clamp, rand, sleep, once, watch, typeInto, easeOut, safe } from './util.js';
import { initBackground } from './bg.js';
import { createGraph } from './graph.js';
import { heroSpec, infraSpec, cloudSpec, aiSpec } from './specs.js';
import { initTerminals } from './terminal.js';
import { initK8s } from './k8s.js';
import { initPipeline } from './pipeline.js';
import { initObservability, initSparkline } from './observability.js';
import { initOrbit } from './orbit.js';

document.documentElement.classList.add('js');

/* ------------------------------------------------------------------ */
/* Loader                                                              */
/* ------------------------------------------------------------------ */
function runLoader() {
  const loader = $('#loader');
  const fill = $('#loaderFill');
  const pct = $('#loaderPct');
  const log = $('#loaderLog');
  const ready = $('#loaderReady');
  const lines = ['Loading infrastructure...', 'Loading Kubernetes...', 'Loading automation...', 'Loading experience...'];
  const total = reduced ? 250 : 1500;

  return new Promise((resolve) => {
    const t0 = performance.now();
    let shown = 0;
    (function step(now) {
      const p = clamp((now - t0) / total, 0, 1);
      const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      fill.style.width = `${(eased * 100).toFixed(1)}%`;
      pct.textContent = Math.round(eased * 100);
      while (shown < lines.length && eased > (shown + 0.6) / (lines.length + 0.4)) {
        const li = document.createElement('li');
        li.textContent = lines[shown++];
        log.appendChild(li);
      }
      if (p < 1) return requestAnimationFrame(step);
      ready.classList.add('on');
      setTimeout(() => {
        loader.classList.add('done');
        document.body.classList.remove('is-loading');
        resolve();
      }, reduced ? 100 : 420);
    })(t0);
  });
}

/* ------------------------------------------------------------------ */
/* Counters                                                            */
/* ------------------------------------------------------------------ */
function count(el) {
  const target = Number(el.dataset.count);
  const suffix = el.dataset.suffix || '';
  if (reduced) { el.textContent = target + suffix; return; }
  const t0 = performance.now();
  const dur = 1700;
  (function step(now) {
    const p = clamp((now - t0) / dur, 0, 1);
    el.textContent = Math.round(target * easeOut(p)) + suffix;
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */
const SPY = {
  metrics: 'about', about: 'about', infrastructure: 'infrastructure', cicd: 'infrastructure',
  observability: 'infrastructure', stack: 'stack', experience: 'experience', ai: 'experience',
  projects: 'projects', principles: 'projects', contact: 'contact',
};

function initNav() {
  const nav = $('#nav');
  const links = $('#navLinks');
  const toggle = $('#navToggle');
  const setOpen = (open) => {
    links.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setOpen(!links.classList.contains('open')));
  links.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && links.classList.contains('open')) setOpen(false); });
  matchMedia('(min-width: 901px)').addEventListener('change', (m) => { if (m.matches) setOpen(false); });

  const sections = Object.keys(SPY).map((id) => $(`#${id}`)).filter(Boolean);
  const anchors = $$('[data-spy]', links);
  return function update() {
    nav.classList.toggle('scrolled', window.scrollY > 8);
    let key = null;
    const line = window.innerHeight * 0.35;
    for (const s of sections) if (s.getBoundingClientRect().top <= line) key = SPY[s.id];
    anchors.forEach((a) => a.classList.toggle('active', a.dataset.spy === key));
  };
}

/* ------------------------------------------------------------------ */
/* Scroll-driven bits: timeline, principles, parallax                   */
/* ------------------------------------------------------------------ */
function initScrollScenes() {
  const rail = $('.tl-rail');
  const fill = $('#tlFill');
  const tlItems = $$('[data-tl]');
  const prins = $$('[data-principle]');
  const heroCopy = $('.hero-copy');
  const heroVisual = $('.hero-visual');

  // principles: headings stay visible; the active one lights up with scroll

  return function update() {
    const vh = window.innerHeight;

    // timeline: the glowing line follows the viewport centre
    if (rail) {
      const mid = vh * 0.55;
      const rr = rail.getBoundingClientRect();
      fill.style.height = `${clamp((mid - rr.top) / rr.height, 0, 1) * 100}%`;
      let active = -1;
      tlItems.forEach((it, i) => {
        const n = $('.tl-node', it).getBoundingClientRect();
        if (n.top + n.height / 2 <= mid) active = i;
      });
      tlItems.forEach((it, i) => {
        it.classList.toggle('is-active', i === active);
        it.classList.toggle('is-past', i < active);
      });
    }

    // principles: the one nearest the viewport centre lights up
    if (prins.length) {
      const mid = vh * 0.5;
      let best = -1, bd = Infinity;
      prins.forEach((li, i) => {
        const r = li.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (r.bottom > 0 && r.top < vh && d < bd) { bd = d; best = i; }
      });
      prins.forEach((li, i) => {
        const r = li.getBoundingClientRect();
        li.classList.toggle('is-active', i === best);
        li.classList.toggle('is-past', i !== best && r.top + r.height / 2 < mid);
      });
    }

    // gentle hero parallax
    if (!reduced && heroCopy && window.innerWidth > 1100) {
      const y = window.scrollY;
      if (y < vh * 1.2) {
        heroCopy.style.transform = `translate3d(0,${(y * 0.07).toFixed(1)}px,0)`;
        heroVisual.style.transform = `translate3d(0,${(-y * 0.04).toFixed(1)}px,0)`;
      }
    }
  };
}

/* ------------------------------------------------------------------ */
/* Pointer effects                                                     */
/* ------------------------------------------------------------------ */
function initPointerFx() {
  if (!finePointer || reduced) return;

  // radial light following the cursor
  const glow = $('#cursorGlow');
  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y;
  window.addEventListener('pointermove', (e) => { tx = e.clientX; ty = e.clientY; glow.classList.add('on'); }, { passive: true });
  document.addEventListener('pointerleave', () => glow.classList.remove('on'));
  (function loop() {
    x += (tx - x) * 0.14;
    y += (ty - y) * 0.14;
    glow.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    requestAnimationFrame(loop);
  })();

  // magnetic tilt on cards
  $$('[data-tilt], [data-metric]').forEach((el) => {
    el.style.transition = 'transform .25s cubic-bezier(.22,.8,.24,1), box-shadow .4s, border-color .3s';
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateX(${(-py * 4).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg) translate3d(${(px * 5).toFixed(1)}px,${(py * 5).toFixed(1)}px,0)`;
    });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; });
  });
}

/* ------------------------------------------------------------------ */
/* Headings type themselves in                                          */
/* ------------------------------------------------------------------ */
function initTypedHeadings() {
  if (reduced) return;
  const heads = $$('[data-type]');
  const pending = new Set();
  heads.forEach((h) => {
    const text = h.textContent.trim();
    h.setAttribute('aria-label', text);
    h.style.minHeight = `${h.offsetHeight}px`;
    h.textContent = '';
    pending.add(h);
    once(h, () => { pending.delete(h); typeInto(h, text, 26); }, { threshold: 0.6 });
    h._full = text;
  });
  // safety net: never leave a heading blank
  setTimeout(() => pending.forEach((h) => { if (!h.textContent) h.textContent = h._full; }), 12000);
}

/* ------------------------------------------------------------------ */
/* Contact form                                                        */
/* ------------------------------------------------------------------ */
function initContact() {
  const form = $('#connForm');
  if (!form) return;
  const fields = $('#connFields');
  const logBox = $('#connLog');
  const status = $('#connStatus');
  const statusText = $('#connStatusText');
  const send = $('#connSend');
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const setStatus = (state, text) => { status.dataset.state = state; statusText.textContent = text; };
  const line = (html, cls = '') => {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    d.innerHTML = html;
    logBox.appendChild(d);
    return d;
  };
  const showErr = (map) => {
    $$('.field', form).forEach((f) => {
      const input = $('input, textarea', f);
      const msg = map[input.name];
      f.classList.toggle('invalid', !!msg);
      $('[data-err]', f).textContent = msg || '';
    });
  };
  const reset = (keep) => {
    logBox.hidden = true;
    logBox.innerHTML = '';
    fields.hidden = false;
    setStatus('waiting', 'STATUS: WAITING');
    if (!keep) form.reset();
    send.disabled = false;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const errors = {};
    if ((data.name || '').trim().length < 2) errors.name = 'Enter your name.';
    if (!EMAIL.test((data.email || '').trim())) errors.email = 'Enter a valid email address.';
    if ((data.message || '').trim().length < 10) errors.message = 'Write at least 10 characters.';
    showErr(errors);
    if (Object.keys(errors).length) { $('.invalid input, .invalid textarea', form)?.focus(); return; }

    send.disabled = true;
    fields.hidden = true;
    logBox.hidden = false;
    logBox.innerHTML = '';
    setStatus('connecting', 'STATUS: CONNECTING');

    const pace = reduced ? 0 : 650;
    line('&gt; Initializing connection...');
    await sleep(pace);
    line('&gt; Validating request...');
    const request = fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
      .then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
      .catch(() => ({ ok: false, body: { error: 'Network error.' } }));
    const [res] = await Promise.all([request, sleep(pace)]);

    if (res.ok && res.body.ok) {
      line('&gt; Connection established.');
      await sleep(pace / 2);
      line('✓ MESSAGE DELIVERED', 'big');
      const again = document.createElement('button');
      again.className = 'btn mono';
      again.type = 'button';
      again.textContent = '[ SEND ANOTHER ]';
      again.addEventListener('click', () => reset(false));
      logBox.appendChild(again);
      setStatus('ok', 'STATUS: CONNECTED');
    } else {
      line('&gt; Connection failed.');
      line('✕ MESSAGE NOT SENT', 'big bad');
      const why = document.createElement('div');
      why.textContent = res.body.error || 'Something went wrong.';
      logBox.appendChild(why);
      const mail = document.createElement('div');
      mail.innerHTML = `Try again, or write to <a href="mailto:${PROFILE.email}" style="color:var(--green)">${PROFILE.email}</a>.`;
      logBox.appendChild(mail);
      const retry = document.createElement('button');
      retry.className = 'btn mono';
      retry.type = 'button';
      retry.textContent = '[ TRY AGAIN ]';
      retry.addEventListener('click', () => reset(true));
      logBox.appendChild(retry);
      if (res.body.fields) { reset(true); showErr(res.body.fields); return; }
      setStatus('error', 'STATUS: FAILED');
    }
  });
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */
const loaded = runLoader();

safe('background', () => initBackground($('#bg')));
const updateNav = safe('nav', initNav);
const terminals = safe('terminals', initTerminals);

// LinkedIn only appears once a URL is set in content.js
if (PROFILE.linkedin) {
  const li = $('#liLinkedin');
  const a = $('a', li);
  a.href = PROFILE.linkedin;
  a.textContent = PROFILE.linkedin.replace(/^https?:\/\//, '');
  li.hidden = false;
  const f = $('#footLinkedin');
  f.href = PROFILE.linkedin;
  f.hidden = false;
}

/* Hero map + HUD */
const heroGraph = safe('hero-map', () => {
  const g = createGraph($('#heroMap'), heroSpec, { tilt: true });
  const req = $('#hudReq'), cpu = $('#hudCpu'), pods = $('#hudPods'), ticker = $('#heroTicker');
  let c = 42;
  if (!reduced) {
    setInterval(() => {
      if (document.hidden) return;
      req.textContent = Math.round(100000 + rand(-900, 1500)).toLocaleString('en-US');
      c = clamp(c + rand(-3, 3), 36, 48);
      cpu.textContent = `${Math.round(c)}%`;
      pods.textContent = g.podCount();
    }, 1100);
    const rollout = () => {
      g.deploy((i, n) => {
        ticker.textContent = i <= n ? `deploy/api · rolling ${i}/${n}` : 'deploy/api · healthy';
      }).then(() => setTimeout(() => { ticker.textContent = 'deploy/api · idle'; }, 2600));
    };
    setTimeout(() => { setInterval(rollout, 19000); setTimeout(rollout, 5500); }, 2000);
  }
  return g;
});

/* Infrastructure explorer */
safe('infra-explorer', () => {
  const title = $('#infraDetailTitle');
  const list = $('#infraDetailList');
  let g;
  const select = (key) => {
    const d = INFRA_DETAILS[key];
    if (!d) return;
    g.select(key);
    title.textContent = d.title;
    list.innerHTML = d.lines.map((l, i) => `<li style="animation-delay:${i * 55}ms">${l}</li>`).join('');
  };
  g = createGraph($('#infraMap'), infraSpec, { interactive: true, tilt: true, selected: 'k8s', onSelect: select });
  select('k8s');
});

/* Cloud topology */
safe('cloud-map', () => createGraph($('#cloudMap'), cloudSpec, { pods: false }));

/* AI x infrastructure */
safe('ai-map', () => {
  const items = $$('#aiList li');
  const g = createGraph($('#aiMap'), aiSpec, {
    onHover: (id) => items.forEach((li) => li.classList.toggle('is-hot', !!id && li.dataset.branch === id)),
  });
  items.forEach((li) => {
    li.addEventListener('pointerenter', () => { g.hot(li.dataset.branch); li.classList.add('is-hot'); });
    li.addEventListener('pointerleave', () => { g.hot(null); li.classList.remove('is-hot'); });
  });
  return g;
});

safe('k8s', initK8s);
safe('pipeline', initPipeline);
safe('observability', initObservability);
safe('sparkline', () => initSparkline($('[data-spark]')));
safe('orbit', initOrbit);
safe('contact', initContact);
safe('pointer-fx', initPointerFx);

/* Metrics: counters + hover particles */
$$('[data-count]').forEach((el) => {
  el.textContent = `0${el.dataset.suffix || ''}`;
  if (!el.closest('.hero')) once(el, () => count(el), { threshold: 0.6 });
});
$$('[data-metric]').forEach((m) => {
  for (let i = 0; i < 12; i++) {
    const p = document.createElement('i');
    p.className = 'pt';
    p.style.left = `${rand(4, 96).toFixed(1)}%`;
    p.style.animationDelay = `${(-Math.random() * 2.4).toFixed(2)}s`;
    p.style.animationDuration = `${rand(1.8, 3.2).toFixed(2)}s`;
    m.appendChild(p);
  }
});

/* Terminal teaser types itself the first time it is seen */
safe('teaser', () => {
  const t = $('#teaserText');
  if (!t || reduced) return;
  const full = t.textContent;
  t.style.display = 'inline-block';
  t.style.minWidth = `${t.offsetWidth}px`;
  t.textContent = '';
  once($('#teaserTerm'), () => typeInto(t, full, 60, { caret: false }), { threshold: 0.6 });
});

/* One rAF-throttled scroll handler drives the nav, timeline, principles and parallax */
let scenes = null;
let ticking = false;
const onScroll = () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    updateNav?.();
    scenes?.();
  });
};
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });
onScroll();

/* Anything that measures text waits for the web fonts, so heights are right */
const fonts = Promise.race([
  Promise.all([
    document.fonts.load('800 40px "Inter Variable"'),
    document.fonts.load('500 16px "Inter Variable"'),
    document.fonts.load('500 14px "JetBrains Mono Variable"'),
  ]),
  sleep(1800),
]).catch(() => {});
fonts.then(() => {
  safe('typed-headings', initTypedHeadings);
  scenes = safe('scroll-scenes', initScrollScenes);
  onScroll();
});

/* After the loader: hero terminal plays, hero number counts */
loaded.then(() => {
  terminals?.playHero();
  const heroNum = $('.hero [data-count]');
  if (heroNum) count(heroNum);
  onScroll();
});
