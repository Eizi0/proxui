import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Settings as SettingsIcon, Save, Server, Shield, Bell, 
  Database, Moon, Sun, Globe, Mail, Webhook, HardDrive,
  Check, AlertCircle, RefreshCw, Plus, Trash2, Edit2, X
} from 'lucide-react';
import Modal from '../components/Modal';
import { useApp } from '../contexts/AppContext';
import { translate } from '../i18n/translations';

export default function Settings() {
  const { reloadConfig, language } = useApp();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'general');
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [nodeFormData, setNodeFormData] = useState({
    name: '',
    host: '',
    user: 'root@pam',
    password: '',
    primary: false
  });
  const [config, setConfig] = useState({
    // General
    proxmoxHost: 'https://localhost:8006',
    proxmoxNode: 'proxmox',
    dockerEnabled: true,
    autoRefresh: true,
    refreshInterval: 5,
    
    // Language
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
    
    // Multi-node
    nodes: []
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
        const result = await response.json();
        
        // Recharger la config dans le contexte
        await reloadConfig();
        
        // Afficher un message de succès et proposer de recharger
        if (window.confirm(result.message + '\n\nRecharger la page pour appliquer tous les changements ?')) {
          window.location.reload();
        }
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

      const result = await response.json();
      alert(result.message || (response.ok ? '✅ Email de test envoyé !' : '❌ Erreur'));
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

      const result = await response.json();
      alert(result.message || (response.ok ? '✅ Connexion PBS réussie !' : '❌ Erreur'));
    } catch (error) {
      console.error('Error testing PBS:', error);
      alert('❌ Erreur lors du test PBS');
    }
  };

  // Node management functions
  const handleAddNode = () => {
    setEditingNode(null);
    setNodeFormData({
      name: '',
      host: '',
      user: 'root@pam',
      password: '',
      primary: false
    });
    setShowNodeModal(true);
  };

  const handleEditNode = (node, index) => {
    setEditingNode(index);
    setNodeFormData({ ...node });
    setShowNodeModal(true);
  };

  const handleDeleteNode = (index) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce node ?')) {
      const newNodes = config.nodes.filter((_, i) => i !== index);
      setConfig(prev => ({ ...prev, nodes: newNodes }));
    }
  };

  const handleSaveNode = () => {
    if (!nodeFormData.name || !nodeFormData.host) {
      alert('Nom et hôte sont requis');
      return;
    }

    let newNodes = [...config.nodes];
    
    if (editingNode !== null) {
      newNodes[editingNode] = nodeFormData;
    } else {
      newNodes.push(nodeFormData);
    }

    // Si ce node est marqué comme primary, retirer primary des autres
    if (nodeFormData.primary) {
      newNodes = newNodes.map((n, i) => ({
        ...n,
        primary: editingNode !== null ? i === editingNode : i === newNodes.length - 1
      }));
    }

    setConfig(prev => ({ ...prev, nodes: newNodes }));
    setShowNodeModal(false);
  };

  const handleSetPrimaryNode = (index) => {
    const newNodes = config.nodes.map((n, i) => ({
      ...n,
      primary: i === index
    }));
    setConfig(prev => ({ ...prev, nodes: newNodes }));
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proxmox-600"></div>
    </div>;
  }

  const tabs = [
    { id: 'general', name: translate('settings.general', language), icon: Server },
    { id: 'nodes', name: translate('settings.nodes', language), icon: HardDrive },
    { id: 'backup', name: translate('settings.backup', language), icon: Database },
    { id: 'language', name: translate('settings.language', language), icon: Globe },
    { id: 'notifications', name: translate('settings.notifications', language), icon: Bell },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">{translate('settings.title', language)}</h2>
        <p className="text-slate-400">{translate('settings.subtitle', language)}</p>
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

        {/* Nodes Tab */}
        {activeTab === 'nodes' && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center">
                    <HardDrive className="mr-2" size={24} />
                    Gestion Multi-Node
                  </h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Gérez plusieurs serveurs Proxmox depuis une seule interface
                  </p>
                </div>
                <button onClick={handleAddNode} className="btn btn-primary">
                  <Plus size={16} className="mr-2" />
                  Ajouter un Node
                </button>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-300 text-sm">
                      Ajoutez plusieurs serveurs Proxmox pour les gérer depuis une seule interface centralisée.
                      Vous pouvez marquer un node comme principal (primary) qui sera utilisé par défaut.
                    </p>
                  </div>
                </div>
              </div>

              {config.nodes.length === 0 ? (
                <div className="text-center py-12 bg-slate-700/30 rounded-lg border border-slate-700">
                  <HardDrive size={48} className="mx-auto text-slate-600 mb-4" />
                  <p className="text-slate-400 text-lg mb-2">Aucun node configuré</p>
                  <p className="text-slate-500 text-sm mb-4">
                    Ajoutez des serveurs Proxmox pour une gestion multi-node
                  </p>
                  <button onClick={handleAddNode} className="btn btn-primary">
                    <Plus size={16} className="mr-2" />
                    Ajouter le premier node
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {config.nodes.map((node, index) => (
                    <div key={index} className="bg-slate-700/30 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="text-white font-semibold text-lg">{node.name}</h4>
                            {node.primary && (
                              <span className="status-badge status-running text-xs">
                                Primary
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-slate-400">Hôte</p>
                              <p className="text-white font-mono">{node.host}</p>
                            </div>
                            <div>
                              <p className="text-slate-400">Utilisateur</p>
                              <p className="text-white font-mono">{node.user}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          {!node.primary && (
                            <button
                              onClick={() => handleSetPrimaryNode(index)}
                              className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                              title="Définir comme principal"
                            >
                              <Check size={18} className="text-green-400" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditNode(node, index)}
                            className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                            title="Modifier"
                          >
                            <Edit2 size={18} className="text-blue-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteNode(index)}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={18} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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

        {/* Language Tab */}
        {activeTab === 'language' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Globe className="mr-2" size={24} />
                Langue de l'interface
              </h3>
              
              <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-300 text-sm">
                      Le changement de langue s'applique à l'ensemble de l'interface, y compris les menus et le contenu des pages.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setConfig(prev => ({ ...prev, language: 'fr' }))}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      config.language === 'fr'
                        ? 'border-proxmox-500 bg-proxmox-500/10'
                        : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                    }`}
                  >
                    <div className="text-4xl mb-3">🇫🇷</div>
                    <p className="text-white font-medium text-lg">Français</p>
                    <p className="text-slate-400 text-sm">Langue française</p>
                  </button>

                  <button
                    onClick={() => setConfig(prev => ({ ...prev, language: 'en' }))}
                    className={`p-6 rounded-lg border-2 transition-all ${
                      config.language === 'en'
                        ? 'border-proxmox-500 bg-proxmox-500/10'
                        : 'border-slate-600 bg-slate-700/30 hover:border-slate-500'
                    }`}
                  >
                    <div className="text-4xl mb-3">🇬🇧</div>
                    <p className="text-white font-medium text-lg">English</p>
                    <p className="text-slate-400 text-sm">English language</p>
                  </button>
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

      {/* Node Modal */}
      {showNodeModal && (
        <Modal 
          isOpen={showNodeModal} 
          onClose={() => setShowNodeModal(false)} 
          title={editingNode !== null ? 'Modifier le Node' : 'Ajouter un Node'}
          size="lg"
        >
          <div className="space-y-4">
            <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-3">
              <p className="text-slate-300 text-sm">
                Ajoutez un serveur Proxmox VE pour étendre votre infrastructure.
              </p>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-2">Nom du Node</label>
              <input
                type="text"
                value={nodeFormData.name}
                onChange={(e) => setNodeFormData({...nodeFormData, name: e.target.value})}
                placeholder="pve-cluster-01"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                required
              />
              <p className="text-slate-500 text-xs mt-1">Nom descriptif pour identifier ce node</p>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-2">Hôte (URL complète)</label>
              <input
                type="text"
                value={nodeFormData.host}
                onChange={(e) => setNodeFormData({...nodeFormData, host: e.target.value})}
                placeholder="https://192.168.1.100:8006"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                required
              />
              <p className="text-slate-500 text-xs mt-1">URL complète avec protocole et port</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-2">Utilisateur</label>
                <input
                  type="text"
                  value={nodeFormData.user}
                  onChange={(e) => setNodeFormData({...nodeFormData, user: e.target.value})}
                  placeholder="root@pam"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-2">Mot de passe</label>
                <input
                  type="password"
                  value={nodeFormData.password}
                  onChange={(e) => setNodeFormData({...nodeFormData, password: e.target.value})}
                  placeholder="••••••••"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
                  required
                />
              </div>
            </div>

            <div className="flex items-center p-4 bg-slate-700/30 rounded-lg">
              <input
                type="checkbox"
                checked={nodeFormData.primary}
                onChange={(e) => setNodeFormData({...nodeFormData, primary: e.target.checked})}
                className="w-4 h-4 text-proxmox-600 bg-slate-700 border-slate-600 rounded"
              />
              <label className="ml-3 text-slate-300">
                Définir comme node principal
                <span className="block text-slate-500 text-xs">Ce node sera utilisé par défaut</span>
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
              <button 
                onClick={() => setShowNodeModal(false)} 
                className="btn btn-secondary"
              >
                Annuler
              </button>
              <button 
                onClick={handleSaveNode} 
                className="btn btn-primary"
              >
                <Check size={16} className="mr-2" />
                {editingNode !== null ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
