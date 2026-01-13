import { useState } from 'react';
import { Box, Container, Rocket } from 'lucide-react';

export default function DeployContainer() {
  const [containerType, setContainerType] = useState('lxc');
  const [formData, setFormData] = useState({
    vmid: '',
    hostname: '',
    template: '',
    cores: 1,
    memory: 512,
    disk: 8,
    network: 'vmbr0',
    storage: 'local-lvm',
    password: '',
    unprivileged: true,
    startOnBoot: false,
    startAfterCreate: true,
  });

  const [dockerFormData, setDockerFormData] = useState({
    name: '',
    image: '',
    ports: '',
    volumes: '',
    env: '',
    command: '',
    restart: 'unless-stopped',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (containerType === 'lxc') {
      console.log('Deploying LXC:', formData);
      alert('⚠️ Fonction en développement\n\nLa création de containers LXC sera disponible prochainement via l\'API Proxmox.');
    } else {
      console.log('Deploying Docker:', dockerFormData);
      alert('⚠️ Fonction en développement\n\nLa création de containers Docker sera disponible prochainement.');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (containerType === 'lxc') {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    } else {
      setDockerFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Deploy Container</h2>
        <p className="text-slate-400">Créez un nouveau conteneur LXC ou Docker</p>
      </div>

      {/* Type Selection */}
      <div className="flex space-x-4">
        <button
          onClick={() => setContainerType('lxc')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            containerType === 'lxc'
              ? 'bg-proxmox-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <Box size={20} />
          <span>LXC Container</span>
        </button>
        <button
          onClick={() => setContainerType('docker')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            containerType === 'docker'
              ? 'bg-proxmox-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <Container size={20} />
          <span>Docker Container</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        {containerType === 'lxc' ? (
          <div className="card space-y-6">
            <h3 className="text-lg font-bold text-white">Configuration LXC</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">CT ID</label>
                <input
                  type="number"
                  name="vmid"
                  value={formData.vmid}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  placeholder="200"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Hostname</label>
                <input
                  type="text"
                  name="hostname"
                  value={formData.hostname}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  placeholder="my-container"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">Template</label>
                <select
                  name="template"
                  value={formData.template}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  required
                >
                  <option value="">Sélectionner un template</option>
                  <option value="ubuntu-22.04">Ubuntu 22.04</option>
                  <option value="debian-12">Debian 12</option>
                  <option value="alpine-3.18">Alpine 3.18</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">CPU Cores</label>
                <input
                  type="number"
                  name="cores"
                  value={formData.cores}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Mémoire (MB)</label>
                <input
                  type="number"
                  name="memory"
                  value={formData.memory}
                  onChange={handleChange}
                  min="256"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Disque (GB)</label>
                <input
                  type="number"
                  name="disk"
                  value={formData.disk}
                  onChange={handleChange}
                  min="4"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Mot de passe root</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-700 pt-6">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="unprivileged"
                  checked={formData.unprivileged}
                  onChange={handleChange}
                  className="w-5 h-5 rounded"
                />
                <span className="text-slate-300">Container non-privilégié (recommandé)</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="startAfterCreate"
                  checked={formData.startAfterCreate}
                  onChange={handleChange}
                  className="w-5 h-5 rounded"
                />
                <span className="text-slate-300">Démarrer après création</span>
              </label>
            </div>

            <div className="flex space-x-4 border-t border-slate-700 pt-6">
              <button type="submit" className="btn btn-primary">
                <Rocket className="inline mr-2" size={16} />
                Créer le Container LXC
              </button>
              <button type="button" className="btn btn-secondary">Annuler</button>
            </div>
          </div>
        ) : (
          <div className="card space-y-6">
            <h3 className="text-lg font-bold text-white">Configuration Docker</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Nom du container</label>
                <input
                  type="text"
                  name="name"
                  value={dockerFormData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  placeholder="my-app"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Image Docker</label>
                <input
                  type="text"
                  name="image"
                  value={dockerFormData.image}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  placeholder="nginx:latest"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Ports (ex: 80:80, 443:443)
                </label>
                <input
                  type="text"
                  name="ports"
                  value={dockerFormData.ports}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  placeholder="8080:80"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Volumes (ex: /host/path:/container/path)
                </label>
                <textarea
                  name="volumes"
                  value={dockerFormData.volumes}
                  onChange={handleChange}
                  rows="2"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  placeholder="/data:/app/data"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Variables d'environnement (une par ligne: KEY=VALUE)
                </label>
                <textarea
                  name="env"
                  value={dockerFormData.env}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  placeholder="ENV_VAR=value"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Restart Policy</label>
                <select
                  name="restart"
                  value={dockerFormData.restart}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                >
                  <option value="no">No</option>
                  <option value="always">Always</option>
                  <option value="unless-stopped">Unless Stopped</option>
                  <option value="on-failure">On Failure</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-4 border-t border-slate-700 pt-6">
              <button type="submit" className="btn btn-primary">
                <Rocket className="inline mr-2" size={16} />
                Créer le Container Docker
              </button>
              <button type="button" className="btn btn-secondary">Annuler</button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
