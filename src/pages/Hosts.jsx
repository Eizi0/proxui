import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { HardDrive, Cpu, MemoryStick, Activity } from 'lucide-react';

export default function Hosts() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNodes();
    // Auto-refresh every 5 seconds
    const interval = setInterval(fetchNodes, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchNodes = async () => {
    try {
      const response = await fetch('/api/proxmox/nodes');
      const data = await response.json();
      setNodes(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching nodes:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proxmox-600"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Hosts / Nodes Proxmox</h2>
        <p className="text-slate-400">Gérez vos hosts et nodes Proxmox</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {nodes.map((node) => (
          <NodeCard key={node.node} node={node} />
        ))}
      </div>

      {nodes.length === 0 && (
        <div className="card text-center py-12">
          <HardDrive className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400">Aucun node trouvé</p>
        </div>
      )}
    </div>
  );
}

function NodeCard({ node }) {
  const isOnline = node.status === 'online';
  const cpuUsage = ((node.cpu || 0) * 100).toFixed(1);
  const memUsage = node.mem && node.maxmem 
    ? ((node.mem / node.maxmem) * 100).toFixed(1)
    : 0;
  const diskUsage = node.disk && node.maxdisk
    ? ((node.disk / node.maxdisk) * 100).toFixed(1)
    : 0;

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link to={`/hosts/${node.node}`} className="block group">
            <h3 className="text-2xl font-bold text-white group-hover:text-proxmox-400 transition-colors cursor-pointer">
              {node.node}
            </h3>
          </Link>
          <p className="text-sm text-slate-400">{node.type || 'Node'}</p>
        </div>
        <span className={`status-badge ${isOnline ? 'status-running' : 'status-stopped'}`}>
          {node.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-4 bg-slate-700/50 rounded-lg">
          <div className="text-3xl font-bold text-proxmox-400">{cpuUsage}%</div>
          <div className="text-sm text-slate-400 mt-1">CPU</div>
        </div>
        <div className="text-center p-4 bg-slate-700/50 rounded-lg">
          <div className="text-3xl font-bold text-green-400">{memUsage}%</div>
          <div className="text-sm text-slate-400 mt-1">Mémoire</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-slate-300">
            <Cpu size={16} className="mr-2 text-slate-400" />
            <span>CPU</span>
          </div>
          <span className="text-white font-medium">{cpuUsage}%</span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="bg-proxmox-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${cpuUsage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-slate-300">
            <MemoryStick size={16} className="mr-2 text-slate-400" />
            <span>Mémoire</span>
          </div>
          <span className="text-white font-medium">
            {formatBytes(node.mem)} / {formatBytes(node.maxmem)}
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${memUsage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-slate-300">
            <HardDrive size={16} className="mr-2 text-slate-400" />
            <span>Disque</span>
          </div>
          <span className="text-white font-medium">
            {formatBytes(node.disk)} / {formatBytes(node.maxdisk)}
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${diskUsage}%` }}
          />
        </div>

        {node.uptime && (
          <div className="flex items-center justify-between text-sm pt-2 border-t border-slate-700">
            <div className="flex items-center text-slate-300">
              <Activity size={16} className="mr-2 text-slate-400" />
              <span>Uptime</span>
            </div>
            <span className="text-white font-medium">{formatUptime(node.uptime)}</span>
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

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}j ${hours}h ${minutes}m`;
}
