import { useState } from 'react';
import { Rocket, Server, HardDrive, Cpu, MemoryStick } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { translate } from '../i18n/translations';

export default function DeployVM() {
  const { language } = useApp();
  const [formData, setFormData] = useState({
    vmid: '',
    name: '',
    osType: 'linux',
    cores: 2,
    memory: 2048,
    disk: 32,
    network: 'vmbr0',
    storage: 'local-lvm',
    iso: '',
    startOnBoot: false,
    startAfterCreate: true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Deploying VM:', formData);
    // TODO: Implémenter l'API de création de VM
    alert(translate('deployvm.inDevelopment', language));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">{translate('deployvm.title', language)}</h2>
        <p className="text-slate-400">{translate('deployvm.subtitle', language)}</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        <div className="card space-y-6">
          {/* General Info */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <Server className="mr-2" size={20} />
              {translate('deployvm.generalInfo', language)}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {translate('deployvm.vmid', language)}
                </label>
                <input
                  type="number"
                  name="vmid"
                  value={formData.vmid}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  placeholder="100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {translate('deployvm.name', language)}
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  placeholder="my-vm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  {translate('deployvm.osType', language)}
                </label>
                <select
                  name="osType"
                  value={formData.osType}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                >
                  <option value="linux">Linux</option>
                  <option value="windows">Windows</option>
                  <option value="other">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  ISO Image
                </label>
                <select
                  name="iso"
                  value={formData.iso}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                >
                  <option value="">Sélectionner une ISO</option>
                  <option value="ubuntu-22.04.iso">Ubuntu 22.04</option>
                  <option value="debian-12.iso">Debian 12</option>
                  <option value="windows-server-2022.iso">Windows Server 2022</option>
                </select>
              </div>
            </div>
          </div>

          {/* Hardware */}
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <Cpu className="mr-2" size={20} />
              Configuration Matérielle
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  CPU Cores
                </label>
                <input
                  type="number"
                  name="cores"
                  value={formData.cores}
                  onChange={handleChange}
                  min="1"
                  max="32"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mémoire (MB)
                </label>
                <input
                  type="number"
                  name="memory"
                  value={formData.memory}
                  onChange={handleChange}
                  min="512"
                  step="512"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Disque (GB)
                </label>
                <input
                  type="number"
                  name="disk"
                  value={formData.disk}
                  onChange={handleChange}
                  min="8"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                />
              </div>
            </div>
          </div>

          {/* Network & Storage */}
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <HardDrive className="mr-2" size={20} />
              Réseau & Stockage
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Bridge Réseau
                </label>
                <select
                  name="network"
                  value={formData.network}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                >
                  <option value="vmbr0">vmbr0</option>
                  <option value="vmbr1">vmbr1</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Storage
                </label>
                <select
                  name="storage"
                  value={formData.storage}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                >
                  <option value="local-lvm">local-lvm</option>
                  <option value="local">local</option>
                </select>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-lg font-bold text-white mb-4">Options</h3>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="startOnBoot"
                  checked={formData.startOnBoot}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-proxmox-600 focus:ring-proxmox-500"
                />
                <span className="text-slate-300">Démarrer au boot</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="startAfterCreate"
                  checked={formData.startAfterCreate}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-proxmox-600 focus:ring-proxmox-500"
                />
                <span className="text-slate-300">Démarrer après création</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="border-t border-slate-700 pt-6 flex space-x-4">
            <button type="submit" className="btn btn-primary">
              <Rocket className="inline mr-2" size={16} />
              Créer la VM
            </button>
            <button type="button" className="btn btn-secondary">
              Annuler
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
