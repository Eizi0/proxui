import { useState, useEffect } from 'react';
import { Server, Box, Container as ContainerIcon, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusPill from '../components/ui/StatusPill';

const GB = 1073741824;

function formatBytes(bytes) {
  if (!bytes) return '0 Go';
  return `${(bytes / GB).toFixed(1)} Go`;
}

const TASK_LABELS = {
  qmsnapshot: { verb: 'snapshot créé', icon: '●', color: '#5ab0ff' },
  vzdump: { verb: 'sauvegarde terminée', icon: '✓', color: '#4ee296' },
  qmigrate: { verb: 'migration terminée', icon: '→', color: '#5ab0ff' },
  vzrestart: { verb: 'conteneur redémarré', icon: '↻', color: '#a855f7' },
  qmstart: { verb: 'démarrée', icon: '▶', color: '#4ee296' },
  qmstop: { verb: 'arrêtée', icon: '■', color: '#9499a6' },
};

export default function Dashboard() {
  const [nodes, setNodes] = useState([]);
  const [overview, setOverview] = useState(null);
  const [topResources, setTopResources] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const load = async () => {
    try {
      const [nodesRes, overviewRes, resourcesRes, activityRes] = await Promise.all([
        fetch('/api/proxmox/nodes').then((r) => r.json()),
        fetch('/api/stats/overview').then((r) => r.json()),
        fetch('/api/stats/recent-resources').then((r) => r.json()),
        fetch('/api/stats/activity?limit=6').then((r) => r.json()),
      ]);
      setNodes(Array.isArray(nodesRes) ? nodesRes : []);
      setOverview(overviewRes);
      setTopResources(Array.isArray(resourcesRes) ? resourcesRes.slice(0, 6) : []);
      setActivity(Array.isArray(activityRes) ? activityRes : []);
    } catch (error) {
      console.error('Erreur de chargement du tableau de bord:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-proxmox-500" />
      </div>
    );
  }

  const nodesOnline = nodes.filter((n) => n.status === 'online').length;
  const cpuTotal = nodes.reduce((s, n) => s + (n.maxcpu || 0), 0);
  const cpuUsed = nodes.reduce((s, n) => s + (n.cpu || 0) * (n.maxcpu || 0), 0);
  const cpuPct = cpuTotal ? Math.round((cpuUsed / cpuTotal) * 100) : 0;
  const memTotal = nodes.reduce((s, n) => s + (n.maxmem || 0), 0);
  const memUsed = nodes.reduce((s, n) => s + (n.mem || 0), 0);
  const memPct = memTotal ? Math.round((memUsed / memTotal) * 100) : 0;
  const diskTotal = nodes.reduce((s, n) => s + (n.maxdisk || 0), 0);
  const diskUsed = nodes.reduce((s, n) => s + (n.disk || 0), 0);
  const diskPct = diskTotal ? Math.round((diskUsed / diskTotal) * 100) : 0;

  const alerts = nodes.filter((n) => (n.cpu || 0) > 0.85 || (n.maxmem ? n.mem / n.maxmem > 0.9 : false));

  const kpis = [
    { label: 'Hôtes en ligne', value: `${nodesOnline}/${nodes.length}`, Icon: Server },
    { label: 'VM en cours', value: `${overview?.vms?.running ?? 0}/${overview?.vms?.total ?? 0}`, Icon: Box },
    { label: 'Conteneurs', value: `${overview?.lxc?.running ?? 0}/${overview?.lxc?.total ?? 0}`, Icon: ContainerIcon },
  ];

  const gauges = [
    { label: 'CPU cluster', pct: cpuPct, detail: `${cpuUsed.toFixed(0)} / ${cpuTotal} vCPU`, color: '#f26522' },
    { label: 'Mémoire cluster', pct: memPct, detail: `${formatBytes(memUsed)} / ${formatBytes(memTotal)}`, color: '#5ab0ff' },
    { label: 'Stockage (tous nœuds)', pct: diskPct, detail: `${formatBytes(diskUsed)} / ${formatBytes(diskTotal)}`, color: '#22c55e' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-graphite-50">Vue d'ensemble du cluster</h1>
          <p className="text-graphite-200 text-[13px] mt-0.5">
            {nodes.length} hôte{nodes.length > 1 ? 's' : ''} · actualisation automatique toutes les 10 s
          </p>
        </div>
        <StatusPill
          status={alerts.length ? 'warning' : 'running'}
          label={alerts.length ? `${alerts.length} hôte(s) sous tension` : 'Cluster sain'}
        />
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-4">
        {kpis.map((k) => (
          <div key={k.label} className="card !p-4">
            <div className="flex justify-between items-start">
              <div className="text-graphite-200 text-[12.5px] font-semibold">{k.label}</div>
              <k.Icon size={16} className="text-graphite-300" />
            </div>
            <div className="text-[28px] font-extrabold mt-1.5 font-mono text-graphite-50">{k.value}</div>
          </div>
        ))}
      </div>

      {/* Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-4">
        {gauges.map((g) => (
          <div key={g.label} className="card !p-4">
            <div className="flex justify-between text-[12.5px] text-graphite-200 font-semibold mb-2.5">
              <span>{g.label}</span>
              <span className="font-mono">{g.detail}</span>
            </div>
            <div className="h-2 rounded-full bg-graphite-700 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${g.pct}%`, background: g.color }} />
            </div>
            <div className="text-xl font-extrabold mt-2 font-mono text-graphite-50">{g.pct}%</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-3.5 mb-4">
        {/* Hosts */}
        <div className="card !p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="font-bold text-[14px] text-graphite-50">Hôtes du cluster</div>
            <Link to="/hosts" className="text-[12.5px] text-proxmox-400 font-semibold flex items-center gap-1 hover:text-proxmox-300">
              Tout voir <ArrowRight size={12} />
            </Link>
          </div>
          <div className="flex flex-col gap-2.5">
            {nodes.map((n) => (
              <Link
                key={n.node}
                to={`/hosts/${n.node}`}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-graphite-900 border border-graphite-600 hover:border-graphite-500 transition-colors"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: n.status === 'online' ? '#4ee296' : '#f87171' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-semibold font-mono text-graphite-50 truncate">{n.node}</div>
                  <div className="text-[11.5px] text-graphite-300">
                    {Math.round((n.uptime || 0) / 86400)} j de disponibilité
                  </div>
                </div>
                <div className="w-24 hidden sm:block">
                  <div className="flex justify-between text-[10.5px] text-graphite-200">
                    <span>CPU</span><span>{Math.round((n.cpu || 0) * 100)}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-graphite-700 mt-0.5">
                    <div className="h-full rounded-full bg-proxmox-500" style={{ width: `${Math.round((n.cpu || 0) * 100)}%` }} />
                  </div>
                </div>
                <div className="w-24 hidden sm:block">
                  <div className="flex justify-between text-[10.5px] text-graphite-200">
                    <span>RAM</span><span>{n.maxmem ? Math.round((n.mem / n.maxmem) * 100) : 0}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-graphite-700 mt-0.5">
                    <div className="h-full rounded-full bg-sky-400" style={{ width: `${n.maxmem ? Math.round((n.mem / n.maxmem) * 100) : 0}%` }} />
                  </div>
                </div>
              </Link>
            ))}
            {nodes.length === 0 && (
              <div className="text-graphite-300 text-[13px] py-6 text-center">Aucun hôte détecté.</div>
            )}
          </div>
        </div>

        {/* Activity */}
        <div className="card !p-4">
          <div className="font-bold text-[14px] text-graphite-50 mb-3">Activité récente</div>
          <div className="flex flex-col gap-3.5">
            {activity.map((t) => {
              const meta = TASK_LABELS[t.type] || { verb: t.type, icon: '•', color: '#8b93a3' };
              const mins = Math.max(0, Math.round((Date.now() / 1000 - t.starttime) / 60));
              const when = mins < 60 ? `il y a ${mins} min` : `il y a ${Math.round(mins / 60)} h`;
              return (
                <div key={t.upid} className="flex gap-2.5">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px]"
                    style={{ background: `${meta.color}26` }}
                  >
                    {meta.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12.5px] text-graphite-100">
                      <span className="font-mono font-semibold text-graphite-50">{t.node}</span> · VM {t.id} {meta.verb}
                    </div>
                    <div className="text-[11px] text-graphite-300 mt-0.5">{when}</div>
                  </div>
                </div>
              );
            })}
            {activity.length === 0 && (
              <div className="text-graphite-300 text-[13px] py-6 text-center">Aucune activité récente.</div>
            )}
          </div>
        </div>
      </div>

      {/* Top consumers */}
      <div className="card !p-0 overflow-hidden">
        <div className="flex justify-between items-center px-4 pt-3.5 pb-2.5">
          <div className="font-bold text-[14px] text-graphite-50">Plus gros consommateurs de ressources</div>
          <Link to="/vms" className="text-[12.5px] text-proxmox-400 font-semibold flex items-center gap-1 hover:text-proxmox-300">
            Toutes les VM <ArrowRight size={12} />
          </Link>
        </div>
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-graphite-300 text-[11px] uppercase tracking-wide">
              <td className="px-4 py-2">Nom</td>
              <td className="px-2.5 py-2">Hôte</td>
              <td className="px-2.5 py-2">État</td>
              <td className="px-2.5 py-2">CPU</td>
              <td className="px-4 py-2">RAM</td>
            </tr>
          </thead>
          <tbody>
            {topResources.map((r) => (
              <tr key={`${r.type}-${r.vmid}`} className="border-t border-graphite-700">
                <td className="px-4 py-2.5 font-semibold font-mono text-graphite-50">{r.name}</td>
                <td className="px-2.5 py-2.5 text-graphite-200 font-mono">{r.node}</td>
                <td className="px-2.5 py-2.5"><StatusPill status={r.status} /></td>
                <td className="px-2.5 py-2.5 text-graphite-100 font-mono">{r.cpuUsage}%</td>
                <td className="px-4 py-2.5 text-graphite-100 font-mono">{r.memUsage}%</td>
              </tr>
            ))}
            {topResources.length === 0 && (
              <tr><td colSpan={5} className="text-center text-graphite-300 text-[13px] py-6">Aucune ressource.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
