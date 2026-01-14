import { useState, useEffect } from 'react';
import { Network as NetworkIcon, Plus, Wifi, Settings, Trash2, Edit, Globe, Shield, Server, RefreshCw } from 'lucide-react';
import Modal from '../components/Modal';
import { useApp } from '../contexts/AppContext';
import { translate } from '../i18n/translations';

export default function Network() {
  const { language } = useApp();
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddBridge, setShowAddBridge] = useState(false);
  const [showAddVLAN, setShowAddVLAN] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [activeTab, setActiveTab] = useState('interfaces'); // interfaces, vlans, vnets

  useEffect(() => {
    fetchNetworks();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchNetworks, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchNetworks = async () => {
    try {
      const response = await fetch('/api/proxmox/networks');
      const data = await response.json();
      setNetworks(data);
    } catch (error) {
      console.error('Erreur lors du chargement des réseaux:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigure = (network) => {
    setSelectedNetwork(network);
    setShowConfigModal(true);
  };

  const handleDelete = async (network) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'interface ${network.iface} ?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/networks/${network.iface}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        alert('Interface supprimée avec succès');
        fetchNetworks();
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proxmox-600"></div>
    </div>;
  }

  const interfaces = networks.filter(n => !n.iface?.includes('.') && !n.type?.includes('vnet'));
  const vlans = networks.filter(n => n.iface?.includes('.'));
  const vnets = networks.filter(n => n.type?.includes('vnet'));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">{translate('network.title', language)}</h2>
          <p className="text-slate-400">{translate('network.subtitle', language)}</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={fetchNetworks} className="btn btn-secondary">
            <RefreshCw size={16} className="mr-2" />
            {translate('common.filter', language)}
          </button>
          <button onClick={() => setShowAddBridge(true)} className="btn btn-primary">
            <Plus size={16} className="mr-2" />
            Bridge
          </button>
          <button onClick={() => setShowAddVLAN(true)} className="btn btn-primary">
            <Plus size={16} className="mr-2" />
            Ajouter VLAN
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
        <button
          onClick={() => setActiveTab('interfaces')}
          className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
            activeTab === 'interfaces'
              ? 'bg-proxmox-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Server size={16} className="inline mr-2" />
          Interfaces ({interfaces.length})
        </button>
        <button
          onClick={() => setActiveTab('vlans')}
          className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
            activeTab === 'vlans'
              ? 'bg-proxmox-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Globe size={16} className="inline mr-2" />
          VLANs ({vlans.length})
        </button>
        <button
          onClick={() => setActiveTab('vnets')}
          className={`flex-1 py-2 px-4 rounded-lg transition-colors ${
            activeTab === 'vnets'
              ? 'bg-proxmox-600 text-white'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Shield size={16} className="inline mr-2" />
          VNets ({vnets.length})
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeTab === 'interfaces' && interfaces.map((network) => (
          <NetworkCard 
            key={network.iface} 
            network={network} 
            onConfigure={handleConfigure}
            onDelete={handleDelete}
          />
        ))}
        {activeTab === 'vlans' && vlans.map((network) => (
          <NetworkCard 
            key={network.iface} 
            network={network} 
            onConfigure={handleConfigure}
            onDelete={handleDelete}
          />
        ))}
        {activeTab === 'vnets' && vnets.map((network) => (
          <NetworkCard 
            key={network.iface} 
            network={network} 
            onConfigure={handleConfigure}
            onDelete={handleDelete}
          />
        ))}
        
        {((activeTab === 'interfaces' && interfaces.length === 0) ||
          (activeTab === 'vlans' && vlans.length === 0) ||
          (activeTab === 'vnets' && vnets.length === 0)) && (
          <div className="col-span-full text-center py-12 text-slate-400">
            <NetworkIcon size={48} className="mx-auto mb-4 text-slate-600" />
            <p>Aucun {activeTab === 'interfaces' ? 'interface' : activeTab === 'vlans' ? 'VLAN' : 'VNet'} configuré</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddBridge && (
        <AddBridgeModal
          isOpen={showAddBridge}
          onClose={() => setShowAddBridge(false)}
          onSuccess={fetchNetworks}
        />
      )}
      
      {showAddVLAN && (
        <AddVLANModal
          isOpen={showAddVLAN}
          onClose={() => setShowAddVLAN(false)}
          onSuccess={fetchNetworks}
          interfaces={interfaces}
        />
      )}
      
      {showConfigModal && selectedNetwork && (
        <ConfigureNetworkModal
          isOpen={showConfigModal}
          onClose={() => {
            setShowConfigModal(false);
            setSelectedNetwork(null);
          }}
          network={selectedNetwork}
          onSuccess={fetchNetworks}
        />
      )}
    </div>
  );
}

function NetworkCard({ network, onConfigure, onDelete }) {
  // L'API Proxmox retourne: iface, type, active, address, netmask, gateway, bridge_ports, autostart
  const name = network.iface || network.name;
  const isActive = network.active === 1 || network.active === true;
  const ports = network.bridge_ports ? network.bridge_ports.split(' ') : (network.ports || []);
  
  const getTypeIcon = () => {
    if (network.type === 'bridge') return <Server size={24} className="text-proxmox-400" />;
    if (network.iface?.includes('.')) return <Globe size={24} className="text-blue-400" />;
    if (network.type?.includes('vnet')) return <Shield size={24} className="text-purple-400" />;
    return <Wifi size={24} className="text-proxmox-400" />;
  };

  const getTypeColor = () => {
    if (network.type === 'bridge') return 'bg-proxmox-600/20';
    if (network.iface?.includes('.')) return 'bg-blue-600/20';
    if (network.type?.includes('vnet')) return 'bg-purple-600/20';
    return 'bg-slate-600/20';
  };
  
  return (
    <div className="card hover:border-proxmox-500 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-12 h-12 ${getTypeColor()} rounded-lg flex items-center justify-center`}>
            {getTypeIcon()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{name}</h3>
            <p className="text-sm text-slate-400">{network.type}</p>
          </div>
        </div>
        <span className={`status-badge ${isActive ? 'status-running' : 'status-stopped'}`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="space-y-3 text-sm">
        {network.address && (
          <div className="flex justify-between">
            <span className="text-slate-400">Adresse IP:</span>
            <span className="text-white font-mono">{network.address}</span>
          </div>
        )}
        {network.netmask && (
          <div className="flex justify-between">
            <span className="text-slate-400">Masque:</span>
            <span className="text-white font-mono">{network.netmask}</span>
          </div>
        )}
        {network.gateway && (
          <div className="flex justify-between">
            <span className="text-slate-400">Passerelle:</span>
            <span className="text-white font-mono">{network.gateway}</span>
          </div>
        )}
        {network.autostart !== undefined && (
          <div className="flex justify-between">
            <span className="text-slate-400">Autostart:</span>
            <span className="text-white">{network.autostart ? 'Oui' : 'Non'}</span>
          </div>
        )}
        {ports.length > 0 && ports[0] && (
          <div className="flex justify-between">
            <span className="text-slate-400">Ports:</span>
            <span className="text-white font-mono text-xs">{ports.join(', ')}</span>
          </div>
        )}
        {network.cidr && (
          <div className="flex justify-between">
            <span className="text-slate-400">CIDR:</span>
            <span className="text-white font-mono">{network.cidr}</span>
          </div>
        )}
        {network.vlan_id && (
          <div className="flex justify-between">
            <span className="text-slate-400">VLAN ID:</span>
            <span className="text-white font-mono">{network.vlan_id}</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700 flex space-x-2">
        <button 
          onClick={() => onConfigure(network)}
          className="btn btn-secondary flex-1 text-sm"
        >
          <Settings size={14} className="inline mr-1" />
          Configurer
        </button>
        <button 
          onClick={() => onDelete(network)}
          className="btn btn-danger text-sm"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// Modal pour ajouter un bridge
function AddBridgeModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    iface: 'vmbr',
    address: '',
    netmask: '255.255.255.0',
    gateway: '',
    bridge_ports: '',
    autostart: true,
    comments: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/networks/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('Bridge créé avec succès');
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        alert('Erreur: ' + (error.message || 'Impossible de créer le bridge'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création du bridge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajouter un Bridge" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 font-medium mb-2">Nom du bridge</label>
            <input
              type="text"
              value={formData.iface}
              onChange={(e) => setFormData({...formData, iface: e.target.value})}
              placeholder="vmbr0, vmbr1, etc."
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              required
            />
            <p className="text-slate-500 text-xs mt-1">Exemple: vmbr0, vmbr1, vmbr2</p>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-2">Ports du bridge</label>
            <input
              type="text"
              value={formData.bridge_ports}
              onChange={(e) => setFormData({...formData, bridge_ports: e.target.value})}
              placeholder="eno1, enp0s31f6"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            />
            <p className="text-slate-500 text-xs mt-1">Interface(s) physique(s)</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 font-medium mb-2">Adresse IP</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              placeholder="192.168.1.1"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-2">Masque de sous-réseau</label>
            <input
              type="text"
              value={formData.netmask}
              onChange={(e) => setFormData({...formData, netmask: e.target.value})}
              placeholder="255.255.255.0"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-2">Passerelle</label>
          <input
            type="text"
            value={formData.gateway}
            onChange={(e) => setFormData({...formData, gateway: e.target.value})}
            placeholder="192.168.1.254"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-2">Commentaires</label>
          <textarea
            value={formData.comments}
            onChange={(e) => setFormData({...formData, comments: e.target.value})}
            placeholder="Description du bridge..."
            rows="3"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={formData.autostart}
            onChange={(e) => setFormData({...formData, autostart: e.target.checked})}
            className="w-4 h-4 text-proxmox-600 bg-slate-700 border-slate-600 rounded"
          />
          <label className="ml-2 text-slate-300">Démarrer automatiquement au boot</label>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Annuler
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Création...' : 'Créer le bridge'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Modal pour ajouter un VLAN
function AddVLANModal({ isOpen, onClose, onSuccess, interfaces }) {
  const [formData, setFormData] = useState({
    parentInterface: '',
    vlanId: '',
    address: '',
    netmask: '255.255.255.0',
    gateway: '',
    autostart: true,
    comments: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/networks/vlan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('VLAN créé avec succès');
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        alert('Erreur: ' + (error.message || 'Impossible de créer le VLAN'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la création du VLAN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajouter un VLAN" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 font-medium mb-2">Interface parente</label>
            <select
              value={formData.parentInterface}
              onChange={(e) => setFormData({...formData, parentInterface: e.target.value})}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              required
            >
              <option value="">Sélectionner une interface</option>
              {interfaces.map((iface) => (
                <option key={iface.iface} value={iface.iface}>
                  {iface.iface} ({iface.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-2">VLAN ID</label>
            <input
              type="number"
              min="1"
              max="4094"
              value={formData.vlanId}
              onChange={(e) => setFormData({...formData, vlanId: e.target.value})}
              placeholder="10, 20, 30..."
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              required
            />
            <p className="text-slate-500 text-xs mt-1">Entre 1 et 4094</p>
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
          <p className="text-slate-400 text-sm">
            Interface résultante: <span className="text-white font-mono">
              {formData.parentInterface && formData.vlanId ? `${formData.parentInterface}.${formData.vlanId}` : 'Sélectionner interface et VLAN ID'}
            </span>
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 font-medium mb-2">Adresse IP</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              placeholder="192.168.10.1"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-2">Masque de sous-réseau</label>
            <input
              type="text"
              value={formData.netmask}
              onChange={(e) => setFormData({...formData, netmask: e.target.value})}
              placeholder="255.255.255.0"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-2">Passerelle (optionnel)</label>
          <input
            type="text"
            value={formData.gateway}
            onChange={(e) => setFormData({...formData, gateway: e.target.value})}
            placeholder="192.168.10.254"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-2">Commentaires</label>
          <textarea
            value={formData.comments}
            onChange={(e) => setFormData({...formData, comments: e.target.value})}
            placeholder="VLAN pour le réseau DMZ, invités, etc."
            rows="2"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={formData.autostart}
            onChange={(e) => setFormData({...formData, autostart: e.target.checked})}
            className="w-4 h-4 text-proxmox-600 bg-slate-700 border-slate-600 rounded"
          />
          <label className="ml-2 text-slate-300">Démarrer automatiquement au boot</label>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Annuler
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Création...' : 'Créer le VLAN'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Modal pour configurer une interface
function ConfigureNetworkModal({ isOpen, onClose, network, onSuccess }) {
  const [formData, setFormData] = useState({
    address: network.address || '',
    netmask: network.netmask || '',
    gateway: network.gateway || '',
    bridge_ports: network.bridge_ports || '',
    autostart: network.autostart !== undefined ? network.autostart : true,
    comments: network.comments || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/networks/${network.iface}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert('Interface mise à jour avec succès');
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        alert('Erreur: ' + (error.message || 'Impossible de mettre à jour'));
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Configurer ${network.iface}`} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Interface:</span>
              <span className="text-white font-mono ml-2">{network.iface}</span>
            </div>
            <div>
              <span className="text-slate-400">Type:</span>
              <span className="text-white ml-2">{network.type}</span>
            </div>
          </div>
        </div>

        {network.type === 'bridge' && (
          <div>
            <label className="block text-slate-300 font-medium mb-2">Ports du bridge</label>
            <input
              type="text"
              value={formData.bridge_ports}
              onChange={(e) => setFormData({...formData, bridge_ports: e.target.value})}
              placeholder="eno1, enp0s31f6"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-300 font-medium mb-2">Adresse IP</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              placeholder="192.168.1.1"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-2">Masque de sous-réseau</label>
            <input
              type="text"
              value={formData.netmask}
              onChange={(e) => setFormData({...formData, netmask: e.target.value})}
              placeholder="255.255.255.0"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-2">Passerelle</label>
          <input
            type="text"
            value={formData.gateway}
            onChange={(e) => setFormData({...formData, gateway: e.target.value})}
            placeholder="192.168.1.254"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-2">Commentaires</label>
          <textarea
            value={formData.comments}
            onChange={(e) => setFormData({...formData, comments: e.target.value})}
            placeholder="Description..."
            rows="3"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={formData.autostart}
            onChange={(e) => setFormData({...formData, autostart: e.target.checked})}
            className="w-4 h-4 text-proxmox-600 bg-slate-700 border-slate-600 rounded"
          />
          <label className="ml-2 text-slate-300">Démarrer automatiquement au boot</label>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Annuler
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
