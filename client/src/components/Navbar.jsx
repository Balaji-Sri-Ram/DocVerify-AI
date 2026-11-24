import React from 'react';
import { ShieldCheck, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import DocVerifyLogo from './DocVerifyLogo';

export default function Navbar({ activeTab, setActiveTab, modelStatus, serverOnline, checkingStatus, onRefreshStatus }) {
  const isReady = serverOnline && modelStatus?.isReady;
  const testAcc = modelStatus?.metadata?.evaluation?.test?.accuracy
    ? `${(modelStatus.metadata.evaluation.test.accuracy * 100).toFixed(1)}% Acc`
    : null;

  return (
    <header className="border-b border-muted-border bg-warm-white sticky top-0 z-50 shadow-xs">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4">
          {/* Top Line on Mobile: Brand + Compact Status */}
          <div className="flex items-center justify-between w-full sm:w-auto">
            {/* Brand Logo & Name */}
            <div 
              className="flex items-center space-x-2 sm:space-x-2.5 cursor-pointer group" 
              onClick={() => setActiveTab('home')}
            >
              <DocVerifyLogo className="w-8 h-8 sm:w-9 sm:h-9 text-forest-deep shrink-0 group-hover:text-forest transition-transform group-hover:scale-105" />
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5 sm:space-x-2">
                  <h1 className="text-base sm:text-lg font-bold text-forest-deep tracking-tight truncate">
                    DocVerify AI
                  </h1>
                </div>
                <p className="text-[10px] sm:text-xs text-forest/70 truncate hidden xs:block">
                  Document Classification & Verification
                </p>
              </div>
            </div>

            {/* Mobile-only compact status and refresh button */}
            <div className="flex sm:hidden items-center space-x-1">
              {checkingStatus ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-beige text-forest/70">
                  <RefreshCw className="w-2.5 h-2.5 mr-1 animate-spin" /> Checking
                </span>
              ) : isReady ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sage/70 text-forest border border-sage-dark/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-forest mr-1 animate-pulse" />
                  Ready
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-800 border border-red-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 mr-1" />
                  Offline
                </span>
              )}

              <button
                onClick={onRefreshStatus}
                title="Refresh status"
                aria-label="Refresh status"
                className="p-1 rounded-lg text-forest/60 hover:text-forest active:bg-beige transition-colors touch-manipulation"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs & Desktop Status Pill */}
          <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-3 w-full sm:w-auto">
            <nav className="grid grid-cols-2 sm:flex sm:space-x-1 bg-beige-light p-1 rounded-xl border border-muted-border text-xs font-medium w-full sm:w-auto">
              <button
                onClick={() => setActiveTab('home')}
                className={`px-3 py-1.5 sm:px-3.5 rounded-lg transition-all text-center cursor-pointer touch-manipulation ${
                  activeTab === 'home'
                    ? 'bg-warm-white text-forest font-bold shadow-xs'
                    : 'text-forest/70 hover:text-forest active:text-forest'
                }`}
              >
                <span className="sm:hidden">Overview</span>
                <span className="hidden sm:inline">Overview & Specs</span>
              </button>
              <button
                onClick={() => setActiveTab('verify')}
                className={`px-3 py-1.5 sm:px-3.5 rounded-lg transition-all text-center cursor-pointer touch-manipulation ${
                  activeTab === 'verify'
                    ? 'bg-forest text-warm-white font-bold shadow-xs'
                    : 'text-forest/70 hover:text-forest active:text-forest'
                }`}
              >
                <span className="sm:hidden">Verify</span>
                <span className="hidden sm:inline">Verify Document</span>
              </button>
            </nav>

            {/* Desktop Status Pill */}
            <div className="hidden sm:flex items-center space-x-1.5 pl-2 border-l border-muted-border shrink-0">
              {checkingStatus ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-beige text-forest/70">
                  <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" /> Checking...
                </span>
              ) : isReady ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-sage/60 text-forest border border-sage-dark/40">
                  <CheckCircle2 className="w-3 h-3 mr-1 text-forest" />
                  <span>Model Ready{testAcc ? ` • ${testAcc}` : ''}</span>
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-red-100 text-red-800 border border-red-200">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  <span>Backend Offline</span>
                </span>
              )}

              <button
                onClick={onRefreshStatus}
                title="Refresh status"
                aria-label="Refresh status"
                className="p-1 rounded-lg text-forest/60 hover:text-forest hover:bg-beige transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
