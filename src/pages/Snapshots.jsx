import { useState, useEffect } from 'react';
import { 
  Camera, Plus, Trash2, RotateCcw, RefreshCw, Search,
  Clock, AlertCircle, CheckCircle, Edit2, Save, X,
  Server, Database, History
} from 'lucide-react';
import Modal from '../components/Modal';
import { useApp } from '../contexts/AppContext';
import { translate } from '../i18n/translations';

export default function Snapshots() {
  const { language } = useApp();
  const [allSnapshots, setAllSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, qemu, lxc
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSnapshot, setEditingSnapshot] = useState(null);
  const [createFormData, setCreateFormData] = useState({
    type: 'qemu',
    vmid: '',
    snapname: '',
    description: '',
    vmstate: false
  });

  useEffect(() => {
    fetchAllSnapshots();
  }, []);

  const fetchAllSnapshots = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/snapshots/all');
      const data = await response.json();
      setAllSnapshots(data);
    } catch (error) {
      console.error('Error fetching snapshots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSnapshot = async (e) => {
    e.preventDefault();
    
    try {
      const { type, vmid, snapname, description, vmstate } = createFormData;
      
      const response = await fetch(`/api/snapshots/${type}/${vmid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapname,
          description,
          vmstate: type === 'qemu' ? vmstate : false
        })
      });

      if (response.ok) {
        alert(translate('snapshots.createSuccess', language));
        setShowCreateModal(false);
        setCreateFormData({
          type: 'qemu',
          vmid: '',
          snapname: '',
          description: '',
          vmstate: false
        });
        setTimeout(fetchAllSnapshots, 2000);
      } else {
        const error = await response.json();
        alert('Erreur: ' + (error.message || translate('snapshots.createError', language)));
      }
    } catch (error) {
      console.error('Error creating snapshot:', error);
      alert(translate('snapshots.createErrorGeneral', language));
    }
  };

  const handleRollback = async (type, vmid, snapname) => {
    if (!confirm(`${translate('snapshots.restoreConfirm', language)}\n\nVM/CT: ${vmid}\nSnapshot: ${snapname}\n\n${translate('snapshots.restoreWarning', language)}`)) {
      return;
    }

    try {
      const response = await fetch(`/api/snapshots/${type}/${vmid}/${snapname}/rollback`, {
        method: 'POST'
      });

      if (response.ok) {
        alert(translate('snapshots.restoreSuccess', language));
        fetchAllSnapshots();
      } else {
        const error = await response.json();
        alert('Erreur: ' + (error.message || 'Impossible de restaurer'));
      }
    } catch (error) {
      console.error('Error rolling back:', error);
      alert(translate('snapshots.restoreError', language));
    }
  };

  const handleDelete = async (type, vmid, snapname) => {
    if (!confirm(`${translate('snapshots.deleteConfirm', language)}\n\nVM/CT: ${vmid}\nSnapshot: ${snapname}`)) {
      return;
    }

    try {
      const response = await fetch(`/api/snapshots/${type}/${vmid}/${snapname}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert(translate('snapshots.deleteSuccess', language));
        fetchAllSnapshots();
      } else {
        const error = await response.json();
        alert('Erreur: ' + (error.message || 'Impossible de supprimer'));
      }
    } catch (error) {
      console.error('Error deleting snapshot:', error);
      alert(translate('snapshots.deleteError', language));
    }
  };

  const handleUpdateDescription = async (type, vmid, snapname, newDescription) => {
    try {
      const response = await fetch(`/api/snapshots/${type}/${vmid}/${snapname}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newDescription })
      });

      if (response.ok) {
        alert('Description mise à jour');
        setEditingSnapshot(null);
        fetchAllSnapshots();
      } else {
        const error = await response.json();
        alert('Erreur: ' + (error.message || 'Impossible de mettre à jour'));
      }
    } catch (error) {
      console.error('Error updating description:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString('fr-FR');
  };

  const formatBytes = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredSnapshots = allSnapshots.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.vmid.toString().includes(searchTerm) ||
      item.snapshots.some(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === 'all' || item.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const totalSnapshots = allSnapshots.reduce((acc, item) => acc + item.snapshots.length, 0);
  const vmSnapshots = allSnapshots.filter(i => i.type === 'qemu').reduce((acc, i) => acc + i.snapshots.length, 0);
  const lxcSnapshots = allSnapshots.filter(i => i.type === 'lxc').reduce((acc, i) => acc + i.snapshots.length, 0);
  const totalSize = allSnapshots.reduce((acc, item) => 
    acc + item.snapshots.reduce((s, snap) => s + (snap.size || 0), 0), 0
  );

  if (loading) {
    return <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proxmox-600"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Snapshots</h2>
          <p className="text-slate-400">Gestion des points de restauration instantanés</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={fetchAllSnapshots} className="btn btn-secondary">
            <RefreshCw size={16} className="mr-2" />
            Actualiser
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            <Plus size={16} className="mr-2" />
            Nouveau Snapshot
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Total Snapshots</p>
              <p className="text-3xl font-bold text-white">{totalSnapshots}</p>
            </div>
            <Camera size={40} className="text-white opacity-20" />
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">VM Snapshots</p>
              <p className="text-3xl font-bold text-white">{vmSnapshots}</p>
            </div>
            <Server size={40} className="text-white opacity-20" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">LXC Snapshots</p>
              <p className="text-3xl font-bold text-white">{lxcSnapshots}</p>
            </div>
            <Database size={40} className="text-white opacity-20" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-orange-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Espace Total</p>
              <p className="text-2xl font-bold text-white">{formatBytes(totalSize)}</p>
            </div>
            <History size={40} className="text-white opacity-20" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher un snapshot..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            >
              <option value="all">Tous les types</option>
              <option value="qemu">VMs seulement</option>
              <option value="lxc">LXC seulement</option>
            </select>
          </div>
        </div>
      </div>

      {/* Snapshots by VM/Container */}
      <div className="space-y-4">
        {filteredSnapshots.length === 0 ? (
          <div className="card">
            <div className="text-center py-12">
              <Camera size={48} className="mx-auto text-slate-600 mb-4" />
              <p className="text-slate-400 text-lg mb-2">
                {searchTerm || filterType !== 'all' 
                  ? 'Aucun snapshot ne correspond aux filtres'
                  : 'Aucun snapshot disponible'}
              </p>
              <p className="text-slate-500 text-sm">
                Créez un snapshot pour sauvegarder l'état actuel d'une VM ou d'un container
              </p>
            </div>
          </div>
        ) : (
          filteredSnapshots.map((item) => (
            <div key={`${item.type}-${item.vmid}`} className="card">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    item.type === 'qemu' 
                      ? 'bg-blue-500/20 text-blue-400' 
                      : 'bg-green-500/20 text-green-400'
                  }`}>
                    {item.type === 'qemu' ? <Server size={20} /> : <Database size={20} />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {item.name || `${item.type.toUpperCase()} ${item.vmid}`}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {item.type === 'qemu' ? 'Machine Virtuelle' : 'Container LXC'} • VMID: {item.vmid}
                    </p>
                  </div>
                </div>
                <span className="status-badge status-running">
                  {item.snapshots.length} snapshot{item.snapshots.length > 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-2">
                {item.snapshots.map((snapshot) => (
                  <div key={snapshot.name} className="bg-slate-700/30 rounded-lg p-4 hover:bg-slate-700/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-white font-semibold font-mono">{snapshot.name}</h4>
                          {snapshot.vmstate && (
                            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                              RAM inclus
                            </span>
                          )}
                        </div>
                        
                        {editingSnapshot === `${item.type}-${item.vmid}-${snapshot.name}` ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              defaultValue={snapshot.description}
                              className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-1 text-white text-sm"
                              id={`desc-${snapshot.name}`}
                            />
                            <button
                              onClick={() => {
                                const input = document.getElementById(`desc-${snapshot.name}`);
                                handleUpdateDescription(item.type, item.vmid, snapshot.name, input.value);
                              }}
                              className="p-1 hover:bg-green-500/20 rounded transition-colors"
                            >
                              <Save size={16} className="text-green-400" />
                            </button>
                            <button
                              onClick={() => setEditingSnapshot(null)}
                              className="p-1 hover:bg-red-500/20 rounded transition-colors"
                            >
                              <X size={16} className="text-red-400" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-slate-400 text-sm flex items-center">
                            {snapshot.description || 'Aucune description'}
                            <button
                              onClick={() => setEditingSnapshot(`${item.type}-${item.vmid}-${snapshot.name}`)}
                              className="ml-2 p-1 hover:bg-slate-600 rounded transition-colors"
                            >
                              <Edit2 size={14} className="text-slate-500" />
                            </button>
                          </p>
                        )}

                        <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center">
                            <Clock size={12} className="mr-1" />
                            {formatDate(snapshot.snaptime)}
                          </span>
                          {snapshot.size && (
                            <span>Taille: {formatBytes(snapshot.size)}</span>
                          )}
                          {snapshot.parent && (
                            <span>Parent: {snapshot.parent}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleRollback(item.type, item.vmid, snapshot.name)}
                          className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                          title="Restaurer ce snapshot"
                        >
                          <RotateCcw size={18} className="text-green-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.type, item.vmid, snapshot.name)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Supprimer ce snapshot"
                        >
                          <Trash2 size={18} className="text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Snapshot Modal */}
      {showCreateModal && (
        <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Créer un Snapshot" size="lg">
          <form onSubmit={handleCreateSnapshot} className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle size={24} className="text-blue-400 flex-shrink-0" />
                <div>
                  <h4 className="text-white font-semibold mb-1">À propos des snapshots</h4>
                  <p className="text-slate-300 text-sm">
                    Un snapshot crée un point de restauration instantané. Il est stocké sur le même disque que la VM/Container.
                    Pour une sauvegarde complète, utilisez plutôt le système de Backup.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-2">Type</label>
                <select
                  value={createFormData.type}
                  onChange={(e) => setCreateFormData({...createFormData, type: e.target.value})}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="qemu">Machine Virtuelle (VM)</option>
                  <option value="lxc">Container LXC</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-2">VMID</label>
                <input
                  type="number"
                  value={createFormData.vmid}
                  onChange={(e) => setCreateFormData({...createFormData, vmid: e.target.value})}
                  placeholder="100, 101, 200..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-2">Nom du snapshot</label>
              <input
                type="text"
                value={createFormData.snapname}
                onChange={(e) => setCreateFormData({...createFormData, snapname: e.target.value})}
                placeholder="avant-mise-a-jour, test-config, etc."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                required
              />
              <p className="text-slate-500 text-xs mt-1">Utilisez des noms descriptifs sans espaces</p>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-2">Description</label>
              <textarea
                value={createFormData.description}
                onChange={(e) => setCreateFormData({...createFormData, description: e.target.value})}
                placeholder="Snapshot avant mise à jour du système..."
                rows="3"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              />
            </div>

            {createFormData.type === 'qemu' && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={createFormData.vmstate}
                  onChange={(e) => setCreateFormData({...createFormData, vmstate: e.target.checked})}
                  className="w-4 h-4 text-proxmox-600 bg-slate-700 border-slate-600 rounded"
                />
                <label className="ml-2 text-slate-300">
                  Inclure l'état de la RAM (vmstate)
                  <span className="block text-slate-500 text-xs">Permet de reprendre exactement où la VM s'était arrêtée</span>
                </label>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
              <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                <Camera size={16} className="mr-2" />
                Créer le Snapshot
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
