export type SplitDirection = 'none' | 'horizontal' | 'vertical';

export interface TerminalPane {
  id: string; // ConPTY session ID
  title: string;
  workDir?: string;
  createdAt: number;
}

export interface TerminalTab {
  id: string; // Tab Container ID
  title: string;
  workDir?: string;
  createdAt: number;
  splitDirection: SplitDirection;
  panes: TerminalPane[];
  activePaneId?: string;
}
