import { useState, useEffect } from 'react';
import { Server, Box, Container, Activity, Cpu, HardDrive, MemoryStick } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { translate } from '../i18n/translations';

export default function Dashboard() {
  const { language } = useApp();
  const [stats, setStats] = useState(null);
  const [recentResources, setRecentResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const [overview, resources, recent] = await Promise.all([
        fetch('/api/stats/overview').then(r => r.json()),
        fetch('/api/stats/resources').then(r => r.json()),
        fetch('/api/stats/recent-resources').then(r => r.json()),
      ]);
      setStats({ overview, resources });
      setRecentResources(recent);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
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
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">{translate('dashboard.title', language)}</h2>
        <p className="text-slate-400">{translate('dashboard.subtitle', language)}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title={translate('dashboard.vms', language)}
          value={stats?.overview?.vms?.total || 0}
          subtitle={`${stats?.overview?.vms?.running || 0} ${translate('dashboard.running', language)}`}
          icon={Server}
          color="blue"
        />
        <StatsCard
          title={translate('dashboard.lxc', language)}
          value={stats?.overview?.lxc?.total || 0}
          subtitle={`${stats?.overview?.lxc?.running || 0} ${translate('dashboard.running', language)}`}
          icon={Box}
          color="green"
        />
        <StatsCard
          title={translate('dashboard.docker', language)}
          value={stats?.overview?.docker?.total || 0}
          subtitle={`${stats?.overview?.docker?.running || 0} ${translate('dashboard.running', language)}`}
          icon={Container}
          color="purple"
          disabled={!stats?.overview?.docker?.available}
        />
        <StatsCard
          title={translate('dashboard.nodes', language)}
          value={stats?.overview?.nodes?.total || 0}
          subtitle={`${stats?.overview?.nodes?.online || 0} ${translate('dashboard.online', language)}`}
          icon={Activity}
          color="orange"
        />
      </div>

      {/* Resource Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <Cpu className="mr-2" size={24} />
            {translate('dashboard.cpu', language)} & {translate('dashboard.memory', language)}
          </h3>
          <div className="space-y-4">
            <ResourceBar
              label={translate('dashboard.cpu', language)}
              value={stats?.resources?.cpu?.usage || 0}
              max={100}
              unit="%"
              color="blue"
            />
            <ResourceBar
              label={translate('dashboard.memory', language)}
              value={stats?.resources?.memory?.percentage || 0}
              max={100}
              unit="%"
              color="green"
              details={`${formatBytes(stats?.resources?.memory?.used)} / ${formatBytes(stats?.resources?.memory?.total)}`}
            />
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <HardDrive className="mr-2" size={24} />
            {translate('dashboard.storage', language)}
          </h3>
          <div className="space-y-4">
            <ResourceBar
              label="Disque"
              value={stats?.resources?.disk?.percentage || 0}
              max={100}
              unit="%"
              color="purple"
              details={`${formatBytes(stats?.resources?.disk?.used)} / ${formatBytes(stats?.resources?.disk?.total)}`}
            />
            <div className="text-sm text-slate-400 mt-4">
              <p>Uptime: {formatUptime(stats?.resources?.uptime || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Resources */}
      {recentResources && recentResources.length > 0 && (
        <div className="card">
          <h3 className="text-xl font-bold text-white mb-4">Ressources Récentes (Top 20 par utilisation CPU)</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-700">
                <tr className="text-left">
                  <th className="pb-3 text-slate-400 font-medium">Nom</th>
                  <th className="pb-3 text-slate-400 font-medium">Type</th>
                  <th className="pb-3 text-slate-400 font-medium">Node</th>
                  <th className="pb-3 text-slate-400 font-medium">Statut</th>
                  <th className="pb-3 text-slate-400 font-medium">CPU</th>
                  <th className="pb-3 text-slate-400 font-medium">Mémoire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {recentResources.map((resource) => (
                  <tr key={`${resource.type}-${resource.id}`} className="text-slate-300 hover:bg-slate-700/30">
                    <td className="py-3 font-medium text-white">{resource.name || `${resource.typeName}-${resource.id}`}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        resource.type === 'qemu' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {resource.typeName}
                      </span>
                    </td>
                    <td className="py-3 text-sm">{resource.node}</td>
                    <td className="py-3">
                      <span className={`status-badge ${
                        resource.status === 'running' ? 'status-running' : 'status-stopped'
                      }`}>
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
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/50',
    green: 'from-green-500/20 to-green-600/20 border-green-500/50',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/50',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/50',
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

function ResourceBar({ label, value, max, unit, color, details }) {
  const percentage = (value / max) * 100;
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    purple: 'bg-purple-600',
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400">
          {value}{unit} {details && `(${details})`}
        </span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2">
        <div
          className={`${colorClasses[color]} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
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
