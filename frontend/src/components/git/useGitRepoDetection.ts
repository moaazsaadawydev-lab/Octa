import { useState, useEffect, useCallback, useRef } from 'react';
import { isGitRepository, startGitAutoWatch, stopGitAutoWatch } from '../../services/api';
import { ProjectWorkspace, ProjectGitConfig } from '../../types/project';

interface UseGitRepoDetectionOptions {
  activeProject?: ProjectWorkspace | null;
  activeProjectPath?: string | null;
  onUpdateGitConfig?: (config: ProjectGitConfig) => void;
  onRepoChanged: (repo: string | null) => void;
  onStatusRefreshNeeded: (repo: string) => void;
}

export function useGitRepoDetection({
  activeProject,
  activeProjectPath,
  onUpdateGitConfig,
  onRepoChanged,
  onStatusRefreshNeeded,
}: UseGitRepoDetectionOptions) {
  const [repoPath, setRepoPath] = useState<string | null>(() => {
    if (activeProject?.git?.repoPath) return activeProject.git.repoPath;
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('octa_active_git_repo');
      if (saved) return saved;
    }
    return activeProjectPath || null;
  });

  const statusDebounceRef = useRef<any>(null);
  const onRepoChangedRef = useRef(onRepoChanged);
  onRepoChangedRef.current = onRepoChanged;
  const onStatusRefreshNeededRef = useRef(onStatusRefreshNeeded);
  onStatusRefreshNeededRef.current = onStatusRefreshNeeded;
  const onUpdateGitConfigRef = useRef(onUpdateGitConfig);
  onUpdateGitConfigRef.current = onUpdateGitConfig;
  const repoPathRef = useRef(repoPath);
  repoPathRef.current = repoPath;

  const handleSetRepo = useCallback((newPath: string) => {
    setRepoPath(newPath);
    onRepoChangedRef.current(newPath);
    if (onUpdateGitConfigRef.current) {
      onUpdateGitConfigRef.current({ repoPath: newPath, autoWatch: true });
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const configuredPath = activeProject?.git?.repoPath;
      if (configuredPath) {
        try {
          const isValid = await isGitRepository(configuredPath);
          if (isValid && isMounted) {
            if (repoPathRef.current !== configuredPath) {
              setRepoPath(configuredPath);
              onRepoChangedRef.current(configuredPath);
            }
            return;
          }
        } catch (e) {
          console.warn('[GitRepoDetection] Error validating configured repo path:', e);
        }
      }

      if (activeProjectPath) {
        try {
          const isRootGit = await isGitRepository(activeProjectPath);
          if (isRootGit && isMounted) {
            if (repoPathRef.current !== activeProjectPath) {
              setRepoPath(activeProjectPath);
              onRepoChangedRef.current(activeProjectPath);
            }
            if (onUpdateGitConfigRef.current) {
              onUpdateGitConfigRef.current({ repoPath: activeProjectPath, autoWatch: true });
            }
            return;
          }
        } catch (e) {
          console.warn('[GitRepoDetection] Error checking project root Git repository:', e);
        }
      }

      if (isMounted && repoPathRef.current !== null) {
        setRepoPath(null);
        onRepoChangedRef.current(null);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [activeProject?.id, activeProject?.git?.repoPath, activeProjectPath]);

  useEffect(() => {
    if (!repoPath) return;

    startGitAutoWatch(repoPath).catch((err) => {
      console.warn('[GitRepoDetection] Failed to start auto-watch:', err);
    });

    const w = window as any;
    let cancelEvent: (() => void) | null = null;
    if (w?.runtime?.EventsOn) {
      cancelEvent = w.runtime.EventsOn('git:status:changed', (changedRepo: string) => {
        if (!changedRepo || changedRepo === repoPath) {
          if (statusDebounceRef.current) {
            clearTimeout(statusDebounceRef.current);
          }
          statusDebounceRef.current = setTimeout(() => {
            onStatusRefreshNeededRef.current(repoPath);
          }, 200);
        }
      });
    }

    return () => {
      if (statusDebounceRef.current) {
        clearTimeout(statusDebounceRef.current);
      }
      if (cancelEvent) {
        cancelEvent();
      } else if (w?.runtime?.EventsOff) {
        w.runtime.EventsOff('git:status:changed');
      }
      stopGitAutoWatch().catch(() => {});
    };
  }, [repoPath]);

  return {
    repoPath,
    setRepoPath,
    handleSetRepo,
  };
}
