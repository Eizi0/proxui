import { useState, useEffect } from 'react';
import { Archive, Download, Trash2, Clock } from 'lucide-react';

export default function Backups() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Implémenter l'API backups
    setTimeout(() => {
      setBackups([
        {
          id: '1',
          vmid: '100',
          name: 'web-server',
          type: 'VM',
          date: new Date('2026-01-12T10:30:00'),
          size: 5368709120,
          storage: 'local',
          format: 'vma.zst',
        },
        {
          id: '2',
          vmid: '101',
          name: 'database',
          type: 'VM',
          date: new Date('2026-01-12T09:15:00'),
          size: 10737418240,
          storage: 'local',
          format: 'vma.zst',
        },
        {
          id: '3',
          vmid: '200',
          name: 'app-container',
          type: 'LXC',
          date: new Date('2026-01-11T23:00:00'),
          size: 2147483648,
          storage: 'local',
          format: 'tar.zst',
        },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-full">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-proxmox-600"></div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Backups</h2>
          <p className="text-slate-400">Gérez vos sauvegardes VMs et Conteneurs</p>
        </div>
        <button className="btn btn-primary">
          <Archive className="inline mr-2" size={16} />
          Nouvelle Sauvegarde
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Total Backups</p>
              <p className="text-3xl font-bold text-white">{backups.length}</p>
            </div>
            <Archive size={40} className="text-white opacity-20" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Espace Utilisé</p>
              <p className="text-3xl font-bold text-white">
                {formatBytes(backups.reduce((acc, b) => acc + b.size, 0))}
              </p>
            </div>
            <Download size={40} className="text-white opacity-20" />
          </div>
        </div>
        <div className="card bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Dernier Backup</p>
              <p className="text-xl font-bold text-white">
                {backups[0]?.date ? formatRelativeTime(backups[0].date) : 'N/A'}
              </p>
            </div>
            <Clock size={40} className="text-white opacity-20" />
          </div>
        </div>
      </div>

      {/* Backup List */}
      <div className="card">
        <h3 className="text-xl font-bold text-white mb-4">Liste des Sauvegardes</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-700">
              <tr className="text-left">
                <th className="pb-3 text-slate-400 font-medium">VM/CT</th>
                <th className="pb-3 text-slate-400 font-medium">Nom</th>
                <th className="pb-3 text-slate-400 font-medium">Type</th>
                <th className="pb-3 text-slate-400 font-medium">Date</th>
                <th className="pb-3 text-slate-400 font-medium">Taille</th>
                <th className="pb-3 text-slate-400 font-medium">Storage</th>
                <th className="pb-3 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {backups.map((backup) => (
                <tr key={backup.id} className="text-slate-300">
                  <td className="py-3">{backup.vmid}</td>
                  <td className="py-3 font-medium text-white">{backup.name}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      backup.type === 'VM' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                      {backup.type}
                    </span>
                  </td>
                  <td className="py-3 text-sm">{backup.date.toLocaleString('fr-FR')}</td>
                  <td className="py-3">{formatBytes(backup.size)}</td>
                  <td className="py-3">{backup.storage}</td>
                  <td className="py-3">
                    <div className="flex space-x-2">
                      <button className="text-proxmox-400 hover:text-proxmox-300" title="Restaurer">
                        <Download size={18} />
                      </button>
                      <button className="text-red-400 hover:text-red-300" title="Supprimer">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

function formatRelativeTime(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // en secondes
  
  if (diff < 60) return 'À l\'instant';
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
  return `Il y a ${Math.floor(diff / 86400)}j`;
}
