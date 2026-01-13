import express from 'express';
import proxmoxAPI from '../services/proxmoxAPI.js';

const router = express.Router();

// Get all snapshots for a VM or Container
router.get('/:type/:vmid', async (req, res) => {
  try {
    const { type, vmid } = req.params;
    const { node = 'proxmox' } = req.query;
    
    if (!['qemu', 'lxc'].includes(type)) {
      return res.status(400).json({ error: 'Type must be qemu or lxc' });
    }
    
    const endpoint = `/nodes/${node}/${type}/${vmid}/snapshot`;
    const snapshots = await proxmoxAPI.request('GET', endpoint);
    
    res.json(snapshots || []);
  } catch (error) {
    console.error('Error fetching snapshots:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// Get snapshot configuration details
router.get('/:type/:vmid/:snapname', async (req, res) => {
  try {
    const { type, vmid, snapname } = req.params;
    const { node = 'proxmox' } = req.query;
    
    if (!['qemu', 'lxc'].includes(type)) {
      return res.status(400).json({ error: 'Type must be qemu or lxc' });
    }
    
    const endpoint = `/nodes/${node}/${type}/${vmid}/snapshot/${snapname}/config`;
    const config = await proxmoxAPI.request('GET', endpoint);
    
    res.json(config || {});
  } catch (error) {
    console.error('Error fetching snapshot config:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// Create a new snapshot
router.post('/:type/:vmid', async (req, res) => {
  try {
    const { type, vmid } = req.params;
    const { node = 'proxmox' } = req.query;
    const { snapname, description, vmstate = false } = req.body;
    
    if (!snapname) {
      return res.status(400).json({ error: 'Snapshot name is required' });
    }
    
    if (!['qemu', 'lxc'].includes(type)) {
      return res.status(400).json({ error: 'Type must be qemu or lxc' });
    }
    
    const endpoint = `/nodes/${node}/${type}/${vmid}/snapshot`;
    const data = {
      snapname,
      description: description || `Snapshot created at ${new Date().toISOString()}`,
    };
    
    // vmstate only available for VMs (qemu)
    if (type === 'qemu') {
      data.vmstate = vmstate ? 1 : 0;
    }
    
    const result = await proxmoxAPI.request('POST', endpoint, data);
    
    res.json({
      success: true,
      upid: result,
      message: 'Snapshot creation started'
    });
  } catch (error) {
    console.error('Error creating snapshot:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// Update snapshot description
router.put('/:type/:vmid/:snapname', async (req, res) => {
  try {
    const { type, vmid, snapname } = req.params;
    const { node = 'proxmox' } = req.query;
    const { description } = req.body;
    
    if (!['qemu', 'lxc'].includes(type)) {
      return res.status(400).json({ error: 'Type must be qemu or lxc' });
    }
    
    const endpoint = `/nodes/${node}/${type}/${vmid}/snapshot/${snapname}/config`;
    await proxmoxAPI.request('PUT', endpoint, { description });
    
    res.json({
      success: true,
      message: 'Snapshot description updated'
    });
  } catch (error) {
    console.error('Error updating snapshot:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// Rollback to a snapshot
router.post('/:type/:vmid/:snapname/rollback', async (req, res) => {
  try {
    const { type, vmid, snapname } = req.params;
    const { node = 'proxmox' } = req.query;
    
    if (!['qemu', 'lxc'].includes(type)) {
      return res.status(400).json({ error: 'Type must be qemu or lxc' });
    }
    
    const endpoint = `/nodes/${node}/${type}/${vmid}/snapshot/${snapname}/rollback`;
    const result = await proxmoxAPI.request('POST', endpoint);
    
    res.json({
      success: true,
      upid: result,
      message: 'Rollback started successfully'
    });
  } catch (error) {
    console.error('Error rolling back snapshot:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// Delete a snapshot
router.delete('/:type/:vmid/:snapname', async (req, res) => {
  try {
    const { type, vmid, snapname } = req.params;
    const { node = 'proxmox' } = req.query;
    const { force = 0 } = req.query;
    
    if (!['qemu', 'lxc'].includes(type)) {
      return res.status(400).json({ error: 'Type must be qemu or lxc' });
    }
    
    const endpoint = `/nodes/${node}/${type}/${vmid}/snapshot/${snapname}`;
    const result = await proxmoxAPI.request('DELETE', endpoint + `?force=${force}`);
    
    res.json({
      success: true,
      upid: result,
      message: 'Snapshot deletion started'
    });
  } catch (error) {
    console.error('Error deleting snapshot:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// Get all snapshots across all VMs and Containers
router.get('/all', async (req, res) => {
  try {
    const { node = 'proxmox' } = req.query;
    
    const allSnapshots = [];
    
    // Get all VMs
    const vms = await proxmoxAPI.request('GET', `/nodes/${node}/qemu`);
    for (const vm of vms) {
      try {
        const snapshots = await proxmoxAPI.request('GET', `/nodes/${node}/qemu/${vm.vmid}/snapshot`);
        if (snapshots && snapshots.length > 0) {
          allSnapshots.push({
            vmid: vm.vmid,
            name: vm.name,
            type: 'qemu',
            snapshots: snapshots.filter(s => s.name !== 'current')
          });
        }
      } catch (err) {
        console.error(`Error fetching snapshots for VM ${vm.vmid}:`, err.message);
      }
    }
    
    // Get all LXC containers
    const containers = await proxmoxAPI.request('GET', `/nodes/${node}/lxc`);
    for (const ct of containers) {
      try {
        const snapshots = await proxmoxAPI.request('GET', `/nodes/${node}/lxc/${ct.vmid}/snapshot`);
        if (snapshots && snapshots.length > 0) {
          allSnapshots.push({
            vmid: ct.vmid,
            name: ct.name,
            type: 'lxc',
            snapshots: snapshots.filter(s => s.name !== 'current')
          });
        }
      } catch (err) {
        console.error(`Error fetching snapshots for LXC ${ct.vmid}:`, err.message);
      }
    }
    
    res.json(allSnapshots);
  } catch (error) {
    console.error('Error fetching all snapshots:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

export default router;
