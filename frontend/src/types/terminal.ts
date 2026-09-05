export type SplitDirection = 'none' | 'horizontal' | 'vertical';

export interface ShellInfo {
  id: string; // 'powershell' | 'cmd' | 'git-bash' | 'pwsh'
  name: string; // 'PowerShell' | 'Command Prompt' | 'Git Bash'
  path: string; // executable path
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

