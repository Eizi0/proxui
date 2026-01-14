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

// Pull image
router.post('/images/pull', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image name is required' });
    }
    console.log('📥 Pulling Docker image:', image);
    const result = await dockerAPI.pullImage(image);
    console.log('✅ Image pulled successfully');
    res.json({ success: true, result });
  } catch (error) {
    console.error('❌ Error pulling image:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Create container
router.post('/containers', async (req, res) => {
  try {
    console.log('📡 API Call: POST /api/docker/containers');
    console.log('📋 Container Config:', JSON.stringify(req.body, null, 2));
    const container = await dockerAPI.createContainer(req.body);
    console.log('✅ Docker container created successfully');
    res.json(container);
  } catch (error) {
    console.error('❌ Error creating container:', error.message);
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

// Stack management endpoints
router.get('/stacks', async (req, res) => {
  try {
    console.log('📡 API Call: GET /api/docker/stacks');
    const stacks = await dockerAPI.listStacks();
    console.log(`✅ Found ${stacks.length} stacks`);
    res.json(stacks);
  } catch (error) {
    console.error('❌ Error listing stacks:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/stacks', async (req, res) => {
  try {
    console.log('📡 API Call: POST /api/docker/stacks');
    console.log('📋 Stack Config:', JSON.stringify(req.body, null, 2));
    const result = await dockerAPI.deployStack(req.body);
    console.log('✅ Stack deployed successfully');
    res.json(result);
  } catch (error) {
    console.error('❌ Error deploying stack:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/stacks/:name', async (req, res) => {
  try {
    console.log('📡 API Call: DELETE /api/docker/stacks/:name');
    const result = await dockerAPI.removeStack(req.params.name);
    console.log('✅ Stack removed successfully');
    res.json(result);
  } catch (error) {
    console.error('❌ Error removing stack:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
