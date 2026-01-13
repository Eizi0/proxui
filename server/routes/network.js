import express from 'express';
import proxmoxAPI from '../services/proxmoxAPI.js';

const router = express.Router();

// Créer un nouveau bridge
router.post('/bridge', async (req, res) => {
  try {
    const { iface, address, netmask, gateway, bridge_ports, autostart, comments } = req.body;

    if (!iface) {
      return res.status(400).json({ error: 'Le nom du bridge est requis' });
    }

    // Préparer les données pour Proxmox
    const networkData = {
      iface,
      type: 'bridge',
      autostart: autostart ? 1 : 0,
    };

    if (address) networkData.address = address;
    if (netmask) networkData.netmask = netmask;
    if (gateway) networkData.gateway = gateway;
    if (bridge_ports) networkData.bridge_ports = bridge_ports;
    if (comments) networkData.comments = comments;

    // Créer le bridge via l'API Proxmox
    const result = await proxmoxAPI.post('/nodes/proxmox/network', networkData);
    
    // Appliquer les changements réseau
    await proxmoxAPI.put('/nodes/proxmox/network');

    res.json(result.data);
  } catch (error) {
    console.error('Erreur lors de la création du bridge:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Impossible de créer le bridge',
      message: error.response?.data?.errors || error.message 
    });
  }
});

// Créer un nouveau VLAN
router.post('/vlan', async (req, res) => {
  try {
    const { parentInterface, vlanId, address, netmask, gateway, autostart, comments } = req.body;

    if (!parentInterface || !vlanId) {
      return res.status(400).json({ error: 'Interface parente et VLAN ID requis' });
    }

    const iface = `${parentInterface}.${vlanId}`;

    // Préparer les données pour Proxmox
    const networkData = {
      iface,
      type: 'vlan',
      autostart: autostart ? 1 : 0,
    };

    if (address) networkData.address = address;
    if (netmask) networkData.netmask = netmask;
    if (gateway) networkData.gateway = gateway;
    if (comments) networkData.comments = comments;

    // Créer le VLAN via l'API Proxmox
    const result = await proxmoxAPI.post('/nodes/proxmox/network', networkData);
    
    // Appliquer les changements réseau
    await proxmoxAPI.put('/nodes/proxmox/network');

    res.json(result.data);
  } catch (error) {
    console.error('Erreur lors de la création du VLAN:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Impossible de créer le VLAN',
      message: error.response?.data?.errors || error.message 
    });
  }
});

// Mettre à jour une interface réseau
router.put('/:iface', async (req, res) => {
  try {
    const { iface } = req.params;
    const { address, netmask, gateway, bridge_ports, autostart, comments } = req.body;

    // Préparer les données pour Proxmox
    const networkData = {};

    if (address !== undefined) networkData.address = address;
    if (netmask !== undefined) networkData.netmask = netmask;
    if (gateway !== undefined) networkData.gateway = gateway;
    if (bridge_ports !== undefined) networkData.bridge_ports = bridge_ports;
    if (autostart !== undefined) networkData.autostart = autostart ? 1 : 0;
    if (comments !== undefined) networkData.comments = comments;

    // Mettre à jour via l'API Proxmox
    const result = await proxmoxAPI.put(`/nodes/proxmox/network/${iface}`, networkData);
    
    // Appliquer les changements réseau
    await proxmoxAPI.put('/nodes/proxmox/network');

    res.json(result.data);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'interface:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Impossible de mettre à jour l\'interface',
      message: error.response?.data?.errors || error.message 
    });
  }
});

// Supprimer une interface réseau
router.delete('/:iface', async (req, res) => {
  try {
    const { iface } = req.params;

    // Supprimer via l'API Proxmox
    await proxmoxAPI.delete(`/nodes/proxmox/network/${iface}`);
    
    // Appliquer les changements réseau
    await proxmoxAPI.put('/nodes/proxmox/network');

    res.json({ success: true, message: 'Interface supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'interface:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Impossible de supprimer l\'interface',
      message: error.response?.data?.errors || error.message 
    });
  }
});

// Obtenir les changements réseau en attente
router.get('/pending', async (req, res) => {
  try {
    const result = await proxmoxAPI.get('/nodes/proxmox/network');
    res.json(result.data);
  } catch (error) {
    console.error('Erreur lors de la récupération des changements:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Impossible de récupérer les changements',
      message: error.message 
    });
  }
});

// Appliquer les changements réseau
router.post('/apply', async (req, res) => {
  try {
    await proxmoxAPI.put('/nodes/proxmox/network');
    res.json({ success: true, message: 'Changements réseau appliqués' });
  } catch (error) {
    console.error('Erreur lors de l\'application des changements:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Impossible d\'appliquer les changements',
      message: error.message 
    });
  }
});

// Annuler les changements réseau
router.delete('/pending', async (req, res) => {
  try {
    await proxmoxAPI.delete('/nodes/proxmox/network');
    res.json({ success: true, message: 'Changements annulés' });
  } catch (error) {
    console.error('Erreur lors de l\'annulation des changements:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Impossible d\'annuler les changements',
      message: error.message 
    });
  }
});

export default router;
