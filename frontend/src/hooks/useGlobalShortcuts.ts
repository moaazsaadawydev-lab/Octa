import { useEffect } from 'react';
import { ActiveModule } from '../components/layout/ActivityBar';

export interface GlobalShortcutsOptions {
  activeModule: ActiveModule;
  setActiveModule: (module: ActiveModule) => void;
  onToggleSidebar?: () => void;
  onOpenSettings?: () => void;
  onCloseModals?: () => void;
  onSaveProject?: () => void;
}

export function isTypingInInput(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable) {
    return true;
  }
  if (target.closest('.monaco-editor') || target.closest('.xterm')) {
    return true;
  }
  return false;
}

export function useGlobalShortcuts({
  activeModule,
  setActiveModule,
  onToggleSidebar,
  onOpenSettings,
  onCloseModals,
  onSaveProject,
}: GlobalShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;
      const key = e.key;

      // 1. ESCAPE: Close open modals / dialogs
      if (key === 'Escape') {
        if (onCloseModals) {
          onCloseModals();
        }
        return;
      }

      // 2. Global Save: Ctrl + S / Cmd + S
      if (isCtrlOrCmd && !isShift && !isAlt && (key === 's' || key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        if (onSaveProject) {
          onSaveProject();
        }
        return;
      }

      // 3. Open Preferences: Ctrl + , / Cmd + ,
      if (isCtrlOrCmd && !isShift && !isAlt && key === ',') {
        e.preventDefault();
        e.stopPropagation();
        if (onOpenSettings) {
          onOpenSettings();
        }
        return;
      }

      // 4. Toggle Sidebar: Ctrl + B / Cmd + B
      if (isCtrlOrCmd && !isShift && !isAlt && (key === 'b' || key === 'B')) {
        if (!isTypingInInput(e.target)) {
          e.preventDefault();
          e.stopPropagation();
          if (onToggleSidebar) {
            onToggleSidebar();
          }
          return;
        }
      }

      // 5. Workspace Navigation: Ctrl + 1 through Ctrl + 6
      if (isCtrlOrCmd && !isShift && !isAlt) {
        if (!isTypingInInput(e.target)) {
          const keyNum = parseInt(key, 10);
          if (keyNum >= 1 && keyNum <= 6) {
            e.preventDefault();
            e.stopPropagation();
            const tabMap: Record<number, ActiveModule> = {
              1: 'databases',
              2: 'redis',
              3: 'http',
              4: 'git',
              5: 'docker',
              6: 'terminal',
            };
            const targetTab = tabMap[keyNum];
            if (targetTab) {
              setActiveModule(targetTab);
            }
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [
    activeModule,
    setActiveModule,
    onToggleSidebar,
    onOpenSettings,
    onCloseModals,
    onSaveProject,
  ]);
}
