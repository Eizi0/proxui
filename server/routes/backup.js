import express from 'express';
import proxmoxAPI from '../services/proxmoxAPI.js';

const router = express.Router();

// Check PBS (Proxmox Backup Server) configuration
router.get('/pbs-status', async (req, res) => {
  try {
    // Check if any PBS storage is configured
    const storages = await proxmoxAPI.request('GET', '/storage');
    const pbsStorages = storages.filter(s => s.type === 'pbs');
    
    res.json({
      configured: pbsStorages.length > 0,
      storages: pbsStorages,
      backupStorages: storages.filter(s => 
        s.content && s.content.includes('backup')
      )
    });
  } catch (error) {
    console.error('Error checking PBS status:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all backups across all nodes and storages
router.get('/', async (req, res) => {
  try {
    const { node = 'proxmox', storage } = req.query;
    
    // Get list of nodes
    const nodes = await proxmoxAPI.getNodes();
    
    const allBackups = [];
    
    for (const nodeItem of nodes) {
      const nodeName = nodeItem.node;
      
      try {
        // Get storage list for this node
        const storages = await proxmoxAPI.request('GET', '/storage');
        const backupStorages = storages.filter(s => 
          s.content && s.content.includes('backup')
        );
        
        for (const stor of backupStorages) {
          if (storage && stor.storage !== storage) continue;
          
          try {
            // Get backups from this storage
            const backupsData = await proxmoxAPI.request(
              'GET',
              `/nodes/${nodeName}/storage/${stor.storage}/content?content=backup`
            );
            
            if (backupsData) {
              const backupsWithNode = backupsData.map(backup => ({
                ...backup,
                node: nodeName,
                storage: stor.storage
              }));
              allBackups.push(...backupsWithNode);
            }
          } catch (err) {
            console.error(`Error fetching backups from ${nodeName}/${stor.storage}:`, err.message);
          }
        }
      } catch (err) {
        console.error(`Error processing node ${nodeName}:`, err.message);
      }
    }
    
    res.json(allBackups);
  } catch (error) {
    console.error('Error fetching backups:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get backup jobs/schedules
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await proxmoxAPI.request('GET', '/cluster/backup');
    res.json(jobs || []);
  } catch (error) {
    console.error('Error fetching backup jobs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create new backup job
router.post('/jobs', async (req, res) => {
  try {
    const result = await proxmoxAPI.request('POST', '/cluster/backup', req.body);
    res.json(result);
  } catch (error) {
    console.error('Error creating backup job:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// Update backup job
router.put('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await proxmoxAPI.request('PUT', `/cluster/backup/${id}`, req.body);
    res.json(result);
  } catch (error) {
    console.error('Error updating backup job:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// Delete backup job
router.delete('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await proxmoxAPI.request('DELETE', `/cluster/backup/${id}`);
    res.json(result);
  } catch (error) {
    console.error('Error deleting backup job:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// Create immediate backup (VM or Container)
router.post('/create', async (req, res) => {
  try {
    const { node, vmid, storage, mode = 'snapshot', compress = 'zstd', remove = 0 } = req.body;
    
    if (!node || !vmid || !storage) {
      return res.status(400).json({ 
        error: 'node, vmid, and storage are required' 
      });
    }
    
    // Determine if it's a VM or Container
    let endpoint;
    try {
      await proxmoxAPI.request('GET', `/nodes/${node}/qemu/${vmid}/status/current`);
      endpoint = `/nodes/${node}/qemu/${vmid}/backup`;
    } catch {
      endpoint = `/nodes/${node}/lxc/${vmid}/backup`;
    }
    
    const result = await proxmoxAPI.request('POST', endpoint, {
      storage,
      mode,
      compress,
      remove
    });
    
    res.json({
      success: true,
      upid: result,
      message: 'Backup started successfully'
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// Restore backup
router.post('/restore', async (req, res) => {
  try {
    const { node, vmid, storage, volume, force = 0 } = req.body;
    
    if (!node || !storage || !volume) {
      return res.status(400).json({ 
        error: 'node, storage, and volume are required' 
      });
    }
    
    // Extract VM type from volume name
    const isQemu = volume.includes('qemu');
    const endpoint = isQemu 
      ? `/nodes/${node}/qemu` 
      : `/nodes/${node}/lxc`;
    
    const result = await proxmoxAPI.request('POST', endpoint, {
      vmid,
      storage,
      archive: volume,
      force
    });
    
    res.json({
      success: true,
      upid: result,
      message: 'Restore started successfully'
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// Delete backup
router.delete('/:node/:storage/:volid', async (req, res) => {
  try {
    const { node, storage, volid } = req.params;
    
    await proxmoxAPI.request(
      'DELETE',
      `/nodes/${node}/storage/${storage}/content/${encodeURIComponent(volid)}`
    );
    
    res.json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// Download backup
router.get('/download/:node/:storage/:volid', async (req, res) => {
  try {
    const { node, storage, volid } = req.params;
    
    // Get download URL from Proxmox
    const downloadUrl = `/nodes/${node}/storage/${storage}/download/${encodeURIComponent(volid)}`;
    
    res.json({
      success: true,
      url: downloadUrl,
      message: 'Use this URL with Proxmox authentication to download'
    });
  } catch (error) {
    console.error('Error getting download URL:', error);
    res.status(500).json({ 
      error: error.message 
    });
  }
});

// Get backup notes/comments
router.get('/notes/:node/:storage/:volid', async (req, res) => {
  try {
    const { node, storage, volid } = req.params;
    
    const data = await proxmoxAPI.request(
      'GET',
      `/nodes/${node}/storage/${storage}/content/${encodeURIComponent(volid)}`
    );
    
    res.json({
      notes: data.notes || '',
      ...data
    });
  } catch (error) {
    console.error('Error fetching backup notes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update backup notes
router.put('/notes/:node/:storage/:volid', async (req, res) => {
  try {
    const { node, storage, volid } = req.params;
    const { notes } = req.body;
    
    await proxmoxAPI.request(
      'PUT',
      `/nodes/${node}/storage/${storage}/content/${encodeURIComponent(volid)}`,
      { notes }
    );
    
    res.json({
      success: true,
      message: 'Notes updated successfully'
    });
  } catch (error) {
    console.error('Error updating backup notes:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========== BACKUP JOBS (SCHEDULING) ==========

// Get all backup jobs
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await proxmoxAPI.request('GET', '/cluster/backup');
    res.json(jobs || []);
  } catch (error) {
    console.error('Error fetching backup jobs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific backup job
router.get('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const job = await proxmoxAPI.request('GET', `/cluster/backup/${id}`);
    res.json(job);
  } catch (error) {
    console.error('Error fetching backup job:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create backup job
router.post('/jobs', async (req, res) => {
  try {
    const {
      vmid,           // VM/CT ID or 'all'
      node,           // Node name or 'all'
      storage,        // Storage target
      schedule,       // Cron expression
      enabled = true, // Job enabled
      mode = 'snapshot', // snapshot, suspend, stop
      compress = 'zstd', // zstd, lzo, gzip
      dow = '*',      // Day of week (0-6 or *)
      starttime = '02:00', // Start time HH:MM
      mailnotification = 'failure', // always, failure
      mailto,         // Email recipients
      prune,          // Prune old backups
      repeatMissed = false,
      comment
    } = req.body;

    if (!storage) {
      return res.status(400).json({ error: 'storage is required' });
    }

    const jobData = {
      vmid: vmid || 'all',
      node: node || 'all',
      storage,
      enabled: enabled ? 1 : 0,
      mode,
      compress,
      dow,
      starttime,
      mailnotification,
      'repeat-missed': repeatMissed ? 1 : 0
    };

    if (schedule) jobData.schedule = schedule;
    if (mailto) jobData.mailto = mailto;
    if (prune !== undefined) jobData.prune = prune;
    if (comment) jobData.comment = comment;

    const result = await proxmoxAPI.request('POST', '/cluster/backup', jobData);
    
    res.json({
      success: true,
      id: result,
      message: 'Backup job created successfully'
    });
  } catch (error) {
    console.error('Error creating backup job:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// Update backup job
router.put('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vmid,
      node,
      storage,
      schedule,
      enabled,
      mode,
      compress,
      dow,
      starttime,
      mailnotification,
      mailto,
      prune,
      'repeat-missed': repeatMissed,
      comment,
      delete: deleteFields
    } = req.body;

    const jobData = {};
    
    if (vmid !== undefined) jobData.vmid = vmid;
    if (node !== undefined) jobData.node = node;
    if (storage !== undefined) jobData.storage = storage;
    if (enabled !== undefined) jobData.enabled = enabled ? 1 : 0;
    if (mode !== undefined) jobData.mode = mode;
    if (compress !== undefined) jobData.compress = compress;
    if (dow !== undefined) jobData.dow = dow;
    if (starttime !== undefined) jobData.starttime = starttime;
    if (schedule !== undefined) jobData.schedule = schedule;
    if (mailnotification !== undefined) jobData.mailnotification = mailnotification;
    if (mailto !== undefined) jobData.mailto = mailto;
    if (prune !== undefined) jobData.prune = prune;
    if (repeatMissed !== undefined) jobData['repeat-missed'] = repeatMissed ? 1 : 0;
    if (comment !== undefined) jobData.comment = comment;
    if (deleteFields !== undefined) jobData.delete = deleteFields;

    await proxmoxAPI.request('PUT', `/cluster/backup/${id}`, jobData);
    
    res.json({
      success: true,
      message: 'Backup job updated successfully'
    });
  } catch (error) {
    console.error('Error updating backup job:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// Delete backup job
router.delete('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await proxmoxAPI.request('DELETE', `/cluster/backup/${id}`);
    
    res.json({
      success: true,
      message: 'Backup job deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting backup job:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

// Run backup job immediately
router.post('/jobs/:id/run', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get job details first
    const job = await proxmoxAPI.request('GET', `/cluster/backup/${id}`);
    
    // Extract node from job
    const node = job.node === 'all' ? 'proxmox' : job.node;
    
    // Trigger backup job execution
    const result = await proxmoxAPI.request(
      'POST', 
      `/nodes/${node}/startall`,
      { force: 1 }
    );
    
    res.json({
      success: true,
      upid: result,
      message: 'Backup job execution started'
    });
  } catch (error) {
    console.error('Error running backup job:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.data 
    });
  }
});

export default router;
