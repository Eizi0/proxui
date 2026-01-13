import express from 'express';
import proxmoxAPI from '../services/proxmoxAPI.js';

const router = express.Router();

// Get all nodes
router.get('/nodes', async (req, res) => {
  try {
    console.log('📡 API Call: GET /api/proxmox/nodes');
    const nodes = await proxmoxAPI.getNodes();
    console.log('✅ Nodes récupérés:', nodes.length);
    res.json(nodes);
  } catch (error) {
    console.error('❌ Erreur GET /nodes:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get node status
router.get('/nodes/:node/status', async (req, res) => {
  try {
    console.log('📡 API Call: GET /api/proxmox/nodes/:node/status');
    const status = await proxmoxAPI.getNodeStatus(req.params.node);
    res.json(status);
  } catch (error) {
    console.error('❌ Erreur GET /nodes/:node/status:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get all VMs
router.get('/vms', async (req, res) => {
  try {
    console.log('📡 API Call: GET /api/proxmox/vms');
    const vms = await proxmoxAPI.getVMs();
    console.log('✅ VMs récupérées:', vms.length);
    res.json(vms);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get VM status
router.get('/vms/:vmid', async (req, res) => {
  try {
    const status = await proxmoxAPI.getVMStatus(req.params.vmid);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start VM
router.post('/vms/:vmid/start', async (req, res) => {
  try {
    const result = await proxmoxAPI.startVM(req.params.vmid);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop VM
router.post('/vms/:vmid/stop', async (req, res) => {
  try {
    const result = await proxmoxAPI.stopVM(req.params.vmid);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Shutdown VM
router.post('/vms/:vmid/shutdown', async (req, res) => {
  try {
    const result = await proxmoxAPI.shutdownVM(req.params.vmid);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reboot VM
router.post('/vms/:vmid/reboot', async (req, res) => {
  try {
    const result = await proxmoxAPI.rebootVM(req.params.vmid);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all LXC containers
router.get('/lxc', async (req, res) => {
  try {
    const lxcs = await proxmoxAPI.getLXCs();
    res.json(lxcs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get LXC status
router.get('/lxc/:vmid', async (req, res) => {
  try {
    const status = await proxmoxAPI.getLXCStatus(req.params.vmid);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start LXC
router.post('/lxc/:vmid/start', async (req, res) => {
  try {
    const result = await proxmoxAPI.startLXC(req.params.vmid);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop LXC
router.post('/lxc/:vmid/stop', async (req, res) => {
  try {
    const result = await proxmoxAPI.stopLXC(req.params.vmid);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Shutdown LXC
router.post('/lxc/:vmid/shutdown', async (req, res) => {
  try {
    const result = await proxmoxAPI.shutdownLXC(req.params.vmid);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reboot LXC
router.post('/lxc/:vmid/reboot', async (req, res) => {
  try {
    const result = await proxmoxAPI.rebootLXC(req.params.vmid);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all resources
router.get('/resources', async (req, res) => {
  try {
    const { type } = req.query;
    const resources = await proxmoxAPI.getResources(type);
    res.json(resources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get storages
router.get('/storages', async (req, res) => {
  try {
    console.log('📡 API Call: GET /api/proxmox/storages');
    const storages = await proxmoxAPI.getStorages();
    console.log('✅ Storages récupérés:', storages.length);
    res.json(storages);
  } catch (error) {
    console.error('❌ Erreur GET /storages:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get storage status
router.get('/storages/:storage/status', async (req, res) => {
  try {
    const status = await proxmoxAPI.getStorageStatus(req.params.storage);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get storage content
router.get('/storages/:storage/content', async (req, res) => {
  try {
    const { content } = req.query;
    const data = await proxmoxAPI.getStorageContent(req.params.storage, undefined, content);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get networks
router.get('/networks', async (req, res) => {
  try {
    console.log('📡 API Call: GET /api/proxmox/networks');
    const networks = await proxmoxAPI.getNetworks();
    console.log('✅ Networks récupérés:', networks.length);
    res.json(networks);
  } catch (error) {
    console.error('❌ Erreur GET /networks:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Get network config
router.get('/networks/:iface', async (req, res) => {
  try {
    const config = await proxmoxAPI.getNetworkConfig(req.params.iface);
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get node detailed info
router.get('/nodes/:node/info', async (req, res) => {
  try {
    const info = await proxmoxAPI.getNodeInfo(req.params.node);
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get node RRD data (graphs)
router.get('/nodes/:node/rrddata', async (req, res) => {
  try {
    const { timeframe } = req.query;
    const data = await proxmoxAPI.getNodeRRDData(req.params.node, timeframe);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get node tasks
router.get('/nodes/:node/tasks', async (req, res) => {
  try {
    const { limit } = req.query;
    const tasks = await proxmoxAPI.getNodeTasks(req.params.node, limit);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get node services
router.get('/nodes/:node/services', async (req, res) => {
  try {
    const services = await proxmoxAPI.getNodeServices(req.params.node);
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get node version
router.get('/nodes/:node/version', async (req, res) => {
  try {
    const version = await proxmoxAPI.getNodeVersion(req.params.node);
    res.json(version);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Browse storage content
router.get('/storages/:storage/content', async (req, res) => {
  try {
    const { node } = req.query;
    const content = await proxmoxAPI.getStorageContent(req.params.storage, node);
    res.json(content);
  } catch (error) {
    console.error('❌ Erreur GET /storages/:storage/content:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
