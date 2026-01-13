import React, { useState, useEffect } from 'react';
import { Download, Upload, Search, Filter, Package, Container, HardDrive, ExternalLink, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';
import Modal from '../components/Modal';

export default function Downloads() {
  const [activeTab, setActiveTab] = useState('iso'); // iso, lxc, docker
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [storages, setStorages] = useState([]);
  const [selectedStorage, setSelectedStorage] = useState('');
  const [downloads, setDownloads] = useState([]);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    fetchConfig();
    fetchStorages();
    fetchDownloads();
    // Auto-refresh downloads status every 5 seconds
    const interval = setInterval(fetchDownloads, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/config/current');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Erreur chargement config:', error);
    }
  };

  const fetchStorages = async () => {
    try {
      const response = await fetch('/api/proxmox/storages');
      const data = await response.json();
      // Filter storages that support the current content type
      const filtered = data.filter(s => {
        if (activeTab === 'iso') return s.content?.includes('iso');
        if (activeTab === 'lxc') return s.content?.includes('vztmpl');
        return false;
      });
      setStorages(filtered);
      if (filtered.length > 0 && !selectedStorage) {
        setSelectedStorage(filtered[0].storage);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des storages:', error);
    }
  };

  const fetchDownloads = async () => {
    try {
      const response = await fetch('/api/downloads');
      const data = await response.json();
      setDownloads(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des téléchargements:', error);
    }
  };

  useEffect(() => {
    fetchStorages();
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Téléchargements</h2>
        <p className="text-slate-400">Gérez vos ISOs, Templates LXC et Images Docker</p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('iso')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'iso'
              ? 'text-proxmox-500 border-b-2 border-proxmox-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <HardDrive size={20} className="inline mr-2" />
          ISO Images
        </button>
        <button
          onClick={() => setActiveTab('lxc')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'lxc'
              ? 'text-proxmox-500 border-b-2 border-proxmox-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Package size={20} className="inline mr-2" />
          Templates LXC
        </button>
        <button
          onClick={() => setActiveTab('docker')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'docker'
              ? 'text-proxmox-500 border-b-2 border-proxmox-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Container size={20} className="inline mr-2" />
          Images Docker
        </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'iso' && <ISODownloader storage={selectedStorage} storages={storages} onStorageChange={setSelectedStorage} node={config?.proxmox?.node} />}
        {activeTab === 'lxc' && <LXCDownloader storage={selectedStorage} storages={storages} onStorageChange={setSelectedStorage} node={config?.proxmox?.node} />}
        {activeTab === 'docker' && <DockerDownloader />}
      </div>

      {/* Download Queue */}
      {downloads.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <Download size={20} className="mr-2" />
            Téléchargements en cours
          </h3>
          <div className="space-y-3">
            {downloads.map((download, index) => (
              <DownloadItem key={index} download={download} onRefresh={fetchDownloads} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ISO Downloader Component
function ISODownloader({ storage, storages, onStorageChange, node }) {
  const [url, setUrl] = useState('');
  const [filename, setFilename] = useState('');
  const [uploading, setUploading] = useState(false);
  const [existingISOs, setExistingISOs] = useState([]);
  const [loadingISOs, setLoadingISOs] = useState(false);

  useEffect(() => {
    if (storage && node) {
      fetchExistingISOs();
    }
  }, [storage, node]);

  const fetchExistingISOs = async () => {
    if (!storage || !node) return;
    setLoadingISOs(true);
    try {
      const response = await fetch(`/api/proxmox/storages/${storage}/content?node=${node}`);
      const data = await response.json();
      const isos = data.filter(item => item.content === 'iso');
      setExistingISOs(isos);
    } catch (error) {
      console.error('Erreur chargement ISOs:', error);
    } finally {
      setLoadingISOs(false);
    }
  };

  const popularISOs = [
    { name: 'Ubuntu 24.04 LTS Server', url: 'https://releases.ubuntu.com/24.04/ubuntu-24.04.1-live-server-amd64.iso', size: '2.6 GB' },
    { name: 'Ubuntu 22.04 LTS Server', url: 'https://releases.ubuntu.com/22.04/ubuntu-22.04.5-live-server-amd64.iso', size: '2.0 GB' },
    { name: 'Debian 12.8 netinst', url: 'https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/debian-12.8.0-amd64-netinst.iso', size: '650 MB' },
    { name: 'Rocky Linux 9.5', url: 'https://download.rockylinux.org/pub/rocky/9/isos/x86_64/Rocky-9.5-x86_64-minimal.iso', size: '1.9 GB' },
    { name: 'AlmaLinux 9.5', url: 'https://repo.almalinux.org/almalinux/9.5/isos/x86_64/AlmaLinux-9.5-x86_64-minimal.iso', size: '1.6 GB' },
    { name: 'Alpine Linux 3.21', url: 'https://dl-cdn.alpinelinux.org/alpine/v3.21/releases/x86_64/alpine-virt-3.21.0-x86_64.iso', size: '60 MB' },
  ];

  const handleDownload = async () => {
    if (!url || !storage) {
      alert('Veuillez renseigner une URL et sélectionner un storage');
      return;
    }

    setUploading(true);
    try {
      const response = await fetch('/api/downloads/iso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          storage,
          node,
          filename: filename || url.split('/').pop()
        })
      });

      if (response.ok) {
        setUrl('');
        setFilename('');
        alert('Téléchargement démarré !');
        // Refresh the list after a delay
        setTimeout(fetchExistingISOs, 2000);
      } else {
        alert('Erreur lors du démarrage du téléchargement');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du démarrage du téléchargement');
    } finally {
      setUploading(false);
    }
  };

  const handleQuickDownload = (iso) => {
    setUrl(iso.url);
    setFilename(iso.url.split('/').pop());
  };

  return (
    <div className="space-y-6">
      {/* Storage Selection */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Storage de destination</h3>
        <select
          value={storage}
          onChange={(e) => onStorageChange(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
        >
          {storages.map(s => (
            <option key={s.storage} value={s.storage}>{s.storage} ({s.type})</option>
          ))}
        </select>
      </div>

      {/* Manual Download */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Download size={20} className="mr-2" />
          Télécharger depuis une URL
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-slate-300 font-medium mb-2">URL de l'ISO</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/distro.iso"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-slate-300 font-medium mb-2">Nom du fichier (optionnel)</label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="mon-iso.iso"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            />
          </div>
          <button
            onClick={handleDownload}
            disabled={uploading || !url || !storage}
            className="btn btn-primary w-full"
          >
            <Download size={16} className="mr-2" />
            {uploading ? 'Démarrage...' : 'Télécharger'}
          </button>
        </div>
      </div>

      {/* Popular ISOs */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">ISOs populaires</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {popularISOs.map((iso, index) => (
            <div key={index} className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h4 className="text-white font-medium">{iso.name}</h4>
                <span className="text-xs text-slate-400">{iso.size}</span>
              </div>
              <button
                onClick={() => handleQuickDownload(iso)}
                className="btn btn-secondary btn-sm w-full mt-2"
              >
                <Download size={14} className="mr-1" />
                Télécharger
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Existing ISOs List */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <HardDrive size={20} className="mr-2" />
            ISOs disponibles dans {storage}
          </h3>
          <button
            onClick={fetchExistingISOs}
            disabled={loadingISOs}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} className={`mr-1 ${loadingISOs ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
        {loadingISOs ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-proxmox-600"></div>
          </div>
        ) : existingISOs.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            Aucune ISO trouvée dans ce storage
          </div>
        ) : (
          <div className="space-y-2">
            {existingISOs.map((iso, index) => (
              <div key={index} className="bg-slate-700/50 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <p className="text-white font-medium">{iso.volid?.split('/').pop() || iso.volid}</p>
                  <p className="text-slate-400 text-sm">{formatBytes(iso.size)}</p>
                </div>
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                  Disponible
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// LXC Downloader Component (Proxmox VE Helper Scripts)
function LXCDownloader({ storage, storages, onStorageChange, node }) {
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [existingTemplates, setExistingTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (storage && node) {
      fetchExistingTemplates();
    }
  }, [storage, node]);

  const fetchExistingTemplates = async () => {
    if (!storage || !node) return;
    setLoadingTemplates(true);
    try {
      const response = await fetch(`/api/proxmox/storages/${storage}/content?node=${node}`);
      const data = await response.json();
      const tmpls = data.filter(item => item.content === 'vztmpl');
      setExistingTemplates(tmpls);
    } catch (error) {
      console.error('Erreur chargement templates:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    filterTemplates();
  }, [searchTerm, category, templates]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/downloads/lxc-templates');
      const data = await response.json();
      setTemplates(data || []);
    } catch (error) {
      console.error('Erreur:', error);
      // Mock data for demo
      const mockTemplates = [
        { name: 'Ubuntu 22.04', category: 'os', description: 'Ubuntu 22.04 LTS', size: '150 MB', url: 'ubuntu-22.04-standard' },
        { name: 'Debian 12', category: 'os', description: 'Debian 12 (Bookworm)', size: '120 MB', url: 'debian-12-standard' },
        { name: 'Alpine Linux 3.19', category: 'os', description: 'Alpine Linux 3.19', size: '8 MB', url: 'alpine-3.19-default' },
        { name: 'Docker', category: 'app', description: 'Docker Engine', size: '200 MB', url: 'docker' },
        { name: 'Nginx Proxy Manager', category: 'app', description: 'Reverse proxy avec UI', size: '180 MB', url: 'nginx-proxy-manager' },
        { name: 'Portainer', category: 'app', description: 'Gestion Docker UI', size: '120 MB', url: 'portainer' },
        { name: 'Home Assistant', category: 'app', description: 'Domotique', size: '500 MB', url: 'homeassistant' },
        { name: 'Nextcloud', category: 'app', description: 'Cloud personnel', size: '400 MB', url: 'nextcloud' },
      ];
      setTemplates(mockTemplates);
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = [...templates];
    
    if (category !== 'all') {
      filtered = filtered.filter(t => t.category && t.category.toLowerCase() === category.toLowerCase());
    }
    
    if (searchTerm && searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(t => 
        (t.name && t.name.toLowerCase().includes(search)) ||
        (t.description && t.description.toLowerCase().includes(search)) ||
        (t.os && t.os.toLowerCase().includes(search))
      );
    }
    
    setFilteredTemplates(filtered);
  };

  const handleDownload = async (template) => {
    if (!storage) {
      alert('Veuillez sélectionner un storage');
      return;
    }

    try {
      const response = await fetch('/api/downloads/lxc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: template.url,
          storage,
          node
        })
      });

      if (response.ok) {
        alert(`Téléchargement de ${template.name} démarré !`);
        // Refresh the list after a delay
        setTimeout(fetchExistingTemplates, 2000);
      } else {
        alert('Erreur lors du démarrage du téléchargement');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du démarrage du téléchargement');
    }
  };

  return (
    <div className="space-y-6">
      {/* Storage Selection */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Storage de destination</h3>
        <select
          value={storage}
          onChange={(e) => onStorageChange(e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
        >
          {storages.map(s => (
            <option key={s.storage} value={s.storage}>{s.storage} ({s.type})</option>
          ))}
        </select>
      </div>

      {/* Search and Filter */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Search size={20} className="mr-2 text-proxmox-500" />
          Rechercher des templates
        </h3>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && filterTemplates()}
                placeholder="Rechercher un template (Ubuntu, Debian, Alpine...)..."
                className="w-full pl-10 pr-4 bg-slate-700 border border-slate-600 rounded-lg py-2 text-white placeholder-slate-400"
              />
            </div>
            <button
              onClick={filterTemplates}
              className="btn btn-primary"
              title="Rechercher"
            >
              <Search size={16} className="mr-2" />
              Rechercher
            </button>
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  filterTemplates();
                }}
                className="btn btn-secondary"
                title="Effacer la recherche"
              >
                <XCircle size={16} />
              </button>
            )}
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white min-w-[200px]"
          >
            <option value="all">Toutes les catégories</option>
            <option value="os">Systèmes d'exploitation</option>
            <option value="app">Applications</option>
          </select>
        </div>
        
        {/* Search Info */}
        {(searchTerm || category !== 'all') && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <p className="text-slate-400 text-sm">
              {filteredTemplates.length} template{filteredTemplates.length > 1 ? 's' : ''} trouvé{filteredTemplates.length > 1 ? 's' : ''}
              {searchTerm && ` pour "${searchTerm}"`}
              {category !== 'all' && ` dans "${category === 'os' ? 'Systèmes d\'exploitation' : 'Applications'}"`}
            </p>
          </div>
        )}
      </div>

      {/* Templates Grid */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center justify-between">
          <span className="flex items-center">
            <Package size={20} className="mr-2 text-proxmox-500" />
            Templates disponibles
          </span>
          {!loading && filteredTemplates.length > 0 && (
            <span className="text-sm text-slate-400 font-normal">
              {filteredTemplates.length} template{filteredTemplates.length > 1 ? 's' : ''}
            </span>
          )}
        </h3>
        
        {/* Scrollable container with max height for ~12-15 visible templates */}
        <div className="max-h-[680px] overflow-y-auto pr-2 custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proxmox-600"></div>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-400">
                Aucun template trouvé
              </div>
            ) : (
              filteredTemplates.map((template, index) => (
                <div key={index} className="card hover:border-proxmox-500 transition-colors cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <Package size={20} className="text-proxmox-500" />
                      <h3 className="text-white font-semibold text-sm">{template.name}</h3>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      template.category === 'os' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                      {template.category === 'os' ? 'OS' : 'APP'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-3 line-clamp-2">{template.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">{template.size}</span>
                    <button
                      onClick={() => handleDownload(template)}
                      className="btn btn-primary btn-sm"
                    >
                      <Download size={14} className="mr-1" />
                      Télécharger
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Existing Templates List */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Package size={20} className="mr-2" />
            Templates disponibles dans {storage}
          </h3>
          <button
            onClick={fetchExistingTemplates}
            disabled={loadingTemplates}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} className={`mr-1 ${loadingTemplates ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
        {loadingTemplates ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-proxmox-600"></div>
          </div>
        ) : existingTemplates.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            Aucun template trouvé dans ce storage
          </div>
        ) : (
          <div className="space-y-2">
            {existingTemplates.map((tmpl, index) => (
              <div key={index} className="bg-slate-700/50 rounded-lg p-3 flex justify-between items-center">
                <div>
                  <p className="text-white font-medium">{tmpl.volid?.split('/').pop() || tmpl.volid}</p>
                  <p className="text-slate-400 text-sm">{formatBytes(tmpl.size)}</p>
                </div>
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                  Disponible
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to format pull count
function formatPullCount(count) {
  if (!count) return '0';
  if (count >= 1000000000) return `${(count / 1000000000).toFixed(1)}B`;
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toString();
}

// Docker Downloader Component (Docker Hub)
function DockerDownloader() {
  const [searchTerm, setSearchTerm] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showTagsModal, setShowTagsModal] = useState(false);

  const popularImages = [
    { name: 'nginx', description: 'Official Nginx web server', pulls: '1B+', official: true },
    { name: 'postgres', description: 'PostgreSQL database', pulls: '1B+', official: true },
    { name: 'redis', description: 'In-memory data store', pulls: '1B+', official: true },
    { name: 'mysql', description: 'MySQL database server', pulls: '1B+', official: true },
    { name: 'node', description: 'Node.js runtime', pulls: '1B+', official: true },
    { name: 'python', description: 'Python programming language', pulls: '1B+', official: true },
  ];

  const searchDockerHub = async () => {
    if (!searchTerm || !searchTerm.trim()) {
      alert('Veuillez entrer un terme de recherche');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`/api/downloads/docker/search?q=${encodeURIComponent(searchTerm.trim())}`);
      
      if (!response.ok) {
        throw new Error('Erreur de recherche');
      }
      
      const data = await response.json();
      console.log('Résultats Docker Hub:', data);
      
      // Docker Hub API returns { results: [...] }
      if (data && data.results && Array.isArray(data.results)) {
        setImages(data.results);
      } else if (Array.isArray(data)) {
        setImages(data);
      } else {
        console.error('Format inattendu:', data);
        setImages([]);
        alert('Aucun résultat trouvé');
      }
    } catch (error) {
      console.error('Erreur recherche Docker:', error);
      alert('Erreur lors de la recherche: ' + error.message);
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
    setShowTagsModal(true);
  };

  const handlePull = async (imageName, tag = 'latest') => {
    try {
      const response = await fetch('/api/downloads/docker/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageName, tag })
      });

      if (response.ok) {
        alert(`Pull de ${imageName}:${tag} démarré !`);
      } else {
        alert('Erreur lors du pull');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors du pull');
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Rechercher sur Docker Hub</h3>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchDockerHub()}
              placeholder="Rechercher une image Docker..."
              className="w-full pl-10 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
            />
          </div>
          <button
            onClick={searchDockerHub}
            disabled={loading}
            className="btn btn-primary"
          >
            <Search size={16} className="mr-2" />
            Rechercher
          </button>
        </div>
      </div>

      {/* Popular Images */}
      {!searchTerm && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Images populaires</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {popularImages.map((image, index) => (
              <div key={index} className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Container size={20} className="text-blue-400" />
                    <h4 className="text-white font-semibold">{image.name}</h4>
                  </div>
                  {image.official && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                      Official
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-sm mb-2">{image.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">{image.pulls} pulls</span>
                  <button
                    onClick={() => handleImageClick({
                      ...image,
                      repo_name: image.name,
                      short_description: image.description,
                      is_official: image.official
                    })}
                    className="btn btn-primary btn-sm"
                  >
                    <Download size={14} className="mr-1" />
                    Pull
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {images.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">
            Résultats de recherche ({images.length})
          </h3>
          <div className="space-y-3">
            {images.map((image, index) => {
              // Docker Hub API returns repo_name, not name
              const imageName = image.repo_name || image.name;
              const imageDescription = image.short_description || image.description || 'Pas de description';
              
              return (
                <div key={index} className="bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition-colors flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Container size={18} className="text-blue-400" />
                      <h4 className="text-white font-semibold">{imageName}</h4>
                      {image.is_official && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Official</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm line-clamp-2">{imageDescription}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                      <span>⭐ {image.star_count || 0}</span>
                      <span>📥 {formatPullCount(image.pull_count)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleImageClick({ ...image, name: imageName })}
                    className="btn btn-primary btn-sm ml-4"
                  >
                    <Download size={14} className="mr-1" />
                    Pull
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Loading State */}
      {loading && (
        <div className="card">
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proxmox-600"></div>
            <span className="ml-4 text-slate-400">Recherche en cours...</span>
          </div>
        </div>
      )}
      
      {/* No Results */}
      {!loading && searchTerm && images.length === 0 && (
        <div className="card">
          <div className="text-center py-12">
            <Container size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">Aucun résultat pour "{searchTerm}"</p>
          </div>
        </div>
      )}

      {/* Tags Modal */}
      {showTagsModal && (
        <DockerTagsModal
          image={selectedImage}
          isOpen={showTagsModal}
          onClose={() => setShowTagsModal(false)}
          onPull={handlePull}
        />
      )}
    </div>
  );
}

// Download Item Component
function DownloadItem({ download, onRefresh }) {
  const getStatusIcon = () => {
    if (download.status === 'completed') return <CheckCircle className="text-green-500" size={20} />;
    if (download.status === 'error') return <XCircle className="text-red-500" size={20} />;
    return <Clock className="text-yellow-500" size={20} />;
  };

  const getStatusText = () => {
    if (download.status === 'completed') return 'Terminé';
    if (download.status === 'error') return 'Erreur';
    return 'En cours';
  };

  return (
    <div className="bg-slate-700/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <div>
            <h4 className="text-white font-medium">{download.filename}</h4>
            <p className="text-slate-400 text-sm">{download.storage || download.type}</p>
          </div>
        </div>
        <span className={`text-sm px-3 py-1 rounded ${
          download.status === 'completed' ? 'bg-green-500/20 text-green-400' :
          download.status === 'error' ? 'bg-red-500/20 text-red-400' :
          'bg-yellow-500/20 text-yellow-400'
        }`}>
          {getStatusText()}
        </span>
      </div>
      {download.progress !== undefined && download.status === 'downloading' && (
        <div className="mt-2">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>{download.progress}%</span>
            <span>{download.speed || ''}</span>
          </div>
          <div className="w-full bg-slate-600 rounded-full h-2">
            <div
              className="bg-proxmox-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${download.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Docker Tags Modal
function DockerTagsModal({ image, isOpen, onClose, onPull }) {
  const [tags, setTags] = useState(['latest', 'stable', 'alpine', 'slim']);
  const [selectedTag, setSelectedTag] = useState('latest');
  const [loadingTags, setLoadingTags] = useState(false);

  // Get image name from either repo_name or name field
  const imageName = image?.repo_name || image?.name || 'Unknown';
  const imageDescription = image?.short_description || image?.description || 'Pas de description disponible';

  // Load actual tags from Docker Hub when modal opens
  React.useEffect(() => {
    if (isOpen && image) {
      loadDockerTags();
    }
  }, [isOpen, image]);

  const loadDockerTags = async () => {
    setLoadingTags(true);
    try {
      // Try to fetch real tags from Docker Hub API
      let repoName = image.repo_name || image.name;
      
      // For official images, add 'library/' prefix
      if (image.is_official && !repoName.includes('/')) {
        repoName = `library/${repoName}`;
      }
      
      const response = await fetch(`https://registry.hub.docker.com/v2/repositories/${repoName}/tags?page_size=15`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const tagNames = data.results.map(t => t.name);
          setTags(tagNames);
          console.log(`✅ ${tagNames.length} tags chargés pour ${repoName}`);
        }
      }
    } catch (error) {
      console.log('Impossible de charger les tags, utilisation des tags par défaut:', error.message);
    } finally {
      setLoadingTags(false);
    }
  };

  const handlePull = () => {
    onPull(imageName, selectedTag);
    onClose();
  };

  const formatBytes = (bytes) => {
    if (!bytes) return 'N/A';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Docker Image: ${imageName}`} size="lg">
      <div className="space-y-4">
        {/* Image Info */}
        <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-white font-semibold text-lg mb-1">{imageName}</h3>
              <p className="text-slate-400 text-sm">{imageDescription}</p>
            </div>
            {image?.is_official && (
              <span className="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
                Official
              </span>
            )}
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-600">
            <div>
              <p className="text-slate-500 text-xs mb-1">Stars</p>
              <p className="text-white font-medium">⭐ {image?.star_count?.toLocaleString() || '0'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-1">Pulls</p>
              <p className="text-white font-medium">📥 {formatPullCount(image?.pull_count)}</p>
            </div>
          </div>
        </div>

        {/* Tag Selection */}
        <div>
          <label className="block text-slate-300 font-medium mb-2">
            Sélectionner un tag
            {loadingTags && <span className="text-slate-500 text-sm ml-2">(Chargement...)</span>}
          </label>
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            disabled={loadingTags}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white disabled:opacity-50"
          >
            {tags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          <p className="text-slate-500 text-xs mt-1">
            {tags.length} tag{tags.length > 1 ? 's' : ''} disponible{tags.length > 1 ? 's' : ''}
          </p>
        </div>

        {/* Command Preview */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <p className="text-slate-400 text-xs mb-2">Commande Docker</p>
          <div className="flex items-center justify-between">
            <code className="text-green-400 text-sm font-mono">
              docker pull {imageName}:{selectedTag}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`docker pull ${imageName}:${selectedTag}`);
                alert('Commande copiée !');
              }}
              className="text-slate-400 hover:text-white transition-colors"
              title="Copier la commande"
            >
              📋
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-700">
          <button onClick={onClose} className="btn btn-secondary">
            Annuler
          </button>
          <button onClick={handlePull} className="btn btn-primary" disabled={loadingTags}>
            <Download size={16} className="mr-2" />
            Pull Image
          </button>
        </div>
      </div>
    </Modal>
  );
}
