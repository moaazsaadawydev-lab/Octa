import {
  GetAvailableShells,
  CreateTerminalSession,
  StartTerminalSession,
  WriteTerminalSession,
  ResizeTerminalSession,
  CloseTerminalSession,
} from '../../wailsjs/go/main/App';
import { ShellInfo } from '../types/terminal';

export async function getAvailableShells(): Promise<ShellInfo[]> {
  try {
    if (typeof GetAvailableShells === 'function') {
      const shells = await GetAvailableShells();
      if (Array.isArray(shells) && shells.length > 0) {
        return shells;
      }
    }
    const w = window as any;
    if (w?.go?.main?.App?.GetAvailableShells) {
      const shells = await w.go.main.App.GetAvailableShells();
      if (Array.isArray(shells) && shells.length > 0) {
        return shells;
      }
    }
  } catch (e) {
    console.warn('[Terminal getAvailableShells Error]:', e);
  }
  return [
    { id: 'powershell', name: 'PowerShell', path: 'powershell.exe' },
    { id: 'cmd', name: 'Command Prompt', path: 'cmd.exe' },
  ];
}

export async function startTerminalSession(
  sessionId: string,
  workDir: string = '',
  cols: number = 120,
  rows: number = 30,
  shellPath: string = ''
): Promise<boolean> {
  try {
    if (typeof StartTerminalSession === 'function') {
      await StartTerminalSession(sessionId, workDir, cols, rows, shellPath);
      return true;
    }
    const w = window as any;
    if (w?.go?.main?.App?.StartTerminalSession) {
      await w.go.main.App.StartTerminalSession(sessionId, workDir, cols, rows, shellPath);
      return true;
    }
    if (typeof CreateTerminalSession === 'function') {
      await CreateTerminalSession(sessionId, workDir, cols, rows, shellPath);
      return true;
    }
    if (w?.go?.main?.App?.CreateTerminalSession) {
      await w.go.main.App.CreateTerminalSession(sessionId, workDir, cols, rows, shellPath);
      return true;
    }
  } catch (e) {
    console.error('[Terminal Start Error]:', e);
  }
  return false;
}

export async function writeTerminalSession(sessionId: string, data: string): Promise<boolean> {
  try {
    if (typeof WriteTerminalSession === 'function') {
      await WriteTerminalSession(sessionId, data);
      return true;
    }
    const w = window as any;
    if (w?.go?.main?.App?.WriteTerminalSession) {
      await w.go.main.App.WriteTerminalSession(sessionId, data);
      return true;
    }
  } catch (e) {
    console.error('[Terminal Write Error]:', e);
  }
  return false;
}

export async function resizeTerminalSession(
  sessionId: string,
  cols: number,
  rows: number
): Promise<boolean> {
  try {
    if (typeof ResizeTerminalSession === 'function') {
      await ResizeTerminalSession(sessionId, cols, rows);
      return true;
    }
    const w = window as any;
    if (w?.go?.main?.App?.ResizeTerminalSession) {
      await w.go.main.App.ResizeTerminalSession(sessionId, cols, rows);
      return true;
    }
  } catch (e) {
    console.warn('[Terminal Resize Error]:', e);
  }
  return false;
}

export async function closeTerminalSession(sessionId: string): Promise<boolean> {
  try {
    if (typeof CloseTerminalSession === 'function') {
      await CloseTerminalSession(sessionId);
      return true;
    }
    const w = window as any;
    if (w?.go?.main?.App?.CloseTerminalSession) {
      await w.go.main.App.CloseTerminalSession(sessionId);
      return true;
    }
  } catch (e) {
    console.warn('[Terminal Close Error]:', e);
  }
  return false;
}
