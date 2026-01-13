import { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Save, Server, Shield, Bell, 
  Database, Moon, Sun, Globe, Mail, Webhook, HardDrive,
  Check, AlertCircle, RefreshCw
} from 'lucide-react';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [config, setConfig] = useState({
    // General
    proxmoxHost: 'https://localhost:8006',
    proxmoxNode: 'proxmox',
    dockerEnabled: true,
    autoRefresh: true,
    refreshInterval: 5,
    
    // Theme & Language
    theme: 'dark',
    language: 'fr',
    
    // Proxmox Backup Server
    pbsEnabled: false,
    pbsHost: '',
    pbsDatastore: '',
    pbsUsername: '',
    pbsPassword: '',
    
    // Notifications
    notificationsEnabled: true,
    notificationType: 'email', // email, webhook, none
    
    // Email SMTP
    smtpHost: '',
    smtpPort: 587,
    smtpSecure: true,
    smtpUser: '',
    smtpPassword: '',
    smtpFrom: '',
    smtpTo: '',
    
    // Webhook
    webhookUrl: '',
    webhookSecret: '',
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/config');
      const data = await response.json();
      setConfig(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        alert('✅ Configuration enregistrée avec succès !');
      } else {
        const error = await response.json();
        alert('❌ Erreur: ' + (error.message || 'Impossible de sauvegarder'));
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('❌ Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const testEmailConfig = async () => {
    try {
      const response = await fetch('/api/config/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost: config.smtpHost,
          smtpPort: config.smtpPort,
          smtpSecure: config.smtpSecure,
          smtpUser: config.smtpUser,
          smtpPassword: config.smtpPassword,
          smtpFrom: config.smtpFrom,
          smtpTo: config.smtpTo
        })
      });

      if (response.ok) {
        alert('✅ Email de test envoyé avec succès !');
      } else {
        const error = await response.json();
        alert('❌ Erreur: ' + (error.message || 'Échec de l\'envoi'));
      }
    } catch (error) {
      console.error('Error testing email:', error);
      alert('❌ Erreur lors du test email');
    }
  };

  const testPBSConnection = async () => {
    try {
      const response = await fetch('/api/config/test-pbs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pbsHost: config.pbsHost,
          pbsDatastore: config.pbsDatastore,
          pbsUsername: config.pbsUsername,
          pbsPassword: config.pbsPassword
        })
      });

      if (response.ok) {
        alert('✅ Connexion PBS réussie !');
      } else {
        const error = await response.json();
        alert('❌ Erreur: ' + (error.message || 'Échec de connexion'));
      }
    } catch (error) {
      console.error('Error testing PBS:', error);
      alert('❌ Erreur lors du test PBS');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proxmox-600"></div>
    </div>;
  }

  const tabs = [
    { id: 'general', name: 'Général', icon: Server },
    { id: 'backup', name: 'Backup PBS', icon: Database },
    { id: 'appearance', name: 'Apparence', icon: Moon },
    { id: 'notifications', name: 'Notifications', icon: Bell },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Paramètres</h2>
        <p className="text-slate-400">Configurez votre instance ProxUI</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700">
        <div className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 pb-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-proxmox-500 text-proxmox-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-4xl">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Server className="mr-2" size={24} />
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
                    placeholder="https://192.168.1.100:8006"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  />
                  <p className="text-slate-500 text-xs mt-1">URL complète de votre serveur Proxmox VE</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Node par défaut
                  </label>
                  <input
                    type="text"
                    name="proxmoxNode"
                    value={config.proxmoxNode}
                    onChange={handleChange}
                    placeholder="proxmox"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  />
                  <p className="text-slate-500 text-xs mt-1">Nom du node Proxmox principal</p>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Gestion Docker</p>
                    <p className="text-slate-400 text-sm">Activer les fonctionnalités Docker</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="dockerEnabled"
                      checked={config.dockerEnabled}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-proxmox-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Rafraîchissement automatique</p>
                    <p className="text-slate-400 text-sm">Actualiser automatiquement les données</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="autoRefresh"
                      checked={config.autoRefresh}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-proxmox-600"></div>
                  </label>
                </div>

                {config.autoRefresh && (
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
                )}
              </div>
            </div>
          </div>
        )}

        {/* Backup PBS Tab */}
        {activeTab === 'backup' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Database className="mr-2" size={24} />
                Proxmox Backup Server (PBS)
              </h3>
              
              <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-300 text-sm">
                      Configurez votre Proxmox Backup Server pour bénéficier de la déduplication,
                      de la vérification d'intégrité et du chiffrement des backups.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Activer PBS</p>
                    <p className="text-slate-400 text-sm">Utiliser Proxmox Backup Server</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="pbsEnabled"
                      checked={config.pbsEnabled}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-proxmox-600"></div>
                  </label>
                </div>

                {config.pbsEnabled && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Hôte PBS
                      </label>
                      <input
                        type="text"
                        name="pbsHost"
                        value={config.pbsHost}
                        onChange={handleChange}
                        placeholder="192.168.1.200:8007"
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                      />
                      <p className="text-slate-500 text-xs mt-1">IP:Port du serveur PBS</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Datastore
                      </label>
                      <input
                        type="text"
                        name="pbsDatastore"
                        value={config.pbsDatastore}
                        onChange={handleChange}
                        placeholder="backups"
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                      />
                      <p className="text-slate-500 text-xs mt-1">Nom du datastore PBS</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Nom d'utilisateur
                        </label>
                        <input
                          type="text"
                          name="pbsUsername"
                          value={config.pbsUsername}
                          onChange={handleChange}
                          placeholder="backup@pbs"
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Mot de passe
                        </label>
                        <input
                          type="password"
                          name="pbsPassword"
                          value={config.pbsPassword}
                          onChange={handleChange}
                          placeholder="••••••••"
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                        />
                      </div>
                    </div>

                    <button onClick={testPBSConnection} className="btn btn-secondary w-full">
                      <Check size={16} className="mr-2" />
                      Tester la connexion PBS
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Appearance Tab */}
        {activeTab === 'appearance' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Moon className="mr-2" size={24} />
                Apparence
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Thème
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setConfig(prev => ({ ...prev, theme: 'dark' }))}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        config.theme === 'dark'
                          ? 'border-proxmox-500 bg-proxmox-500/10'
                          : 'border-slate-600 bg-slate-700/30'
                      }`}
                    >
                      <Moon size={32} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-white font-medium">Sombre</p>
                      <p className="text-slate-400 text-sm">Thème par défaut</p>
                    </button>

                    <button
                      onClick={() => setConfig(prev => ({ ...prev, theme: 'light' }))}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        config.theme === 'light'
                          ? 'border-proxmox-500 bg-proxmox-500/10'
                          : 'border-slate-600 bg-slate-700/30'
                      }`}
                    >
                      <Sun size={32} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-white font-medium">Clair</p>
                      <p className="text-slate-400 text-sm">Thème lumineux</p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Langue
                  </label>
                  <select
                    name="language"
                    value={config.language}
                    onChange={handleChange}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  >
                    <option value="fr">🇫🇷 Français</option>
                    <option value="en">🇬🇧 English</option>
                    <option value="es">🇪🇸 Español</option>
                    <option value="de">🇩🇪 Deutsch</option>
                    <option value="it">🇮🇹 Italiano</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Bell className="mr-2" size={24} />
                Notifications
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                  <div>
                    <p className="text-white font-medium">Activer les notifications</p>
                    <p className="text-slate-400 text-sm">Recevoir des alertes sur les événements</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="notificationsEnabled"
                      checked={config.notificationsEnabled}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-proxmox-600"></div>
                  </label>
                </div>

                {config.notificationsEnabled && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-3">
                        Type de notification
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={() => setConfig(prev => ({ ...prev, notificationType: 'email' }))}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            config.notificationType === 'email'
                              ? 'border-proxmox-500 bg-proxmox-500/10'
                              : 'border-slate-600 bg-slate-700/30'
                          }`}
                        >
                          <Mail size={32} className="mx-auto mb-2 text-slate-300" />
                          <p className="text-white font-medium">Email (SMTP)</p>
                          <p className="text-slate-400 text-sm">Notifications par email</p>
                        </button>

                        <button
                          onClick={() => setConfig(prev => ({ ...prev, notificationType: 'webhook' }))}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            config.notificationType === 'webhook'
                              ? 'border-proxmox-500 bg-proxmox-500/10'
                              : 'border-slate-600 bg-slate-700/30'
                          }`}
                        >
                          <Webhook size={32} className="mx-auto mb-2 text-slate-300" />
                          <p className="text-white font-medium">Webhook</p>
                          <p className="text-slate-400 text-sm">API externe</p>
                        </button>
                      </div>
                    </div>

                    {/* Email SMTP Configuration */}
                    {config.notificationType === 'email' && (
                      <div className="space-y-4 p-4 bg-slate-700/20 rounded-lg border border-slate-700">
                        <h4 className="text-white font-semibold flex items-center">
                          <Mail size={18} className="mr-2" />
                          Configuration SMTP
                        </h4>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Serveur SMTP
                            </label>
                            <input
                              type="text"
                              name="smtpHost"
                              value={config.smtpHost}
                              onChange={handleChange}
                              placeholder="smtp.gmail.com"
                              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Port
                            </label>
                            <input
                              type="number"
                              name="smtpPort"
                              value={config.smtpPort}
                              onChange={handleChange}
                              placeholder="587"
                              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                          <div>
                            <p className="text-white text-sm font-medium">Connexion sécurisée (TLS)</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              name="smtpSecure"
                              checked={config.smtpSecure}
                              onChange={handleChange}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-proxmox-600"></div>
                          </label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Utilisateur SMTP
                            </label>
                            <input
                              type="text"
                              name="smtpUser"
                              value={config.smtpUser}
                              onChange={handleChange}
                              placeholder="user@example.com"
                              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Mot de passe
                            </label>
                            <input
                              type="password"
                              name="smtpPassword"
                              value={config.smtpPassword}
                              onChange={handleChange}
                              placeholder="••••••••"
                              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Email expéditeur
                            </label>
                            <input
                              type="email"
                              name="smtpFrom"
                              value={config.smtpFrom}
                              onChange={handleChange}
                              placeholder="proxui@example.com"
                              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                              Email destinataire
                            </label>
                            <input
                              type="email"
                              name="smtpTo"
                              value={config.smtpTo}
                              onChange={handleChange}
                              placeholder="admin@example.com"
                              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                            />
                          </div>
                        </div>

                        <button onClick={testEmailConfig} className="btn btn-secondary w-full">
                          <Mail size={16} className="mr-2" />
                          Envoyer un email de test
                        </button>
                      </div>
                    )}

                    {/* Webhook Configuration */}
                    {config.notificationType === 'webhook' && (
                      <div className="space-y-4 p-4 bg-slate-700/20 rounded-lg border border-slate-700">
                        <h4 className="text-white font-semibold flex items-center">
                          <Webhook size={18} className="mr-2" />
                          Configuration Webhook
                        </h4>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            URL du Webhook
                          </label>
                          <input
                            type="url"
                            name="webhookUrl"
                            value={config.webhookUrl}
                            onChange={handleChange}
                            placeholder="https://hooks.example.com/notifications"
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                          />
                          <p className="text-slate-500 text-xs mt-1">Discord, Slack, Teams, ou API personnalisée</p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Secret (optionnel)
                          </label>
                          <input
                            type="password"
                            name="webhookSecret"
                            value={config.webhookSecret}
                            onChange={handleChange}
                            placeholder="••••••••"
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                          />
                          <p className="text-slate-500 text-xs mt-1">Pour authentifier les requêtes</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex space-x-4 pt-6 border-t border-slate-700">
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? (
              <>
                <RefreshCw className="inline mr-2 animate-spin" size={16} />
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
            onClick={loadConfig}
            className="btn btn-secondary"
          >
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  );
}
