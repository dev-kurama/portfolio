/* Small shared helpers. */

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

/** Call onEnter / onLeave as an element crosses the viewport. */
export function watch(el, { onEnter, onLeave, threshold = 0.15, rootMargin = '0px' } = {}) {
  const io = new IntersectionObserver(
    ([e]) => (e.isIntersecting ? onEnter?.(e) : onLeave?.(e)),
    { threshold, rootMargin }
  );
  io.observe(el);
  return io;
}

/** Fire a callback the first time an element is visible. */
export function once(el, cb, { threshold = 0.3, rootMargin = '0px' } = {}) {
  const io = new IntersectionObserver(
    ([e]) => {
      if (e.isIntersecting) {
        io.disconnect();
        cb(e);
      }
    },
    { threshold, rootMargin }
  );
  io.observe(el);
}

/** Type text into an element one character at a time (adds .typing for the caret). */
export async function typeInto(el, text, speed = 28, { caret = true } = {}) {
  el.textContent = '';
  if (caret) el.classList.add('typing');
  for (let i = 1; i <= text.length; i++) {
    el.textContent = text.slice(0, i);
    await sleep(speed + Math.random() * speed * 0.5);
  }
  el.classList.remove('typing');
}

/** Run an init function; one broken module should never take the page down. */
export function safe(name, fn) {
  try {
    return fn();
  } catch (err) {
    console.error(`[init:${name}]`, err);
    return null;
  }
}
