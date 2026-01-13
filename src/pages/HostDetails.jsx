import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Server, Cpu, HardDrive, Activity, Clock, Package, Play, Pause, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

function HostDetails() {
  const { node } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [nodeInfo, setNodeInfo] = useState(null);
  const [rrdData, setRrdData] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [services, setServices] = useState([]);
  const [vms, setVms] = useState([]);
  const [containers, setContainers] = useState([]);
  const [version, setVersion] = useState(null);

  useEffect(() => {
    fetchAllData();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchAllData, 5000);
    return () => clearInterval(interval);
  }, [node]);

  const fetchAllData = async () => {
    try {
      const [infoRes, rrdRes, tasksRes, servicesRes, vmsRes, containersRes, versionRes] = await Promise.all([
        fetch(`/api/proxmox/nodes/${node}/info`).catch(e => ({ ok: false, error: e })),
        fetch(`/api/proxmox/nodes/${node}/rrddata?timeframe=hour`).catch(e => ({ ok: false, error: e })),
        fetch(`/api/proxmox/nodes/${node}/tasks?limit=10`).catch(e => ({ ok: false, error: e })),
        fetch(`/api/proxmox/nodes/${node}/services`).catch(e => ({ ok: false, error: e })),
        fetch(`/api/proxmox/vms`).catch(e => ({ ok: false, error: e })),
        fetch(`/api/proxmox/lxc`).catch(e => ({ ok: false, error: e })),
        fetch(`/api/proxmox/nodes/${node}/version`).catch(e => ({ ok: false, error: e }))
      ]);

      // Check info response
      if (!infoRes.ok) {
        setLoading(false);
        return;
      }

      const info = await infoRes.json();
      const rrd = rrdRes.ok ? await rrdRes.json() : null;
      const taskList = tasksRes.ok ? await tasksRes.json() : [];
      const serviceList = servicesRes.ok ? await servicesRes.json() : [];
      const vmList = vmsRes.ok ? await vmsRes.json() : [];
      const containerList = containersRes.ok ? await containersRes.json() : [];
      const ver = versionRes.ok ? await versionRes.json() : null;
      
      setNodeInfo(info);
      setRrdData(rrd);
      setTasks(Array.isArray(taskList) ? taskList : []);
      setServices(Array.isArray(serviceList) ? serviceList : []);
      setVms(Array.isArray(vmList) ? vmList.filter(vm => vm.node === node) : []);
      setContainers(Array.isArray(containerList) ? containerList.filter(ct => ct.node === node) : []);
      setVersion(ver);
      setLoading(false);
    } catch (error) {
      console.error('Error loading host details:', error);
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    if (!seconds) return 'N/A';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}j ${hours}h ${minutes}m`;
  };

  const getStatusIcon = (status) => {
    if (status === 'running' || status === 'active') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === 'stopped' || status === 'inactive') return <XCircle className="w-5 h-5 text-red-500" />;
    return <AlertCircle className="w-5 h-5 text-yellow-500" />;
  };

  const getTaskStatusColor = (status) => {
    if (status === 'OK') return 'text-green-500';
    if (status === 'running') return 'text-blue-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proxmox-600"></div>
      </div>
    );
  }

  if (!nodeInfo) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Impossible de charger les informations de l'hôte</p>
      </div>
    );
  }

  const cpuUsage = nodeInfo.cpu ? (nodeInfo.cpu * 100).toFixed(1) : 0;
  const memUsage = nodeInfo.memory ? ((nodeInfo.memory.used / nodeInfo.memory.total) * 100).toFixed(1) : 0;
  const swapUsage = nodeInfo.swap ? ((nodeInfo.swap.used / nodeInfo.swap.total) * 100).toFixed(1) : 0;
  const diskUsage = nodeInfo.rootfs ? ((nodeInfo.rootfs.used / nodeInfo.rootfs.total) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/hosts')}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center">
              <Server className="w-8 h-8 mr-3 text-proxmox-500" />
              {node}
            </h1>
            <p className="text-slate-400 mt-1">
              {version?.version} | Uptime: {formatUptime(nodeInfo.uptime)}
            </p>
          </div>
        </div>
      </div>

      {/* System Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CPU */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Cpu className="w-6 h-6 text-blue-500 mr-2" />
              <h3 className="font-semibold text-white">CPU</h3>
            </div>
            <span className="text-2xl font-bold text-blue-500">{cpuUsage}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${cpuUsage}%` }}
            ></div>
          </div>
          <p className="text-sm text-slate-400">
            {nodeInfo.cpuinfo?.cpus || 0} CPU(s) - {(nodeInfo.cpuinfo?.model || 'N/A').substring(0, 30)}...
          </p>
        </div>

        {/* Memory */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <HardDrive className="w-6 h-6 text-green-500 mr-2" />
              <h3 className="font-semibold text-white">Mémoire</h3>
            </div>
            <span className="text-2xl font-bold text-green-500">{memUsage}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${memUsage}%` }}
            ></div>
          </div>
          <p className="text-sm text-slate-400">
            {formatBytes(nodeInfo.memory?.used)} / {formatBytes(nodeInfo.memory?.total)}
          </p>
        </div>

        {/* Swap */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Activity className="w-6 h-6 text-yellow-500 mr-2" />
              <h3 className="font-semibold text-white">Swap</h3>
            </div>
            <span className="text-2xl font-bold text-yellow-500">{swapUsage}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
            <div
              className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${swapUsage}%` }}
            ></div>
          </div>
          <p className="text-sm text-slate-400">
            {formatBytes(nodeInfo.swap?.used)} / {formatBytes(nodeInfo.swap?.total)}
          </p>
        </div>

        {/* Disk */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <HardDrive className="w-6 h-6 text-purple-500 mr-2" />
              <h3 className="font-semibold text-white">Disque</h3>
            </div>
            <span className="text-2xl font-bold text-purple-500">{diskUsage}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${diskUsage}%` }}
            ></div>
          </div>
          <p className="text-sm text-slate-400">
            {formatBytes(nodeInfo.rootfs?.used)} / {formatBytes(nodeInfo.rootfs?.total)}
          </p>
        </div>
      </div>

      {/* VMs and Containers Running */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* VMs */}
        <div className="card">
          <h3 className="text-xl font-semibold mb-4 flex items-center text-white">
            <Server className="w-6 h-6 mr-2 text-blue-500" />
            Machines Virtuelles ({vms.length})
          </h3>
          <div className="space-y-3">
            {vms.length === 0 ? (
              <p className="text-slate-400 text-center py-4">Aucune VM sur cet hôte</p>
            ) : (
              vms.map((vm) => (
                <div key={vm.vmid} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(vm.status)}
                    <div>
                      <p className="font-medium text-white">{vm.name}</p>
                      <p className="text-sm text-slate-400">ID: {vm.vmid}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-300">
                    <p>{vm.cpus} CPU(s)</p>
                    <p>{formatBytes(vm.maxmem)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Containers */}
        <div className="card">
          <h3 className="text-xl font-semibold mb-4 flex items-center text-white">
            <Package className="w-6 h-6 mr-2 text-green-500" />
            Conteneurs LXC ({containers.length})
          </h3>
          <div className="space-y-3">
            {containers.length === 0 ? (
              <p className="text-slate-400 text-center py-4">Aucun conteneur sur cet hôte</p>
            ) : (
              containers.map((ct) => (
                <div key={ct.vmid} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(ct.status)}
                    <div>
                      <p className="font-medium text-white">{ct.name}</p>
                      <p className="text-sm text-slate-400">ID: {ct.vmid}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-300">
                    <p>{ct.cpus} CPU(s)</p>
                    <p>{formatBytes(ct.maxmem)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4 flex items-center text-white">
          <Play className="w-6 h-6 mr-2 text-green-500" />
          Services Système
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.length === 0 ? (
            <p className="text-slate-400 col-span-3 text-center py-4">Aucun service disponible</p>
          ) : (
            services.slice(0, 12).map((service, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(service.state)}
                  <span className="font-medium text-white">{service.name}</span>
                </div>
                <span className={`text-sm ${service.state === 'running' ? 'text-green-500' : 'text-slate-500'}`}>
                  {service.state}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="card">
        <h3 className="text-xl font-semibold mb-4 flex items-center text-white">
          <Clock className="w-6 h-6 mr-2 text-blue-500" />
          Tâches Récentes
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Utilisateur</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Début</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-4 text-center text-slate-400">Aucune tâche récente</td>
                </tr>
              ) : (
                tasks.map((task, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{task.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">{task.user}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {new Date(task.starttime * 1000).toLocaleString()}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getTaskStatusColor(task.status)}`}>
                      {task.status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default HostDetails;
