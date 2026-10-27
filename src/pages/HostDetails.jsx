import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Play, Pause, RotateCw } from 'lucide-react';
import StatusPill from '../components/ui/StatusPill';
import Sparkline from '../components/ui/Sparkline';

function formatBytes(bytes) {
  if (!bytes) return '0 Go';
  const gb = bytes / 1073741824;
  return gb >= 1 ? `${gb.toFixed(1)} Go` : `${(bytes / 1048576).toFixed(0)} Mo`;
}

function formatUptime(seconds) {
  if (!seconds) return 'N/A';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days} j ${hours} h`;
}

const TASK_LABELS = {
  qmsnapshot: 'snapshot créé', vzdump: 'sauvegarde terminée', qmigrate: 'migration terminée',
  vzrestart: 'conteneur redémarré', qmstart: 'démarrée', qmstop: 'arrêtée',
};

export default function HostDetails() {
  const { node } = useParams();
  const [loading, setLoading] = useState(true);
  const [nodeInfo, setNodeInfo] = useState(null);
  const [rrd, setRrd] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [services, setServices] = useState([]);
  const [vms, setVms] = useState([]);
  const [containers, setContainers] = useState([]);
  const [version, setVersion] = useState(null);
  const [actingService, setActingService] = useState(null);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [node]);

  const load = async () => {
    try {
      const [info, rrdData, taskList, serviceList, vmList, ctList, ver] = await Promise.all([
        fetch(`/api/proxmox/nodes/${node}/info`).then((r) => (r.ok ? r.json() : null)),
        fetch(`/api/proxmox/nodes/${node}/rrddata?timeframe=hour`).then((r) => (r.ok ? r.json() : [])),
        fetch(`/api/proxmox/nodes/${node}/tasks?limit=8`).then((r) => (r.ok ? r.json() : [])),
        fetch(`/api/proxmox/nodes/${node}/services`).then((r) => (r.ok ? r.json() : [])),
        fetch(`/api/proxmox/resources?type=vm&node=${node}`).then((r) => (r.ok ? r.json() : [])),
        fetch(`/api/proxmox/resources?type=lxc&node=${node}`).then((r) => (r.ok ? r.json() : [])),
        fetch(`/api/proxmox/nodes/${node}/version`).then((r) => (r.ok ? r.json() : null)),
      ]);
      const knownServices = ['pvedaemon', 'pveproxy', 'pve-cluster', 'pvestatd', 'pve-firewall', 'lxcfs'];
      setNodeInfo(info);
      setRrd(Array.isArray(rrdData) ? rrdData : []);
      setTasks(Array.isArray(taskList) ? taskList : []);
      setServices(Array.isArray(serviceList) ? serviceList.filter((s) => knownServices.includes(s.name)) : []);
      setVms(Array.isArray(vmList) ? vmList : []);
      setContainers(Array.isArray(ctList) ? ctList : []);
      setVersion(ver);
    } catch (error) {
      console.error('Erreur de chargement de l\'hôte:', error);
    } finally {
      setLoading(false);
    }
  };

  const controlService = async (service, action) => {
    setActingService(`${service}-${action}`);
    try {
      await fetch(`/api/proxmox/nodes/${node}/services/${service}/${action}`, { method: 'POST' });
    } catch (error) {
      console.error('Erreur de contrôle de service:', error);
    } finally {
      setTimeout(() => { load(); setActingService(null); }, 1500);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-proxmox-500" /></div>;
  }
  if (!nodeInfo) {
    return <div className="text-center py-16 text-graphite-200">Impossible de charger les informations de cet hôte.</div>;
  }

  const cpuPct = Math.round((nodeInfo.cpu || 0) * 100);
  const memPct = nodeInfo.memory?.total ? Math.round((nodeInfo.memory.used / nodeInfo.memory.total) * 100) : 0;

  const cpuSeries = rrd.map((p) => p.cpu || 0);
  const memSeries = rrd.map((p) => (nodeInfo.memory?.total ? (p.memused || 0) / nodeInfo.memory.total : 0));
  const netSeries = rrd.map((p) => ((p.netin || 0) + (p.netout || 0)) / 2);
  const netMax = Math.max(...netSeries, 1);

  const charts = [
    { label: 'CPU', value: `${cpuPct}`, unit: '%', color: '#f26522', points: cpuSeries },
    { label: 'Mémoire', value: `${memPct}`, unit: '%', color: '#5ab0ff', points: memSeries },
    { label: 'Réseau', value: `${(netMax / 1048576).toFixed(0)}`, unit: ' Mo/s (crête)', color: '#22c55e', points: netSeries.map((v) => v / netMax) },
  ];

  const allGuests = [
    ...vms.map((v) => ({ ...v, kind: 'VM' })),
    ...containers.map((c) => ({ ...c, kind: 'LXC' })),
  ];

  return (
    <div>
      <Link to="/hosts" className="inline-flex items-center gap-1.5 text-graphite-200 hover:text-graphite-50 text-[13px] mb-4 transition-colors">
        <ArrowLeft size={14} /> Hôtes
      </Link>

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-graphite-800 flex items-center justify-center text-xl">🖥️</div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-extrabold font-mono text-graphite-50">{node}</h1>
              <StatusPill status="online" />
            </div>
            <div className="text-graphite-200 text-[12.5px] mt-0.5">
              Proxmox VE {version?.version || '—'} · dispo. depuis {formatUptime(nodeInfo.uptime)}
            </div>
          </div>
        </div>
      </div>

      {/* Resource charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-4">
        {charts.map((c) => (
          <div key={c.label} className="card !p-4">
            <div className="flex justify-between items-baseline mb-2.5">
              <div className="text-[12.5px] text-graphite-200 font-semibold">{c.label}</div>
              <div className="text-lg font-extrabold font-mono text-graphite-50">
                {c.value}<span className="text-[11px] text-graphite-300 font-medium">{c.unit}</span>
              </div>
            </div>
            <Sparkline points={c.points} color={c.color} />
            <div className="flex justify-between text-[10.5px] text-graphite-400 mt-1">
              <span>-1 h</span><span>maintenant</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3.5">
        {/* Guests on this host */}
        <div className="card !p-0 overflow-hidden self-start">
          <div className="flex justify-between items-center px-4 pt-3.5 pb-2.5">
            <div className="font-bold text-[14px] text-graphite-50">VM &amp; conteneurs sur cet hôte</div>
            <span className="text-[12px] text-graphite-300 font-mono">{allGuests.length} au total</span>
          </div>
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="text-graphite-300 text-[11px] uppercase tracking-wide">
                <td className="px-4 py-2">Nom</td>
                <td className="px-2.5 py-2">Type</td>
                <td className="px-2.5 py-2">État</td>
                <td className="px-2.5 py-2">CPU</td>
                <td className="px-4 py-2">RAM</td>
              </tr>
            </thead>
            <tbody>
              {allGuests.map((g) => (
                <tr key={`${g.kind}-${g.vmid}`} className="border-t border-graphite-700">
                  <td className="px-4 py-2.5 font-semibold font-mono">
                    <Link to={`/vms/${g.vmid}`} className="text-graphite-50 hover:text-proxmox-400">{g.name}</Link>
                  </td>
                  <td className="px-2.5 py-2.5 text-graphite-200">{g.kind}</td>
                  <td className="px-2.5 py-2.5"><StatusPill status={g.status} /></td>
                  <td className="px-2.5 py-2.5 text-graphite-100 font-mono">{Math.round((g.cpu || 0) * 100)}%</td>
                  <td className="px-4 py-2.5 text-graphite-100 font-mono">{formatBytes(g.mem)}</td>
                </tr>
              ))}
              {allGuests.length === 0 && (
                <tr><td colSpan={5} className="text-center text-graphite-300 text-[13px] py-6">Aucune VM ni conteneur sur cet hôte.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3.5">
          {/* Hardware */}
          <div className="card !p-4">
            <div className="font-bold text-[13.5px] text-graphite-50 mb-2.5">Matériel</div>
            <div className="flex flex-col gap-2 text-[12.5px]">
              <div className="flex justify-between"><span className="text-graphite-300">CPU</span><span className="font-mono text-graphite-100 text-right">{nodeInfo.cpuinfo?.cpus || '—'} vCPU</span></div>
              <div className="flex justify-between"><span className="text-graphite-300">Modèle</span><span className="font-mono text-graphite-100 text-right truncate max-w-[180px]" title={nodeInfo.cpuinfo?.model}>{nodeInfo.cpuinfo?.model || '—'}</span></div>
              <div className="flex justify-between"><span className="text-graphite-300">Mémoire</span><span className="font-mono text-graphite-100">{formatBytes(nodeInfo.memory?.total)}</span></div>
              <div className="flex justify-between"><span className="text-graphite-300">Disque racine</span><span className="font-mono text-graphite-100">{formatBytes(nodeInfo.rootfs?.total)}</span></div>
              <div className="flex justify-between"><span className="text-graphite-300">Swap</span><span className="font-mono text-graphite-100">{formatBytes(nodeInfo.swap?.total)}</span></div>
            </div>
          </div>

          {/* Services */}
          <div className="card !p-4">
            <div className="font-bold text-[13.5px] text-graphite-50 mb-2.5">Services système</div>
            <div className="flex flex-col gap-2">
              {services.map((s) => {
                const key = s.name || s.service;
                return (
                  <div key={key} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.state === 'running' ? '#4ee296' : '#f87171' }} />
                      <span className="text-[12.5px] font-mono text-graphite-100 truncate">{key}</span>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      {s.state === 'running' ? (
                        <>
                          <button onClick={() => controlService(key, 'restart')} disabled={actingService === `${key}-restart`} className="w-6 h-6 rounded border border-graphite-600 bg-graphite-800 flex items-center justify-center text-graphite-200 hover:text-graphite-50 disabled:opacity-40">
                            <RotateCw size={11} />
                          </button>
                          <button onClick={() => controlService(key, 'stop')} disabled={actingService === `${key}-stop`} className="w-6 h-6 rounded border border-graphite-600 bg-graphite-800 flex items-center justify-center text-graphite-200 hover:text-red-400 disabled:opacity-40">
                            <Pause size={11} />
                          </button>
                        </>
                      ) : (
                        <button onClick={() => controlService(key, 'start')} disabled={actingService === `${key}-start`} className="w-6 h-6 rounded border border-graphite-600 bg-graphite-800 flex items-center justify-center text-graphite-200 hover:text-emerald-400 disabled:opacity-40">
                          <Play size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {services.length === 0 && <div className="text-graphite-300 text-[12.5px] py-2">Aucun service.</div>}
            </div>
          </div>

          {/* Recent events */}
          <div className="card !p-4">
            <div className="font-bold text-[13.5px] text-graphite-50 mb-2.5">Tâches récentes</div>
            <div className="flex flex-col gap-3">
              {tasks.map((t, i) => {
                const mins = Math.max(0, Math.round((Date.now() / 1000 - t.starttime) / 60));
                const when = mins < 60 ? `il y a ${mins} min` : `il y a ${Math.round(mins / 60)} h`;
                return (
                  <div key={t.upid || i} className="flex gap-2">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: t.status === 'OK' ? '#4ee296' : t.status === 'running' ? '#5ab0ff' : '#f87171' }} />
                    <div className="min-w-0">
                      <div className="text-[12px] text-graphite-100">{TASK_LABELS[t.type] || t.type} — VM {t.id}</div>
                      <div className="text-[10.5px] text-graphite-300 mt-0.5">{when}</div>
                    </div>
                  </div>
                );
              })}
              {tasks.length === 0 && <div className="text-graphite-300 text-[12.5px] py-2">Aucune tâche récente.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
