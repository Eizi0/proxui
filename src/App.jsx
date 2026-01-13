import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Hosts from './pages/Hosts';
import HostDetails from './pages/HostDetails';
import VMs from './pages/VMs';
import Containers from './pages/Containers';
import Storages from './pages/Storages';
import Network from './pages/Network';
import Backups from './pages/Backups';
import DeployVM from './pages/DeployVM';
import DeployContainer from './pages/DeployContainer';
import Downloads from './pages/Downloads';
import Migration from './pages/Migration';
import Snapshots from './pages/Snapshots';
import BackupScheduling from './pages/BackupScheduling';
import Settings from './pages/Settings';
import Monitoring from './pages/Monitoring';
import InitialSetup from './pages/InitialSetup';

function App() {
  const [configured, setConfigured] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      const response = await fetch('/api/config/check');
      const data = await response.json();
      setConfigured(data.configured);
    } catch (error) {
      console.error('Erreur vérification config:', error);
      setConfigured(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!configured) {
    return <InitialSetup />;
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          
          {/* Infrastructure */}
          <Route path="/hosts" element={<Hosts />} />
          <Route path="/hosts/:node" element={<HostDetails />} />
          <Route path="/vms" element={<VMs />} />
          <Route path="/containers" element={<Containers />} />
          <Route path="/storages" element={<Storages />} />
          <Route path="/network" element={<Network />} />
          <Route path="/backups" element={<Backups />} />
          
          {/* Operations */}
          <Route path="/deploy-vm" element={<DeployVM />} />
          <Route path="/deploy-container" element={<DeployContainer />} />
          <Route path="/downloads" element={<Downloads />} />
          <Route path="/migration" element={<Migration />} />
          <Route path="/snapshots" element={<Snapshots />} />
          
          {/* Management */}
          <Route path="/backup-scheduling" element={<BackupScheduling />} />
          <Route path="/settings" element={<Settings />} />
          
          {/* Monitoring */}
          <Route path="/monitoring" element={<Monitoring />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
