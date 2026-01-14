import { useState, useEffect } from 'react';
import { Rocket, Server, HardDrive, Cpu, MemoryStick, Network, AlertCircle, Loader, Cloud } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { translate } from '../i18n/translations';
import { useNavigate } from 'react-router-dom';

export default function DeployVM() {
  const { language } = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingISOs, setLoadingISOs] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [storages, setStorages] = useState([]);
  const [isos, setIsos] = useState([]);
  const [networks, setNetworks] = useState([]);
  
  const [formData, setFormData] = useState({
    // General
    node: '',
    vmid: '',
    name: '',
    
    // OS
    ostype: 'l26',
    iso: 'none',
    
    // System
    machine: 'q35',
    bios: 'seabios',
    scsihw: 'virtio-scsi-pci',
    
    // CPU
    cores: 2,
    sockets: 1,
    cpu: 'host',
    
    // Memory
    memory: 2048,
    balloon: 0,
    
    // Disk
    storage: '',
    diskSize: 32,
    cache: 'none',
    iothread: true,
    discard: 'on',
    ssd: false,
    
    // Network
    bridge: 'vmbr0',
    model: 'virtio',
    firewall: false,
    vlan: '',
    rate: '',
    
    // Options
    startOnBoot: false,
    startAfterCreate: true,
    agent: true,
    protection: false,
    
    // Cloud-init (optionnel)
    ciuser: '',
    cipassword: '',
    sshkeys: '',
    ipconfig: '',
  });

  // Fetch data on mount
  useEffect(() => {
    fetchNodes();
  }, []);

  useEffect(() => {
    if (formData.node) {
      fetchStorages(formData.node);
      fetchISOs(formData.node);
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
    }
  };

  const fetchStorages = async (node) => {
    try {
      const response = await fetch(`/api/proxmox/nodes/${node}/storage`);
      const data = await response.json();
      const vmStorages = data.filter(s => s.content?.includes('images'));
      setStorages(vmStorages);
      if (vmStorages.length > 0 && !formData.storage) {
        setFormData(prev => ({ ...prev, storage: vmStorages[0].storage }));
      }
    } catch (error) {
      console.error('Error fetching storages:', error);
    }
  };

  const fetchISOs = async (node) => {
    setLoadingISOs(true);
    try {
      const response = await fetch(`/api/proxmox/nodes/${node}/storage`);
      const data = await response.json();
      
      // Tous les storages qui peuvent contenir des ISOs
      const isoStorages = data.filter(s => 
        s.content?.includes('iso') || 
        s.type === 'dir' || 
        s.type === 'nfs' || 
        s.type === 'cifs'
      );
      
      let allISOs = [];
      for (const storage of isoStorages) {
        try {
          const isoResponse = await fetch(`/api/proxmox/nodes/${node}/storage/${storage.storage}/content?content=iso`);
          const isoData = await isoResponse.json();
          
          // Ajouter le nom du storage à chaque ISO pour faciliter l'identification
          const isosWithStorage = isoData.map(iso => ({
            ...iso,
            storageName: storage.storage
          }));
          
          allISOs = [...allISOs, ...isosWithStorage];
        } catch (err) {
          console.error(`Error fetching ISOs from ${storage.storage}:`, err);
        }
      }
      
      setIsos(allISOs);
      console.log(`Found ${allISOs.length} ISOs across ${isoStorages.length} storages`);
    } catch (error) {
      console.error('Error fetching ISOs:', error);
    } finally {
      setLoadingISOs(false);
    }
  };

  const fetchNetworks = async (node) => {
    try {
      const response = await fetch(`/api/proxmox/nodes/${node}/network`);
      const data = await response.json();
      const bridges = data.filter(n => n.type === 'bridge' || n.iface?.startsWith('vmbr'));
      setNetworks(bridges);
    } catch (error) {
      console.error('Error fetching networks:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.node || !formData.vmid || !formData.name) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);

    try {
      // Construction de la configuration VM
      const vmConfig = {
        vmid: parseInt(formData.vmid),
        name: formData.name,
        ostype: formData.ostype,
        
        // CPU
        cores: parseInt(formData.cores),
        sockets: parseInt(formData.sockets),
        cpu: formData.cpu,
        
        // Memory
        memory: parseInt(formData.memory),
        balloon: parseInt(formData.balloon),
        
        // Disk
        [formData.ssd ? 'scsi0' : 'virtio0']: `${formData.storage}:${formData.diskSize}${formData.ssd ? ',ssd=1' : ''}${formData.discard === 'on' ? ',discard=on' : ''}${formData.iothread ? ',iothread=1' : ''}`,
        
        // CDROM/ISO
        ide2: formData.iso !== 'none' ? `${formData.iso},media=cdrom` : 'none,media=cdrom',
        
        // Boot order
        boot: 'order=virtio0;ide2',
        
        // Network
        net0: `${formData.model},bridge=${formData.bridge}${formData.firewall ? ',firewall=1' : ''}${formData.vlan ? `,tag=${formData.vlan}` : ''}${formData.rate ? `,rate=${formData.rate}` : ''}`,
        
        // System
        machine: formData.machine,
        bios: formData.bios,
        scsihw: formData.scsihw,
        
        // Options
        onboot: formData.startOnBoot ? 1 : 0,
        agent: formData.agent ? 'enabled=1' : 'enabled=0',
        protection: formData.protection ? 1 : 0,
      };

      // Cloud-init si configuré
      if (formData.ciuser) {
        vmConfig.ciuser = formData.ciuser;
      }
      if (formData.cipassword) {
        vmConfig.cipassword = formData.cipassword;
      }
      if (formData.sshkeys) {
        vmConfig.sshkeys = encodeURIComponent(formData.sshkeys);
      }
      if (formData.ipconfig) {
        vmConfig.ipconfig0 = formData.ipconfig;
      }

      const response = await fetch(`/api/proxmox/nodes/${formData.node}/qemu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vmConfig),
      });

      if (response.ok) {
        alert('VM créée avec succès !');
        
        // Démarrer la VM si demandé
        if (formData.startAfterCreate) {
          await fetch(`/api/proxmox/nodes/${formData.node}/qemu/${formData.vmid}/status/start`, {
            method: 'POST',
          });
        }
        
        navigate('/vms');
      } else {
        const error = await response.json();
        alert('Erreur: ' + (error.message || 'Impossible de créer la VM'));
      }
    } catch (error) {
      console.error('Error creating VM:', error);
      alert('Erreur lors de la création de la VM');
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

  const osTypes = [
    { value: 'l26', label: 'Linux 6.x - 2.6 Kernel' },
    { value: 'l24', label: 'Linux 2.4 Kernel' },
    { value: 'w11', label: 'Windows 11/2022' },
    { value: 'w10', label: 'Windows 10/2016/2019' },
    { value: 'w8', label: 'Windows 8/2012/2012r2' },
    { value: 'w7', label: 'Windows 7/2008r2' },
    { value: 'wxp', label: 'Windows XP/2003' },
    { value: 'solaris', label: 'Solaris/OpenSolaris/OpenIndiana' },
    { value: 'other', label: 'Other' },
  ];

  const cpuTypes = [
    { value: 'host', label: 'host (Meilleure performance)' },
    { value: 'kvm64', label: 'kvm64 (Compatibilité)' },
    { value: 'qemu64', label: 'qemu64' },
    { value: 'x86-64-v2-AES', label: 'x86-64-v2-AES' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">{translate('deployvm.title', language)}</h2>
        <p className="text-slate-400">{translate('deployvm.subtitle', language)}</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-6xl">
        <div className="card space-y-6">
          {/* Node Selection */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <Server className="mr-2" size={20} />
              Node & Identification
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Node *
                </label>
                <select
                  name="node"
                  value={formData.node}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                  required
                >
                  <option value="">Sélectionner un node</option>
                  {nodes.map(node => (
                    <option key={node.node} value={node.node}>{node.node}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  VM ID *
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
                  Nom *
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
            </div>
          </div>

          {/* OS & Boot */}
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <HardDrive className="mr-2" size={20} />
              Système d'exploitation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Type d'OS
                </label>
                <select
                  name="ostype"
                  value={formData.ostype}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                >
                  {osTypes.map(os => (
                    <option key={os.value} value={os.value}>{os.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-300">
                    ISO Image
                  </label>
                  <button
                    type="button"
                    onClick={() => formData.node && fetchISOs(formData.node)}
                    disabled={!formData.node || loadingISOs}
                    className="text-xs text-proxmox-500 hover:text-proxmox-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Loader size={12} className={`mr-1 ${loadingISOs ? 'animate-spin' : ''}`} />
                    {loadingISOs ? 'Chargement...' : 'Rafraîchir'}
                  </button>
                </div>
                <select
                  name="iso"
                  value={formData.iso}
                  onChange={handleChange}
                  disabled={loadingISOs}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500 disabled:opacity-50"
                >
                  <option value="none">Aucune (boot depuis disque)</option>
                  {isos.length === 0 && !loadingISOs && (
                    <option disabled>Aucune ISO trouvée - Uploadez des ISOs dans Storage</option>
                  )}
                  {loadingISOs && (
                    <option disabled>Chargement des ISOs...</option>
                  )}
                  {(() => {
                    // Grouper les ISOs par storage
                    const groupedISOs = {};
                    isos.forEach(iso => {
                      const storage = iso.storageName || 'unknown';
                      if (!groupedISOs[storage]) {
                        groupedISOs[storage] = [];
                      }
                      groupedISOs[storage].push(iso);
                    });

                    // Afficher par groupe
                    return Object.entries(groupedISOs).map(([storage, storageISOs]) => (
                      <optgroup key={storage} label={`📁 ${storage}`}>
                        {storageISOs.map(iso => {
                          const filename = iso.volid.split('/')[1] || iso.volid;
                          const size = iso.size ? ` (${(iso.size / (1024 * 1024 * 1024)).toFixed(2)} GB)` : '';
                          return (
                            <option key={iso.volid} value={iso.volid}>
                              {filename}{size}
                            </option>
                          );
                        })}
                      </optgroup>
                    ));
                  })()}
                </select>
                {isos.length === 0 && !loadingISOs && (
                  <p className="text-xs text-slate-400 mt-2">
                    💡 Astuce: Uploadez des ISOs via la page Downloads ou directement dans Proxmox
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* CPU Configuration */}
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <Cpu className="mr-2" size={20} />
              Processeur
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Sockets
                </label>
                <input
                  type="number"
                  name="sockets"
                  value={formData.sockets}
                  onChange={handleChange}
                  min="1"
                  max="4"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Cores
                </label>
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
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Type CPU
                </label>
                <select
                  name="cpu"
                  value={formData.cpu}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                >
                  {cpuTypes.map(cpu => (
                    <option key={cpu.value} value={cpu.value}>{cpu.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Memory */}
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <MemoryStick className="mr-2" size={20} />
              Mémoire
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mémoire (MiB)
                </label>
                <input
                  type="number"
                  name="memory"
                  value={formData.memory}
                  onChange={handleChange}
                  min="64"
                  step="512"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Ballooning (0 = désactivé)
                </label>
                <input
                  type="number"
                  name="balloon"
                  value={formData.balloon}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                />
              </div>
            </div>
          </div>

          {/* Disk */}
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <HardDrive className="mr-2" size={20} />
              Disque
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <option value="">Sélectionner un storage</option>
                  {storages.map(storage => (
                    <option key={storage.storage} value={storage.storage}>
                      {storage.storage}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Taille (GiB)
                </label>
                <input
                  type="number"
                  name="diskSize"
                  value={formData.diskSize}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Cache
                </label>
                <select
                  name="cache"
                  value={formData.cache}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                >
                  <option value="none">None</option>
                  <option value="writethrough">Write through</option>
                  <option value="writeback">Write back</option>
                </select>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="ssd"
                  checked={formData.ssd}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-proxmox-600 focus:ring-proxmox-500"
                />
                <span className="text-slate-300">SSD émulé</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="iothread"
                  checked={formData.iothread}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-proxmox-600 focus:ring-proxmox-500"
                />
                <span className="text-slate-300">IO Thread</span>
              </label>
            </div>
          </div>

          {/* Network */}
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <Network className="mr-2" size={20} />
              Réseau
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Bridge
                </label>
                <select
                  name="bridge"
                  value={formData.bridge}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                >
                  {networks.length > 0 ? (
                    networks.map(net => (
                      <option key={net.iface} value={net.iface}>{net.iface}</option>
                    ))
                  ) : (
                    <>
                      <option value="vmbr0">vmbr0</option>
                      <option value="vmbr1">vmbr1</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Modèle
                </label>
                <select
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                >
                  <option value="virtio">VirtIO (paravirtualisé)</option>
                  <option value="e1000">Intel E1000</option>
                  <option value="rtl8139">Realtek RTL8139</option>
                  <option value="vmxnet3">VMware vmxnet3</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  VLAN Tag (optionnel)
                </label>
                <input
                  type="number"
                  name="vlan"
                  value={formData.vlan}
                  onChange={handleChange}
                  min="1"
                  max="4094"
                  placeholder="ex: 100"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="firewall"
                  checked={formData.firewall}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-proxmox-600 focus:ring-proxmox-500"
                />
                <span className="text-slate-300">Activer le firewall</span>
              </label>
            </div>
          </div>

          {/* Cloud-Init (Optional) */}
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <Cloud className="mr-2" size={20} />
              Cloud-Init (Optionnel)
            </h3>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-2">
                <AlertCircle size={20} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-300">
                  Cloud-Init permet de configurer automatiquement les VMs cloud-ready (Ubuntu, Debian, etc.)
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Utilisateur
                </label>
                <input
                  type="text"
                  name="ciuser"
                  value={formData.ciuser}
                  onChange={handleChange}
                  placeholder="ubuntu"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mot de passe
                </label>
                <input
                  type="password"
                  name="cipassword"
                  value={formData.cipassword}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Clés SSH publiques
                </label>
                <textarea
                  name="sshkeys"
                  value={formData.sshkeys}
                  onChange={handleChange}
                  rows="3"
                  placeholder="ssh-rsa AAAA..."
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500 font-mono text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Configuration IP (ex: ip=dhcp ou ip=192.168.1.100/24,gw=192.168.1.1)
                </label>
                <input
                  type="text"
                  name="ipconfig"
                  value={formData.ipconfig}
                  onChange={handleChange}
                  placeholder="ip=dhcp"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-proxmox-500"
                />
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
                <span className="text-slate-300">Démarrer au boot du node</span>
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
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="agent"
                  checked={formData.agent}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-proxmox-600 focus:ring-proxmox-500"
                />
                <span className="text-slate-300">Activer QEMU Guest Agent</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="protection"
                  checked={formData.protection}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-proxmox-600 focus:ring-proxmox-500"
                />
                <span className="text-slate-300">Protection (empêche la suppression accidentelle)</span>
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="border-t border-slate-700 pt-6 flex space-x-4">
            <button 
              type="submit" 
              className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader className="inline mr-2 animate-spin" size={16} />
                  Création en cours...
                </>
              ) : (
                <>
                  <Rocket className="inline mr-2" size={16} />
                  Créer la VM
                </>
              )}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={() => navigate('/vms')}
            >
              Annuler
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
