import { useState } from 'react';
import { GitBranch, ArrowRight } from 'lucide-react';

export default function Migration() {
  const [sourceType, setSourceType] = useState('vm');
  const [selectedSource, setSelectedSource] = useState('');
  const [targetNode, setTargetNode] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">Migration</h2>
        <p className="text-slate-400">Migrez vos VMs et conteneurs entre nodes</p>
      </div>

      <div className="card max-w-4xl">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center">
          <GitBranch className="mr-2" />
          Configurer la Migration
        </h3>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Type de ressource</label>
            <div className="flex space-x-4">
              <button
                onClick={() => setSourceType('vm')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  sourceType === 'vm' ? 'bg-proxmox-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                Machine Virtuelle
              </button>
              <button
                onClick={() => setSourceType('lxc')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  sourceType === 'lxc' ? 'bg-proxmox-600 text-white' : 'bg-slate-700 text-slate-300'
                }`}
              >
                Container LXC
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Source</label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            >
              <option value="">Sélectionner une {sourceType === 'vm' ? 'VM' : 'Container'}</option>
              <option value="100">100 - web-server</option>
              <option value="101">101 - database</option>
            </select>
          </div>

          <div className="flex items-center justify-center py-4">
            <ArrowRight className="text-proxmox-400" size={32} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Node de destination</label>
            <select
              value={targetNode}
              onChange={(e) => setTargetNode(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            >
              <option value="">Sélectionner un node</option>
              <option value="pve2">pve2</option>
              <option value="pve3">pve3</option>
            </select>
          </div>

          <div className="flex space-x-4 border-t border-slate-700 pt-6">
            <button className="btn btn-primary">
              <GitBranch className="inline mr-2" size={16} />
              Démarrer la Migration
            </button>
            <button className="btn btn-secondary">Annuler</button>
          </div>
        </div>
      </div>
    </div>
  );
}
