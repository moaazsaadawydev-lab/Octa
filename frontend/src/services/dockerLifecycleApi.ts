import {
  StartDockerEngine,
  CheckDockerStatus,
  GetDetectedDockerEngines,
  SetDockerEngine,
} from '../../wailsjs/go/main/App';
import { DockerEngineProvider } from '../types/docker';

/**
 * Discovers available Docker engines (Windows Docker Desktop, WSL2) on the system.
 */
export async function getDetectedDockerEngines(): Promise<DockerEngineProvider[]> {
  try {
    if (typeof GetDetectedDockerEngines === 'function') {
      const engines = await GetDetectedDockerEngines();
      return (engines || []) as DockerEngineProvider[];
    }
    const w = window as any;
    if (w?.go?.main?.App?.GetDetectedDockerEngines) {
      const engines = await w.go.main.App.GetDetectedDockerEngines();
      return (engines || []) as DockerEngineProvider[];
    }
  } catch (err) {
    console.warn('[Docker getDetectedDockerEngines Error]:', err);
  }
  return [{ id: 'windows', label: 'Docker Desktop (Windows)' }];
}

/**
 * Switches the active Docker Engine in the backend service and re-initializes connection.
 */
export async function setDockerEngine(engineId: string, distro: string = ''): Promise<boolean> {
  try {
    if (typeof SetDockerEngine === 'function') {
      const ok = await SetDockerEngine(engineId, distro);
      return Boolean(ok);
    }
    const w = window as any;
    if (w?.go?.main?.App?.SetDockerEngine) {
      const ok = await w.go.main.App.SetDockerEngine(engineId, distro);
      return Boolean(ok);
    }
  } catch (err) {
    console.error('[Docker setDockerEngine Error]:', err);
    return false;
  }
  return true;
}

/**
 * Invokes the backend to start Docker Desktop or the WSL2 Docker daemon asynchronously.
 */
export async function startDockerEngine(engineId: string = '', distro: string = ''): Promise<void> {
  try {
    if (typeof StartDockerEngine === 'function') {
      await StartDockerEngine(engineId, distro);
      return;
    }
    const w = window as any;
    if (w?.go?.main?.App?.StartDockerEngine) {
      await w.go.main.App.StartDockerEngine(engineId, distro);
      return;
    }
  } catch (err: any) {
    console.error('[Docker startDockerEngine Error]:', err);
    throw err;
  }
}

/**
 * Performs a lightweight connectivity check against the targeted or active Docker daemon.
 * Returns true if responsive, false otherwise.
 */
export async function checkDockerStatus(engineId: string = ''): Promise<boolean> {
  try {
    if (typeof CheckDockerStatus === 'function') {
      const res = await CheckDockerStatus(engineId);
      return Boolean(res);
    }
    const w = window as any;
    if (w?.go?.main?.App?.CheckDockerStatus) {
      const res = await w.go.main.App.CheckDockerStatus(engineId);
      return Boolean(res);
    }
  } catch (err: any) {
    console.warn('[Docker checkDockerStatus Error]:', err);
    return false;
  }
  return false;
}
