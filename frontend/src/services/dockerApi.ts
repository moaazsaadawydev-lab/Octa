import {
  CheckDockerAvailability,
  ListContainers,
  StartContainer,
  StopContainer,
  RestartContainer,
  RemoveContainer,
  StartLogStream,
  StopLogStream,
} from '../../wailsjs/go/main/App';
import { DockerProjectGroup } from '../types/docker';

export async function checkDockerAvailability(): Promise<{
  available: boolean;
  version?: string;
  error?: string;
}> {
  try {
    let res: any;
    if (typeof CheckDockerAvailability === 'function') {
      res = await CheckDockerAvailability();
    } else {
      const w = window as any;
      if (w?.go?.main?.App?.CheckDockerAvailability) {
        res = await w.go.main.App.CheckDockerAvailability();
      } else if (w?.go?.main?.App?.CheckConnection) {
        res = await w.go.main.App.CheckConnection();
      }
    }

    if (Array.isArray(res)) {
      const isOnline = Boolean(res[0]);
      if (isOnline) {
        return { available: true, version: String(res[1] || '') };
      } else {
        return { available: false, error: String(res[1] || 'Docker daemon is not responding') };
      }
    } else if (typeof res === 'object' && res !== null) {
      return {
        available: Boolean(res.available ?? res.isOnline ?? true),
        version: res.version,
        error: res.error,
      };
    } else if (typeof res === 'boolean') {
      return { available: res };
    }
  } catch (e: any) {
    console.error('[Frontend] Error calling CheckDockerAvailability:', e);
    return { available: false, error: e?.message || String(e) };
  }
  return { available: false, error: 'Docker API not available' };
}

export async function listDockerContainers(
  onlyRunning: boolean = false
): Promise<DockerProjectGroup[]> {
  try {
    if (typeof ListContainers === 'function') {
      const res = await ListContainers(onlyRunning);
      return (res || []) as unknown as DockerProjectGroup[];
    }
    const w = window as any;
    if (w?.go?.main?.App?.ListContainers) {
      const res = await w.go.main.App.ListContainers(onlyRunning);
      return (res || []) as unknown as DockerProjectGroup[];
    }
  } catch (e) {
    console.error('[Docker ListContainers Error]:', e);
  }
  return [];
}

export async function startDockerContainer(containerId: string): Promise<boolean> {
  try {
    if (typeof StartContainer === 'function') {
      const res = await StartContainer(containerId);
      return Boolean(res);
    }
    const w = window as any;
    if (w?.go?.main?.App?.StartContainer) {
      const res = await w.go.main.App.StartContainer(containerId);
      return Boolean(res);
    }
  } catch (e) {
    console.error('[Docker StartContainer Error]:', e);
    throw e;
  }
  return false;
}

export async function stopDockerContainer(containerId: string): Promise<boolean> {
  try {
    if (typeof StopContainer === 'function') {
      const res = await StopContainer(containerId);
      return Boolean(res);
    }
    const w = window as any;
    if (w?.go?.main?.App?.StopContainer) {
      const res = await w.go.main.App.StopContainer(containerId);
      return Boolean(res);
    }
  } catch (e) {
    console.error('[Docker StopContainer Error]:', e);
    throw e;
  }
  return false;
}

export async function restartDockerContainer(containerId: string): Promise<boolean> {
  try {
    if (typeof RestartContainer === 'function') {
      const res = await RestartContainer(containerId);
      return Boolean(res);
    }
    const w = window as any;
    if (w?.go?.main?.App?.RestartContainer) {
      const res = await w.go.main.App.RestartContainer(containerId);
      return Boolean(res);
    }
  } catch (e) {
    console.error('[Docker RestartContainer Error]:', e);
    throw e;
  }
  return false;
}

export async function removeDockerContainer(
  containerId: string,
  force: boolean = false
): Promise<boolean> {
  try {
    if (typeof RemoveContainer === 'function') {
      const res = await RemoveContainer(containerId, force);
      return Boolean(res);
    }
    const w = window as any;
    if (w?.go?.main?.App?.RemoveContainer) {
      const res = await w.go.main.App.RemoveContainer(containerId, force);
      return Boolean(res);
    }
  } catch (e) {
    console.error('[Docker RemoveContainer Error]:', e);
    throw e;
  }
  return false;
}

export async function startDockerLogStream(containerId: string): Promise<void> {
  try {
    if (typeof StartLogStream === 'function') {
      await StartLogStream(containerId);
      return;
    }
    const w = window as any;
    if (w?.go?.main?.App?.StartLogStream) {
      await w.go.main.App.StartLogStream(containerId);
    }
  } catch (e) {
    console.warn('[Docker StartLogStream Error]:', e);
  }
}

export async function stopDockerLogStream(containerId: string): Promise<void> {
  try {
    if (typeof StopLogStream === 'function') {
      await StopLogStream(containerId);
      return;
    }
    const w = window as any;
    if (w?.go?.main?.App?.StopLogStream) {
      await w.go.main.App.StopLogStream(containerId);
    }
  } catch (e) {
    console.warn('[Docker StopLogStream Error]:', e);
  }
}

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
