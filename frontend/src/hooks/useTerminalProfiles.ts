import { useState, useEffect, useMemo, useCallback } from 'react';
import { ShellInfo } from '../types/terminal';
import { getAvailableShells } from '../services/terminalApi';

export interface ShellSelectOption {
  value: string;
  label: string;
  badge?: string;
}

interface UseTerminalProfilesOptions {
  initialShells?: ShellInfo[];
  defaultShellId?: string;
}

export function useTerminalProfiles(options?: UseTerminalProfilesOptions) {
  const [shells, setShells] = useState<ShellInfo[]>(() => {
    if (options?.initialShells && options.initialShells.length > 0) {
      return options.initialShells;
    }
    return [
      { id: 'powershell', name: 'PowerShell', path: 'powershell.exe' },
      { id: 'cmd', name: 'Command Prompt', path: 'cmd.exe' },
    ];
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    getAvailableShells()
      .then((detected) => {
        if (isMounted && Array.isArray(detected) && detected.length > 0) {
          setShells(detected);
        }
      })
      .catch((err) => {
        console.warn('[useTerminalProfiles] Failed to load shells:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const defaultShellId = options?.defaultShellId || 'powershell';

  const defaultShell = useMemo(() => {
    return shells.find((s) => s.id === defaultShellId) || shells[0];
  }, [shells, defaultShellId]);

  const getProfile = useCallback(
    (idOrPath: string): ShellInfo => {
      const match = shells.find((s) => s.id === idOrPath || s.path === idOrPath);
      if (match) return match;
      if (idOrPath === 'cmd') return { id: 'cmd', name: 'Command Prompt', path: 'cmd.exe' };
      if (idOrPath === 'git-bash') return { id: 'git-bash', name: 'Git Bash', path: 'bash.exe' };
      if (idOrPath === 'wsl' || idOrPath.startsWith('wsl_')) {
        return { id: idOrPath, name: 'WSL (Ubuntu)', path: 'wsl.exe', distro: 'Ubuntu', args: ['-d', 'Ubuntu'] };
      }
      return { id: 'powershell', name: 'PowerShell', path: 'powershell.exe' };
    },
    [shells]
  );

  const shellOptions = useMemo<ShellSelectOption[]>(() => {
    return shells.map((s) => {
      let badge: string | undefined;
      if (s.id === 'powershell') {
        badge = 'Default';
      } else if (s.id === 'wsl' || s.id.startsWith('wsl_')) {
        badge = 'Linux';
      } else if (s.id === 'git-bash') {
        badge = 'Git';
      }

      return {
        value: s.id,
        label: s.name,
        badge,
      };
    });
  }, [shells]);

  return {
    shells,
    loading,
    defaultShell,
    getProfile,
    shellOptions,
  };
}
