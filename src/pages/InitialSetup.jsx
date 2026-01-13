import { useState, useEffect } from 'react';
import { Settings, Server, Database, Save, CheckCircle } from 'lucide-react';

export default function InitialSetup() {
  const [config, setConfig] = useState({
    proxmox: {
      host: '',
      user: 'root@pam',
      password: '',
      node: 'pve',
      verifySSL: false
    },
    backup: {
      host: '',
      user: 'root@pam',
      password: '',
      datastore: 'backup',
      verifySSL: false
    }
  });

  const [step, setStep] = useState(1);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saved, setSaved] = useState(false);

  const handleProxmoxChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      proxmox: { ...prev.proxmox, [field]: value }
    }));
  };

  const handleBackupChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      backup: { ...prev.backup, [field]: value }
    }));
  };

  const testProxmoxConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/config/test-proxmox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.proxmox)
      });

      const result = await response.json();
      setTestResult(result);
      
      if (result.success) {
        setTimeout(() => setStep(2), 1500);
      }
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setTesting(false);
    }
  };

  const testBackupConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/config/test-backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config.backup)
      });

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setTesting(false);
    }
  };

  const saveConfiguration = async () => {
    try {
      const response = await fetch('/api/config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Bienvenue sur ProxUI
          </h1>
          <p className="text-gray-400">
            Configuration initiale de votre environnement
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center ${step >= 1 ? 'text-blue-400' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-700'
              }`}>
                1
              </div>
              <span className="ml-2">Proxmox VE</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-700"></div>
            <div className={`flex items-center ${step >= 2 ? 'text-blue-400' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-700'
              }`}>
                2
              </div>
              <span className="ml-2">Proxmox Backup</span>
            </div>
          </div>
        </div>

        {/* Configuration Card */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          {step === 1 && (
            <div>
              <div className="flex items-center mb-6">
                <Server className="w-6 h-6 text-blue-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">
                  Configuration Proxmox VE
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Hôte Proxmox
                  </label>
                  <input
                    type="text"
                    value={config.proxmox.host}
                    onChange={(e) => handleProxmoxChange('host', e.target.value)}
                    placeholder="https://192.168.1.100:8006"
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Exemple: https://172.16.22.116:8006 ou https://localhost:8006 (avec tunnel SSH)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Utilisateur
                  </label>
                  <input
                    type="text"
                    value={config.proxmox.user}
                    onChange={(e) => handleProxmoxChange('user', e.target.value)}
                    placeholder="root@pam"
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={config.proxmox.password}
                    onChange={(e) => handleProxmoxChange('password', e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Node par défaut
                  </label>
                  <input
                    type="text"
                    value={config.proxmox.node}
                    onChange={(e) => handleProxmoxChange('node', e.target.value)}
                    placeholder="pve"
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="verifySSL"
                    checked={!config.proxmox.verifySSL}
                    onChange={(e) => handleProxmoxChange('verifySSL', !e.target.checked)}
                    className="w-4 h-4 text-blue-500 bg-gray-700 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="verifySSL" className="ml-2 text-sm text-gray-300">
                    Ignorer les erreurs de certificat SSL (auto-signé)
                  </label>
                </div>
              </div>

              {testResult && (
                <div className={`mt-4 p-4 rounded-lg ${
                  testResult.success ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'
                }`}>
                  <p className={`text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                    {testResult.message}
                  </p>
                </div>
              )}

              <button
                onClick={testProxmoxConnection}
                disabled={testing || !config.proxmox.host || !config.proxmox.password}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center"
              >
                {testing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Test de connexion...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Tester et continuer
                  </>
                )}
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="flex items-center mb-6">
                <Database className="w-6 h-6 text-blue-400 mr-3" />
                <h2 className="text-2xl font-bold text-white">
                  Configuration Proxmox Backup Server (Optionnel)
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Hôte Proxmox Backup Server
                  </label>
                  <input
                    type="text"
                    value={config.backup.host}
                    onChange={(e) => handleBackupChange('host', e.target.value)}
                    placeholder="https://192.168.1.101:8007"
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Laissez vide si vous n'utilisez pas Proxmox Backup Server
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Utilisateur
                  </label>
                  <input
                    type="text"
                    value={config.backup.user}
                    onChange={(e) => handleBackupChange('user', e.target.value)}
                    placeholder="root@pam"
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={config.backup.password}
                    onChange={(e) => handleBackupChange('password', e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Datastore
                  </label>
                  <input
                    type="text"
                    value={config.backup.datastore}
                    onChange={(e) => handleBackupChange('datastore', e.target.value)}
                    placeholder="backup"
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="backupVerifySSL"
                    checked={!config.backup.verifySSL}
                    onChange={(e) => handleBackupChange('verifySSL', !e.target.checked)}
                    className="w-4 h-4 text-blue-500 bg-gray-700 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <label htmlFor="backupVerifySSL" className="ml-2 text-sm text-gray-300">
                    Ignorer les erreurs de certificat SSL
                  </label>
                </div>
              </div>

              {testResult && (
                <div className={`mt-4 p-4 rounded-lg ${
                  testResult.success ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'
                }`}>
                  <p className={`text-sm ${testResult.success ? 'text-green-400' : 'text-red-400'}`}>
                    {testResult.message}
                  </p>
                </div>
              )}

              <div className="flex space-x-4 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors"
                >
                  Retour
                </button>

                {config.backup.host && (
                  <button
                    onClick={testBackupConnection}
                    disabled={testing}
                    className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-colors"
                  >
                    {testing ? 'Test...' : 'Tester PBS'}
                  </button>
                )}

                <button
                  onClick={saveConfiguration}
                  disabled={saved}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center"
                >
                  {saved ? (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Sauvegardé !
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Terminer
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Vous pourrez modifier ces paramètres plus tard dans les réglages
        </p>
      </div>
    </div>
  );
}
