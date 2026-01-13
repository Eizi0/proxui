import { useState, useEffect } from 'react';
import { 
  Archive, Download, Trash2, Clock, Play, AlertCircle, 
  CheckCircle, RefreshCw, Calendar, HardDrive, Filter,
  Search, Settings, Plus, FileArchive, Database
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';

export default function Backups() {
  const navigate = useNavigate();
  const [backups, setBackups] = useState([]);
  const [pbsStatus, setPbsStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, qemu, lxc
  const [filterStorage, setFilterStorage] = useState('all');
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [backupFormData, setBackupFormData] = useState({
    vmid: '',
    storage: '',
    mode: 'snapshot',
    compress: 'zstd'
  });

  useEffect(() => {
    checkPBSStatus();
    fetchBackups();
  }, []);

  const checkPBSStatus = async () => {
    try {
      const response = await fetch('/api/backups/pbs-status');
      const data = await response.json();
      setPbsStatus(data);
      
      if (!data.configured && data.backupStorages.length === 0) {
        console.warn('⚠️  No backup storage configured');
      }
    } catch (error) {
      console.error('Error checking PBS status:', error);
    }
  };

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/backups');
      const data = await response.json();
      setBackups(data);
    } catch (error) {
      console.error('Error fetching backups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/backups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node: 'proxmox',
          ...backupFormData
        })
      });

      if (response.ok) {
        alert('Backup démarré avec succès !');
        setShowBackupModal(false);
        setTimeout(fetchBackups, 2000);
      } else {
        const error = await response.json();
        alert('Erreur: ' + (error.message || 'Impossible de créer le backup'));
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Erreur lors de la création du backup');
    }
  };

  const handleDeleteBackup = async (backup) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ce backup ?\n${backup.volid}`)) {
      return;
    }

    try {
      const response = await fetch(
        `/api/backups/${backup.node}/${backup.storage}/${encodeURIComponent(backup.volid)}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        alert('Backup supprimé avec succès');
        fetchBackups();
      } else {
        const error = await response.json();
        alert('Erreur: ' + (error.message || 'Impossible de supprimer le backup'));
      }
    } catch (error) {
      console.error('Error deleting backup:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleRestoreBackup = async (backup) => {
    setSelectedBackup(backup);
    setShowRestoreModal(true);
  };

  const executeRestore = async (e) => {
    e.preventDefault();
    
    try {
      const vmid = prompt('Entrez le VMID de destination (laisser vide pour restaurer au même ID):');
      
      const response = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node: selectedBackup.node,
          storage: selectedBackup.storage,
          volume: selectedBackup.volid,
          vmid: vmid || undefined,
          force: 0
        })
      });

      if (response.ok) {
        alert('Restauration démarrée avec succès !');
        setShowRestoreModal(false);
      } else {
        const error = await response.json();
        alert('Erreur: ' + (error.message || 'Impossible de restaurer'));
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert('Erreur lors de la restauration');
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleString('fr-FR');
  };

  const extractVMID = (volid) => {
    const match = volid.match(/\/(\d+)\//);
    return match ? match[1] : 'N/A';
  };

  const getBackupType = (volid) => {
    if (volid.includes('qemu')) return 'VM';
    if (volid.includes('lxc')) return 'LXC';
    return 'Unknown';
  };

  const filteredBackups = backups.filter(backup => {
    const matchesSearch = backup.volid.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || 
      (filterType === 'qemu' && backup.volid.includes('qemu')) ||
      (filterType === 'lxc' && backup.volid.includes('lxc'));
    const matchesStorage = filterStorage === 'all' || backup.storage === filterStorage;
    
    return matchesSearch && matchesType && matchesStorage;
  });

  const totalSize = backups.reduce((acc, b) => acc + (b.size || 0), 0);
  const vmBackups = backups.filter(b => b.volid.includes('qemu')).length;
  const lxcBackups = backups.filter(b => b.volid.includes('lxc')).length;
  const uniqueStorages = [...new Set(backups.map(b => b.storage))];

  if (loading) {
    return <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proxmox-600"></div>
    </div>;
  }

  // Show critical warning if NO backup storage at all
  if (pbsStatus && pbsStatus.backupStorages.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">Backups</h2>
            <p className="text-slate-400">Système de sauvegarde professionnel</p>
          </div>
        </div>

        <div className="card bg-red-500/10 border-red-500/50">
          <div className="flex items-start space-x-4">
            <AlertCircle size={48} className="text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">⚠️ Configuration Backup Requise</h3>
              <p className="text-slate-300 mb-4">
                <strong>Aucun stockage de backup n'est configuré !</strong> Vous devez configurer au moins un stockage 
                avec le type de contenu "backup" activé pour pouvoir créer des sauvegardes.
              </p>
              
              <div className="bg-slate-800/50 rounded-lg p-4 mb-4 border border-slate-700">
                <h4 className="text-white font-semibold mb-2">Options de configuration :</h4>
                <ul className="space-y-2 text-slate-300 text-sm">
                  <li className="flex items-start">
                    <span className="text-proxmox-400 mr-2">•</span>
                    <div>
                      <strong className="text-white">Stockage Local :</strong> Utilise l'espace disque local du serveur Proxmox
                      <br />
                      <span className="text-slate-500 text-xs">Rapide mais limité en capacité</span>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-proxmox-400 mr-2">•</span>
                    <div>
                      <strong className="text-white">NFS/CIFS :</strong> Montez un partage réseau pour les backups
                      <br />
                      <span className="text-slate-500 text-xs">Bonne capacité, performance réseau-dépendante</span>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="text-proxmox-400 mr-2">•</span>
                    <div>
                      <strong className="text-white">Proxmox Backup Server (PBS) :</strong> Solution professionnelle avec déduplication
                      <br />
                      <span className="text-slate-500 text-xs">Déduplication, compression, vérification d'intégrité</span>
                    </div>
                  </li>
                </ul>
              </div>

              <button 
                onClick={() => navigate('/settings')} 
                className="btn btn-primary"
              >
                <Settings size={16} className="mr-2" />
                Configurer dans Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Backups</h2>
          <p className="text-slate-400">
            Gestion professionnelle des sauvegardes
            {pbsStatus?.configured && (
              <span className="ml-2 text-green-400">• PBS Configuré</span>
            )}
          </p>
        </div>
        <div className="flex space-x-3">
          <button onClick={fetchBackups} className="btn btn-secondary">
            <RefreshCw size={16} className="mr-2" />
            Actualiser
          </button>
          <button onClick={() => navigate('/backup-scheduling')} className="btn btn-secondary">
            <Calendar size={16} className="mr-2" />
            Planifications
          </button>
          <button onClick={() => setShowBackupModal(true)} className="btn btn-primary">
            <Plus size={16} className="mr-2" />
            Nouveau Backup
          </button>
        </div>
      </div>

      {/* PBS Recommendation Banner */}
      {pbsStatus && !pbsStatus.configured && pbsStatus.backupStorages.length > 0 && (
        <div className="card bg-yellow-500/10 border-yellow-500/50">
          <div className="flex items-start space-x-3">
            <AlertCircle size={24} className="text-yellow-500 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h4 className="text-white font-semibold mb-1">💡 Recommandation : Proxmox Backup Server</h4>
              <p className="text-slate-300 text-sm mb-3">
                Vous utilisez actuellement un stockage local <strong>({pbsStatus.backupStorages.map(s => s.storage).join(', ')})</strong> pour vos backups.
                Pour une solution professionnelle de datacenter, considérez <strong>Proxmox Backup Server (PBS)</strong> :
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                <div className="bg-slate-800/30 rounded p-2 border border-slate-700/50">
                  <div className="text-green-400 text-xs font-semibold mb-1">✓ Déduplication</div>
                  <div className="text-slate-400 text-xs">Économie d'espace massive</div>
                </div>
                <div className="bg-slate-800/30 rounded p-2 border border-slate-700/50">
                  <div className="text-green-400 text-xs font-semibold mb-1">✓ Vérification</div>
                  <div className="text-slate-400 text-xs">Intégrité garantie</div>
                </div>
                <div className="bg-slate-800/30 rounded p-2 border border-slate-700/50">
                  <div className="text-green-400 text-xs font-semibold mb-1">✓ Chiffrement</div>
                  <div className="text-slate-400 text-xs">Sécurité renforcée</div>
                </div>
              </div>
              <button 
                onClick={() => navigate('/settings')} 
                className="text-yellow-400 hover:text-yellow-300 text-sm font-medium flex items-center transition-colors"
              >
                <Settings size={14} className="mr-1" />
                Configurer PBS dans Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Total Backups</p>
              <p className="text-3xl font-bold text-white">{backups.length}</p>
            </div>
            <Archive size={40} className="text-white opacity-20" />
          </div>
        </div>
        
        <div className="card bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Espace Total</p>
              <p className="text-2xl font-bold text-white">{formatBytes(totalSize)}</p>
            </div>
            <HardDrive size={40} className="text-white opacity-20" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">VM Backups</p>
              <p className="text-3xl font-bold text-white">{vmBackups}</p>
            </div>
            <FileArchive size={40} className="text-white opacity-20" />
          </div>
        </div>

        <div className="card bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-orange-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">LXC Backups</p>
              <p className="text-3xl font-bold text-white">{lxcBackups}</p>
            </div>
            <Database size={40} className="text-white opacity-20" />
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
                placeholder="Rechercher un backup..."
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

            <select
              value={filterStorage}
              onChange={(e) => setFilterStorage(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            >
              <option value="all">Tous les stockages</option>
              {uniqueStorages.map(storage => (
                <option key={storage} value={storage}>{storage}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Backups List */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">Type</th>
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">VMID</th>
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">Nom du Fichier</th>
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">Stockage</th>
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">Taille</th>
                <th className="text-left py-3 px-4 text-slate-400 font-semibold">Date</th>
                <th className="text-right py-3 px-4 text-slate-400 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBackups.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400">
                    {searchTerm || filterType !== 'all' || filterStorage !== 'all' 
                      ? 'Aucun backup ne correspond aux filtres'
                      : 'Aucun backup disponible'}
                  </td>
                </tr>
              ) : (
                filteredBackups.map((backup, index) => (
                  <tr key={index} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="py-3 px-4">
                      <span className={`status-badge ${
                        getBackupType(backup.volid) === 'VM' ? 'status-running' : 'status-stopped'
                      }`}>
                        {getBackupType(backup.volid)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white font-mono">{extractVMID(backup.volid)}</td>
                    <td className="py-3 px-4 text-white font-mono text-sm">
                      {backup.volid.split('/').pop()}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{backup.storage}</td>
                    <td className="py-3 px-4 text-slate-300">{formatBytes(backup.size)}</td>
                    <td className="py-3 px-4 text-slate-300 text-sm">{formatDate(backup.ctime)}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleRestoreBackup(backup)}
                          className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                          title="Restaurer"
                        >
                          <Play size={16} className="text-green-400" />
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(backup)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={16} className="text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Backup Modal */}
      {showBackupModal && (
        <Modal isOpen={showBackupModal} onClose={() => setShowBackupModal(false)} title="Créer un Backup" size="lg">
          <form onSubmit={handleCreateBackup} className="space-y-4">
            <div>
              <label className="block text-slate-300 font-medium mb-2">VMID</label>
              <input
                type="number"
                value={backupFormData.vmid}
                onChange={(e) => setBackupFormData({...backupFormData, vmid: e.target.value})}
                placeholder="100, 101, 200..."
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                required
              />
              <p className="text-slate-500 text-xs mt-1">ID de la VM ou du container à sauvegarder</p>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-2">Stockage de destination</label>
              <select
                value={backupFormData.storage}
                onChange={(e) => setBackupFormData({...backupFormData, storage: e.target.value})}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                required
              >
                <option value="">Sélectionner un stockage</option>
                {pbsStatus?.backupStorages.map(storage => (
                  <option key={storage.storage} value={storage.storage}>
                    {storage.storage} ({storage.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-2">Mode de backup</label>
              <select
                value={backupFormData.mode}
                onChange={(e) => setBackupFormData({...backupFormData, mode: e.target.value})}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="snapshot">Snapshot (recommandé)</option>
                <option value="suspend">Suspend</option>
                <option value="stop">Stop</option>
              </select>
              <p className="text-slate-500 text-xs mt-1">
                Snapshot: backup sans interruption | Suspend: pause temporaire | Stop: arrêt complet
              </p>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-2">Compression</label>
              <select
                value={backupFormData.compress}
                onChange={(e) => setBackupFormData({...backupFormData, compress: e.target.value})}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              >
                <option value="zstd">Zstandard (rapide, bon ratio)</option>
                <option value="lzo">LZO (très rapide)</option>
                <option value="gzip">GZIP (compatible)</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
              <button type="button" onClick={() => setShowBackupModal(false)} className="btn btn-secondary">
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                <Archive size={16} className="mr-2" />
                Créer le Backup
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Restore Confirmation Modal */}
      {showRestoreModal && selectedBackup && (
        <Modal isOpen={showRestoreModal} onClose={() => setShowRestoreModal(false)} title="Restaurer Backup" size="lg">
          <form onSubmit={executeRestore} className="space-y-4">
            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle size={24} className="text-yellow-500 flex-shrink-0" />
                <div>
                  <h4 className="text-white font-semibold mb-1">Attention</h4>
                  <p className="text-slate-300 text-sm">
                    La restauration va créer une nouvelle VM/Container ou écraser une existante. 
                    Assurez-vous d'avoir suffisamment d'espace de stockage.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
              <h4 className="text-white font-semibold mb-2">Informations du backup :</h4>
              <p className="text-slate-300 text-sm"><strong>Type:</strong> {getBackupType(selectedBackup.volid)}</p>
              <p className="text-slate-300 text-sm"><strong>VMID d'origine:</strong> {extractVMID(selectedBackup.volid)}</p>
              <p className="text-slate-300 text-sm"><strong>Fichier:</strong> {selectedBackup.volid.split('/').pop()}</p>
              <p className="text-slate-300 text-sm"><strong>Taille:</strong> {formatBytes(selectedBackup.size)}</p>
              <p className="text-slate-300 text-sm"><strong>Date:</strong> {formatDate(selectedBackup.ctime)}</p>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
              <button type="button" onClick={() => setShowRestoreModal(false)} className="btn btn-secondary">
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                <Play size={16} className="mr-2" />
                Restaurer
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
