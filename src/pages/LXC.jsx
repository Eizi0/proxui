import { useState, useEffect } from 'react';
import { Play, Square, RotateCw, Box } from 'lucide-react';

export default function LXC() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContainers();
  }, []);

  const fetchContainers = async () => {
    try {
      const response = await fetch('/api/proxmox/lxc');
      const data = await response.json();
      setContainers(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching LXC containers:', error);
      setLoading(false);
    }
  };

  const handleAction = async (vmid, action) => {
    try {
      await fetch(`/api/proxmox/lxc/${vmid}/${action}`, { method: 'POST' });
      setTimeout(fetchContainers, 1000);
    } catch (error) {
      console.error(`Error ${action} LXC:`, error);
    }
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
          <h2 className="text-3xl font-bold text-white mb-2">Conteneurs LXC</h2>
          <p className="text-slate-400">Gérez vos conteneurs LXC Proxmox</p>
        </div>
        <button className="btn btn-primary">
          <Box className="inline mr-2" size={16} />
          Créer un LXC
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {containers.map((container) => (
          <LXCCard key={container.vmid} container={container} onAction={handleAction} />
        ))}
      </div>

      {containers.length === 0 && (
        <div className="card text-center py-12">
          <Box className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400">Aucun conteneur LXC trouvé</p>
        </div>
      )}
    </div>
  );
}

function LXCCard({ container, onAction }) {
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
        {isRunning && container.cpu && (
          <div className="flex justify-between">
            <span className="text-slate-400">CPU Usage:</span>
            <span>{(container.cpu * 100).toFixed(1)}%</span>
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        {!isRunning ? (
          <button
            onClick={() => onAction(container.vmid, 'start')}
            className="btn btn-success flex-1"
          >
            <Play size={16} className="inline mr-1" />
            Démarrer
          </button>
        ) : (
          <>
            <button
              onClick={() => onAction(container.vmid, 'shutdown')}
              className="btn btn-danger flex-1"
            >
              <Square size={16} className="inline mr-1" />
              Arrêter
            </button>
            <button
              onClick={() => onAction(container.vmid, 'reboot')}
              className="btn btn-secondary"
            >
              <RotateCw size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
