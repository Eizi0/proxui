import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Settings, Play, Square, Terminal } from 'lucide-react';
import StatusPill from '../components/ui/StatusPill';
import EditVMModal from '../components/EditVMModal';

function formatBytes(bytes) {
  if (!bytes) return '0 Go';
  return `${(bytes / 1073741824).toFixed(1)} Go`;
}

const TABS = [
  { key: 'all', label: 'Toutes' },
  { key: 'qemu', label: 'Machines virtuelles' },
  { key: 'lxc', label: 'Conteneurs LXC' },
];

export default function VMs() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // { vmid, node }

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, []);

  const load = async () => {
    try {
      const res = await fetch('/api/stats/recent-resources?limit=500');
      const data = await res.json();
      setResources(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erreur de chargement des VM/conteneurs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (r, action) => {
    const base = r.type === 'lxc' ? '/api/proxmox/lxc' : '/api/proxmox/vms';
    try {
      await fetch(`${base}/${r.vmid}/${action}?node=${r.node}`, { method: 'POST' });
      setTimeout(load, 1200);
    } catch (error) {
      console.error(`Erreur action ${action}:`, error);
    }
  };

  const counts = useMemo(() => ({
    all: resources.length,
    qemu: resources.filter((r) => r.type === 'qemu').length,
    lxc: resources.filter((r) => r.type === 'lxc').length,
  }), [resources]);

  const filtered = useMemo(() => {
    return resources.filter((r) => {
      if (tab !== 'all' && r.type !== tab) return false;
      if (query && !r.name.toLowerCase().includes(query.toLowerCase()) && !String(r.vmid).includes(query)) return false;
      return true;
    });
  }, [resources, tab, query]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-proxmox-500" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-extrabold text-graphite-50">Machines virtuelles &amp; conteneurs</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-graphite-600 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`pb-2.5 text-[13px] font-semibold border-b-2 transition-colors ${
              tab === t.key ? 'text-graphite-50 border-proxmox-500' : 'text-graphite-300 border-transparent hover:text-graphite-100'
            }`}
          >
            {t.label} <span className="font-mono text-graphite-400 font-medium">({counts[t.key]})</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2.5 mb-3.5">
        <div className="flex items-center gap-2 bg-graphite-850 border border-graphite-600 rounded-lg px-3 py-1.5 flex-1 max-w-sm">
          <Search size={13} className="text-graphite-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer par nom ou ID…"
            className="bg-transparent text-[12.5px] text-graphite-50 placeholder-graphite-400 outline-none flex-1"
          />
        </div>
        <span className="text-[12px] text-graphite-300 font-mono">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="text-graphite-300 text-[11px] uppercase tracking-wide bg-graphite-900">
              <td className="px-4 py-2.5">Nom</td>
              <td className="px-2.5 py-2.5">ID</td>
              <td className="px-2.5 py-2.5">Hôte</td>
              <td className="px-2.5 py-2.5">État</td>
              <td className="px-2.5 py-2.5">CPU</td>
              <td className="px-2.5 py-2.5">RAM</td>
              <td className="px-4 py-2.5 w-28"></td>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const isRunning = r.status === 'running';
              return (
                <tr key={`${r.type}-${r.vmid}`} className="border-t border-graphite-700 hover:bg-graphite-900/60">
                  <td className="px-4 py-2.5">
                    <Link to={`/vms/${r.vmid}`} className="flex items-center gap-2 font-semibold font-mono text-graphite-50 hover:text-proxmox-400">
                      <span>{r.type === 'lxc' ? '📦' : '🖥️'}</span>{r.name}
                    </Link>
                  </td>
                  <td className="px-2.5 py-2.5 text-graphite-300 font-mono">{r.vmid}</td>
                  <td className="px-2.5 py-2.5 text-graphite-200 font-mono">{r.node}</td>
                  <td className="px-2.5 py-2.5"><StatusPill status={r.status} /></td>
                  <td className="px-2.5 py-2.5">
                    <div className="flex items-center gap-2 w-24">
                      <div className="w-11 h-1 rounded-full bg-graphite-700">
                        <div className="h-full rounded-full bg-proxmox-500" style={{ width: `${r.cpuUsage}%` }} />
                      </div>
                      <span className="font-mono text-[11px] text-graphite-200">{r.cpuUsage}%</span>
                    </div>
                  </td>
                  <td className="px-2.5 py-2.5 text-graphite-100 font-mono">{formatBytes(r.mem)} <span className="text-graphite-400">/ {formatBytes(r.maxmem)}</span></td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      {isRunning ? (
                        <button onClick={() => handleAction(r, 'shutdown')} title="Arrêter" className="w-7 h-7 rounded-md border border-graphite-600 bg-graphite-800 flex items-center justify-center text-graphite-200 hover:text-red-400">
                          <Square size={12} />
                        </button>
                      ) : (
                        <button onClick={() => handleAction(r, 'start')} title="Démarrer" className="w-7 h-7 rounded-md border border-graphite-600 bg-graphite-800 flex items-center justify-center text-graphite-200 hover:text-emerald-400">
                          <Play size={12} />
                        </button>
                      )}
                      {r.type === 'qemu' && (
                        <button
                          onClick={() => setEditing({ vmid: r.vmid, node: r.node })}
                          title="Modifier"
                          className="w-7 h-7 rounded-md border border-graphite-600 bg-graphite-800 flex items-center justify-center text-graphite-200 hover:text-graphite-50"
                        >
                          <Settings size={12} />
                        </button>
                      )}
                      <Link to={`/vms/${r.vmid}`} title="Détail" className="w-7 h-7 rounded-md border border-graphite-600 bg-graphite-800 flex items-center justify-center text-graphite-200 hover:text-graphite-50">
                        <Terminal size={12} />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center text-graphite-300 text-[13px] py-10">Aucun résultat.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <EditVMModal
        vmid={editing?.vmid}
        node={editing?.node}
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        onSave={() => { setEditing(null); load(); }}
      />
    </div>
  );
}
