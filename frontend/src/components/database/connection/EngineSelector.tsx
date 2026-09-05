import React from 'react';
import { ConnectionConfig } from '../../../types/connection';

interface EngineSelectorProps {
  selectedEngine: 'postgres' | 'mysql' | 'mongodb';
  onSelectEngine: (engine: 'postgres' | 'mysql' | 'mongodb') => void;
  formData: ConnectionConfig;
  onPortChange: (port: number) => void;
}

export const EngineSelector: React.FC<EngineSelectorProps> = ({
  selectedEngine,
  onSelectEngine,
  formData,
  onPortChange,
}) => {
  return (
    <div className="px-6 pt-4 pb-2 bg-surface-850 border-b border-border/60">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
        Select Engine
      </label>
      <div className="grid grid-cols-3 gap-2">
        {/* PostgreSQL Tab */}
        <button
          type="button"
          onClick={() => {
            onSelectEngine('postgres');
            if (formData.port === 3306 || formData.port === 27017) {
              onPortChange(5432);
            }
          }}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
            selectedEngine === 'postgres'
              ? 'bg-brand-500/15 border-brand-500/50 text-brand-300 shadow-sm'
              : 'bg-surface-800 border-border/80 text-gray-400 hover:bg-surface-750'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-brand-400" />
          <span>PostgreSQL</span>
        </button>

        {/* MySQL Tab (Disabled) */}
        <div
          className="relative flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border/40 bg-surface-900/50 text-gray-500 text-xs font-medium cursor-not-allowed opacity-60"
          title="MySQL support coming in Phase 3"
        >
          <span>MySQL</span>
          <span className="text-[10px] bg-surface-750 text-gray-400 px-1.5 py-0.5 rounded border border-border/50">
            Soon
          </span>
        </div>

        {/* MongoDB Tab (Disabled) */}
        <div
          className="relative flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border/40 bg-surface-900/50 text-gray-500 text-xs font-medium cursor-not-allowed opacity-60"
          title="MongoDB support coming soon"
        >
          <span>MongoDB</span>
          <span className="text-[10px] bg-surface-750 text-gray-400 px-1.5 py-0.5 rounded border border-border/50">
            Soon
          </span>
        </div>
      </div>
    </div>
  );
};
