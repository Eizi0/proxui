import { useState, useEffect } from 'react';
import { Box, Container, Rocket, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { translate } from '../i18n/translations';

export default function DeployContainer() {
  const { language } = useApp();
  const navigate = useNavigate();
  const [containerType, setContainerType] = useState('lxc');
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [storages, setStorages] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [networks, setNetworks] = useState([]);
  
  const [formData, setFormData] = useState({
    node: '',
    vmid: '',
    hostname: '',
    ostemplate: '',
    cores: 1,
    memory: 512,
    swap: 512,
    rootfs: '',
    storage: '',
    disk: 8,
    bridge: 'vmbr0',
    ip: 'dhcp',
    password: '',
    unprivileged: true,
    startOnBoot: false,
    startAfterCreate: true,
    features: {
      nesting: false,
      keyctl: false,
    },
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

  const [stackFormData, setStackFormData] = useState({
    name: '',
    composeYaml: `version: '3.8'
services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
    networks:
      - webnet
    restart: unless-stopped

networks:
  webnet:
    driver: bridge`,
  });

  // Fetch nodes on mount
  useEffect(() => {
    fetchNodes();
  }, []);

  // Fetch storages and networks when node changes
  useEffect(() => {
    if (formData.node) {
      fetchStorages(formData.node);
      fetchTemplates(formData.node);
      fetchNetworks(formData.node);
    }
  }, [formData.node]);

  const fetchNodes = async () => {
    try {
      const response = await fetch('/api/proxmox/nodes');
      const data = await response.json();
      setNodes(data);
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, node: data[0].node }));
      }
    } catch (error) {
      console.error('Error fetching nodes:', error);
      alert('Erreur lors de la récupération des nodes');
    }
  };

  const fetchStorages = async (node) => {
    try {
      const response = await fetch(`/api/proxmox/nodes/${node}/storage`);
      const data = await response.json();
      // Filter storages that support container rootfs
      const containerStorages = data.filter(s => 
        s.content?.includes('rootdir') || 
        s.type === 'dir' || 
        s.type === 'lvm' || 
        s.type === 'lvmthin' ||
        s.type === 'zfspool'
      );
      setStorages(containerStorages);
      if (containerStorages.length > 0) {
        setFormData(prev => ({ ...prev, storage: containerStorages[0].storage }));
      }
    } catch (error) {
      console.error('Error fetching storages:', error);
    }
  };

  const fetchTemplates = async (node) => {
    try {
      setLoadingTemplates(true);
      const response = await fetch(`/api/proxmox/nodes/${node}/storage`);
      const data = await response.json();
      
      // Find storages that can contain templates
      const templateStorages = data.filter(s => 
        s.content?.includes('vztmpl') || 
        s.type === 'dir'
      );

      // Fetch templates from all template storages
      const allTemplates = [];
      for (const storage of templateStorages) {
        try {
          const contentResponse = await fetch(`/api/proxmox/nodes/${node}/storage/${storage.storage}/content?content=vztmpl`);
          const templates = await contentResponse.json();
          templates.forEach(template => {
            allTemplates.push({
              ...template,
              storageName: storage.storage
            });
          });
        } catch (error) {
          console.error(`Error fetching templates from ${storage.storage}:`, error);
        }
      }
      
      setTemplates(allTemplates);
      console.log(`Found ${allTemplates.length} templates across ${templateStorages.length} storages`);
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const fetchNetworks = async (node) => {
    try {
      const response = await fetch(`/api/proxmox/nodes/${node}/network`);
      const data = await response.json();
      // Filter only bridge interfaces
      const bridges = data.filter(net => net.type === 'bridge');
      setNetworks(bridges);
    } catch (error) {
      console.error('Error fetching networks:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (containerType === 'lxc') {
      try {
        setLoading(true);
        
        // Prepare LXC config
        const config = {
          vmid: parseInt(formData.vmid),
          hostname: formData.hostname,
          ostemplate: formData.ostemplate,
          cores: parseInt(formData.cores),
          memory: parseInt(formData.memory),
          swap: parseInt(formData.swap),
          rootfs: `${formData.storage}:${formData.disk}`,
          net0: `name=eth0,bridge=${formData.bridge},ip=${formData.ip},firewall=1`,
          password: formData.password,
          unprivileged: formData.unprivileged ? 1 : 0,
          onboot: formData.startOnBoot ? 1 : 0,
          start: formData.startAfterCreate ? 1 : 0,
          features: Object.entries(formData.features)
            .filter(([_, value]) => value)
            .map(([key, _]) => key)
            .join(',') || undefined,
        };

        const response = await fetch(`/api/proxmox/nodes/${formData.node}/lxc`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(config),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erreur lors de la création du container');
        }

        alert('✅ Container LXC créé avec succès !');
        navigate('/containers');
      } catch (error) {
        console.error('Error creating LXC:', error);
        alert(`❌ Erreur: ${error.message}`);
      } finally {
        setLoading(false);
      }
    } else if (containerType === 'docker') {
      // Docker container creation
      try {
        setLoading(true);
        
        // First check if image exists, if not pull it
        const imageCheckResponse = await fetch('/api/docker/images');
        const images = await imageCheckResponse.json();
        const imageExists = images.some(img => 
          img.RepoTags && img.RepoTags.includes(dockerFormData.image)
        );

        if (!imageExists) {
          const confirmPull = window.confirm(
            `L'image ${dockerFormData.image} n'est pas disponible localement.\n\nVoulez-vous la télécharger ? Cela peut prendre quelques minutes.`
          );
          
          if (confirmPull) {
            alert('📥 Téléchargement de l\'image en cours...\n\nCela peut prendre quelques minutes.');
            
            const pullResponse = await fetch('/api/docker/images/pull', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ image: dockerFormData.image }),
            });

            if (!pullResponse.ok) {
              const error = await pullResponse.json();
              throw new Error(error.error || 'Erreur lors du téléchargement de l\'image');
            }
            
            alert('✅ Image téléchargée avec succès !');
          } else {
            setLoading(false);
            return;
          }
        }

        // Create container
        const response = await fetch('/api/docker/containers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dockerFormData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erreur lors de la création du container Docker');
        }

        const result = await response.json();
        alert(`✅ Container Docker créé avec succès !\n\nID: ${result.Id?.substring(0, 12)}\nNom: ${dockerFormData.name}`);
        navigate('/containers');
      } catch (error) {
        console.error('Error creating Docker container:', error);
        alert(`❌ Erreur: ${error.message}`);
      } finally {
        setLoading(false);
      }
    } else {
      // Docker Stack deployment
      try {
        setLoading(true);
        
        // Parse the compose YAML
        const parsedCompose = parseComposeYaml(stackFormData.composeYaml);
        
        // Add stack name
        parsedCompose.name = stackFormData.name;
        
        // Deploy stack
        const response = await fetch('/api/docker/stacks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(parsedCompose),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erreur lors du déploiement du stack');
        }

        const result = await response.json();
        alert(`✅ Stack Docker déployé avec succès !\n\nNom: ${stackFormData.name}\nServices: ${Object.keys(parsedCompose.services).length}\nContainers: ${result.resources.containers.length}`);
        navigate('/containers');
      } catch (error) {
        console.error('Error deploying Docker stack:', error);
        alert(`❌ Erreur: ${error.message}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (containerType === 'lxc') {
      if (name.startsWith('features.')) {
        const featureName = name.split('.')[1];
        setFormData(prev => ({
          ...prev,
          features: {
            ...prev.features,
            [featureName]: checked
          }
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [name]: type === 'checkbox' ? checked : value
        }));
      }
    } else if (containerType === 'docker') {
      setDockerFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      // Stack
      setStackFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const parseComposeYaml = (yamlText) => {
    // Simple YAML parser for our needs
    try {
      const lines = yamlText.split('\n');
      const result = {
        services: {},
        networks: {},
        volumes: {}
      };
      
      let currentSection = null;
      let currentService = null;
      let currentKey = null;
      let indentLevel = 0;

      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;

        const indent = line.search(/\S/);
        
        // Top level sections
        if (indent === 0 && trimmed.endsWith(':')) {
          const section = trimmed.slice(0, -1);
          if (section === 'services' || section === 'networks' || section === 'volumes') {
            currentSection = section;
            currentService = null;
          }
          return;
        }

        // Service name
        if (currentSection === 'services' && indent === 2 && trimmed.endsWith(':')) {
          currentService = trimmed.slice(0, -1);
          result.services[currentService] = {};
          return;
        }

        // Service properties
        if (currentService && indent === 4) {
          if (trimmed.includes(':')) {
            const [key, ...valueParts] = trimmed.split(':');
            const value = valueParts.join(':').trim();
            currentKey = key.trim();
            
            if (currentKey === 'ports' || currentKey === 'volumes' || currentKey === 'networks' || currentKey === 'environment') {
              result.services[currentService][currentKey] = value ? [value] : [];
            } else if (value) {
              result.services[currentService][currentKey] = value.replace(/['"]/g, '');
            }
          }
        }

        // Array items
        if (currentService && indent === 6 && trimmed.startsWith('-')) {
          const value = trimmed.slice(1).trim().replace(/['"]/g, '');
          if (currentKey && Array.isArray(result.services[currentService][currentKey])) {
            result.services[currentService][currentKey].push(value);
          }
        }

        // Networks
        if (currentSection === 'networks' && indent === 2 && trimmed.endsWith(':')) {
          const networkName = trimmed.slice(0, -1);
          result.networks[networkName] = { driver: 'bridge' };
        }

        // Volumes
        if (currentSection === 'volumes' && indent === 2 && trimmed.endsWith(':')) {
          const volumeName = trimmed.slice(0, -1);
          result.volumes[volumeName] = { driver: 'local' };
        }
      });

      return result;
    } catch (error) {
      console.error('Error parsing YAML:', error);
      throw new Error('Erreur lors du parsing du fichier YAML');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">{translate('deploycontainer.title', language)}</h2>
        <p className="text-slate-400">{translate('deploycontainer.subtitle', language)}</p>
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
          <span>{translate('deploycontainer.lxc', language)}</span>
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
        <button
          onClick={() => setContainerType('stack')}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
            containerType === 'stack'
              ? 'bg-proxmox-600 text-white'
              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          <Container size={20} />
          <span>Docker Stack</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl">
        {containerType === 'lxc' ? (
          <div className="card space-y-6">
            <h3 className="text-lg font-bold text-white">Configuration LXC</h3>
            
            {/* Node & Identification */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Node</label>
                <select
                  name="node"
                  value={formData.node}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  required
                >
                  {nodes.map(node => (
                    <option key={node.node} value={node.node}>{node.node}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">CT ID</label>
                <input
                  type="number"
                  name="vmid"
                  value={formData.vmid}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  placeholder="200"
                  min="100"
                  required
                />
              </div>
              <div className="md:col-span-2">
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
            </div>

            {/* Template Selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-300">
                  Template LXC
                </label>
                <button
                  type="button"
                  onClick={() => formData.node && fetchTemplates(formData.node)}
                  disabled={!formData.node || loadingTemplates}
                  className="text-xs text-proxmox-500 hover:text-proxmox-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Loader size={12} className={`mr-1 ${loadingTemplates ? 'animate-spin' : ''}`} />
                  {loadingTemplates ? 'Chargement...' : 'Rafraîchir'}
                </button>
              </div>
              <select
                name="ostemplate"
                value={formData.ostemplate}
                onChange={handleChange}
                disabled={loadingTemplates}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500 disabled:opacity-50"
                required
              >
                <option value="">Sélectionner un template</option>
                {templates.length === 0 && !loadingTemplates && (
                  <option disabled>Aucun template trouvé</option>
                )}
                {loadingTemplates && (
                  <option disabled>Chargement des templates...</option>
                )}
                {(() => {
                  // Grouper les templates par storage
                  const groupedTemplates = {};
                  templates.forEach(tpl => {
                    const storage = tpl.storageName || 'unknown';
                    if (!groupedTemplates[storage]) {
                      groupedTemplates[storage] = [];
                    }
                    groupedTemplates[storage].push(tpl);
                  });

                  // Afficher par groupe
                  return Object.entries(groupedTemplates).map(([storage, storageTemplates]) => (
                    <optgroup key={storage} label={`📁 ${storage}`}>
                      {storageTemplates.map(tpl => {
                        const filename = tpl.volid.split('/')[1] || tpl.volid;
                        const size = tpl.size ? ` (${(tpl.size / (1024 * 1024 * 1024)).toFixed(2)} GB)` : '';
                        return (
                          <option key={tpl.volid} value={tpl.volid}>
                            {filename}{size}
                          </option>
                        );
                      })}
                    </optgroup>
                  ));
                })()}
              </select>
              {templates.length === 0 && !loadingTemplates && (
                <p className="text-xs text-slate-400 mt-2">
                  💡 Astuce: Téléchargez des templates via la page Downloads
                </p>
              )}
            </div>
            {/* CPU & Memory */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-700 pt-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">CPU Cores</label>
                <input
                  type="number"
                  name="cores"
                  value={formData.cores}
                  onChange={handleChange}
                  min="1"
                  max="128"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Mémoire (MiB)</label>
                <input
                  type="number"
                  name="memory"
                  value={formData.memory}
                  onChange={handleChange}
                  min="16"
                  step="256"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Swap (MiB)</label>
                <input
                  type="number"
                  name="swap"
                  value={formData.swap}
                  onChange={handleChange}
                  min="0"
                  step="256"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                />
              </div>
            </div>

            {/* Storage & Disk */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-700 pt-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Storage</label>
                <select
                  name="storage"
                  value={formData.storage}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  required
                >
                  <option value="">Sélectionner un storage</option>
                  {storages.map(storage => (
                    <option key={storage.storage} value={storage.storage}>
                      {storage.storage} ({storage.type})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Taille du disque (GiB)</label>
                <input
                  type="number"
                  name="disk"
                  value={formData.disk}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                />
              </div>
            </div>

            {/* Network */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-700 pt-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Bridge réseau</label>
                <select
                  name="bridge"
                  value={formData.bridge}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  required
                >
                  {networks.length === 0 ? (
                    <option value="vmbr0">vmbr0 (défaut)</option>
                  ) : (
                    networks.map(net => (
                      <option key={net.iface} value={net.iface}>
                        {net.iface} {net.comments ? `(${net.comments})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Configuration IP
                </label>
                <select
                  name="ip"
                  value={formData.ip}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                >
                  <option value="dhcp">DHCP</option>
                  <option value="manual">Manuel (à configurer après)</option>
                </select>
              </div>
            </div>

            {/* Password */}
            <div className="border-t border-slate-700 pt-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">Mot de passe root</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                placeholder="Entrez un mot de passe sécurisé"
                required
              />
            </div>

            {/* Options */}
            <div className="space-y-3 border-t border-slate-700 pt-6">
              <h4 className="text-sm font-medium text-white mb-3">Options</h4>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="unprivileged"
                  checked={formData.unprivileged}
                  onChange={handleChange}
                  className="w-5 h-5 rounded"
                />
                <div>
                  <span className="text-slate-300">Container non-privilégié</span>
                  <p className="text-xs text-slate-400">Recommandé pour la sécurité</p>
                </div>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="startOnBoot"
                  checked={formData.startOnBoot}
                  onChange={handleChange}
                  className="w-5 h-5 rounded"
                />
                <span className="text-slate-300">Démarrer au boot du node</span>
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

            {/* Features */}
            <div className="space-y-3 border-t border-slate-700 pt-6">
              <h4 className="text-sm font-medium text-white mb-3">Fonctionnalités avancées</h4>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="features.nesting"
                  checked={formData.features.nesting}
                  onChange={handleChange}
                  className="w-5 h-5 rounded"
                />
                <div>
                  <span className="text-slate-300">Nesting</span>
                  <p className="text-xs text-slate-400">Permet d'exécuter des containers dans le container</p>
                </div>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="features.keyctl"
                  checked={formData.features.keyctl}
                  onChange={handleChange}
                  className="w-5 h-5 rounded"
                />
                <div>
                  <span className="text-slate-300">Keyctl</span>
                  <p className="text-xs text-slate-400">Active la gestion des clés du noyau</p>
                </div>
              </label>
            </div>

            <div className="flex space-x-4 border-t border-slate-700 pt-6">
              <button 
                type="submit" 
                disabled={loading}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="inline mr-2 animate-spin" size={16} />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <Rocket className="inline mr-2" size={16} />
                    Créer le Container LXC
                  </>
                )}
              </button>
              <button 
                type="button" 
                onClick={() => navigate('/containers')}
                className="btn btn-secondary"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : containerType === 'docker' ? (
          <div className="card space-y-6">
            <h3 className="text-lg font-bold text-white">Configuration Docker</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nom du container *
                </label>
                <input
                  type="text"
                  name="name"
                  value={dockerFormData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  placeholder="my-app"
                  pattern="[a-zA-Z0-9][a-zA-Z0-9_.-]*"
                  title="Le nom doit commencer par une lettre ou un chiffre et ne peut contenir que des lettres, chiffres, tirets, points et underscores"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  Le nom du container (lettres, chiffres, -, _, .)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Image Docker *
                </label>
                <input
                  type="text"
                  name="image"
                  value={dockerFormData.image}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  placeholder="nginx:latest"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  Exemples: nginx:latest, postgres:15, node:18-alpine
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Ports (optionnel)
                </label>
                <input
                  type="text"
                  name="ports"
                  value={dockerFormData.ports}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  placeholder="8080:80, 8443:443"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Format: port_hôte:port_container, séparés par des virgules
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Volumes (optionnel)
                </label>
                <textarea
                  name="volumes"
                  value={dockerFormData.volumes}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  placeholder="/opt/data:/app/data&#10;/opt/config:/etc/app"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Un volume par ligne. Format: /chemin/hôte:/chemin/container
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Variables d'environnement (optionnel)
                </label>
                <textarea
                  name="env"
                  value={dockerFormData.env}
                  onChange={handleChange}
                  rows="4"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  placeholder="DATABASE_URL=postgresql://user:pass@host:5432/db&#10;API_KEY=your-api-key&#10;NODE_ENV=production"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Une variable par ligne. Format: CLE=valeur
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Commande (optionnel)
                </label>
                <input
                  type="text"
                  name="command"
                  value={dockerFormData.command}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  placeholder="/bin/sh -c 'npm start'"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Commande à exécuter au démarrage (écrase la commande par défaut)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Politique de redémarrage
                </label>
                <select
                  name="restart"
                  value={dockerFormData.restart}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                >
                  <option value="no">No - Ne jamais redémarrer</option>
                  <option value="always">Always - Toujours redémarrer</option>
                  <option value="unless-stopped">Unless Stopped - Sauf si arrêté manuellement</option>
                  <option value="on-failure">On Failure - Seulement en cas d'erreur</option>
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Détermine quand Docker doit redémarrer automatiquement le container
                </p>
              </div>
            </div>

            <div className="flex space-x-4 border-t border-slate-700 pt-6">
              <button 
                type="submit" 
                disabled={loading}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="inline mr-2 animate-spin" size={16} />
                    {dockerFormData.image && !dockerFormData.image.includes('latest') 
                      ? 'Téléchargement...' 
                      : 'Création en cours...'}
                  </>
                ) : (
                  <>
                    <Rocket className="inline mr-2" size={16} />
                    Créer le Container Docker
                  </>
                )}
              </button>
              <button 
                type="button" 
                onClick={() => navigate('/containers')}
                className="btn btn-secondary"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <div className="card space-y-6">
            <h3 className="text-lg font-bold text-white">Configuration Docker Stack (Compose)</h3>
            <p className="text-slate-400 text-sm">
              Déployez plusieurs containers interconnectés avec Docker Compose
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nom du Stack *
                </label>
                <input
                  type="text"
                  name="name"
                  value={stackFormData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  placeholder="my-stack"
                  pattern="[a-z0-9][a-z0-9_-]*"
                  title="Le nom doit être en minuscules et ne peut contenir que des lettres, chiffres, tirets et underscores"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  Le nom du stack (minuscules, chiffres, -, _)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Docker Compose YAML *
                </label>
                <textarea
                  name="composeYaml"
                  value={stackFormData.composeYaml}
                  onChange={handleChange}
                  rows="20"
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500 font-mono text-sm"
                  placeholder="Collez votre fichier docker-compose.yml ici"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  Format Docker Compose YAML (version 3.x)
                </p>
              </div>

              <div className="bg-slate-800 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-white mb-2">💡 Exemple de Stack</h4>
                <pre className="text-xs text-slate-300 overflow-x-auto">
{`version: '3.8'
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: secret
    volumes:
      - db-data:/var/lib/postgresql/data
    networks:
      - backend
    restart: unless-stopped

  web:
    image: nginx:latest
    ports:
      - "8080:80"
    networks:
      - frontend
      - backend
    restart: unless-stopped

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge

volumes:
  db-data:
    driver: local`}
                </pre>
              </div>
            </div>

            <div className="flex space-x-4 border-t border-slate-700 pt-6">
              <button 
                type="submit" 
                disabled={loading}
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader className="inline mr-2 animate-spin" size={16} />
                    Déploiement en cours...
                  </>
                ) : (
                  <>
                    <Rocket className="inline mr-2" size={16} />
                    Déployer le Stack
                  </>
                )}
              </button>
              <button 
                type="button" 
                onClick={() => navigate('/containers')}
                className="btn btn-secondary"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
