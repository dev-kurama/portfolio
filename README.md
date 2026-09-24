# Devyanshu Kaushik — Senior DevOps Engineer portfolio

Node.js + Express server, framework-free front end (ES modules, SVG, canvas). No build step.

## Run

```bash
npm install
npm start            # http://localhost:3000
npm run dev          # same, restarts on file changes
```

Node 18+. Fonts (Inter, JetBrains Mono) are self-hosted from `node_modules`, so the site makes no third-party requests.

## Things to edit

| What | Where |
| --- | --- |
| LinkedIn link (hidden until set) | `public/js/content.js` → `PROFILE.linkedin` |
| Terminal outputs, tech blurbs, infra detail text | `public/js/content.js` |
| Page copy, experience, projects, principles | `public/index.html` |
| Colours, spacing, fonts | top of `public/css/style.css` (`:root`) |
| Diagram layouts (hero map, infra explorer, cloud, AI) | `public/js/specs.js` |

## Contact form

`POST /api/contact` validates input, rate-limits (5/hour/IP), honeypots bots, and appends each message to
`data/messages.jsonl`. Set the `SMTP_*` variables (see `.env.example`) to also get an email.
Behind a proxy/load balancer the server already trusts one proxy hop for the client IP.

## Simulated values

These are illustrative, not live telemetry, and are labelled as such on the page:
the hero HUD (req/min, CPU, pods), the Kubernetes board (42 pods, CPU/memory), the observability
graph and log stream, and the terminal's `kubectl` output.
Everything else comes from the resume.

## Hidden terminal

Press `` ` `` (backtick), click `>_` in the nav, or click the strip above the contact section.
Commands: `help about skills infra experience projects contact whoami uptime clear exit`,
`kubectl get nodes|pods`, `sudo devyanshu --help`. `Esc` closes.

## Deploy

Any Node host works (`npm start`, honours `PORT`). Health check: `GET /healthz`.
