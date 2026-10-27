import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Server, 
  Box, 
  Container, 
  HardDrive,
  ChevronLeft,
  ChevronDown,
  Network,
  Archive,
  Database,
  Rocket,
  GitBranch,
  Camera,
  Calendar,
  Settings,
  Bell,
  Activity,
  Download
} from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { translate } from '../i18n/translations';

const menuSections = [
  {
    title: 'Dashboard',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    title: 'Infrastructure',
    items: [
      { path: '/hosts', label: 'Hosts/Nodes', icon: HardDrive },
      { path: '/vms', label: 'Virtual Machines', icon: Server },
      { path: '/containers', label: 'Containers LXC/Docker', icon: Container },
      { path: '/storages', label: 'Storages', icon: Database },
      { path: '/network', label: 'Network', icon: Network },
      { path: '/backups', label: 'Backups', icon: Archive },
    ]
  },
  {
    title: 'Operations',
    items: [
      { path: '/deploy-vm', label: 'Deploy VM', icon: Rocket },
      { path: '/deploy-container', label: 'Deploy Container', icon: Box },
      { path: '/downloads', label: 'ISO & Templates', icon: Download },
      { path: '/migration', label: 'Migration', icon: GitBranch },
      { path: '/snapshots', label: 'Snapshots', icon: Camera },
    ]
  },
  {
    title: 'Management',
    items: [
      { path: '/backup-scheduling', label: 'Backup Scheduling', icon: Calendar },
      { path: '/settings', label: 'Settings', icon: Settings },
    ]
  },
  {
    title: 'Monitoring',
    items: [
      { path: '/monitoring', label: 'Monitoring & Alerts', icon: Bell },
    ]
  }
];

export default function Sidebar({ isOpen, setIsOpen }) {
  const { language } = useApp();
  const [expandedSections, setExpandedSections] = useState({
    Dashboard: true,
    Infrastructure: true,
    Operations: false,
    Management: false,
    Monitoring: true,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <aside
      className={`${
        isOpen ? 'w-64' : 'w-20'
      } bg-graphite-900 border-r border-graphite-600 transition-all duration-300 flex flex-col`}
    >
      {/* Logo Section */}
      <div className="p-4 border-b border-graphite-600">
        {isOpen ? (
          <div className="flex items-center justify-center">
            <img src="/logo.png" alt="Proxmox UI" className="h-12 w-auto" />
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <img src="/logo-icon.png" alt="Proxmox" className="h-10 w-auto" />
          </div>
        )}
      </div>

      {/* Toggle Button */}
      <div className="px-4 py-2 flex justify-end">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-graphite-300 hover:text-graphite-50 transition-colors"
        >
          <ChevronLeft
            size={20}
            className={`transition-transform ${!isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {menuSections.map((section) => (
          <div key={section.title} className="mb-2">
            {isOpen && section.title !== 'Dashboard' && (
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center justify-between w-full px-2 py-2 text-[10.5px] font-bold text-graphite-400 uppercase tracking-wider hover:text-graphite-200 transition-colors"
              >
                <span>{translate(section.title, language)}</span>
                <ChevronDown
                  size={14}
                  className={`transition-transform ${
                    expandedSections[section.title] ? '' : '-rotate-90'
                  }`}
                />
              </button>
            )}
            
            {(section.title === 'Dashboard' || !isOpen || expandedSections[section.title]) && (
              <div className={`space-y-1 ${isOpen ? '' : 'mt-2'}`}>
                {section.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-[13.5px] font-medium border-l-2 ${
                        isActive
                          ? 'bg-proxmox-500/10 text-proxmox-300 border-proxmox-500'
                          : 'text-graphite-200 hover:text-graphite-50 hover:bg-graphite-800 border-transparent'
                      }`
                    }
                    title={!isOpen ? translate(item.label, language) : ''}
                  >
                    <item.icon size={18} />
                    {isOpen && <span className="font-medium">{translate(item.label, language)}</span>}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-graphite-600">
        <div className={`${isOpen ? 'text-center' : ''} text-xs text-graphite-400 font-mono`}>
          {isOpen ? 'ProxUI v1.0.0' : 'v1.0'}
        </div>
      </div>
    </aside>
  );
}
