import { useState } from 'react';
import { Calendar, Plus, Clock } from 'lucide-react';

export default function BackupScheduling() {
  const [schedules] = useState([
    { id: '1', name: 'Daily VMs Backup', target: 'All VMs', schedule: '0 2 * * *', enabled: true, retention: 7 },
    { id: '2', name: 'Weekly Full Backup', target: 'Production', schedule: '0 0 * * 0', enabled: true, retention: 4 },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Backup Scheduling</h2>
          <p className="text-slate-400">Planifiez vos sauvegardes automatiques</p>
        </div>
        <button className="btn btn-primary">
          <Plus className="inline mr-2" size={16} />
          Nouvelle Planification
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {schedules.map((schedule) => (
          <div key={schedule.id} className="card">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-proxmox-600/20 rounded-lg flex items-center justify-center">
                  <Calendar className="text-proxmox-400" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{schedule.name}</h3>
                  <p className="text-sm text-slate-400">{schedule.target}</p>
                </div>
              </div>
              <span className={`status-badge ${schedule.enabled ? 'status-running' : 'status-stopped'}`}>
                {schedule.enabled ? 'Actif' : 'Inactif'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-slate-400 mb-1 flex items-center">
                  <Clock size={14} className="mr-1" />
                  Planning (cron)
                </p>
                <p className="text-white font-mono">{schedule.schedule}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-1">Rétention</p>
                <p className="text-white">{schedule.retention} backups</p>
              </div>
              <div className="flex items-end justify-end space-x-2">
                <button className="btn btn-secondary text-sm">Modifier</button>
                <button className="btn btn-danger text-sm">Supprimer</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
