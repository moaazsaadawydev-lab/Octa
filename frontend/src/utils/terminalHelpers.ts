import { TerminalTab, ShellInfo } from '../types/terminal';

export const getShellDisplayName = (shellId: string, availableShells: ShellInfo[]): string => {
  const found = availableShells.find((s) => s.id === shellId || s.path === shellId);
  if (found) return found.name;
  if (shellId === 'cmd') return 'Command Prompt';
  if (shellId === 'git-bash') return 'Git Bash';
  if (shellId === 'pwsh') return 'PowerShell Core';
  return 'PowerShell';
};

export const resolveShellInfo = (
  shellOrId: ShellInfo | string | undefined,
  defaultShellId: string,
  availableShells: ShellInfo[]
): ShellInfo => {
  if (shellOrId && typeof shellOrId === 'object' && shellOrId.id) {
    return shellOrId;
  }
  const idToFind = typeof shellOrId === 'string' && shellOrId ? shellOrId : defaultShellId;
  const found = availableShells.find((s) => s.id === idToFind || s.path === idToFind);
  if (found) return found;
  if (idToFind === 'cmd') return { id: 'cmd', name: 'Command Prompt', path: 'cmd.exe' };
  if (idToFind === 'git-bash') return { id: 'git-bash', name: 'Git Bash', path: 'bash.exe' };
  if (idToFind === 'pwsh') return { id: 'pwsh', name: 'PowerShell Core', path: 'pwsh.exe' };
  return { id: 'powershell', name: 'PowerShell', path: 'powershell.exe' };
};

export const getNextTabTitle = (shellInfo: ShellInfo, existingTabs: TerminalTab[]): string => {
  const count = existingTabs.filter((t) => t.shellId === shellInfo.id).length + 1;
  return `${shellInfo.name} ${count}`;
};

export const normalizeTab = (t: any): TerminalTab => {
  const shellId = t.shellId || t.shell || 'powershell';
  const shellName =
    t.shellName ||
    (shellId === 'cmd' ? 'Command Prompt' : shellId === 'git-bash' ? 'Git Bash' : 'PowerShell');
  const shellPath =
    t.shellPath ||
    (shellId === 'cmd' ? 'cmd.exe' : shellId === 'git-bash' ? 'bash.exe' : 'powershell.exe');
  return {
    ...t,
    shellId,
    shellName,
    shellPath,
    shell: shellPath || shellId,
    title: t.title || `${shellName} 1`,
    panes: Array.isArray(t.panes)
      ? t.panes.map((p: any) => ({
          ...p,
          shellId: p.shellId || shellId,
          shellName: p.shellName || shellName,
          shellPath: p.shellPath || shellPath,
          shell: p.shellPath || p.shellId || shellPath || shellId,
          title: p.title || t.title || `${shellName} 1`,
        }))
      : [],
  };
};

export const createInitialTerminalTab = (
  shell: ShellInfo,
  defaultWorkDir: string
): TerminalTab => {
  const tabId = 'tab-' + Date.now();
  const paneId = 'pane-' + Date.now();
  const title = `${shell.name} 1`;
  return {
    id: tabId,
    title,
    workDir: defaultWorkDir,
    shellId: shell.id,
    shellName: shell.name,
    shellPath: shell.path,
    shell: shell.path || shell.id,
    createdAt: Date.now(),
    splitDirection: 'none',
    panes: [
      {
        id: paneId,
        title,
        workDir: defaultWorkDir,
        shellId: shell.id,
        shellName: shell.name,
        shellPath: shell.path,
        shell: shell.path || shell.id,
        createdAt: Date.now(),
      },
    ],
    activePaneId: paneId,
  };
};
