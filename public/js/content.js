/**
 * Single source of truth for anything the JS layer needs to know about
 * Devyanshu. Facts come from the 2026 resume. Edit here, not in the modules.
 */

export const PROFILE = {
  name: 'Devyanshu Kaushik',
  role: 'Senior DevOps Engineer',
  location: 'Gurugram, India',
  email: 'Devyanshukaushik08@gmail.com',
  github: 'https://github.com/dev-kurama',
  githubHandle: 'dev-kurama',
  linkedin: '', // add your LinkedIn URL here and it appears in the footer + contact panel
  years: '4+',
};

/** Category colours follow the palette rules: green = healthy/ops, cyan = cloud/data, purple = AI. */
export const CAT = {
  cloud: '#00D9FF',
  ops: '#00FF9C',
  lang: '#7C3AED',
  data: '#00D9FF',
  obs: '#00FF9C',
};

export const TECH = [
  { name: 'Kubernetes', cat: 'ops', ring: 0, blurb: 'Production clusters serving 100K+ requests/minute. Ingress, services, cert-manager.' },
  { name: 'Docker', cat: 'ops', ring: 0, blurb: 'Dockerized deployments and container builds inside the CI/CD pipeline.' },
  { name: 'GCP', cat: 'cloud', ring: 0, blurb: 'Kubernetes, networking, storage and production Linux servers.' },
  { name: 'AWS', cat: 'cloud', ring: 0, blurb: 'Production Linux servers alongside GCP for the same platform.' },
  { name: 'GitHub Actions', cat: 'ops', ring: 1, blurb: 'CI/CD pipelines that cut deployment time and enabled zero-touch releases.' },
  { name: 'Python', cat: 'lang', ring: 1, blurb: 'Automation and scripting, plus backend APIs in FastAPI and Flask.' },
  { name: 'Linux', cat: 'ops', ring: 1, blurb: 'Managed 20+ production Linux servers across GCP and AWS.' },
  { name: 'NGINX', cat: 'ops', ring: 1, blurb: 'Reverse proxy and SSL termination in front of Kubernetes services.' },
  { name: 'Grafana', cat: 'obs', ring: 1, blurb: 'Dashboards and monitoring for production services.' },
  { name: 'Loki', cat: 'obs', ring: 2, blurb: 'Centralised log management with retention on Google Cloud Storage.' },
  { name: 'PostgreSQL', cat: 'data', ring: 2, blurb: 'Configured and maintained in production alongside MongoDB and Cassandra.' },
  { name: 'MongoDB', cat: 'data', ring: 2, blurb: 'Configured and maintained in production; backs the RaySuite platform.' },
  { name: 'Cassandra', cat: 'data', ring: 2, blurb: 'Distributed database setup and management.' },
  { name: 'Redis', cat: 'data', ring: 2, blurb: 'In-memory cache and data layer in the service stack.' },
  { name: 'FastAPI', cat: 'lang', ring: 2, blurb: 'Scalable API systems and microservices.' },
  { name: 'Flask', cat: 'lang', ring: 2, blurb: 'Lightweight Python services and internal APIs.' },
];

export const INFRA_DETAILS = {
  cdn: {
    title: 'CLOUD',
    lines: ['Public entry point for traffic', 'GCP and AWS environments', 'Traffic routed to the load balancer'],
  },
  lb: {
    title: 'LOAD BALANCER',
    lines: ['Traffic distribution across nodes', 'Health checks and failover', 'Sustained 100K+ requests/minute', 'NGINX reverse proxy layer'],
  },
  k8s: {
    title: 'KUBERNETES',
    lines: ['Production clusters', 'Container orchestration', 'Autoscaling', 'Deployments', 'Services', 'Ingress', 'Cert-manager'],
  },
  svc: {
    title: 'MICROSERVICES',
    lines: ['FastAPI and Flask services', 'Dockerized, released through GitHub Actions', 'Centralised logs in Loki', 'Grafana dashboards per service'],
  },
  mongo: { title: 'MONGODB', lines: ['Production configuration and maintenance', 'Powers RaySuite backend services', 'Runs beside Cassandra and PostgreSQL'] },
  pg: { title: 'POSTGRESQL', lines: ['Relational workloads', 'Configured and maintained in production', 'Used at Nitro Commerce and RaySuite AI'] },
  redis: { title: 'REDIS', lines: ['Caching layer', 'Fast lookups for API services', 'Part of the standard service stack'] },
};

export const EXPERIENCE = [
  {
    company: 'RaySuite AI',
    role: 'Senior Software Engineer',
    dates: 'Jun 2025 – Present',
    place: 'Delhi, India (Hybrid)',
    highlights: ['Agentic AI', 'Campaign automation', 'Predictive analytics', 'Microservices', 'Distributed databases'],
  },
  {
    company: 'Nitro Commerce',
    role: 'Software Engineer (DevOps)',
    dates: 'Nov 2023 – May 2025',
    place: 'Gurugram, India (Hybrid)',
    highlights: ['Kubernetes', '100K+ RPM infrastructure', 'CI/CD', 'Grafana + Loki', 'GCP / AWS'],
  },
  {
    company: 'Wigzo by Shiprocket',
    role: 'Associate Software Engineer',
    dates: 'Aug 2022 – Oct 2023',
    place: 'Delhi, India',
    highlights: ['Backend engineering', 'Production releases', 'Database management', 'Client issue resolution'],
  },
];

export const PROJECTS = [
  { id: 'k8s', name: 'Production Kubernetes Infrastructure', tags: ['Kubernetes', 'GCP', 'Docker', 'NGINX', 'Linux'] },
  { id: 'cicd', name: 'CI/CD Automation', tags: ['GitHub Actions', 'Docker', 'CI/CD', 'Automation'] },
  { id: 'obs', name: 'Observability Platform', tags: ['Grafana', 'Loki', 'GCS', 'Monitoring', 'Logging'] },
  { id: 'ssl', name: 'SSL / Reverse Proxy Automation', tags: ['NGINX', 'Cert-manager', "Let's Encrypt", 'Kubernetes'] },
];

/* -------------------------------------------------------------- */
/* Terminal command outputs.                                       */
/* Lines are plain strings with inline colour markup:              */
/*   [[ok:text]] green · [[cy:text]] cyan · [[pu:text]] purple ·   */
/*   [[mu:text]] muted · [[warn:text]] amber                       */
/* -------------------------------------------------------------- */

const ok = (t) => `[[ok:${t}]]`;
const cy = (t) => `[[cy:${t}]]`;
const pu = (t) => `[[pu:${t}]]`;
const mu = (t) => `[[mu:${t}]]`;

export function commandOutput(cmd) {
  switch (cmd) {
    case 'help':
      return [
        mu('available commands'),
        '',
        row('about', 'Who I am'),
        row('skills', 'Technical stack'),
        row('infra', 'Infrastructure experience'),
        row('experience', 'Where I have worked'),
        row('projects', 'Selected projects'),
        row('contact', 'How to reach me'),
        '',
        mu('also try: whoami · kubectl get nodes · kubectl get pods · uptime · clear'),
      ];
    case 'about':
      return [
        ok('Devyanshu Kaushik — Senior DevOps Engineer'),
        '4+ years designing, deploying and managing cloud-native infrastructure,',
        'Kubernetes environments, CI/CD pipelines, monitoring and distributed databases.',
        'Currently building agentic AI systems at RaySuite AI.',
        mu('Gurugram, India'),
      ];
    case 'skills':
      return [
        cy('cloud      ') + 'GCP · AWS',
        cy('platform   ') + 'Kubernetes · Docker · NGINX · Linux · Cert-manager',
        cy('cicd       ') + 'GitHub Actions · zero-touch releases',
        cy('observe    ') + 'Grafana · Loki · centralised logging',
        cy('data       ') + 'PostgreSQL · MongoDB · Cassandra · Redis · MariaDB',
        cy('code       ') + 'Python · FastAPI · Flask · Java · C / C++ · SQL',
        pu('ai         ') + 'LangGraph · predictive analytics · campaign automation',
      ];
    case 'infra':
      return [
        ok('▸ ') + 'Production Kubernetes serving 100K+ requests/minute (Nitro Commerce)',
        ok('▸ ') + '20+ production Linux servers across GCP and AWS',
        ok('▸ ') + 'Grafana + Loki with log retention on Google Cloud Storage',
        ok('▸ ') + 'Reverse proxy and SSL automation: Certbot + Kubernetes cert-manager',
        ok('▸ ') + 'Onsite infrastructure, networking and Asterisk SIP (PJSIP) integrations',
      ];
    case 'experience':
      return EXPERIENCE.map((e) => cy(e.dates.padEnd(22)) + e.company + mu('  ' + e.role));
    case 'projects':
      return PROJECTS.map((p, i) => cy(`0${i + 1}  `) + p.name + mu('  [' + p.tags.slice(0, 3).join(', ') + ']'));
    case 'contact':
      return [
        cy('email   ') + PROFILE.email,
        cy('github  ') + PROFILE.github.replace('https://', ''),
        ...(PROFILE.linkedin ? [cy('linkedin ') + PROFILE.linkedin.replace('https://', '')] : []),
        mu('or scroll to ESTABLISH CONNECTION and send a request'),
      ];
    case 'whoami':
      return [ok('devyanshu') + mu('  senior devops engineer · gurugram')];
    case 'uptime':
      return [ok('always-on') + ' production mindset'];
    case 'kubectl get nodes':
      return [
        mu('NAME            STATUS   ROLE'),
        'prod-node-01    ' + ok('Ready') + '    worker',
        'prod-node-02    ' + ok('Ready') + '    worker',
        'prod-node-03    ' + ok('Ready') + '    worker',
      ];
    case 'kubectl get pods':
      return [ok('42 pods running'), '0 failed', mu('# simulated portfolio values')];
    case 'kubectl get devyanshu':
      return [
        mu('NAME         ROLE            STATUS'),
        'devyanshu    senior-devops   ' + ok('running'),
      ];
    case 'sudo devyanshu --help':
      return [
        'Usage: devyanshu [command]',
        '',
        'commands:',
        '',
        row('about', 'About Devyanshu'),
        row('skills', 'Technical stack'),
        row('infra', 'Infrastructure experience'),
        row('projects', 'Selected projects'),
        row('experience', 'Professional experience'),
        row('contact', 'Contact information'),
      ];
    default:
      return null;
  }
}

function row(cmd, desc) {
  return cy('  ' + cmd.padEnd(13)) + desc;
}

export const KNOWN_COMMANDS = [
  'help', 'about', 'skills', 'infra', 'experience', 'projects', 'contact',
  'whoami', 'uptime', 'clear', 'exit',
  'kubectl get nodes', 'kubectl get pods', 'kubectl get devyanshu',
  'sudo devyanshu --help',
];
