/** Topologies for the four graphs on the page. */

const PODS = [
  ['api', 'wkr', 'ngx'],
  ['api', 'wkr', 'rds'],
  ['api', 'wkr', 'mon'],
];

const k8sTier = (withDetail) =>
  [1, 2, 3].map((i) => ({
    id: `k8s${i}`,
    kind: 'k8s',
    label: `K8S NODE ${i}`,
    sub: `prod-node-0${i}`,
    pods: PODS[i - 1],
    ...(withDetail ? { detail: 'k8s' } : {}),
  }));

/** Hero: what a request passes through on its way to the data. */
export const heroSpec = {
  padTop: 50,
  padBottom: 42,
  gap: 34,
  gapNarrow: 34,
  tiers: [
    [{ id: 'internet', kind: 'edge', label: 'INTERNET' }],
    [{ id: 'lb', kind: 'lb', label: 'LOAD BALANCER' }],
    k8sTier(false),
    [{ id: 'svc', kind: 'svc', label: 'MICROSERVICES' }],
    [
      { id: 'pg', kind: 'db', label: 'POSTGRESQL' },
      { id: 'mongo', kind: 'db', label: 'MONGODB' },
      { id: 'redis', kind: 'db', label: 'REDIS' },
    ],
  ],
};

/** Infrastructure explorer: same system, one tier deeper, everything clickable. */
export const infraSpec = {
  padTop: 20,
  padBottom: 20,
  gap: 40,
  gapNarrow: 34,
  tiers: [
    [{ id: 'users', kind: 'edge', label: 'USERS' }],
    [{ id: 'cdn', kind: 'lb', label: 'CLOUD / CDN', detail: 'cdn' }],
    [{ id: 'lb', kind: 'lb', label: 'LOAD BALANCER', detail: 'lb' }],
    k8sTier(true),
    [{ id: 'svc', kind: 'svc', label: 'MICROSERVICES', detail: 'svc' }],
    [
      { id: 'mongo', kind: 'db', label: 'MONGODB', detail: 'mongo' },
      { id: 'pg', kind: 'db', label: 'POSTGRESQL', detail: 'pg' },
      { id: 'redis', kind: 'db', label: 'REDIS', detail: 'redis' },
    ],
  ],
};

/** Cloud topology: three environments feeding one production estate. */
export const cloudSpec = {
  padTop: 16,
  padBottom: 16,
  gap: 46,
  gapNarrow: 40,
  tiers: [
    [
      { id: 'gcp', kind: 'zone', label: 'GCP', items: ['Kubernetes', 'Networking', 'Storage'] },
      { id: 'aws', kind: 'zone-aws', label: 'AWS', items: ['EC2', 'VPC', 'IAM'] },
      { id: 'onsite', kind: 'zone-onsite', label: 'ON-PREM', items: ['Infrastructure', 'Networking', 'Loyalty Rewardz'], itemsNarrow: ['Servers', 'Network', 'Client site'] },
    ],
    [{ id: 'prod', kind: 'prod', label: 'PRODUCTION', sub: 'GCP · AWS · onsite', w: 300 }],
  ],
};

/** Infrastructure x AI: an agent fanning out over services that run on the same platform. */
export const aiSpec = {
  padTop: 18,
  padBottom: 18,
  gap: 40,
  gapNarrow: 36,
  tiers: [
    [{ id: 'agent', kind: 'ai', label: 'AI AGENT', sub: 'Adi · LangGraph' }],
    [
      { id: 'campaign', kind: 'ai', label: ['CAMPAIGN', 'AUTOMATION'] },
      { id: 'analytics', kind: 'ai', label: ['PREDICTIVE', 'ANALYTICS'] },
      { id: 'chatbot', kind: 'ai', label: ['CHATBOT', 'AUTOMATION'] },
    ],
    [{ id: 'svc', kind: 'svc', label: 'MICROSERVICES' }],
    [{ id: 'infra', kind: 'prod', label: 'CLOUD INFRASTRUCTURE', sub: 'Kubernetes · MongoDB · Cassandra · PostgreSQL', w: 340 }],
  ],
};

// zone kinds are styled by data-kind; the builder treats them all as 'zone'
