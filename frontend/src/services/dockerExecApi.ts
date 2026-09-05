/**
 * Docker Interactive Exec Session Service
 */

export async function startContainerExec(
  sessionId: string,
  containerId: string,
  cols: number = 80,
  rows: number = 24
): Promise<boolean> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.StartContainerExec) {
      await w.go.main.App.StartContainerExec(sessionId, containerId, cols, rows);
      return true;
    }
  } catch (e) {
    console.error('[Docker StartContainerExec Error]:', e);
    throw e;
  }
  return false;
}

export async function writeContainerExec(sessionId: string, data: string): Promise<boolean> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.WriteContainerExec) {
      await w.go.main.App.WriteContainerExec(sessionId, data);
      return true;
    }
  } catch (e) {
    console.warn('[Docker WriteContainerExec Error]:', e);
  }
  return false;
}

export async function resizeContainerExec(
  sessionId: string,
  cols: number,
  rows: number
): Promise<boolean> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.ResizeContainerExec) {
      await w.go.main.App.ResizeContainerExec(sessionId, cols, rows);
      return true;
    }
  } catch (e) {
    console.warn('[Docker ResizeContainerExec Error]:', e);
  }
  return false;
}

export async function closeContainerExec(sessionId: string): Promise<boolean> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.CloseContainerExec) {
      await w.go.main.App.CloseContainerExec(sessionId);
      return true;
    }
  } catch (e) {
    console.warn('[Docker CloseContainerExec Error]:', e);
  }
  return false;
}
