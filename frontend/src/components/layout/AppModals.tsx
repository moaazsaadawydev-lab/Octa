import React from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { NewConnectionModal } from '../database/NewConnectionModal';
import { ImportSqlModal } from '../database/ImportSqlModal';
import { SettingsModal } from './SettingsModal';
import { AppSettings } from '../../types/settings';
import { useWorkspaceState } from '../../hooks/useWorkspaceState';

export interface AppModalsProps {
  state: ReturnType<typeof useWorkspaceState>;
  settings: AppSettings;
  onUpdateSettings: (newSettings: AppSettings) => void;
}

export const AppModals: React.FC<AppModalsProps> = ({ state, settings, onUpdateSettings }) => {
  return (
    <>
      {/* New Connection Modal */}
      <NewConnectionModal
        isOpen={state.isModalOpen}
        onClose={() => state.setIsModalOpen(false)}
        onSaved={state.handleSavedConnection}
        onConnectDirect={state.handleConnectDirect}
      />

      {/* Sidebar Triggered Import SQL Modal */}
      {state.sidebarImportSession && (
        <ImportSqlModal
          isOpen={Boolean(state.sidebarImportSession)}
          onClose={() => state.setSidebarImportSession(null)}
          activeSession={state.sidebarImportSession}
          onImportSuccess={() => {
            if (
              state.activeSession?.connection.id === state.sidebarImportSession?.connection.id &&
              state.activeSession?.activeDatabase === state.sidebarImportSession?.activeDatabase
            ) {
              state.showToast('SQL imported successfully', 'success');
            }
          }}
          showToast={state.showToast}
        />
      )}

      {/* Settings / Preferences Modal */}
      <SettingsModal
        isOpen={state.isSettingsModalOpen}
        onClose={() => state.setIsSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        showToast={state.showToast}
      />

      {/* Toast Notification */}
      {state.toast.show && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce-in select-none">
          <div
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border shadow-2xl backdrop-blur-md text-xs font-medium ${
              state.toast.type === 'success'
                ? 'bg-zinc-900/95 border-emerald-500/50 text-emerald-300 shadow-emerald-950/40'
                : state.toast.type === 'error'
                ? 'bg-zinc-900/95 border-rose-500/50 text-rose-300 shadow-rose-950/40'
                : 'bg-zinc-900/95 border-zinc-700/80 text-zinc-100 shadow-black/50'
            }`}
          >
            {state.toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
            {state.toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
            <span className="max-w-sm text-zinc-100 font-medium select-text">{state.toast.message}</span>
            <button
              onClick={() => state.setToast((prev) => ({ ...prev, show: false }))}
              className="text-zinc-400 hover:text-zinc-100 p-0.5 rounded transition-colors cursor-pointer ml-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
