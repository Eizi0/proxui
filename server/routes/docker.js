import express from 'express';
import dockerAPI from '../services/dockerAPI.js';

const router = express.Router();

// Check if Docker is available
router.get('/status', async (req, res) => {
  res.json({ available: dockerAPI.available });
});

// List all containers
router.get('/containers', async (req, res) => {
  try {
    const { all } = req.query;
    const containers = await dockerAPI.listContainers(all !== 'false');
    res.json(containers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get container details
router.get('/containers/:id', async (req, res) => {
  try {
    const container = await dockerAPI.getContainer(req.params.id);
    res.json(container);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start container
router.post('/containers/:id/start', async (req, res) => {
  try {
    await dockerAPI.startContainer(req.params.id);
    res.json({ success: true, message: 'Container started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stop container
router.post('/containers/:id/stop', async (req, res) => {
  try {
    await dockerAPI.stopContainer(req.params.id);
    res.json({ success: true, message: 'Container stopped' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restart container
router.post('/containers/:id/restart', async (req, res) => {
  try {
    await dockerAPI.restartContainer(req.params.id);
    res.json({ success: true, message: 'Container restarted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove container
router.delete('/containers/:id', async (req, res) => {
  try {
    const { force } = req.query;
    await dockerAPI.removeContainer(req.params.id, force === 'true');
    res.json({ success: true, message: 'Container removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get container stats
router.get('/containers/:id/stats', async (req, res) => {
  try {
    const stats = await dockerAPI.getContainerStats(req.params.id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get container logs
router.get('/containers/:id/logs', async (req, res) => {
  try {
    const { tail = 100 } = req.query;
    const logs = await dockerAPI.getContainerLogs(req.params.id, parseInt(tail));
    res.json({ logs: logs.toString() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// List images
router.get('/images', async (req, res) => {
  try {
    const images = await dockerAPI.listImages();
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Docker info
router.get('/info', async (req, res) => {
  try {
    const info = await dockerAPI.getDockerInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Docker version
router.get('/version', async (req, res) => {
  try {
    const version = await dockerAPI.getDockerVersion();
    res.json(version);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
