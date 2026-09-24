/**
 * Terminal emulator used twice: the floating hero terminal (auto-plays a short
 * script, then accepts commands on click) and the hidden full-screen shell that
 * opens from the nav, the ` key, or the teaser strip.
 */
import { commandOutput, KNOWN_COMMANDS } from './content.js';
import { esc, sleep, reduced, $ } from './util.js';

const PROMPT = 'devyanshu@production:~$';

const markup = (s) =>
  esc(s).replace(/\[\[(ok|cy|pu|mu|warn):([\s\S]*?)\]\](?!\])/g, (_, c, t) => `<span class="c-${c}">${t}</span>`);

function normalize(raw) {
  let c = raw.trim().replace(/\s+/g, ' ').toLowerCase();
  if (c === 'sudo devyanshu' || c === 'sudo devyanshu --help' || c === '--help' || c === '-h' || c === 'devyanshu --help') return 'sudo devyanshu --help';
  if (c.startsWith('sudo devyanshu ')) c = c.slice(15);
  else if (c.startsWith('devyanshu ')) c = c.slice(10);
  if (c === 'kubectl get node') c = 'kubectl get nodes';
  if (c === 'kubectl get pod') c = 'kubectl get pods';
  if (c === 'll') c = 'ls';
  return c;
}

class Term {
  constructor(root, mode) {
    this.root = root;
    this.mode = mode;
    this.history = [];
    this.hi = 0;
    this.busy = false;
    this.skipping = false;
    this.played = false;
    this.onExit = null;

    const title = mode === 'overlay' ? 'root@devyanshu: ~' : 'devyanshu@production: ~';
    root.insertAdjacentHTML(
      'beforeend',
      `<div class="term-bar"><i></i><i></i><i></i><span>${title}</span></div>
       <div class="term-body">
         <div class="term-lines" aria-live="polite"></div>
         <div class="term-in" hidden>
           <span class="p">${PROMPT}</span>
           <input type="text" spellcheck="false" autocomplete="off" autocapitalize="off" autocorrect="off" aria-label="Terminal input" placeholder="type help">
           <i class="term-caret" aria-hidden="true"></i>
         </div>
       </div>`
    );
    this.body = $('.term-body', root);
    this.lines = $('.term-lines', root);
    this.inRow = $('.term-in', root);
    this.input = $('input', root);
    this.caret = $('.term-caret', root);

    this.body.addEventListener('click', () => {
      if (this.busy) { this.skipping = true; return; }
      if (window.getSelection()?.toString()) return;
      this.focus();
    });
    this.input.addEventListener('focus', () => { this.caret.style.display = 'none'; });
    this.input.addEventListener('blur', () => { this.caret.style.display = ''; });
    this.input.addEventListener('keydown', (e) => this.onKey(e));
  }

  focus() {
    this.inRow.hidden = false;
    this.input.focus({ preventScroll: true });
  }

  scroll() { this.body.scrollTop = this.body.scrollHeight; }

  line(html, cls = '') {
    const d = document.createElement('div');
    d.className = `term-line ${cls}`.trim();
    d.innerHTML = html;
    this.lines.appendChild(d);
    this.scroll();
    return d;
  }

  wait(ms) { return this.skipping ? Promise.resolve() : sleep(ms); }

  async typeCommand(cmd) {
    const row = this.line(`<span class="p">${PROMPT}</span> <span class="cmd"></span><i class="term-caret"></i>`);
    const out = $('.cmd', row);
    if (reduced || this.skipping) out.textContent = cmd;
    else {
      for (let i = 1; i <= cmd.length; i++) {
        out.textContent = cmd.slice(0, i);
        await this.wait(34 + Math.random() * 40);
        if (this.skipping) { out.textContent = cmd; break; }
      }
    }
    $('.term-caret', row)?.remove();
  }

  echo(cmd) {
    this.line(`<span class="p">${PROMPT}</span> <span class="cmd">${esc(cmd)}</span>`);
  }

  async print(lines) {
    for (const l of lines) {
      this.line(markup(l) || '&nbsp;');
      await this.wait(45);
    }
  }

  async execute(raw) {
    const cmd = normalize(raw);
    if (!cmd) return;
    if (cmd === 'clear') { this.lines.innerHTML = ''; return; }
    if (cmd === 'exit' || cmd === 'quit') {
      if (this.mode === 'overlay') { this.onExit?.(); return; }
      await this.print(['[[mu:nothing to exit here. try the >_ button in the nav for a full shell.]]']);
      return;
    }
    if (cmd === 'sudo') {
      await this.print(['[[warn:devyanshu is not in the sudoers file. This incident will be reported.]]']);
      return;
    }
    if (cmd === 'ls') {
      await this.print(['[[cy:about  skills  infra  experience  projects  contact]]']);
      return;
    }
    const out = commandOutput(cmd);
    if (out) await this.print(out);
    else await this.print([`[[warn:command not found:]] ${raw.trim()}`, "[[mu:type 'help' to see what is available]]"]);
  }

  async play(script, { hint = true } = {}) {
    if (this.played) return;
    this.played = true;
    this.busy = true;
    this.skipping = false;
    for (const cmd of script) {
      await this.typeCommand(cmd);
      await this.wait(200);
      await this.execute(cmd);
      await this.wait(320);
    }
    if (hint) this.line(markup("[[mu:click here and type a command. try 'help'.]]"));
    this.busy = false;
    this.skipping = false;
    this.inRow.hidden = false;
    this.scroll();
  }

  onKey(e) {
    if (e.key === 'Enter') {
      const raw = this.input.value;
      this.input.value = '';
      if (raw.trim()) { this.history.push(raw); this.hi = this.history.length; }
      // run commands strictly in order so output never interleaves
      this.queue = (this.queue || Promise.resolve()).then(async () => {
        this.echo(raw);
        this.busy = true;
        await this.execute(raw);
        this.busy = false;
        this.skipping = false;
        this.scroll();
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.hi > 0) this.input.value = this.history[--this.hi] ?? '';
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.hi = Math.min(this.hi + 1, this.history.length);
      this.input.value = this.history[this.hi] ?? '';
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const v = this.input.value.trimStart().toLowerCase();
      if (!v) return;
      const m = KNOWN_COMMANDS.filter((c) => c.startsWith(v));
      if (m.length === 1) this.input.value = m[0];
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      this.lines.innerHTML = '';
    }
  }
}

export function initTerminals() {
  const heroRoot = $('[data-term="hero"]');
  const overRoot = $('[data-term="overlay"]');
  const overlay = $('#termOverlay');
  const closeBtn = $('#closeTerm');

  const hero = heroRoot ? new Term(heroRoot, 'hero') : null;
  const over = overRoot ? new Term(overRoot, 'overlay') : null;
  let opener = null;

  function open(from) {
    if (!over || !overlay) return;
    opener = from || document.activeElement;
    overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    if (!over.played) {
      over.line(markup('[[mu:root shell. type help, or press esc to close.]]'));
      over.play(['sudo devyanshu --help'], { hint: false }).then(() => over.focus());
    } else {
      over.focus();
    }
  }

  function close() {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.body.style.overflow = '';
    opener?.focus?.({ preventScroll: true });
  }

  if (over) over.onExit = close;
  closeBtn?.addEventListener('click', close);
  overlay?.addEventListener('pointerdown', (e) => { if (e.target === overlay) close(); });

  document.addEventListener('keydown', (e) => {
    if (overlay && !overlay.hidden) {
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key === 'Tab') {
        const items = [closeBtn, over.input].filter(Boolean);
        const i = items.indexOf(document.activeElement);
        e.preventDefault();
        items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus({ preventScroll: true });
      }
      return;
    }
    if (e.key === '`' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const t = e.target;
      const typing = t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (!typing) { e.preventDefault(); open(); }
    }
  });

  $('#openTerm')?.addEventListener('click', (e) => open(e.currentTarget));
  $('#teaserTerm')?.addEventListener('click', (e) => open(e.currentTarget));

  return {
    open,
    close,
    playHero() {
      hero?.play(['whoami', 'kubectl get nodes', 'kubectl get pods', 'uptime']);
    },
  };
}
