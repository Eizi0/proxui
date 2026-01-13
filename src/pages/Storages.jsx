import { useState, useEffect } from 'react';
import { Database, HardDrive, Plus, Info, Settings, Trash2, CheckCircle, XCircle, FolderOpen, File, Folder, Download, FileText, FileImage, FileArchive, FileCode } from 'lucide-react';
import Modal from '../components/Modal';

export default function Storages() {
  const [storages, setStorages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStorage, setSelectedStorage] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExplorerModal, setShowExplorerModal] = useState(false);

  useEffect(() => {
    fetchStorages();
    // Auto-refresh every 10 seconds (slower for storage)
    const interval = setInterval(fetchStorages, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchStorages = async () => {
    try {
      const response = await fetch('/api/proxmox/storages');
      const data = await response.json();
      
      // Enrichir avec les détails de status
      const enrichedStorages = await Promise.all(
        data.map(async (storage) => {
          try {
            const statusResponse = await fetch(`/api/proxmox/storages/${storage.storage}/status`);
            const status = await statusResponse.json();
            return { ...storage, ...status };
          } catch (error) {
            console.error(`Erreur status storage ${storage.storage}:`, error);
            return storage;
          }
        })
      );
      
      setStorages(enrichedStorages);
    } catch (error) {
      console.error('Erreur lors du chargement des storages:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proxmox-600"></div>
    </div>;
  }

  const handleShowDetails = (storage) => {
    setSelectedStorage(storage);
    setShowDetailsModal(true);
  };

  const handleShowManage = (storage) => {
    setSelectedStorage(storage);
    setShowManageModal(true);
  };

  const handleAddStorage = () => {
    setShowAddModal(true);
  };

  const handleShowExplorer = (storage) => {
    setSelectedStorage(storage);
    setShowExplorerModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Storages</h2>
          <p className="text-slate-400">Gérez vos espaces de stockage Proxmox</p>
        </div>
        <button className="btn btn-primary" onClick={handleAddStorage}>
          <Plus className="inline mr-2" size={16} />
          Ajouter un Storage
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {storages.map((storage) => (
          <StorageCard 
            key={storage.id} 
            storage={storage}
            onShowDetails={handleShowDetails}
            onShowManage={handleShowManage}
            onShowExplorer={handleShowExplorer}
          />
        ))}
      </div>

      {/* Modals */}
      <StorageDetailsModal 
        storage={selectedStorage}
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
      />

      <StorageManageModal 
        storage={selectedStorage}
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        onUpdate={fetchStorages}
      />

      <AddStorageModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={fetchStorages}
      />

      <StorageExplorerModal 
        storage={selectedStorage}
        isOpen={showExplorerModal}
        onClose={() => setShowExplorerModal(false)}
      />
    </div>
  );
}

function StorageCard({ storage, onShowDetails, onShowManage, onShowExplorer }) {
  const usagePercent = ((storage.used / storage.total) * 100).toFixed(1);
  
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">{storage.storage}</h3>
          <p className="text-sm text-slate-400">{storage.type}</p>
        </div>
        <span className={`status-badge ${storage.active ? 'status-running' : 'status-stopped'}`}>
          {storage.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-400">Utilisation</span>
          <span className="text-white font-medium">{usagePercent}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              usagePercent > 90 ? 'bg-red-600' : usagePercent > 70 ? 'bg-yellow-600' : 'bg-green-600'
            }`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>{formatBytes(storage.used)}</span>
          <span>{formatBytes(storage.total)}</span>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Type:</span>
          <span className="text-white">{storage.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Contenu:</span>
          <span className="text-white text-xs">{storage.content}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Disponible:</span>
          <span className="text-white">{formatBytes(storage.available)}</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-3 gap-2">
        <button 
          className="btn btn-secondary text-xs py-2"
          onClick={() => onShowDetails(storage)}
        >
          <Database size={14} className="inline mr-1" />
          Détails
        </button>
        <button 
          className="btn btn-secondary text-xs py-2"
          onClick={() => onShowManage(storage)}
        >
          <HardDrive size={14} className="inline mr-1" />
          Gérer
        </button>
        <button 
          className="btn btn-primary text-xs py-2"
          onClick={() => onShowExplorer(storage)}
        >
          <FolderOpen size={14} className="inline mr-1" />
          Explorer
        </button>
      </div>
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Modal pour afficher les détails
function StorageDetailsModal({ storage, isOpen, onClose }) {
  if (!storage) return null;

  const usagePercent = ((storage.used / storage.total) * 100).toFixed(2);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Détails: ${storage.storage}`} size="lg">
      <div className="space-y-6">
        {/* Vue d'ensemble */}
        <div className="card bg-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Info size={20} className="mr-2 text-blue-500" />
            Vue d'ensemble
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="ID" value={storage.storage} />
            <InfoItem label="Type" value={storage.type} />
            <InfoItem label="Contenu" value={storage.content} />
            <InfoItem label="Partagé" value={storage.shared ? 'Oui' : 'Non'} />
            <InfoItem label="Node" value={storage.node || 'Tous'} />
            <InfoItem label="Plugin" value={storage.plugintype || storage.type} />
          </div>
        </div>

        {/* Utilisation */}
        <div className="card bg-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <HardDrive size={20} className="mr-2 text-green-500" />
            Utilisation
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-300">Espace utilisé</span>
                <span className="text-white font-medium">{usagePercent}%</span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-4">
                <div
                  className={`h-4 rounded-full transition-all duration-300 ${
                    usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-slate-800 p-3 rounded-lg">
                <p className="text-slate-400 text-xs mb-1">Total</p>
                <p className="text-white font-semibold">{formatBytes(storage.total)}</p>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg">
                <p className="text-slate-400 text-xs mb-1">Utilisé</p>
                <p className="text-white font-semibold">{formatBytes(storage.used)}</p>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg">
                <p className="text-slate-400 text-xs mb-1">Disponible</p>
                <p className="text-white font-semibold">{formatBytes(storage.available)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statut */}
        <div className="card bg-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            {storage.active ? (
              <CheckCircle size={20} className="mr-2 text-green-500" />
            ) : (
              <XCircle size={20} className="mr-2 text-red-500" />
            )}
            Statut
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <InfoItem 
              label="État" 
              value={storage.active ? 'Actif' : 'Inactif'}
              valueColor={storage.active ? 'text-green-400' : 'text-red-400'}
            />
            <InfoItem 
              label="Statut" 
              value={storage.status || 'available'}
              valueColor="text-green-400"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Modal pour gérer le storage
function StorageManageModal({ storage, isOpen, onClose, onUpdate }) {
  if (!storage) return null;

  const [enabled, setEnabled] = useState(storage.enabled !== 0);
  const [content, setContent] = useState(storage.content || '');
  const [nodes, setNodes] = useState(storage.nodes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Implémenter l'API de mise à jour
      await new Promise(resolve => setTimeout(resolve, 1000));
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le storage "${storage.storage}" ?`)) {
      return;
    }
    
    try {
      // TODO: Implémenter l'API de suppression
      await new Promise(resolve => setTimeout(resolve, 1000));
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Gérer: ${storage.storage}`} size="lg">
      <div className="space-y-6">
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">
            <strong>Note:</strong> La modification des paramètres de storage peut affecter les VMs et conteneurs qui l'utilisent.
          </p>
        </div>

        <div className="space-y-4">
          {/* Activé/Désactivé */}
          <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
            <div>
              <label className="text-white font-medium">Activé</label>
              <p className="text-slate-400 text-sm">Activer ou désactiver ce storage</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Type de contenu */}
          <div>
            <label className="block text-slate-300 font-medium mb-2">Type de contenu</label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-proxmox-500"
              placeholder="iso,vztmpl,backup"
              disabled
            />
            <p className="text-slate-400 text-sm mt-1">Types de contenu supportés (séparés par des virgules)</p>
          </div>

          {/* Nodes */}
          <div>
            <label className="block text-slate-300 font-medium mb-2">Nodes</label>
            <input
              type="text"
              value={nodes}
              onChange={(e) => setNodes(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-proxmox-500"
              placeholder="Tous les nodes"
            />
            <p className="text-slate-400 text-sm mt-1">Limiter aux nodes spécifiques (vide = tous)</p>
          </div>

          {/* Informations */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-700/30 rounded-lg">
            <InfoItem label="Type" value={storage.type} />
            <InfoItem label="Plugin" value={storage.plugintype || storage.type} />
            <InfoItem label="Partagé" value={storage.shared ? 'Oui' : 'Non'} />
            <InfoItem label="Utilisation" value={`${((storage.used / storage.total) * 100).toFixed(1)}%`} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t border-slate-700">
          <button
            onClick={handleDelete}
            className="btn bg-red-600 hover:bg-red-700 text-white"
          >
            <Trash2 size={16} className="mr-2" />
            Supprimer
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Modal pour ajouter un storage
function AddStorageModal({ isOpen, onClose, onAdd }) {
  const [storageType, setStorageType] = useState('dir');
  const [storageId, setStorageId] = useState('');
  const [path, setPath] = useState('');
  const [content, setContent] = useState('vztmpl,iso,backup');
  const [nodes, setNodes] = useState('');
  const [shared, setShared] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!storageId || !path) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setCreating(true);
    try {
      // TODO: Implémenter l'API de création
      await new Promise(resolve => setTimeout(resolve, 1000));
      onAdd();
      onClose();
      // Reset form
      setStorageId('');
      setPath('');
      setContent('vztmpl,iso,backup');
      setNodes('');
      setShared(false);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ajouter un Storage" size="lg">
      <div className="space-y-6">
        <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
          <p className="text-blue-400 text-sm">
            <strong>Note:</strong> Cette fonctionnalité créera un nouveau storage dans Proxmox. Assurez-vous que le chemin existe et est accessible.
          </p>
        </div>

        <div className="space-y-4">
          {/* Type de storage */}
          <div>
            <label className="block text-slate-300 font-medium mb-2">Type de Storage *</label>
            <select
              value={storageType}
              onChange={(e) => setStorageType(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-proxmox-500"
            >
              <option value="dir">Directory</option>
              <option value="nfs">NFS</option>
              <option value="cifs">CIFS/SMB</option>
              <option value="lvm">LVM</option>
              <option value="lvmthin">LVM-Thin</option>
              <option value="zfspool">ZFS</option>
            </select>
          </div>

          {/* ID */}
          <div>
            <label className="block text-slate-300 font-medium mb-2">ID Storage *</label>
            <input
              type="text"
              value={storageId}
              onChange={(e) => setStorageId(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-proxmox-500"
              placeholder="mon-storage"
            />
            <p className="text-slate-400 text-sm mt-1">Identifiant unique pour ce storage</p>
          </div>

          {/* Chemin ou serveur selon le type */}
          <div>
            <label className="block text-slate-300 font-medium mb-2">
              {storageType === 'nfs' || storageType === 'cifs' ? 'Serveur' : 'Chemin'} *
            </label>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-proxmox-500"
              placeholder={storageType === 'dir' ? '/mnt/pve/mon-storage' : '192.168.1.100'}
            />
          </div>

          {/* Type de contenu */}
          <div>
            <label className="block text-slate-300 font-medium mb-2">Type de contenu</label>
            <input
              type="text"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-proxmox-500"
              placeholder="vztmpl,iso,backup"
            />
            <p className="text-slate-400 text-sm mt-1">
              Options: vztmpl, iso, backup, images, rootdir (séparés par des virgules)
            </p>
          </div>

          {/* Nodes */}
          <div>
            <label className="block text-slate-300 font-medium mb-2">Nodes</label>
            <input
              type="text"
              value={nodes}
              onChange={(e) => setNodes(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-proxmox-500"
              placeholder="Tous les nodes"
            />
            <p className="text-slate-400 text-sm mt-1">Limiter aux nodes spécifiques (vide = tous)</p>
          </div>

          {/* Partagé */}
          <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
            <div>
              <label className="text-white font-medium">Storage partagé</label>
              <p className="text-slate-400 text-sm">Accessible depuis plusieurs nodes</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={shared}
                onChange={(e) => setShared(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Annuler
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !storageId || !path}
            className="btn btn-primary"
          >
            {creating ? 'Création...' : 'Créer'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Composant pour afficher une info
function InfoItem({ label, value, valueColor = 'text-white' }) {
  return (
    <div>
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <p className={`font-medium ${valueColor}`}>{value}</p>
    </div>
  );
}

// Modal pour explorer le contenu du storage
function StorageExplorerModal({ storage, isOpen, onClose }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    if (isOpen && storage) {
      loadFiles();
    }
  }, [isOpen, storage, currentPath]);

  const loadFiles = async () => {
    if (!storage) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/proxmox/storages/${storage.storage}/content?node=${storage.node || 'proxmox'}`);
      const data = await response.json();
      setFiles(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des fichiers:', error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  if (!storage) return null;

  const getFileIcon = (file) => {
    if (file.content === 'iso') return <FileImage className="text-blue-400" size={20} />;
    if (file.content === 'vztmpl') return <FileArchive className="text-green-400" size={20} />;
    if (file.content === 'backup') return <FileArchive className="text-purple-400" size={20} />;
    if (file.content === 'snippets') return <FileCode className="text-yellow-400" size={20} />;
    return <FileText className="text-slate-400" size={20} />;
  };

  const sortedFiles = [...files].sort((a, b) => {
    let compareA = a[sortBy];
    let compareB = b[sortBy];
    
    if (sortBy === 'size') {
      compareA = a.size || 0;
      compareB = b.size || 0;
    }
    
    if (sortOrder === 'asc') {
      return compareA > compareB ? 1 : -1;
    } else {
      return compareA < compareB ? 1 : -1;
    }
  });

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Explorer: ${storage.storage}`} size="xl">
      <div className="space-y-4">
        {/* Header avec stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-slate-700/50 rounded-lg">
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-1">Total Fichiers</p>
            <p className="text-white text-2xl font-bold">{files.length}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-1">Espace Utilisé</p>
            <p className="text-white text-2xl font-bold">{formatBytes(storage.used)}</p>
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-1">Type</p>
            <p className="text-white text-2xl font-bold">{storage.type}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <button 
            onClick={loadFiles}
            className="btn btn-secondary"
            disabled={loading}
          >
            <Download size={16} className="mr-2" />
            {loading ? 'Chargement...' : 'Actualiser'}
          </button>
          
          <div className="flex space-x-2 text-sm">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded px-3 py-1 text-white"
            >
              <option value="name">Nom</option>
              <option value="size">Taille</option>
              <option value="content">Type</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="btn btn-secondary px-3"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Liste des fichiers */}
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-proxmox-600"></div>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
              <p>Aucun fichier trouvé</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-slate-700/50 sticky top-0">
                  <tr>
                    <th 
                      className="text-left p-3 text-slate-300 font-medium cursor-pointer hover:bg-slate-700"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Nom
                        {sortBy === 'name' && <span className="ml-2">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th 
                      className="text-left p-3 text-slate-300 font-medium cursor-pointer hover:bg-slate-700"
                      onClick={() => handleSort('content')}
                    >
                      <div className="flex items-center">
                        Type
                        {sortBy === 'content' && <span className="ml-2">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th 
                      className="text-right p-3 text-slate-300 font-medium cursor-pointer hover:bg-slate-700"
                      onClick={() => handleSort('size')}
                    >
                      <div className="flex items-center justify-end">
                        Taille
                        {sortBy === 'size' && <span className="ml-2">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
                      </div>
                    </th>
                    <th className="text-right p-3 text-slate-300 font-medium">Format</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFiles.map((file, index) => (
                    <tr 
                      key={file.volid || index}
                      className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="p-3">
                        <div className="flex items-center space-x-3">
                          {getFileIcon(file)}
                          <span className="text-white font-medium truncate max-w-xs">
                            {file.volid?.split('/').pop() || file.volid || 'Sans nom'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="inline-block px-2 py-1 text-xs rounded bg-slate-700 text-slate-300">
                          {file.content}
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-300">
                        {formatBytes(file.size)}
                      </td>
                      <td className="p-3 text-right text-slate-400 text-sm">
                        {file.format || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-700 text-sm text-slate-400">
          <span>{files.length} fichier(s)</span>
          <span>Capacité: {formatBytes(storage.total)}</span>
        </div>
      </div>
    </Modal>
  );
}

