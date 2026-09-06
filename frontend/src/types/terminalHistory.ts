export interface TerminalCommandBlock {
  id: string;
  command: string;
  output: string;
  exitCode?: number; // 0 for success, non-zero for error
  timestamp: number;
}
