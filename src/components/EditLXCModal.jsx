import { useState, useEffect } from 'react';
import { X, Loader, Save, HardDrive, Cpu, MemoryStick } from 'lucide-react';

export default function EditLXCModal({ vmid, isOpen, onClose, onSave }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [formData, setFormData] = useState({
    cores: '',
    memory: '',
    swap: '',
    hostname: '',
    description: '',
    onboot: false,
    unprivileged: false,
  });

  useEffect(() => {
    if (isOpen && vmid) {
      fetchConfig();
    }
  }, [isOpen, vmid]);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/proxmox/lxc/${vmid}/config`);
      const data = await response.json();
      setConfig(data);
      setFormData({
        cores: data.cores || '',
        memory: data.memory || '',
        swap: data.swap || '',
        hostname: data.hostname || '',
        description: data.description || '',
        onboot: data.onboot === 1,
        unprivileged: data.unprivileged === 1,
      });
    } catch (error) {
      console.error('Error fetching LXC config:', error);
      alert('Erreur lors de la récupération de la configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      
      const updateData = {
        cores: parseInt(formData.cores),
        memory: parseInt(formData.memory),
        swap: parseInt(formData.swap),
        hostname: formData.hostname,
        description: formData.description,
        onboot: formData.onboot ? 1 : 0,
      };

      const response = await fetch(`/api/proxmox/lxc/${vmid}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la mise à jour');
      }

      alert('✅ Configuration mise à jour avec succès !');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating LXC config:', error);
      alert(`❌ Erreur: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Éditer Container {vmid}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="animate-spin text-proxmox-500" size={48} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-white flex items-center">
                <Cpu size={16} className="mr-2" />
                Informations générales
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Hostname
                </label>
                <input
                  type="text"
                  name="hostname"
                  value={formData.hostname}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="2"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                />
              </div>

              <div className="bg-slate-700 px-4 py-3 rounded-lg">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.unprivileged}
                    disabled
                    className="w-5 h-5 rounded opacity-50 cursor-not-allowed"
                  />
                  <div>
                    <span className="text-slate-300">Container non-privilégié</span>
                    <p className="text-xs text-slate-400 mt-1">
                      ⚠️ Ce paramètre ne peut pas être modifié après la création
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* CPU */}
            <div className="border-t border-slate-700 pt-6 space-y-4">
              <h4 className="text-sm font-medium text-white flex items-center">
                <Cpu size={16} className="mr-2" />
                Processeur
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nombre de cœurs
                </label>
                <input
                  type="number"
                  name="cores"
                  value={formData.cores}
                  onChange={handleChange}
                  min="1"
                  max="128"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  required
                />
              </div>
            </div>

            {/* Memory */}
            <div className="border-t border-slate-700 pt-6 space-y-4">
              <h4 className="text-sm font-medium text-white flex items-center">
                <MemoryStick size={16} className="mr-2" />
                Mémoire
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    RAM (MiB)
                  </label>
                  <input
                    type="number"
                    name="memory"
                    value={formData.memory}
                    onChange={handleChange}
                    min="16"
                    step="256"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Swap (MiB)
                  </label>
                  <input
                    type="number"
                    name="swap"
                    value={formData.swap}
                    onChange={handleChange}
                    min="0"
                    step="256"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                    required
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400">
                Mémoire actuelle: {config?.memory} MiB | Swap: {config?.swap} MiB
              </p>
            </div>

            {/* Options */}
            <div className="border-t border-slate-700 pt-6 space-y-4">
              <h4 className="text-sm font-medium text-white">Options</h4>
              
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="onboot"
                  checked={formData.onboot}
                  onChange={handleChange}
                  className="w-5 h-5 rounded"
                />
                <span className="text-slate-300">Démarrer au boot du node</span>
              </label>
            </div>

            {/* Disk Info */}
            {config && config.rootfs && (
              <div className="border-t border-slate-700 pt-6">
                <h4 className="text-sm font-medium text-white flex items-center mb-4">
                  <HardDrive size={16} className="mr-2" />
                  Disque racine (lecture seule)
                </h4>
                <div className="text-sm text-slate-300 bg-slate-700 px-3 py-2 rounded">
                  {config.rootfs}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  💡 Pour redimensionner le disque, utilisez l'option de resize dans le menu actions
                </p>
              </div>
            )}

            {/* Network Info */}
            {config && (
              <div className="border-t border-slate-700 pt-6">
                <h4 className="text-sm font-medium text-white mb-4">Réseau (lecture seule)</h4>
                <div className="space-y-2">
                  {Object.entries(config).map(([key, value]) => {
                    if (key.startsWith('net')) {
                      return (
                        <div key={key} className="text-sm text-slate-300 bg-slate-700 px-3 py-2 rounded">
                          <span className="font-medium">{key}:</span> {value}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex space-x-4 border-t border-slate-700 pt-6">
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader className="inline mr-2 animate-spin" size={16} />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="inline mr-2" size={16} />
                    Enregistrer les modifications
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Annuler
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
