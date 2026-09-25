'use strict';

/**
 * Devyanshu Kaushik — portfolio server
 *
 *  - serves the static site from /public
 *  - self-hosts fonts from node_modules (no third-party requests)
 *  - POST /api/contact  → validates, rate-limits, stores to data/messages.jsonl
 *                          and (optionally) emails via SMTP if configured
 */
require("dotenv").config();
const path = require('path');
const fs = require('fs');
const express = require('express');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.jsonl');
const CONTACT_TO = process.env.CONTACT_TO || 'Devyanshukaushik08@gmail.com';

app.disable('x-powered-by');
app.set('trust proxy', 1);

/* ------------------------------------------------------------------ */
/* Security headers                                                    */
/* ------------------------------------------------------------------ */
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // HSTS: force HTTPS (only in production)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
});

app.use(express.json({ limit: '16kb' }));

/* ------------------------------------------------------------------ */
/* Static assets                                                       */
/* ------------------------------------------------------------------ */
const fontOpts = { maxAge: '30d', immutable: true };
app.use(
  '/vendor/inter',
  express.static(path.join(__dirname, 'node_modules/@fontsource-variable/inter'), fontOpts)
);
app.use(
  '/vendor/jetbrains-mono',
  express.static(path.join(__dirname, 'node_modules/@fontsource-variable/jetbrains-mono'), fontOpts)
);
app.use(
  express.static(PUBLIC_DIR, {
    extensions: ['html'],
    // Short cache while iterating; bump for production if you like.
    maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
  })
);

/* ------------------------------------------------------------------ */
/* Contact API                                                         */
/* ------------------------------------------------------------------ */
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_MAX = 5;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_MAX) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  return false;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, list] of hits) {
    const fresh = list.filter((t) => now - t < RATE_WINDOW_MS);
    if (fresh.length) hits.set(ip, fresh);
    else hits.delete(ip);
  }
}, 10 * 60 * 1000).unref();

let transporter = null;
if (process.env.SMTP_HOST) {
  try {
    const nodemailer = require('nodemailer');
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  } catch (err) {
    console.warn('[contact] nodemailer unavailable, falling back to file storage only:', err.message);
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v, max) =>
  String(v ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
    .slice(0, max);

app.post('/api/contact', async (req, res) => {
  const body = req.body || {};

  // Honeypot: real users never fill this in. Pretend success.
  if (body.website) return res.json({ ok: true });

  if (rateLimited(req.ip)) {
    return res.status(429).json({ ok: false, error: 'Too many requests. Try again in an hour or email directly.' });
  }

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const message = clean(body.message, 4000);

  const errors = {};
  if (name.length < 2) errors.name = 'Enter your name.';
  if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
  if (message.length < 10) errors.message = 'Write at least 10 characters.';
  if (Object.keys(errors).length) {
    return res.status(400).json({ ok: false, error: 'Validation failed.', fields: errors });
  }

  // The visitor's IP is used only for in-memory rate limiting, never stored.
  const record = { at: new Date().toISOString(), name, email, message };

  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(MESSAGES_FILE, JSON.stringify(record) + '\n');
  } catch (err) {
    console.error('[contact] could not write message file:', err.message);
    if (!transporter) {
      return res.status(500).json({ ok: false, error: 'Could not store your message. Email directly instead.' });
    }
  }

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || CONTACT_TO,
        to: CONTACT_TO,
        replyTo: `${name.replace(/[<>\r\n]/g, '')} <${email}>`,
        subject: `Portfolio connection request from ${name.replace(/[\r\n]/g, ' ')}`,
        text: `${message}\n\n— ${name} <${email}>`,
      });
    } catch (err) {
      // Message is already saved to disk, so don't fail the request.
      console.error('[contact] SMTP send failed:', err.message);
    }
  }

  console.log(`[contact] message from ${name} <${email}> stored`);
  res.json({ ok: true });
});

app.get('/healthz', (req, res) => res.json({ status: 'ok', uptime: Math.round(process.uptime()) }));

app.use('/api', (req, res) => res.status(404).json({ ok: false, error: 'Not found' }));

app.use((req, res) => {
  res.status(404).type('text/plain').send('404 — not found. Try /');
});

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body.' });
  }
  console.error(err);
  res.status(500).json({ ok: false, error: 'Internal error.' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  ▸ devyanshu.kaushik is online → http://localhost:${PORT}\n`);
  });
}

module.exports = app;
