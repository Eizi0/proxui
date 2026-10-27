import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Play, Square, RotateCw, Terminal, Camera, Settings as SettingsIcon } from 'lucide-react';
import StatusPill from '../components/ui/StatusPill';
import Sparkline from '../components/ui/Sparkline';

function formatBytes(bytes) {
  if (!bytes) return '0 Go';
  return `${(bytes / 1073741824).toFixed(1)} Go`;
}

function formatUptime(seconds) {
  if (!seconds) return 'N/A';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days} j ${hours} h`;
}

const TABS = ['Résumé', 'Disques', 'Réseau', 'Snapshots', 'Journal'];

export default function VMDetail() {
  const { vmid } = useParams();
  const [loading, setLoading] = useState(true);
  const [resource, setResource] = useState(null); // entrée de /api/proxmox/resources : donne type + node
  const [config, setConfig] = useState(null);
  const [rrd, setRrd] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('Résumé');
  const [acting, setActing] = useState(false);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [vmid]);

  const load = async () => {
    try {
      // On ne connaît pas encore le nœud ni le type (VM/LXC) de cet ID :
      // /cluster/resources est la seule vue qui couvre tout le cluster sans
      // qu'on ait besoin de le préciser d'avance.
      const all = await fetch('/api/proxmox/resources').then((r) => r.json());
      const res = Array.isArray(all) ? all.find((r) => String(r.vmid) === String(vmid)) : null;
      if (!res) { setLoading(false); return; }
      setResource(res);

      const base = res.type === 'lxc' ? '/api/proxmox/lxc' : '/api/proxmox/vms';
      const qs = `?node=${res.node}`;
      const [cfg, rrdData, snaps, nodeTasks] = await Promise.all([
        fetch(`${base}/${vmid}/config${qs}`).then((r) => (r.ok ? r.json() : {})),
        fetch(`${base}/${vmid}/rrddata${qs}&timeframe=hour`).then((r) => (r.ok ? r.json() : [])),
        fetch(`/api/snapshots/${res.type}/${vmid}${qs}`).then((r) => (r.ok ? r.json() : [])),
        fetch(`/api/proxmox/nodes/${res.node}/tasks?limit=30`).then((r) => (r.ok ? r.json() : [])),
      ]);
      setConfig(cfg);
      setRrd(Array.isArray(rrdData) ? rrdData : []);
      setSnapshots(Array.isArray(snaps) ? snaps.filter((s) => s.name !== 'current') : []);
      setTasks(Array.isArray(nodeTasks) ? nodeTasks.filter((t) => String(t.id) === String(vmid)) : []);
    } catch (error) {
      console.error('Erreur de chargement de la VM:', error);
    } finally {
      setLoading(false);
    }
  };

  const doAction = async (action) => {
    if (!resource) return;
    setActing(true);
    const base = resource.type === 'lxc' ? '/api/proxmox/lxc' : '/api/proxmox/vms';
    try {
      await fetch(`${base}/${vmid}/${action}?node=${resource.node}`, { method: 'POST' });
    } catch (error) {
      console.error(`Erreur action ${action}:`, error);
    } finally {
      setTimeout(() => { load(); setActing(false); }, 1500);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-proxmox-500" /></div>;
  }
  if (!resource) {
    return (
      <div className="text-center py-16 text-graphite-200">
        VM/conteneur {vmid} introuvable. <Link to="/vms" className="text-proxmox-400">Retour à la liste</Link>
      </div>
    );
  }

  const isRunning = resource.status === 'running';
  const cpuSeries = rrd.map((p) => p.cpu || 0);
  const memSeries = rrd.map((p) => (p.maxmem ? (p.mem || 0) / p.maxmem : 0));
  const diskSeries = rrd.map((p) => (p.diskread || 0) + (p.diskwrite || 0));
  const netSeries = rrd.map((p) => (p.netin || 0) + (p.netout || 0));
  const diskMax = Math.max(...diskSeries, 1);
  const netMax = Math.max(...netSeries, 1);

  const charts = [
    { label: 'CPU', value: `${Math.round((resource.cpu || 0) * 100)}`, unit: '%', color: '#f26522', points: cpuSeries },
    { label: 'Mémoire', value: formatBytes(resource.mem).replace(' Go', ''), unit: ' Go', color: '#5ab0ff', points: memSeries },
    { label: 'Disque (E/S)', value: (diskMax / 1048576).toFixed(0), unit: ' Mo/s (crête)', color: '#22c55e', points: diskSeries.map((v) => v / diskMax) },
    { label: 'Réseau', value: (netMax / 1048576).toFixed(0), unit: ' Mo/s (crête)', color: '#a855f7', points: netSeries.map((v) => v / netMax) },
  ];

  return (
    <div>
      <Link to="/vms" className="inline-flex items-center gap-1.5 text-graphite-200 hover:text-graphite-50 text-[13px] mb-3 transition-colors">
        <ArrowLeft size={14} /> Machines virtuelles
      </Link>

      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-graphite-800 flex items-center justify-center text-lg">
            {resource.type === 'lxc' ? '📦' : '🖥️'}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[19px] font-extrabold font-mono text-graphite-50">{resource.name}</h1>
              <StatusPill status={resource.status} />
            </div>
            <div className="text-graphite-300 text-[12px] mt-0.5">
              {resource.type === 'lxc' ? 'LXC' : 'VM'} {vmid} · {resource.node} · {config?.ostype || '—'}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button disabled className="flex items-center gap-1.5 text-[12.5px] font-semibold border border-graphite-600 text-graphite-200 rounded-lg px-3 py-2 opacity-50 cursor-not-allowed" title="Console intégrée non encore implémentée">
            <Terminal size={13} /> Console
          </button>
          {isRunning ? (
            <>
              <button onClick={() => doAction('reboot')} disabled={acting} className="flex items-center gap-1.5 text-[12.5px] font-semibold border border-graphite-600 text-graphite-200 rounded-lg px-3 py-2 hover:text-graphite-50 disabled:opacity-50">
                <RotateCw size={13} /> Redémarrer
              </button>
              <button onClick={() => doAction('shutdown')} disabled={acting} className="flex items-center gap-1.5 text-[12.5px] font-semibold border border-graphite-600 text-graphite-200 rounded-lg px-3 py-2 hover:text-graphite-50 disabled:opacity-50">
                <Square size={13} /> Arrêter
              </button>
            </>
          ) : (
            <button onClick={() => doAction('start')} disabled={acting} className="flex items-center gap-1.5 text-[12.5px] font-semibold border border-graphite-600 text-graphite-200 rounded-lg px-3 py-2 hover:text-graphite-50 disabled:opacity-50">
              <Play size={13} /> Démarrer
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-graphite-600 mt-4 mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`pb-2.5 text-[13px] font-semibold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === t ? 'text-graphite-50 border-proxmox-500' : 'text-graphite-300 border-transparent hover:text-graphite-100'
            }`}
          >
            {t}
            {t === 'Snapshots' && <span className="font-mono text-graphite-400 font-medium"> ({snapshots.length})</span>}
          </button>
        ))}
      </div>

      {activeTab === 'Résumé' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5 mb-4">
            {charts.map((c) => (
              <div key={c.label} className="card !p-4">
                <div className="flex justify-between items-baseline mb-2">
                  <div className="text-[12px] text-graphite-200 font-semibold">{c.label}</div>
                  <div className="text-[15px] font-extrabold font-mono text-graphite-50">
                    {c.value}<span className="text-[10px] text-graphite-300 font-medium">{c.unit}</span>
                  </div>
                </div>
                <Sparkline points={c.points} color={c.color} height={40} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3.5">
            <div className="card !p-4">
              <div className="font-bold text-[14px] text-graphite-50 mb-3.5">Informations générales</div>
              <div className="grid grid-cols-2 gap-x-7 gap-y-3 text-[13px]">
                <InfoField label="Système" value={config?.ostype === 'l26' ? 'Linux' : config?.ostype || '—'} />
                <InfoField label="Cœurs" value={`${config?.cores || resource.maxcpu || '—'} vCPU`} />
                <InfoField label="Mémoire allouée" value={formatBytes(resource.maxmem)} />
                <InfoField label="Démarrage" value={config?.boot || '—'} />
                <InfoField label="Uptime" value={formatUptime(resource.uptime)} />
                <InfoField label="Démarrage auto" value={config?.onboot ? 'Activé' : 'Désactivé'} />
              </div>
            </div>

            <div className="card !p-4">
              <div className="font-bold text-[13.5px] text-graphite-50 mb-2.5">Tags</div>
              <div className="flex gap-1.5 flex-wrap">
                {(resource.tags || '').split(';').filter(Boolean).map((tag) => (
                  <span key={tag} className="pill pill-stopped">{tag}</span>
                ))}
                {!resource.tags && <span className="text-graphite-300 text-[12.5px]">Aucun tag</span>}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'Disques' && (
        <div className="card !p-4">
          <div className="font-bold text-[14px] text-graphite-50 mb-3">Disques</div>
          <div className="flex flex-col gap-2">
            {Object.entries(config || {})
              .filter(([k]) => /^(scsi|sata|virtio|ide|rootfs|mp)\d*$/.test(k))
              .map(([k, v]) => (
                <div key={k} className="flex justify-between text-[13px] py-2 border-b border-graphite-700 last:border-0">
                  <span className="text-graphite-300 font-mono">{k}</span>
                  <span className="text-graphite-100 font-mono">{String(v)}</span>
                </div>
              ))}
            {Object.keys(config || {}).filter((k) => /^(scsi|sata|virtio|ide|rootfs|mp)\d*$/.test(k)).length === 0 && (
              <div className="text-graphite-300 text-[13px] py-4 text-center">Aucun disque détecté dans la configuration.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'Réseau' && (
        <div className="card !p-4">
          <div className="font-bold text-[14px] text-graphite-50 mb-3">Interfaces réseau</div>
          <div className="flex flex-col gap-2">
            {Object.entries(config || {})
              .filter(([k]) => /^net\d+$/.test(k))
              .map(([k, v]) => (
                <div key={k} className="flex justify-between text-[13px] py-2 border-b border-graphite-700 last:border-0">
                  <span className="text-graphite-300 font-mono">{k}</span>
                  <span className="text-graphite-100 font-mono">{String(v)}</span>
                </div>
              ))}
            {Object.keys(config || {}).filter((k) => /^net\d+$/.test(k)).length === 0 && (
              <div className="text-graphite-300 text-[13px] py-4 text-center">Aucune interface détectée dans la configuration.</div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'Snapshots' && (
        <div className="card !p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="font-bold text-[14px] text-graphite-50">Snapshots</div>
            <button className="flex items-center gap-1.5 text-[12px] font-semibold bg-proxmox-600 hover:bg-proxmox-500 text-white rounded-lg px-3 py-1.5">
              <Camera size={12} /> Nouveau snapshot
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {snapshots.map((s) => (
              <div key={s.name} className="flex items-center justify-between py-2.5 border-b border-graphite-700 last:border-0">
                <div>
                  <div className="text-[13px] font-semibold font-mono text-graphite-50">{s.name}</div>
                  <div className="text-[11.5px] text-graphite-300 mt-0.5">{s.description}</div>
                </div>
                <div className="text-[11.5px] text-graphite-400 font-mono">
                  {s.snaptime ? new Date(s.snaptime * 1000).toLocaleString('fr-FR') : '—'}
                </div>
              </div>
            ))}
            {snapshots.length === 0 && <div className="text-graphite-300 text-[13px] py-6 text-center">Aucun snapshot.</div>}
          </div>
        </div>
      )}

      {activeTab === 'Journal' && (
        <div className="card !p-4">
          <div className="font-bold text-[14px] text-graphite-50 mb-3">Journal des tâches</div>
          <div className="flex flex-col gap-3">
            {tasks.map((t, i) => (
              <div key={t.upid || i} className="flex gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: t.status === 'OK' ? '#4ee296' : '#f87171' }} />
                <div>
                  <div className="text-[12.5px] text-graphite-100 font-mono">{t.type} · {t.user}</div>
                  <div className="text-[11px] text-graphite-300 mt-0.5">{new Date(t.starttime * 1000).toLocaleString('fr-FR')}</div>
                </div>
              </div>
            ))}
            {tasks.length === 0 && <div className="text-graphite-300 text-[13px] py-6 text-center">Aucune tâche récente pour cette ressource.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }) {
  return (
    <div>
      <div className="text-graphite-400 text-[10.5px] mb-0.5 uppercase tracking-wide">{label}</div>
      <div className="font-mono text-graphite-50">{value}</div>
    </div>
  );
}
