import React from 'react';
import { Database, Terminal, Settings, Layers, Flame } from 'lucide-react';

interface ActivityBarProps {
  activeTab: 'explorer' | 'editor' | 'erd' | 'settings';
  setActiveTab: (tab: 'explorer' | 'editor' | 'erd' | 'settings') => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <div className="w-12 bg-surface-950 border-r border-border-subtle flex flex-col items-center py-3 select-none flex-shrink-0 z-20">
      {/* App Logo / Brand */}
      <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/30 flex items-center justify-center mb-6 text-brand-400 font-bold shadow-sm">
        <Flame className="w-5 h-5 text-brand-400" />
      </div>

      {/* Top Nav Items */}
      <div className="flex flex-col gap-2 w-full items-center">
        <button
          onClick={() => setActiveTab('explorer')}
          title="Server Explorer"
          className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            activeTab === 'explorer'
              ? 'bg-surface-800 text-brand-400 font-medium'
              : 'text-gray-400 hover:text-gray-200 hover:bg-surface-800/60'
          }`}
        >
          {activeTab === 'explorer' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 rounded-r" />
          )}
          <Database className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveTab('editor')}
          title="SQL Query Editor"
          className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            activeTab === 'editor'
              ? 'bg-surface-800 text-brand-400 font-medium'
              : 'text-gray-400 hover:text-gray-200 hover:bg-surface-800/60'
          }`}
        >
          {activeTab === 'editor' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 rounded-r" />
          )}
          <Terminal className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveTab('erd')}
          title="Schema & ERD Visualizer"
          className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            activeTab === 'erd'
              ? 'bg-surface-800 text-brand-400 font-medium'
              : 'text-gray-400 hover:text-gray-200 hover:bg-surface-800/60'
          }`}
        >
          {activeTab === 'erd' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 rounded-r" />
          )}
          <Layers className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Nav Items */}
      <div className="mt-auto flex flex-col gap-2 w-full items-center">
        <button
          onClick={() => setActiveTab('settings')}
          title="Settings"
          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
            activeTab === 'settings'
              ? 'bg-surface-800 text-brand-400'
              : 'text-gray-400 hover:text-gray-200 hover:bg-surface-800/60'
          }`}
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
