import { useState } from 'react';
import { Camera, Plus, Trash2, RotateCcw } from 'lucide-react';

export default function Snapshots() {
  const [snapshots] = useState([
    { id: '1', vmid: '100', name: 'before-update', description: 'Before system update', date: new Date('2026-01-12T08:00:00'), size: 2147483648 },
    { id: '2', vmid: '101', name: 'clean-install', description: 'Fresh installation', date: new Date('2026-01-10T14:30:00'), size: 3221225472 },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Snapshots</h2>
          <p className="text-slate-400">Gérez les snapshots de vos VMs et conteneurs</p>
        </div>
        <button className="btn btn-primary">
          <Plus className="inline mr-2" size={16} />
          Nouveau Snapshot
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-700">
              <tr className="text-left">
                <th className="pb-3 text-slate-400 font-medium">VM/CT</th>
                <th className="pb-3 text-slate-400 font-medium">Nom</th>
                <th className="pb-3 text-slate-400 font-medium">Description</th>
                <th className="pb-3 text-slate-400 font-medium">Date</th>
                <th className="pb-3 text-slate-400 font-medium">Taille</th>
                <th className="pb-3 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {snapshots.map((snapshot) => (
                <tr key={snapshot.id} className="text-slate-300">
                  <td className="py-3">{snapshot.vmid}</td>
                  <td className="py-3 font-medium text-white">{snapshot.name}</td>
                  <td className="py-3">{snapshot.description}</td>
                  <td className="py-3 text-sm">{snapshot.date.toLocaleString('fr-FR')}</td>
                  <td className="py-3">{formatBytes(snapshot.size)}</td>
                  <td className="py-3">
                    <div className="flex space-x-2">
                      <button className="text-green-400 hover:text-green-300" title="Restaurer">
                        <RotateCcw size={18} />
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
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
