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
      } bg-slate-800 border-r border-slate-700 transition-all duration-300 flex flex-col`}
    >
      <div className="p-6 flex items-center justify-between">
        {isOpen && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-proxmox-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <span className="text-white font-bold text-lg">ProxUI</span>
          </div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-slate-400 hover:text-white transition-colors"
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
                className="flex items-center justify-between w-full px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-300 transition-colors"
              >
                <span>{section.title}</span>
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
                      `flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                        isActive
                          ? 'bg-proxmox-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-700'
                      }`
                    }
                    title={!isOpen ? item.label : ''}
                  >
                    <item.icon size={18} />
                    {isOpen && <span className="font-medium">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className={`${isOpen ? 'text-center' : ''} text-xs text-slate-500`}>
          {isOpen ? 'ProxUI v1.0.0' : 'v1.0'}
        </div>
      </div>
    </aside>
  );
}
