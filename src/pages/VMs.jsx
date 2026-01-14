import { useState, useEffect } from 'react';
import { Play, Square, RotateCw, Server, Settings } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { translate } from '../i18n/translations';
import EditVMModal from '../components/EditVMModal';

export default function VMs() {
  const { language } = useApp();
  const [vms, setVMs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingVM, setEditingVM] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchVMs();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchVMs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchVMs = async () => {
    try {
      const response = await fetch('/api/proxmox/vms');
      const data = await response.json();
      setVMs(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching VMs:', error);
      setLoading(false);
    }
  };

  const handleAction = async (vmid, action) => {
    try {
      await fetch(`/api/proxmox/vms/${vmid}/${action}`, { method: 'POST' });
      setTimeout(fetchVMs, 1000);
    } catch (error) {
      console.error(`Error ${action} VM:`, error);
    }
  };

  const handleEdit = (vmid) => {
    setEditingVM(vmid);
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    fetchVMs();
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
          <h2 className="text-3xl font-bold text-white mb-2">{translate('vms.title', language)}</h2>
          <p className="text-slate-400">{translate('vms.subtitle', language)}</p>
        </div>
        <button className="btn btn-primary">
          <Server className="inline mr-2" size={16} />
          {translate('vms.create', language)}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vms.map((vm) => (
          <VMCard key={vm.vmid} vm={vm} onAction={handleAction} onEdit={handleEdit} language={language} />
        ))}
      </div>

      {vms.length === 0 && (
        <div className="card text-center py-12">
          <Server className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400">{translate('vms.none', language)}</p>
        </div>
      )}

      <EditVMModal
        vmid={editingVM}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
      />
    </div>
  );
}

function VMCard({ vm, onAction, onEdit, language }) {
  const isRunning = vm.status === 'running';

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white">{vm.name}</h3>
          <p className="text-sm text-slate-400">{translate('common.id', language)}: {vm.vmid}</p>
        </div>
        <span className={`status-badge ${isRunning ? 'status-running' : 'status-stopped'}`}>
          {isRunning ? translate('vms.status.running', language) : translate('vms.status.stopped', language)}
        </span>
      </div>

      <div className="space-y-2 text-sm text-slate-300 mb-4">
        <div className="flex justify-between">
          <span className="text-slate-400">CPU:</span>
          <span>{vm.cpus || 0} vCPU</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Mémoire:</span>
          <span>{Math.round((vm.maxmem || 0) / 1024 / 1024 / 1024)} GB</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Disque:</span>
          <span>{Math.round((vm.maxdisk || 0) / 1024 / 1024 / 1024)} GB</span>
        </div>
        {vm.agent && vm['net0'] && (
          <div className="flex justify-between">
            <span className="text-slate-400">IP:</span>
            <span className="text-xs font-mono">{vm['net0'] || 'N/A'}</span>
          </div>
        )}
        {isRunning && vm.cpu && (
          <div className="flex justify-between">
            <span className="text-slate-400">CPU Usage:</span>
            <span>{(vm.cpu * 100).toFixed(1)}%</span>
          </div>
        )}
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() => onEdit(vm.vmid)}
          className="btn btn-secondary"
          title="Éditer la configuration"
        >
          <Settings size={16} />
        </button>
        {!isRunning ? (
          <button
            onClick={() => onAction(vm.vmid, 'start')}
            className="btn btn-success flex-1"
          >
            <Play size={16} className="inline mr-1" />
            Démarrer
          </button>
        ) : (
          <>
            <button
              onClick={() => onAction(vm.vmid, 'shutdown')}
              className="btn btn-danger flex-1"
            >
              <Square size={16} className="inline mr-1" />
              Arrêter
            </button>
            <button
              onClick={() => onAction(vm.vmid, 'reboot')}
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
