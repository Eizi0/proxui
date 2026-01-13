import { useState, useEffect } from 'react';
import { Play, Square, RotateCw, Trash2, Container } from 'lucide-react';

export default function Docker() {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    checkDocker();
    fetchContainers();
  }, []);

  const checkDocker = async () => {
    try {
      const response = await fetch('/api/docker/status');
      const data = await response.json();
      setAvailable(data.available);
    } catch (error) {
      setAvailable(false);
    }
  };

  const fetchContainers = async () => {
    try {
      const response = await fetch('/api/docker/containers');
      const data = await response.json();
      setContainers(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching Docker containers:', error);
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      const method = action === 'remove' ? 'DELETE' : 'POST';
      await fetch(`/api/docker/containers/${id}/${action}`, { method });
      setTimeout(fetchContainers, 1000);
    } catch (error) {
      console.error(`Error ${action} container:`, error);
    }
  };

  if (!available) {
    return (
      <div className="card text-center py-12">
        <Container className="mx-auto text-slate-600 mb-4" size={48} />
        <h3 className="text-xl font-bold text-white mb-2">Docker non disponible</h3>
        <p className="text-slate-400">
          Docker n'est pas accessible. Vérifiez que le socket Docker est monté.
        </p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proxmox-600"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Conteneurs Docker</h2>
        <p className="text-slate-400">Gérez vos conteneurs Docker sur l'hôte</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {containers.map((container) => (
          <DockerCard key={container.Id} container={container} onAction={handleAction} />
        ))}
      </div>

      {containers.length === 0 && (
        <div className="card text-center py-12">
          <Container className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400">Aucun conteneur Docker trouvé</p>
        </div>
      )}
    </div>
  );
}

function DockerCard({ container, onAction }) {
  const isRunning = container.State === 'running';
  const name = container.Names[0]?.replace('/', '') || 'Unknown';

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
          <span className="text-slate-400">Créé:</span>
          <span>{new Date(container.Created * 1000).toLocaleDateString('fr-FR')}</span>
        </div>
        {container.Ports && container.Ports.length > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-400">Ports:</span>
            <span className="text-xs">{container.Ports.length} port(s)</span>
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        {!isRunning ? (
          <button
            onClick={() => onAction(container.Id, 'start')}
            className="btn btn-success flex-1"
          >
            <Play size={16} className="inline mr-1" />
            Démarrer
          </button>
        ) : (
          <>
            <button
              onClick={() => onAction(container.Id, 'stop')}
              className="btn btn-danger flex-1"
            >
              <Square size={16} className="inline mr-1" />
              Arrêter
            </button>
            <button
              onClick={() => onAction(container.Id, 'restart')}
              className="btn btn-secondary"
            >
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
