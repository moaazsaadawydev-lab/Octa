import { useEffect, useCallback } from 'react';
import { AppSettings } from '../types/settings';
import { ProjectWorkspace, ProjectHttpClient } from '../types/project';
import { readProjectFile, wipeLegacyStorage } from '../services/api';
import { loadHttpClientData } from '../services/httpApi';

interface UseStartupProjectOptions {
  settings: AppSettings;
  loadProjectIntoWorkspace: (proj: ProjectWorkspace, filePath: string) => void;
  setHttpData: React.Dispatch<React.SetStateAction<ProjectHttpClient>>;
  setIsOpeningProject: (opening: boolean) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useStartupProject({
  settings,
  loadProjectIntoWorkspace,
  setHttpData,
  setIsOpeningProject,
  showToast,
}: UseStartupProjectOptions) {
  const restoreStandaloneHttpData = useCallback(async () => {
    try {
      const raw = await loadHttpClientData();
      if (raw?.trim()) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.collections?.length || parsed.environments?.length)) {
          setHttpData(parsed);
          return;
        }
      }
    } catch {}
    try {
      const local = localStorage.getItem('octa_http_client_data');
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed && (parsed.collections?.length || parsed.environments?.length)) setHttpData(parsed);
      }
    } catch {}
  }, [setHttpData]);

  useEffect(() => {
    const hasResetLegacy = localStorage.getItem('octa_legacy_wiped_v3');
    if (!hasResetLegacy) {
      wipeLegacyStorage();
      localStorage.removeItem('octa_connections');
      localStorage.removeItem('octa_sql_queries_tree');
      localStorage.removeItem('octa_redis_connections');
      localStorage.removeItem('octa_http_client_data');
      localStorage.removeItem('octa_http_environments');
      localStorage.setItem('octa_legacy_wiped_v3', 'true');
    }

    if (settings.onStartup === 'last_project' && settings.lastOpenedProjectFilePath) {
      (async () => {
        setIsOpeningProject(true);
        try {
          const res = await readProjectFile(settings.lastOpenedProjectFilePath!);
          if (res.project && res.filePath) {
            loadProjectIntoWorkspace(res.project, res.filePath);
            showToast(`Restored "${res.project.name}"`, 'info');
          } else {
            restoreStandaloneHttpData();
            showToast('Previous project not found, opened Welcome Screen', 'info');
          }
        } catch {
          restoreStandaloneHttpData();
          showToast('Previous project not found, opened Welcome Screen', 'info');
        } finally {
          setIsOpeningProject(false);
        }
      })();
    } else {
      restoreStandaloneHttpData();
    }
  }, []);

  return { restoreStandaloneHttpData };
}
