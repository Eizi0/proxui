import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [language, setLanguage] = useState('fr');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    // Appliquer la langue au document
    document.documentElement.lang = language;
  }, [language]);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      if (data.language) setLanguage(data.language);
    } catch (error) {
      console.error('Erreur chargement config:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLanguage = (newLanguage) => {
    setLanguage(newLanguage);
  };

  const value = {
    language,
    loading,
    updateLanguage,
    reloadConfig: loadConfig,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
