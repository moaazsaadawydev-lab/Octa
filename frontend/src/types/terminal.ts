export type SplitDirection = 'none' | 'horizontal' | 'vertical';

export interface ShellInfo {
  id: string; // 'powershell' | 'cmd' | 'git-bash' | 'pwsh' | 'wsl' | string
  name: string; // 'PowerShell' | 'Command Prompt' | 'Git Bash' | 'WSL (Ubuntu)'
  path: string; // executable path
  distro?: string;
  args?: string[];
}


export interface TerminalPane {
  id: string; // ConPTY session ID
  title: string;
  workDir?: string;
  shellId: string;
  shellName: string;
  shellPath: string;
  shell?: string;
  createdAt: number;
}

export interface TerminalTab {
  id: string; // Tab Container ID
  title: string;
  workDir?: string;
  shellId: string;
  shellName: string;
  shellPath: string;
  shell?: string;
  createdAt: number;
  splitDirection: SplitDirection;
  panes: TerminalPane[];
  activePaneId?: string;
}

