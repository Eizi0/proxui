import { useState, useEffect } from 'react';
import { Menu, Search, Bell, Plus } from 'lucide-react';

export default function Header({ toggleSidebar }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-graphite-900 border-b border-graphite-600 px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={toggleSidebar}
            className="text-graphite-300 hover:text-graphite-50 transition-colors flex-shrink-0"
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center gap-2 bg-graphite-850 border border-graphite-600 rounded-lg px-3 py-2 flex-1 max-w-sm">
            <Search size={14} className="text-graphite-400 flex-shrink-0" />
            <span className="text-graphite-400 text-[13px] truncate">
              Rechercher une VM, un hôte, un conteneur…
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-[11.5px] text-graphite-400 font-mono hidden lg:block">
            {currentTime.toLocaleString('fr-FR')}
          </div>
          <div className="w-px h-6 bg-graphite-600 hidden lg:block" />
          <button className="flex items-center gap-1.5 bg-proxmox-600 hover:bg-proxmox-500 text-white font-bold text-[13px] rounded-lg px-3.5 py-2 transition-colors">
            <Plus size={14} /> Nouvelle VM
          </button>
          <button className="relative text-graphite-200 hover:text-graphite-50 transition-colors">
            <Bell size={18} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 border-[1.5px] border-graphite-900" />
          </button>
          <div className="w-8 h-8 rounded-full bg-graphite-600 flex items-center justify-center text-[12px] font-bold text-graphite-100">
            JD
          </div>
        </div>
      </div>
    </header>
  );
}
