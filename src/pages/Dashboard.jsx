import { useState, useEffect } from 'react';
import { Server, Box, Container, Activity, Cpu, HardDrive, MemoryStick, Clock, ChevronDown } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { translate } from '../i18n/translations';

export default function Dashboard() {
  const { language } = useApp();
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeStats, setNodeStats] = useState(null);
  const [clusterStats, setClusterStats] = useState(null);
  const [recentResources, setRecentResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNodeDropdown, setShowNodeDropdown] = useState(false);

  useEffect(() => {
    fetchNodes();
    fetchClusterStats();
    const interval = setInterval(() => {
      fetchClusterStats();
      if (selectedNode) {
        fetchNodeStats(selectedNode);
        fetchNodeResources(selectedNode);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [selectedNode]);

  const fetchNodes = async () => {
    try {
      const response = await fetch('/api/proxmox/nodes');
      const data = await response.json();
      setNodes(data);
      if (data.length > 0 && !selectedNode) {
        setSelectedNode(data[0].node);
        fetchNodeStats(data[0].node);
        fetchNodeResources(data[0].node);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching nodes:', error);
      setLoading(false);
    }
  };

  const fetchClusterStats = async () => {
    try {
      const response = await fetch('/api/stats/overview');
      const data = await response.json();
      setClusterStats(data);
    } catch (error) {
      console.error('Error fetching cluster stats:', error);
    }
  };

  const fetchNodeStats = async (nodeName) => {
    try {
      const response = await fetch(`/api/proxmox/nodes/${nodeName}/status`);
      const data = await response.json();
      setNodeStats(data);
    } catch (error) {
      console.error('Error fetching node stats:', error);
    }
  };

  const fetchNodeResources = async (nodeName) => {
    try {
      const response = await fetch(`/api/proxmox/resources?node=${nodeName}`);
      const data = await response.json();
      
      // Filter and sort by CPU usage
      const resources = data
        .filter(r => (r.type === 'qemu' || r.type === 'lxc') && r.status === 'running')
        .map(r => ({
          ...r,
          cpuUsage: ((r.cpu || 0) * 100).toFixed(1),
          memUsage: ((r.mem / r.maxmem) * 100).toFixed(1),
          typeName: r.type === 'qemu' ? 'VM' : 'LXC'
        }))
        .sort((a, b) => parseFloat(b.cpuUsage) - parseFloat(a.cpuUsage))
        .slice(0, 20);
      
      setRecentResources(resources);
    } catch (error) {
      console.error('Error fetching node resources:', error);
    }
  };

  const handleNodeChange = (nodeName) => {
    setSelectedNode(nodeName);
    setShowNodeDropdown(false);
    fetchNodeStats(nodeName);
    fetchNodeResources(nodeName);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proxmox-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Node Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">{translate('dashboard.title', language)}</h2>
          <p className="text-slate-400">{translate('dashboard.subtitle', language)}</p>
        </div>
        
        {/* Node Selector */}
        <div className="relative">
          <button
            onClick={() => setShowNodeDropdown(!showNodeDropdown)}
            className="btn btn-secondary flex items-center space-x-2 min-w-[200px]"
          >
            <Server size={16} />
            <span>{selectedNode || 'Select Node'}</span>
            <ChevronDown size={16} />
          </button>
          
          {showNodeDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
              <div className="p-2">
                {nodes.map((node) => (
                  <button
                    key={node.node}
                    onClick={() => handleNodeChange(node.node)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      selectedNode === node.node
                        ? 'bg-proxmox-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{node.node}</div>
                        <div className="text-xs text-slate-400">
                          {node.status === 'online' ? '🟢 Online' : '🔴 Offline'}
                        </div>
                      </div>
                      {node.status === 'online' && (
                        <div className="text-xs">
                          <div>CPU: {((node.cpu || 0) * 100).toFixed(0)}%</div>
                          <div>RAM: {((node.mem / node.maxmem) * 100).toFixed(0)}%</div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cluster Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title={translate('dashboard.vms', language)}
          value={clusterStats?.vms?.total || 0}
          subtitle={`${clusterStats?.vms?.running || 0} ${translate('dashboard.running', language)}`}
          icon={Server}
          color="proxmox"
        />
        <StatsCard
          title={translate('dashboard.lxc', language)}
          value={clusterStats?.lxc?.total || 0}
          subtitle={`${clusterStats?.lxc?.running || 0} ${translate('dashboard.running', language)}`}
          icon={Box}
          color="green"
        />
        <StatsCard
          title={translate('dashboard.docker', language)}
          value={clusterStats?.docker?.total || 0}
          subtitle={`${clusterStats?.docker?.running || 0} ${translate('dashboard.running', language)}`}
          icon={Container}
          color="blue"
          disabled={!clusterStats?.docker?.available}
        />
        <StatsCard
          title={translate('dashboard.nodes', language)}
          value={clusterStats?.nodes?.total || 0}
          subtitle={`${clusterStats?.nodes?.online || 0} ${translate('dashboard.online', language)}`}
          icon={Activity}
          color="purple"
        />
      </div>

      {/* Node Resource Usage - Donut Charts */}
      {nodeStats && (
        <div className="card">
          <h3 className="text-xl font-bold text-white mb-6">
            Utilisation des ressources - {selectedNode}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <DonutChart
              label="CPU"
              percentage={((nodeStats.cpu || 0) * 100).toFixed(1)}
              icon={Cpu}
              color="proxmox"
              details={`${nodeStats.cpus || 0} vCPUs`}
            />
            <DonutChart
              label="Mémoire"
              percentage={((nodeStats.mem / nodeStats.maxmem) * 100).toFixed(1)}
              icon={MemoryStick}
              color="green"
              details={`${formatBytes(nodeStats.mem)} / ${formatBytes(nodeStats.maxmem)}`}
            />
            <DonutChart
              label="Stockage"
              percentage={((nodeStats.disk / nodeStats.maxdisk) * 100).toFixed(1)}
              icon={HardDrive}
              color="blue"
              details={`${formatBytes(nodeStats.disk)} / ${formatBytes(nodeStats.maxdisk)}`}
            />
            <DonutChart
              label="Uptime"
              percentage={100}
              icon={Clock}
              color="purple"
              details={formatUptime(nodeStats.uptime || 0)}
              isUptime={true}
            />
          </div>
        </div>
      )}

      {/* Recent Resources */}
      {recentResources && recentResources.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4">
            Top 20 Ressources - {selectedNode} (par utilisation CPU)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-700">
                <tr className="text-left">
                  <th className="pb-3 text-slate-400 font-medium">Nom</th>
                  <th className="pb-3 text-slate-400 font-medium">Type</th>
                  <th className="pb-3 text-slate-400 font-medium">VMID</th>
                  <th className="pb-3 text-slate-400 font-medium">Statut</th>
                  <th className="pb-3 text-slate-400 font-medium">CPU</th>
                  <th className="pb-3 text-slate-400 font-medium">Mémoire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {recentResources.map((resource) => (
                  <tr key={`${resource.type}-${resource.vmid}`} className="text-slate-300 hover:bg-slate-700/30">
                    <td className="py-3 font-medium text-white">{resource.name || `${resource.typeName}-${resource.vmid}`}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        resource.type === 'qemu' ? 'bg-proxmox-500/20 text-proxmox-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {resource.typeName}
                      </span>
                    </td>
                    <td className="py-3 text-sm">{resource.vmid}</td>
                    <td className="py-3">
                      <span className="status-badge status-running">
                        {resource.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`font-medium ${
                        parseFloat(resource.cpuUsage) > 80 ? 'text-red-400' : 
                        parseFloat(resource.cpuUsage) > 50 ? 'text-yellow-400' : 'text-green-400'
                      }`}>
                        {resource.cpuUsage}%
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-col">
                        <span className="text-sm">{formatBytes(resource.mem)}</span>
                        <span className="text-xs text-slate-500">/ {formatBytes(resource.maxmem)}</span>
                      </div>
                      <div className="w-24 bg-slate-700 rounded-full h-1 mt-1">
                        <div
                          className={`h-1 rounded-full ${
                            parseFloat(resource.memUsage) > 80 ? 'bg-red-500' : 
                            parseFloat(resource.memUsage) > 50 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${resource.memUsage}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatsCard({ title, value, subtitle, icon: Icon, color, disabled }) {
  const colorClasses = {
    proxmox: 'from-proxmox-500/20 to-proxmox-600/20 border-proxmox-500/50',
    green: 'from-green-500/20 to-green-600/20 border-green-500/50',
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/50',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/50',
  };

  return (
    <div className={`card bg-gradient-to-br ${colorClasses[color]} ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm mb-1">{title}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          <p className="text-slate-400 text-sm mt-1">{subtitle}</p>
        </div>
        <Icon size={48} className="text-white opacity-20" />
      </div>
    </div>
  );
}

function DonutChart({ label, percentage, icon: Icon, color, details, isUptime = false }) {
  const colorClasses = {
    proxmox: {
      stroke: '#f26522',
      bg: '#f26522',
      text: 'text-proxmox-400'
    },
    green: {
      stroke: '#10b981',
      bg: '#10b981',
      text: 'text-green-400'
    },
    blue: {
      stroke: '#3b82f6',
      bg: '#3b82f6',
      text: 'text-blue-400'
    },
    purple: {
      stroke: '#a855f7',
      bg: '#a855f7',
      text: 'text-purple-400'
    }
  };

  const size = 120;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (isUptime ? circumference : (parseFloat(percentage) / 100) * circumference);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background circle */}
        <svg className="transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#374151"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colorClasses[color].stroke}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        {/* Center icon and percentage */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon size={24} className={colorClasses[color].text} />
          {!isUptime && (
            <span className="text-white font-bold text-lg mt-1">{percentage}%</span>
          )}
        </div>
      </div>
      <div className="mt-3 text-center">
        <div className="text-white font-medium">{label}</div>
        <div className="text-slate-400 text-xs mt-1">{details}</div>
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

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}j ${hours}h ${minutes}m`;
}
