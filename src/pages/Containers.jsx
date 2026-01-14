import { useState, useEffect } from 'react';
import { Play, Square, RotateCw, Trash2, Box, Container, Settings } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { translate } from '../i18n/translations';
import EditLXCModal from '../components/EditLXCModal';

export default function Containers() {
  const { language } = useApp();
  const [activeTab, setActiveTab] = useState('lxc');
  const [lxcContainers, setLxcContainers] = useState([]);
  const [dockerContainers, setDockerContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dockerAvailable, setDockerAvailable] = useState(true);
  const [editingContainer, setEditingContainer] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchContainers();
    checkDocker();
    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      fetchContainers();
      checkDocker();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkDocker = async () => {
    try {
      const response = await fetch('/api/docker/status');
      const data = await response.json();
      setDockerAvailable(data.available);
    } catch (error) {
      setDockerAvailable(false);
    }
  };

  const fetchContainers = async () => {
    try {
      const [lxc, docker] = await Promise.all([
        fetch('/api/proxmox/lxc').then(r => r.json()).catch(() => []),
        fetch('/api/docker/containers').then(r => r.json()).catch(() => []),
      ]);
      setLxcContainers(lxc);
      setDockerContainers(docker);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching containers:', error);
      setLoading(false);
    }
  };

  const handleLXCAction = async (vmid, action) => {
    try {
      await fetch(`/api/proxmox/lxc/${vmid}/${action}`, { method: 'POST' });
      setTimeout(fetchContainers, 1000);
    } catch (error) {
      console.error(`Error ${action} LXC:`, error);
    }
  };

  const handleEditLXC = (vmid) => {
    setEditingContainer(vmid);
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    fetchContainers();
  };

  const handleDockerAction = async (id, action) => {
    try {
      const method = action === 'remove' ? 'DELETE' : 'POST';
      await fetch(`/api/docker/containers/${id}/${action}`, { method });
      setTimeout(fetchContainers, 1000);
    } catch (error) {
      console.error(`Error ${action} Docker container:`, error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proxmox-600"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">{translate('containers.title', language)}</h2>
        <p className="text-slate-400">{translate('containers.subtitle', language)}</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('lxc')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'lxc'
              ? 'text-proxmox-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Box className="inline mr-2" size={18} />
          {translate('containers.lxc', language)} ({lxcContainers.length})
          {activeTab === 'lxc' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-proxmox-600"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('docker')}
          className={`px-6 py-3 font-medium transition-colors relative ${
            activeTab === 'docker'
              ? 'text-proxmox-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Container className="inline mr-2" size={18} />
          {translate('containers.docker', language)} ({dockerContainers.length})
          {activeTab === 'docker' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-proxmox-600"></div>
          )}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'lxc' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lxcContainers.map((container) => (
            <LXCCard key={container.vmid} container={container} onAction={handleLXCAction} onEdit={handleEditLXC} language={language} />
          ))}
          {lxcContainers.length === 0 && (
            <div className="col-span-full card text-center py-12">
              <Box className="mx-auto text-slate-600 mb-4" size={48} />
              <p className="text-slate-400">{translate('containers.none', language)}</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {!dockerAvailable ? (
            <div className="card text-center py-12">
              <Container className="mx-auto text-slate-600 mb-4" size={48} />
              <h3 className="text-xl font-bold text-white mb-2">Docker</h3>
              <p className="text-slate-400">{translate('containers.dockerUnavailable', language)}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dockerContainers.map((container) => (
                <DockerCard key={container.Id} container={container} onAction={handleDockerAction} language={language} />
              ))}
              {dockerContainers.length === 0 && (
                <div className="col-span-full card text-center py-12">
                  <Container className="mx-auto text-slate-600 mb-4" size={48} />
                  <p className="text-slate-400">{translate('containers.none', language)}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <EditLXCModal
        vmid={editingContainer}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}

function LXCCard({ container, onAction, onEdit }) {
  const isRunning = container.status === 'running';

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">{container.name}</h3>
          <p className="text-sm text-slate-400">ID: {container.vmid}</p>
        </div>
        <span className={`status-badge ${isRunning ? 'status-running' : 'status-stopped'}`}>
          {container.status}
        </span>
      </div>

      <div className="space-y-2 text-sm text-slate-300 mb-4">
        <div className="flex justify-between">
          <span className="text-slate-400">CPU:</span>
          <span>{container.cpus || 0} vCPU</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Mémoire:</span>
          <span>{Math.round((container.maxmem || 0) / 1024 / 1024 / 1024)} GB</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Disque:</span>
          <span>{Math.round((container.maxdisk || 0) / 1024 / 1024 / 1024)} GB</span>
        </div>
        {container['net0'] && (
          <div className="flex justify-between">
            <span className="text-slate-400">IP:</span>
            <span className="text-xs font-mono">{container['net0'] || 'N/A'}</span>
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => onEdit(container.vmid)}
          className="btn btn-secondary"
          title="Éditer la configuration"
        >
          <Settings size={16} />
        </button>
        {!isRunning ? (
          <button onClick={() => onAction(container.vmid, 'start')} className="btn btn-success flex-1">
            <Play size={16} className="inline mr-1" />
            Démarrer
          </button>
        ) : (
          <>
            <button onClick={() => onAction(container.vmid, 'shutdown')} className="btn btn-danger flex-1">
              <Square size={16} className="inline mr-1" />
              Arrêter
            </button>
            <button onClick={() => onAction(container.vmid, 'reboot')} className="btn btn-secondary">
              <RotateCw size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DockerCard({ container, onAction }) {
  const isRunning = container.State === 'running';
  const name = container.Names[0]?.replace('/', '') || 'Unknown';
  
  // Extract ports
  const ports = container.Ports?.map(p => {
    if (p.PublicPort) {
      return `${p.PublicPort}:${p.PrivatePort}`;
    }
    return `${p.PrivatePort}`;
  }).join(', ') || 'Aucun';

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white truncate">{name}</h3>
          <p className="text-xs text-slate-400 truncate">{container.Id.substring(0, 12)}</p>
        </div>
        <span className={`status-badge ${isRunning ? 'status-running' : 'status-stopped'}`}>
          {container.State}
        </span>
      </div>

      <div className="space-y-2 text-sm text-slate-300 mb-4">
        <div className="flex justify-between">
          <span className="text-slate-400">Image:</span>
          <span className="truncate ml-2">{container.Image}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Ports:</span>
          <span className="text-xs font-mono">{ports}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Créé:</span>
          <span>{new Date(container.Created * 1000).toLocaleDateString('fr-FR')}</span>
        </div>
      </div>

      <div className="flex space-x-2">
        {!isRunning ? (
          <button onClick={() => onAction(container.Id, 'start')} className="btn btn-success flex-1">
            <Play size={16} className="inline mr-1" />
            Démarrer
          </button>
        ) : (
          <>
            <button onClick={() => onAction(container.Id, 'stop')} className="btn btn-danger flex-1">
              <Square size={16} className="inline mr-1" />
              Arrêter
            </button>
            <button onClick={() => onAction(container.Id, 'restart')} className="btn btn-secondary">
              <RotateCw size={16} />
            </button>
          </>
        )}
        <button
          onClick={() => {
            if (confirm('Êtes-vous sûr de vouloir supprimer ce conteneur ?')) {
              onAction(container.Id, 'remove');
            }
          }}
          className="btn btn-danger"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
