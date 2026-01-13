import express from 'express';
import proxmoxAPI from '../services/proxmoxAPI.js';
import dockerAPI from '../services/dockerAPI.js';

const router = express.Router();

// Get overview stats
router.get('/overview', async (req, res) => {
  try {
    const [nodes, vms, lxcs, resources] = await Promise.all([
      proxmoxAPI.getNodes().catch(() => []),
      proxmoxAPI.getVMs().catch(() => []),
      proxmoxAPI.getLXCs().catch(() => []),
      proxmoxAPI.getResources().catch(() => []),
    ]);

    let dockerContainers = [];
    if (dockerAPI.available) {
      dockerContainers = await dockerAPI.listContainers().catch(() => []);
    }

    const vmsRunning = vms.filter(vm => vm.status === 'running').length;
    const lxcsRunning = lxcs.filter(lxc => lxc.status === 'running').length;
    const dockerRunning = dockerContainers.filter(c => c.State === 'running').length;

    res.json({
      nodes: {
        total: nodes.length,
        online: nodes.filter(n => n.status === 'online').length,
      },
      vms: {
        total: vms.length,
        running: vmsRunning,
        stopped: vms.length - vmsRunning,
      },
      lxc: {
        total: lxcs.length,
        running: lxcsRunning,
        stopped: lxcs.length - lxcsRunning,
      },
      docker: {
        available: dockerAPI.available,
        total: dockerContainers.length,
        running: dockerRunning,
        stopped: dockerContainers.length - dockerRunning,
      },
      resources: resources.slice(0, 10), // Limiter pour performance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get resource usage
router.get('/resources', async (req, res) => {
  try {
    // Charger la config pour obtenir le node
    const configPath = new URL('../../config.json', import.meta.url);
    let node = 'pve';
    try {
      const { readFile } = await import('fs/promises');
      const configData = await readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);
      node = config.proxmox?.node || process.env.PROXMOX_NODE || 'pve';
    } catch (e) {
      node = process.env.PROXMOX_NODE || 'pve';
    }
    
    const status = await proxmoxAPI.getNodeInfo(node);

    res.json({
      cpu: {
        usage: ((status.cpu || 0) * 100).toFixed(2),
        cores: status.cpuinfo?.cpus || 0,
      },
      memory: {
        used: status.memory?.used || 0,
        total: status.memory?.total || 0,
        free: status.memory?.free || 0,
        percentage: status.memory?.total 
          ? ((status.memory.used / status.memory.total) * 100).toFixed(2)
          : 0,
      },
      swap: {
        used: status.swap?.used || 0,
        total: status.swap?.total || 0,
        free: status.swap?.free || 0,
      },
      disk: {
        used: status.rootfs?.used || 0,
        total: status.rootfs?.total || 0,
        free: status.rootfs?.free || 0,
        percentage: status.rootfs?.total
          ? ((status.rootfs.used / status.rootfs.total) * 100).toFixed(2)
          : 0,
      },
      uptime: status.uptime || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent VMs and Containers
router.get('/recent-resources', async (req, res) => {
  try {
    const [vms, lxcs] = await Promise.all([
      proxmoxAPI.getVMs().catch(() => []),
      proxmoxAPI.getLXCs().catch(() => []),
    ]);

    // Combiner VMs et LXCs
    const allResources = [
      ...vms.map(vm => ({
        ...vm,
        type: 'qemu',
        typeName: 'VM',
        id: vm.vmid,
        cpuUsage: vm.cpu ? (vm.cpu * 100).toFixed(1) : 0,
        memUsage: vm.mem && vm.maxmem ? ((vm.mem / vm.maxmem) * 100).toFixed(1) : 0,
      })),
      ...lxcs.map(lxc => ({
        ...lxc,
        type: 'lxc',
        typeName: 'LXC',
        id: lxc.vmid,
        cpuUsage: lxc.cpu ? (lxc.cpu * 100).toFixed(1) : 0,
        memUsage: lxc.mem && lxc.maxmem ? ((lxc.mem / lxc.maxmem) * 100).toFixed(1) : 0,
      })),
    ];

    // Trier par utilisation CPU décroissante (les plus utilisés en premier)
    allResources.sort((a, b) => parseFloat(b.cpuUsage) - parseFloat(a.cpuUsage));

    // Limiter aux 20 premiers
    const recentResources = allResources.slice(0, 20);

    res.json(recentResources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TODO: WebSocket for live stats (à implémenter avec express-ws)
// router.ws('/live', (ws, req) => { ... });

export default router;
