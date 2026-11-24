import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import HomeView from './components/HomeView';
import VerifyView from './components/VerifyView';
import Footer from './components/Footer';
import { stopAllCameraHardware } from './components/DocumentScanner';
import { checkHealth, getModelStatus, getDatasetStats } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'verify'
  const [serverOnline, setServerOnline] = useState(false);
  const [modelStatus, setModelStatus] = useState(null);
  const [datasetStats, setDatasetStats] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  const handleTabChange = (newTab) => {
    if (newTab !== 'verify') {
      stopAllCameraHardware();
    }
    setActiveTab(newTab);
  };

  const fetchStatus = async () => {
    setCheckingStatus(true);
    try {
      const [healthRes, statusRes, statsRes] = await Promise.all([
        checkHealth(),
        getModelStatus(),
        getDatasetStats()
      ]);

      setServerOnline(healthRes.success && healthRes.data?.status === 'ok');

      if (statusRes.success) {
        setModelStatus(statusRes.data);
      } else {
        setModelStatus(null);
      }

      if (statsRes.success) {
        setDatasetStats(statsRes.data);
      }
    } catch (err) {
      setServerOnline(false);
      setModelStatus(null);
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll status periodically (every 15 seconds)
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-beige flex flex-col font-sans text-forest-deep selection:bg-forest selection:text-warm-white overflow-x-hidden">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        modelStatus={modelStatus}
        serverOnline={serverOnline}
        checkingStatus={checkingStatus}
        onRefreshStatus={fetchStatus}
      />

      {/* Main Container */}
      <main className="max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-8 flex-1 w-full">
        {activeTab === 'home' ? (
          <HomeView
            onStartVerification={() => setActiveTab('verify')}
            modelStatus={modelStatus}
            datasetStats={datasetStats}
          />
        ) : (
          <VerifyView />
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
