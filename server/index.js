import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import expressWs from 'express-ws';

// Routes
import proxmoxRoutes from './routes/proxmox.js';
import dockerRoutes from './routes/docker.js';
import statsRoutes from './routes/stats.js';
import configRoutes from './routes/config.js';
import downloadsRoutes from './routes/downloads.js';
import networkRoutes from './routes/network.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const { app: wsApp } = expressWs(app);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/proxmox', proxmoxRoutes);
app.use('/api/docker', dockerRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/downloads', downloadsRoutes);
app.use('/api/networks', networkRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir le frontend en production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal Server Error', 
    message: err.message 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 ProxUI Server running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Proxmox Host: ${process.env.PROXMOX_HOST}`);
});
