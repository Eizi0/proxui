import { useState } from 'react';
import { Settings as SettingsIcon, Save, Server, Shield, Bell } from 'lucide-react';

export default function Settings() {
  const [config, setConfig] = useState({
    proxmoxHost: 'https://192.168.1.100:8006',
    proxmoxNode: 'pve',
    dockerEnabled: true,
    autoRefresh: true,
    refreshInterval: 5,
    theme: 'dark',
    notifications: true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = () => {
    console.log('Saving settings:', config);
    alert('Settings saved successfully!');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Settings</h2>
        <p className="text-slate-400">Configurez votre instance ProxUI</p>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Proxmox Configuration */}
        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <Server className="mr-2" />
            Configuration Proxmox
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Proxmox Host
              </label>
              <input
                type="text"
                name="proxmoxHost"
                value={config.proxmoxHost}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Default Node
              </label>
              <input
                type="text"
                name="proxmoxNode"
                value={config.proxmoxNode}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
              />
            </div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                name="dockerEnabled"
                checked={config.dockerEnabled}
                onChange={handleChange}
                className="w-5 h-5 rounded"
              />
              <span className="text-slate-300">Activer la gestion Docker</span>
            </label>
          </div>
        </div>

        {/* Interface Configuration */}
        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <SettingsIcon className="mr-2" />
            Interface
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Intervalle de rafraîchissement (secondes)
              </label>
              <input
                type="number"
                name="refreshInterval"
                value={config.refreshInterval}
                onChange={handleChange}
                min="1"
                max="60"
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Thème
              </label>
              <select
                name="theme"
                value={config.theme}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
              >
                <option value="dark">Sombre</option>
                <option value="light">Clair</option>
              </select>
            </div>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                name="autoRefresh"
                checked={config.autoRefresh}
                onChange={handleChange}
                className="w-5 h-5 rounded"
              />
              <span className="text-slate-300">Rafraîchissement automatique</span>
            </label>
          </div>
        </div>

        {/* Notifications */}
        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <Bell className="mr-2" />
            Notifications
          </h3>
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                name="notifications"
                checked={config.notifications}
                onChange={handleChange}
                className="w-5 h-5 rounded"
              />
              <span className="text-slate-300">Activer les notifications</span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex space-x-4">
          <button onClick={handleSave} className="btn btn-primary">
            <Save className="inline mr-2" size={16} />
            Enregistrer les modifications
          </button>
          <button className="btn btn-secondary">Réinitialiser</button>
        </div>
      </div>
    </div>
  );
}
