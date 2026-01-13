import { useState, useEffect } from 'react';
import { Calendar, Plus, Clock, Edit2, Trash2, Play, RefreshCw, AlertCircle, Check } from 'lucide-react';
import Modal from '../components/Modal';

export default function BackupScheduling() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [formData, setFormData] = useState({
    vmid: 'all',
    node: 'all',
    storage: 'local',
    enabled: true,
    mode: 'snapshot',
    compress: 'zstd',
    dow: '*',
    starttime: '02:00',
    mailnotification: 'failure',
    mailto: '',
    prune: 7,
    comment: ''
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/backups/jobs');
      const data = await response.json();
      setJobs(data);
    } catch (error) {
      console.error('Error fetching backup jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingJob 
        ? `/api/backups/jobs/${editingJob.id}`
        : '/api/backups/jobs';
      
      const method = editingJob ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          prune: parseInt(formData.prune),
          enabled: formData.enabled ? 1 : 0
        })
      });

      if (response.ok) {
        alert(editingJob ? 'Job mis à jour !' : 'Job créé !');
        setShowModal(false);
        setEditingJob(null);
        resetForm();
        fetchJobs();
      } else {
        const error = await response.json();
        alert('Erreur: ' + (error.message || 'Impossible de sauvegarder'));
      }
    } catch (error) {
      console.error('Error saving job:', error);
      alert('Erreur lors de la sauvegarde');
    }
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setFormData({
      vmid: job.vmid || 'all',
      node: job.node || 'all',
      storage: job.storage || 'local',
      enabled: job.enabled === 1 || job.enabled === true,
      mode: job.mode || 'snapshot',
      compress: job.compress || 'zstd',
      dow: job.dow || '*',
      starttime: job.starttime || '02:00',
      mailnotification: job.mailnotification || 'failure',
      mailto: job.mailto || '',
      prune: job.prune || 7,
      comment: job.comment || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (jobId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette planification ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/backups/jobs/${jobId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        alert('Job supprimé !');
        fetchJobs();
      } else {
        const error = await response.json();
        alert('Erreur: ' + (error.message || 'Impossible de supprimer'));
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleRun = async (jobId) => {
    if (!confirm('Voulez-vous exécuter ce backup maintenant ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/backups/jobs/${jobId}/run`, {
        method: 'POST'
      });

      if (response.ok) {
        alert('Backup démarré !');
      } else {
        const error = await response.json();
        alert('Erreur: ' + (error.message || 'Impossible de lancer'));
      }
    } catch (error) {
      console.error('Error running job:', error);
      alert('Erreur lors du lancement');
    }
  };

  const resetForm = () => {
    setFormData({
      vmid: 'all',
      node: 'all',
      storage: 'local',
      enabled: true,
      mode: 'snapshot',
      compress: 'zstd',
      dow: '*',
      starttime: '02:00',
      mailnotification: 'failure',
      mailto: '',
      prune: 7,
      comment: ''
    });
  };

  const formatSchedule = (dow, starttime) => {
    const days = {
      '*': 'Tous les jours',
      '0': 'Dimanche',
      '1': 'Lundi',
      '2': 'Mardi',
      '3': 'Mercredi',
      '4': 'Jeudi',
      '5': 'Vendredi',
      '6': 'Samedi'
    };
    
    return `${days[dow] || dow} à ${starttime}`;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proxmox-600"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Planification des Backups</h2>
          <p className="text-slate-400">Configurez vos sauvegardes automatiques</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={fetchJobs} className="btn btn-secondary">
            <RefreshCw size={16} className="mr-2" />
            Actualiser
          </button>
          <button onClick={() => { setEditingJob(null); resetForm(); setShowModal(true); }} className="btn btn-primary">
            <Plus size={16} className="mr-2" />
            Nouvelle Planification
          </button>
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="card">
          <div className="text-center py-12">
            <Calendar size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400 text-lg mb-2">Aucune planification configurée</p>
            <p className="text-slate-500 text-sm mb-4">
              Créez des planifications pour automatiser vos backups
            </p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary">
              <Plus size={16} className="mr-2" />
              Créer la première planification
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {jobs.map((job) => (
            <div key={job.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-proxmox-600/20 rounded-lg flex items-center justify-center">
                    <Calendar className="text-proxmox-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {job.comment || `Backup Job ${job.id}`}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {job.vmid === 'all' ? 'Toutes les VMs/CTs' : `VMID: ${job.vmid}`}
                      {' • '}
                      {job.node === 'all' ? 'Tous les nodes' : `Node: ${job.node}`}
                    </p>
                  </div>
                </div>
                <span className={`status-badge ${job.enabled ? 'status-running' : 'status-stopped'}`}>
                  {job.enabled ? 'Actif' : 'Inactif'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <p className="text-slate-400 mb-1 flex items-center">
                    <Clock size={14} className="mr-1" />
                    Planning
                  </p>
                  <p className="text-white">{formatSchedule(job.dow, job.starttime)}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-1">Stockage</p>
                  <p className="text-white font-mono">{job.storage}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-1">Mode / Compression</p>
                  <p className="text-white">{job.mode} / {job.compress}</p>
                </div>
                <div>
                  <p className="text-slate-400 mb-1">Rétention</p>
                  <p className="text-white">{job.prune || 'Aucune'} backup{job.prune > 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-700">
                <button onClick={() => handleRun(job.id)} className="btn btn-secondary text-sm">
                  <Play size={14} className="mr-1" />
                  Exécuter
                </button>
                <button onClick={() => handleEdit(job)} className="btn btn-secondary text-sm">
                  <Edit2 size={14} className="mr-1" />
                  Modifier
                </button>
                <button onClick={() => handleDelete(job.id)} className="btn btn-danger text-sm">
                  <Trash2 size={14} className="mr-1" />
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Create/Edit */}
      {showModal && (
        <Modal 
          isOpen={showModal} 
          onClose={() => { setShowModal(false); setEditingJob(null); resetForm(); }} 
          title={editingJob ? 'Modifier la planification' : 'Nouvelle planification'}
          size="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-300 text-sm">
                    Cette planification créera automatiquement des backups selon le calendrier défini.
                    Les backups seront stockés dans le stockage sélectionné.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-2">VMID</label>
                <input
                  type="text"
                  value={formData.vmid}
                  onChange={(e) => setFormData({...formData, vmid: e.target.value})}
                  placeholder="all ou 100,101,102"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                />
                <p className="text-slate-500 text-xs mt-1">"all" pour toutes les VMs/CTs</p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-2">Node</label>
                <input
                  type="text"
                  value={formData.node}
                  onChange={(e) => setFormData({...formData, node: e.target.value})}
                  placeholder="all ou proxmox"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-2">Stockage</label>
                <input
                  type="text"
                  value={formData.storage}
                  onChange={(e) => setFormData({...formData, storage: e.target.value})}
                  placeholder="local"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-2">Rétention (jours)</label>
                <input
                  type="number"
                  value={formData.prune}
                  onChange={(e) => setFormData({...formData, prune: e.target.value})}
                  placeholder="7"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-2">Jour</label>
                <select
                  value={formData.dow}
                  onChange={(e) => setFormData({...formData, dow: e.target.value})}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="*">Tous les jours</option>
                  <option value="0">Dimanche</option>
                  <option value="1">Lundi</option>
                  <option value="2">Mardi</option>
                  <option value="3">Mercredi</option>
                  <option value="4">Jeudi</option>
                  <option value="5">Vendredi</option>
                  <option value="6">Samedi</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-2">Heure</label>
                <input
                  type="time"
                  value={formData.starttime}
                  onChange={(e) => setFormData({...formData, starttime: e.target.value})}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-2">Mode</label>
                <select
                  value={formData.mode}
                  onChange={(e) => setFormData({...formData, mode: e.target.value})}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="snapshot">Snapshot</option>
                  <option value="suspend">Suspend</option>
                  <option value="stop">Stop</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-2">Compression</label>
                <select
                  value={formData.compress}
                  onChange={(e) => setFormData({...formData, compress: e.target.value})}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="zstd">ZSTD (Recommandé)</option>
                  <option value="lzo">LZO (Rapide)</option>
                  <option value="gzip">GZIP (Compatible)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-2">Notification</label>
                <select
                  value={formData.mailnotification}
                  onChange={(e) => setFormData({...formData, mailnotification: e.target.value})}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                >
                  <option value="always">Toujours</option>
                  <option value="failure">En cas d'échec</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-2">Email (optionnel)</label>
              <input
                type="email"
                value={formData.mailto}
                onChange={(e) => setFormData({...formData, mailto: e.target.value})}
                placeholder="admin@example.com"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-2">Description</label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData({...formData, comment: e.target.value})}
                placeholder="Backup journalier des VMs de production"
                rows="2"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
                className="w-4 h-4 text-proxmox-600 bg-slate-700 border-slate-600 rounded"
              />
              <label className="ml-2 text-slate-300">
                Activer cette planification
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
              <button 
                type="button" 
                onClick={() => { setShowModal(false); setEditingJob(null); resetForm(); }} 
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button type="submit" className="btn btn-primary">
                <Check size={16} className="mr-2" />
                {editingJob ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
