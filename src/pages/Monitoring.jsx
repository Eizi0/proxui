import { useState, useEffect } from 'react';
import { Bell, Activity, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function Monitoring() {
  const [alerts, setAlerts] = useState([
    { id: '1', type: 'warning', title: 'CPU Usage High', message: 'Node pve: CPU usage above 80%', time: new Date(), resolved: false },
    { id: '2', type: 'error', title: 'VM Down', message: 'VM 101 (database) is not responding', time: new Date(Date.now() - 3600000), resolved: false },
    { id: '3', type: 'info', title: 'Backup Completed', message: 'Daily backup completed successfully', time: new Date(Date.now() - 7200000), resolved: true },
  ]);

  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats/resources');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Monitoring & Alerts</h2>
        <p className="text-slate-400">Surveillez votre infrastructure en temps réel</p>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-slate-400">CPU Usage</h3>
            <Activity className="text-blue-400" size={20} />
          </div>
          <p className="text-3xl font-bold text-white">{stats?.cpu?.usage || 0}%</p>
        </div>
        <div className="card bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-slate-400">Memory</h3>
            <Activity className="text-green-400" size={20} />
          </div>
          <p className="text-3xl font-bold text-white">{stats?.memory?.percentage || 0}%</p>
        </div>
        <div className="card bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-slate-400">Disk</h3>
            <Activity className="text-purple-400" size={20} />
          </div>
          <p className="text-3xl font-bold text-white">{stats?.disk?.percentage || 0}%</p>
        </div>
        <div className="card bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-orange-500/50">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-slate-400">Active Alerts</h3>
            <Bell className="text-orange-400" size={20} />
          </div>
          <p className="text-3xl font-bold text-white">{alerts.filter(a => !a.resolved).length}</p>
        </div>
      </div>

      {/* Alerts List */}
      <div className="card">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center">
          <Bell className="mr-2" />
          Alertes & Notifications
        </h3>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border ${
                alert.resolved
                  ? 'bg-slate-700/50 border-slate-600'
                  : alert.type === 'error'
                  ? 'bg-red-500/10 border-red-500/50'
                  : alert.type === 'warning'
                  ? 'bg-yellow-500/10 border-yellow-500/50'
                  : 'bg-blue-500/10 border-blue-500/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {alert.type === 'error' && <XCircle className="text-red-400 flex-shrink-0 mt-1" size={20} />}
                  {alert.type === 'warning' && <AlertTriangle className="text-yellow-400 flex-shrink-0 mt-1" size={20} />}
                  {alert.type === 'info' && <CheckCircle className="text-blue-400 flex-shrink-0 mt-1" size={20} />}
                  <div className="flex-1">
                    <h4 className="font-bold text-white mb-1">{alert.title}</h4>
                    <p className="text-sm text-slate-300">{alert.message}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {alert.time.toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
                {!alert.resolved && (
                  <button className="btn btn-secondary text-sm ml-4">
                    Résoudre
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-bold text-white mb-4">CPU History</h3>
          <div className="h-64 flex items-center justify-center border border-slate-700 rounded-lg">
            <p className="text-slate-500">Graph will be implemented with Chart.js</p>
          </div>
        </div>
        <div className="card">
          <h3 className="text-lg font-bold text-white mb-4">Memory History</h3>
          <div className="h-64 flex items-center justify-center border border-slate-700 rounded-lg">
            <p className="text-slate-500">Graph will be implemented with Chart.js</p>
          </div>
        </div>
      </div>
    </div>
  );
}
