import {
  createProjectFileDialog,
  openProjectFileDialog,
  readProjectFile,
  saveProjectFile,
} from '../services/api';
import { ProjectWorkspace, ProjectHttpClient } from '../types/project';
import { ConnectionConfig, SqlQueryFolder, SqlQueryItem } from '../types/connection';
import { RedisConnectionConfig } from '../types/redis';

interface ProjectFileOpsContext {
  activeProject: ProjectWorkspace | null;
  setActiveProject: (proj: ProjectWorkspace | null) => void;
  projectFilePath: string | null;
  setIsOpeningProject: (opening: boolean) => void;
  setIsSavingProject: (saving: boolean) => void;
  loadProjectIntoWorkspace: (proj: ProjectWorkspace, filePath: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  connections: ConnectionConfig[];
  queriesTree: (SqlQueryFolder | SqlQueryItem)[];
  redisConnections: RedisConnectionConfig[];
  httpData: ProjectHttpClient;
}

export function useProjectFileOps(ctx: ProjectFileOpsContext) {
  const handleCreateProject = async () => {
    ctx.setIsOpeningProject(true);
    try {
      const res = await createProjectFileDialog('my-workspace');
      if (res.cancelled) return;
      if (res.error) {
        ctx.showToast(res.error, 'error');
        return;
      }
      if (res.project && res.filePath) {
        ctx.loadProjectIntoWorkspace(res.project, res.filePath);
        ctx.showToast(`Created project "${res.project.name}"`, 'success');
      }
    } catch (err: any) {
      ctx.showToast(`Failed to create project: ${err?.message || err}`, 'error');
    } finally {
      ctx.setIsOpeningProject(false);
    }
  };

  const handleOpenProject = async () => {
    ctx.setIsOpeningProject(true);
    try {
      const res = await openProjectFileDialog();
      if (res.cancelled) return;
      if (res.error) {
        ctx.showToast(res.error, 'error');
        return;
      }
      if (res.project && res.filePath) {
        ctx.loadProjectIntoWorkspace(res.project, res.filePath);
        ctx.showToast(`Opened project "${res.project.name}"`, 'success');
      }
    } catch (err: any) {
      ctx.showToast(`Failed to open project: ${err?.message || err}`, 'error');
    } finally {
      ctx.setIsOpeningProject(false);
    }
  };

  const handleSelectRecent = async (filePath: string) => {
    ctx.setIsOpeningProject(true);
    try {
      const res = await readProjectFile(filePath);
      if (res.error) {
        ctx.showToast(`Could not open project: ${res.error}`, 'error');
        return;
      }
      if (res.project && res.filePath) {
        ctx.loadProjectIntoWorkspace(res.project, res.filePath);
        ctx.showToast(`Opened project "${res.project.name}"`, 'success');
      }
    } catch (err: any) {
      ctx.showToast(`Error reading file: ${err?.message || err}`, 'error');
    } finally {
      ctx.setIsOpeningProject(false);
    }
  };

  const handleSaveProject = async () => {
    if (!ctx.activeProject || !ctx.projectFilePath) return;
    ctx.setIsSavingProject(true);
    try {
      const updatedProj: ProjectWorkspace = {
        ...ctx.activeProject,
        updatedAt: new Date().toISOString(),
        databases: ctx.connections,
        sqlQueries: ctx.queriesTree,
        redis: ctx.redisConnections,
        httpClient: ctx.httpData,
      };
      const ok = await saveProjectFile(ctx.projectFilePath, updatedProj);
      if (ok) {
        ctx.setActiveProject(updatedProj);
        ctx.showToast(`Saved "${ctx.activeProject.name}"`, 'success');
      } else {
        ctx.showToast('Failed to save project file', 'error');
      }
    } catch (err: any) {
      ctx.showToast(`Save error: ${err?.message || err}`, 'error');
    } finally {
      ctx.setIsSavingProject(false);
    }
  };

  const handleSaveProjectAs = async () => {
    if (!ctx.activeProject) return;
    try {
      const res = await createProjectFileDialog(ctx.activeProject.name + '-copy');
      if (res.cancelled || !res.filePath) return;
      const updatedProj: ProjectWorkspace = {
        ...ctx.activeProject,
        id: 'octa-' + Date.now(),
        name: res.filePath.replace(/^.*[\\\/]/, '').replace(/\.octa$/, ''),
        updatedAt: new Date().toISOString(),
        databases: ctx.connections,
        sqlQueries: ctx.queriesTree,
        redis: ctx.redisConnections,
        httpClient: ctx.httpData,
      };
      await saveProjectFile(res.filePath, updatedProj);
      ctx.loadProjectIntoWorkspace(updatedProj, res.filePath);
      ctx.showToast(`Project saved as "${updatedProj.name}"`, 'success');
    } catch (err: any) {
      ctx.showToast(`Save As error: ${err?.message || err}`, 'error');
    }
  };

  return {
    handleCreateProject,
    handleOpenProject,
    handleSelectRecent,
    handleSaveProject,
    handleSaveProjectAs,
  };
}
