import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';

export default function Header({ toggleSidebar }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <Menu size={24} />
          </button>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="text-sm text-slate-400">
            {currentTime.toLocaleString('fr-FR')}
          </div>
        </div>
      </div>
    </header>
  );
}
