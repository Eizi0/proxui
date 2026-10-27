// Données de démonstration réalistes, utilisées quand DEMO_MODE=true.
// Permet de lancer et visualiser ProxUI sans accès à un vrai cluster Proxmox.
// Les formes de données suivent exactement celles de l'API Proxmox réelle
// (mêmes champs que /api2/json/...), pour que passer en mode réel ne change
// rien côté frontend.

const NODES = [
  { node: 'pve-node-01', status: 'online', cpu: 0.81, maxcpu: 24, mem: 103079215104, maxmem: 137438953472, disk: 450971566080, maxdisk: 1920000000000, uptime: 8121600 },
  { node: 'pve-node-02', status: 'online', cpu: 0.63, maxcpu: 24, mem: 96636764160, maxmem: 137438953472, disk: 380000000000, maxdisk: 1920000000000, uptime: 8121600 },
  { node: 'pve-node-03', status: 'online', cpu: 0.54, maxcpu: 16, mem: 62277025792, maxmem: 107374182400, disk: 290000000000, maxdisk: 960000000000, uptime: 1036800 },
];

const NODE_STATUS = {
  'pve-node-01': {
    cpu: 0.81, cpuinfo: { cpus: 24, model: 'Intel Xeon Silver 4214 (2x)' },
    memory: { used: 103079215104, total: 137438953472, free: 34359738368 },
    swap: { used: 0, total: 8589934592, free: 8589934592 },
    rootfs: { used: 450971566080, total: 1920000000000, free: 1469028433920 },
    uptime: 8121600,
    pveversion: 'pve-manager/8.3.1/c1689ccb1065a83b',
  },
  'pve-node-02': {
    cpu: 0.63, cpuinfo: { cpus: 24, model: 'Intel Xeon Silver 4214 (2x)' },
    memory: { used: 96636764160, total: 137438953472, free: 40802189312 },
    swap: { used: 0, total: 8589934592, free: 8589934592 },
    rootfs: { used: 380000000000, total: 1920000000000, free: 1540000000000 },
    uptime: 8121600,
    pveversion: 'pve-manager/8.3.1/c1689ccb1065a83b',
  },
  'pve-node-03': {
    cpu: 0.54, cpuinfo: { cpus: 16, model: 'Intel Xeon Silver 4214 (1x)' },
    memory: { used: 62277025792, total: 107374182400, free: 45097156608 },
    swap: { used: 0, total: 8589934592, free: 8589934592 },
    rootfs: { used: 290000000000, total: 960000000000, free: 670000000000 },
    uptime: 1036800,
    pveversion: 'pve-manager/8.3.1/c1689ccb1065a83b',
  },
};

const QEMU_BY_NODE = {
  'pve-node-01': [
    { vmid: 101, name: 'db-primary-01', status: 'running', cpu: 0.88, maxcpu: 8, mem: 15254507520, maxmem: 17179869184, disk: 0, maxdisk: 343597383680, uptime: 1047600, tags: 'prod;db' },
    { vmid: 105, name: 'elastic-node-01', status: 'running', cpu: 0.64, maxcpu: 6, mem: 21911814144, maxmem: 25769803776, disk: 0, maxdisk: 536870912000, uptime: 1047600, tags: 'prod;logs' },
    { vmid: 110, name: 'win-test-vm', status: 'stopped', cpu: 0, maxcpu: 4, mem: 0, maxmem: 8589934592, disk: 0, maxdisk: 85899345920, uptime: 0, tags: 'test' },
  ],
  'pve-node-02': [
    { vmid: 102, name: 'web-prod-02', status: 'running', cpu: 0.76, maxcpu: 4, mem: 6552532992, maxmem: 8589934592, disk: 0, maxdisk: 85899345920, uptime: 523800, tags: 'prod;web' },
  ],
  'pve-node-03': [
    { vmid: 104, name: 'build-runner-04', status: 'running', cpu: 0.71, maxcpu: 8, mem: 12670673920, maxmem: 17179869184, disk: 0, maxdisk: 171798691840, uptime: 86400, tags: 'ci' },
    { vmid: 111, name: 'staging-app-01', status: 'paused', cpu: 0, maxcpu: 4, mem: 0, maxmem: 8589934592, disk: 0, maxdisk: 85899345920, uptime: 0, tags: 'staging' },
  ],
};

const LXC_BY_NODE = {
  'pve-node-01': [
    { vmid: 201, name: 'lxc-redis-cache', status: 'running', cpu: 0.12, maxcpu: 2, mem: 1153433600, maxmem: 2147483648, disk: 6442450944, maxdisk: 17179869184, uptime: 1047600, tags: 'prod;cache' },
    { vmid: 202, name: 'lxc-nginx-proxy', status: 'running', cpu: 0.08, maxcpu: 1, mem: 440401920, maxmem: 536870912, disk: 2147483648, maxdisk: 8589934592, uptime: 1047600, tags: 'prod' },
  ],
  'pve-node-02': [],
  'pve-node-03': [],
};

const VERSION = { version: '8.3.1', release: '8.3', repoid: 'c1689ccb1065a83b' };

const SERVICES = [
  { name: 'pvedaemon', service: 'pvedaemon', state: 'running', desc: 'PVE API Daemon' },
  { name: 'pveproxy', service: 'pveproxy', state: 'running', desc: 'PVE API Proxy Server' },
  { name: 'pve-cluster', service: 'pve-cluster', state: 'running', desc: 'The Proxmox VE cluster filesystem' },
  { name: 'pvestatd', service: 'pvestatd', state: 'running', desc: 'PVE Status Daemon' },
  { name: 'pve-firewall', service: 'pve-firewall', state: 'running', desc: 'Proxmox VE firewall' },
  { name: 'lxcfs', service: 'lxcfs', state: 'running', desc: 'FUSE filesystem for LXC' },
];

function rrd(node, metricKeys) {
  // 24 points représentant la dernière heure (une donnée toutes les 150s, comme Proxmox 'hour')
  const now = Math.floor(Date.now() / 1000);
  const seedByNode = { 'pve-node-01': 1, 'pve-node-02': 2, 'pve-node-03': 3 };
  const seed = seedByNode[node] || 1;
  return Array.from({ length: 24 }, (_, i) => {
    const t = now - (23 - i) * 150;
    const wave = Math.abs(Math.sin(i / 3 + seed)) * 0.3 + 0.5;
    const point = { time: t };
    if (metricKeys.includes('cpu')) point.cpu = Math.min(0.98, wave);
    if (metricKeys.includes('memused')) point.memused = Math.floor(NODE_STATUS[node].memory.total * wave * 0.9);
    if (metricKeys.includes('netin')) point.netin = Math.floor(wave * 40000000);
    if (metricKeys.includes('netout')) point.netout = Math.floor(wave * 18000000);
    return point;
  });
}

const TASKS_BY_NODE = {
  'pve-node-01': [
    { upid: 'UPID:pve-node-01:00001A2B:snapshot', node: 'pve-node-01', type: 'qmsnapshot', id: '101', user: 'root@pam', status: 'OK', starttime: Math.floor(Date.now() / 1000) - 480 },
    { upid: 'UPID:pve-node-01:00001A1C:vzdump', node: 'pve-node-01', type: 'vzdump', id: '101', user: 'root@pam', status: 'OK', starttime: Math.floor(Date.now() / 1000) - 10800 },
    { upid: 'UPID:pve-node-01:00001A0F:vzdump', node: 'pve-node-01', type: 'vzdump', id: '105', user: 'root@pam', status: 'OK', starttime: Math.floor(Date.now() / 1000) - 10750 },
  ],
  'pve-node-02': [
    { upid: 'UPID:pve-node-02:00002B3C:qmigrate', node: 'pve-node-02', type: 'qmigrate', id: '102', user: 'root@pam', status: 'OK', starttime: Math.floor(Date.now() / 1000) - 120 },
  ],
  'pve-node-03': [
    { upid: 'UPID:pve-node-03:00003C4D:vzrestart', node: 'pve-node-03', type: 'vzrestart', id: '201', user: 'root@pam', status: 'OK', starttime: Math.floor(Date.now() / 1000) - 18000 },
  ],
};

/**
 * Essaie de répondre à un appel d'API Proxmox à partir des fixtures ci-dessus.
 * Retourne `undefined` si l'endpoint n'est pas simulé (l'appelant garde alors
 * son comportement normal, qui échoue proprement grâce aux .catch() déjà en
 * place dans les routes Express).
 */
export function resolveDemoEndpoint(method, endpoint) {
  const [path, qs] = endpoint.split('?');
  const query = new URLSearchParams(qs || '');
  let m;

  if (method === 'GET' && path === '/nodes') return NODES;

  if ((m = path.match(/^\/nodes\/([^/]+)\/status$/)) && method === 'GET') {
    return NODE_STATUS[m[1]] ? [NODE_STATUS[m[1]]] : [];
  }
  if ((m = path.match(/^\/nodes\/([^/]+)\/version$/)) && method === 'GET') {
    return VERSION;
  }
  // Proxmox est incohérent entre ses propres endpoints : la liste par nœud
  // (/nodes/{node}/qemu) nomme le champ `cpus`, tandis que /cluster/resources
  // le nomme `maxcpu`. On fournit les deux pour que le frontend, qui lit
  // l'un ou l'autre selon l'écran, fonctionne dans les deux cas.
  if ((m = path.match(/^\/nodes\/([^/]+)\/qemu$/)) && method === 'GET') {
    return (QEMU_BY_NODE[m[1]] || []).map((v) => ({ ...v, cpus: v.maxcpu }));
  }
  if ((m = path.match(/^\/nodes\/([^/]+)\/lxc$/)) && method === 'GET') {
    return (LXC_BY_NODE[m[1]] || []).map((v) => ({ ...v, cpus: v.maxcpu }));
  }
  if ((m = path.match(/^\/nodes\/([^/]+)\/qemu\/(\d+)\/status\/current$/)) && method === 'GET') {
    const vm = (QEMU_BY_NODE[m[1]] || []).find((v) => String(v.vmid) === m[2]);
    return vm ? { ...vm, qmpstatus: vm.status } : {};
  }
  if ((m = path.match(/^\/nodes\/([^/]+)\/qemu\/(\d+)\/config$/)) && method === 'GET') {
    const vm = (QEMU_BY_NODE[m[1]] || []).find((v) => String(v.vmid) === m[2]);
    if (!vm) return {};
    return {
      name: vm.name, cores: vm.maxcpu, sockets: 1, memory: Math.round(vm.maxmem / 1048576),
      ostype: 'l26', boot: 'order=scsi0;net0', agent: '1',
      net0: 'virtio=BC:24:11:AA:BB:01,bridge=vmbr0', scsi0: `local-lvm:vm-${vm.vmid}-disk-0,size=${Math.round(vm.maxdisk / 1073741824)}G`,
      tags: vm.tags,
    };
  }
  if ((m = path.match(/^\/nodes\/([^/]+)\/rrddata$/)) && method === 'GET') {
    return rrd(m[1], ['cpu', 'memused', 'netin', 'netout']);
  }
  if ((m = path.match(/^\/nodes\/([^/]+)\/tasks$/)) && method === 'GET') {
    return TASKS_BY_NODE[m[1]] || [];
  }
  if (path === '/cluster/resources' && method === 'GET') {
    const all = [];
    for (const node of NODES) all.push({ ...node, type: 'node', id: `node/${node.node}` });
    for (const [node, vms] of Object.entries(QEMU_BY_NODE)) {
      for (const vm of vms) all.push({ ...vm, type: 'qemu', node, id: `qemu/${vm.vmid}` });
    }
    for (const [node, lxcs] of Object.entries(LXC_BY_NODE)) {
      for (const lxc of lxcs) all.push({ ...lxc, type: 'lxc', node, id: `lxc/${lxc.vmid}` });
    }
    const type = query.get('type');
    return type ? all.filter((r) => r.type === type) : all;
  }

  if ((m = path.match(/^\/nodes\/([^/]+)\/services$/)) && method === 'GET') {
    return SERVICES;
  }

  return undefined;
}
