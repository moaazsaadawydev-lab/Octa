import React, { useState, useCallback } from 'react';
import { TitleBar } from './components/layout/TitleBar';
import { ActivityBar } from './components/layout/ActivityBar';
import { WorkspaceViewRenderer } from './components/layout/WorkspaceViewRenderer';
import { AppModals } from './components/layout/AppModals';
import { CommandPaletteModal } from './components/command-palette/CommandPaletteModal';
import { usePaletteActions } from './components/command-palette/usePaletteActions';
import { usePreferences } from './hooks/usePreferences';
import { useWorkspaceState } from './hooks/useWorkspaceState';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { AppSettings } from './types/settings';

export function App() {
  const { settings, updateSettings } = usePreferences();
  const state = useWorkspaceState({ settings, updateSettings });
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const paletteActions = usePaletteActions({
    state,
    onClose: () => setIsCommandPaletteOpen(false),
  });

  const handleUpdateSettings = useCallback(
    (newSettings: AppSettings) => {
      updateSettings(newSettings);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('octa:settings:changed', { detail: newSettings }));
      }
    },
    [updateSettings]
  );

  useGlobalShortcuts({
    activeModule: state.activeModule,
    setActiveModule: state.setActiveModule,
    onToggleSidebar: () => state.setIsSidebarVisible((prev) => !prev),
    onOpenSettings: () => state.setIsSettingsModalOpen(true),
    onToggleCommandPalette: () => setIsCommandPaletteOpen((prev) => !prev),
    onCloseModals: () => {
      setIsCommandPaletteOpen(false);
      state.setIsModalOpen(false);
      state.setIsSettingsModalOpen(false);
      state.setSidebarImportSession(null);
    },
    onSaveProject: state.handleSaveProject,
  });

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white dark:bg-[#0E0E10] text-slate-800 dark:text-zinc-200 font-sans select-none">
      <TitleBar
        activeModule={state.activeModule}
        activeSession={state.activeSession}
        activeProject={state.activeProject}
        projectFilePath={state.projectFilePath}
        isSavingProject={state.isSavingProject}
        onOpenProject={state.handleOpenProject}
        onSaveProject={state.handleSaveProject}
        onSaveProjectAs={state.handleSaveProjectAs}
        onCloseProject={state.handleCloseProject}
        onOpenSettings={() => state.setIsSettingsModalOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        <ActivityBar
          activeModule={state.activeModule}
          setActiveModule={state.setActiveModule}
          hasProject={Boolean(state.activeProject)}
          onOpenSettings={() => state.setIsSettingsModalOpen(true)}
        />
        <WorkspaceViewRenderer
          state={state}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
        />
      </div>

      <AppModals
        state={state}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        actions={paletteActions}
      />
    </div>
  );
}

export default App;
