import { ProjectWorkspace, ProjectFileResult } from '../types/project';

export async function createProjectFileDialog(
  defaultName: string = 'my-workspace'
): Promise<ProjectFileResult> {
  try {
    const w = window as any;
    if (
      w &&
      w.go &&
      w.go.main &&
      w.go.main.App &&
      typeof w.go.main.App.CreateProjectFileDialog === 'function'
    ) {
      return await w.go.main.App.CreateProjectFileDialog(defaultName);
    }
  } catch (e: any) {
    console.warn('CreateProjectFileDialog binding error:', e);
    return { filePath: '', error: e?.message || String(e) };
  }
  return { filePath: '', error: 'Wails bridge not available' };
}

export async function openProjectFileDialog(): Promise<ProjectFileResult> {
  try {
    const w = window as any;
    if (
      w &&
      w.go &&
      w.go.main &&
      w.go.main.App &&
      typeof w.go.main.App.OpenProjectFileDialog === 'function'
    ) {
      return await w.go.main.App.OpenProjectFileDialog();
    }
  } catch (e: any) {
    console.warn('OpenProjectFileDialog binding error:', e);
    return { filePath: '', error: e?.message || String(e) };
  }
  return { filePath: '', error: 'Wails bridge not available' };
}

export async function readProjectFile(filePath: string): Promise<ProjectFileResult> {
  try {
    const w = window as any;
    if (
      w &&
      w.go &&
      w.go.main &&
      w.go.main.App &&
      typeof w.go.main.App.ReadProjectFile === 'function'
    ) {
      return await w.go.main.App.ReadProjectFile(filePath);
    }
  } catch (e: any) {
    console.warn('ReadProjectFile binding error:', e);
    return { filePath, error: e?.message || String(e) };
  }
  return { filePath, error: 'Wails bridge not available' };
}

export async function saveProjectFile(
  filePath: string,
  project: ProjectWorkspace
): Promise<boolean> {
  try {
    const w = window as any;
    if (
      w &&
      w.go &&
      w.go.main &&
      w.go.main.App &&
      typeof w.go.main.App.SaveProjectFile === 'function'
    ) {
      const jsonStr = JSON.stringify(project, null, 2);
      return await w.go.main.App.SaveProjectFile(filePath, jsonStr);
    }
  } catch (e) {
    console.warn('SaveProjectFile binding error:', e);
  }
  return false;
}

export async function closeProjectConnections(): Promise<boolean> {
  try {
    const w = window as any;
    if (
      w &&
      w.go &&
      w.go.main &&
      w.go.main.App &&
      typeof w.go.main.App.CloseProjectConnections === 'function'
    ) {
      return await w.go.main.App.CloseProjectConnections();
    }
  } catch (e) {
    console.warn('CloseProjectConnections binding error:', e);
  }
  return true;
}

export async function wipeLegacyStorage(): Promise<boolean> {
  try {
    const w = window as any;
    if (
      w &&
      w.go &&
      w.go.main &&
      w.go.main.App &&
      typeof w.go.main.App.WipeLegacyStorage === 'function'
    ) {
      return await w.go.main.App.WipeLegacyStorage();
    }
  } catch (e) {
    console.warn('WipeLegacyStorage binding error:', e);
  }
  return false;
}
