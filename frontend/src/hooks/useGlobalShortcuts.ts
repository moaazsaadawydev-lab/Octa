import { useEffect } from 'react';
import { ActiveModule } from '../components/layout/ActivityBar';

export interface GlobalShortcutsOptions {
  activeModule: ActiveModule;
  setActiveModule: (module: ActiveModule) => void;
  onToggleSidebar?: () => void;
  onOpenSettings?: () => void;
  onCloseModals?: () => void;
  onSaveProject?: () => void;
  onToggleCommandPalette?: () => void;
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

export function isInsideMonaco(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('.monaco-editor'));
}

function getDigitFromEvent(e: KeyboardEvent): number | null {
  switch (e.code) {
    case 'Digit1':
    case 'Numpad1':
      return 1;
    case 'Digit2':
    case 'Numpad2':
      return 2;
    case 'Digit3':
    case 'Numpad3':
      return 3;
    case 'Digit4':
    case 'Numpad4':
      return 4;
    case 'Digit5':
    case 'Numpad5':
      return 5;
    case 'Digit6':
    case 'Numpad6':
      return 6;
  }

  const parsed = parseInt(e.key, 10);
  if (!isNaN(parsed) && parsed >= 1 && parsed <= 6) {
    return parsed;
  }

  const arabicDigits: Record<string, number> = {
    '١': 1, '٢': 2, '٣': 3, '٤': 4, '٥': 5, '٦': 6,
  };
  return arabicDigits[e.key] || null;
}

export function useGlobalShortcuts({
  activeModule,
  setActiveModule,
  onToggleSidebar,
  onOpenSettings,
  onCloseModals,
  onSaveProject,
  onToggleCommandPalette,
}: GlobalShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;

      // 1. ESCAPE: Close open modals / dialogs everywhere
      if (e.key === 'Escape') {
        if (onCloseModals) onCloseModals();
        return;
      }

      // 2. Command Palette: Ctrl + K / Cmd + K or Ctrl + P / Cmd + P
      if (
        isCtrlOrCmd &&
        !isShift &&
        !isAlt &&
        (e.code === 'KeyK' || e.key === 'k' || e.key === 'K' || e.code === 'KeyP' || e.key === 'p' || e.key === 'P')
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (onToggleCommandPalette) onToggleCommandPalette();
        return;
      }

      // 3. Workspace Navigation: Ctrl + 1 through Ctrl + 6
      if (isCtrlOrCmd && !isShift && !isAlt) {
        const digit = getDigitFromEvent(e);
        if (digit !== null) {
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
          const targetTab = tabMap[digit];
          if (targetTab) {
            if (onCloseModals) onCloseModals();
            setActiveModule(targetTab);
          }
          return;
        }
      }

      // 4. Global Save: Ctrl + S / Cmd + S
      if (isCtrlOrCmd && !isShift && !isAlt && (e.code === 'KeyS' || e.key === 's' || e.key === 'S')) {
        if (isInsideMonaco(e.target)) return;
        e.preventDefault();
        e.stopPropagation();
        if (onSaveProject) onSaveProject();
        return;
      }

      // 5. Open / Toggle Preferences: Ctrl + , / Cmd + ,
      if (isCtrlOrCmd && !isShift && !isAlt && (e.code === 'Comma' || e.key === ',')) {
        e.preventDefault();
        e.stopPropagation();
        if (onOpenSettings) onOpenSettings();
        return;
      }

      // 6. Toggle Sidebar: Ctrl + B / Cmd + B
      if (isCtrlOrCmd && !isShift && !isAlt && (e.code === 'KeyB' || e.key === 'b' || e.key === 'B')) {
        if (!isTypingInInput(e.target)) {
          e.preventDefault();
          e.stopPropagation();
          if (onToggleSidebar) onToggleSidebar();
          return;
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
    onToggleCommandPalette,
  ]);
}
