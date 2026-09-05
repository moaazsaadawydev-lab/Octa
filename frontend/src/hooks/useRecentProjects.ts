import { useState, useCallback } from 'react';
import { RecentProject } from '../types/project';

export function useRecentProjects(showToast: (message: string, type?: 'success' | 'error' | 'info') => void) {
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>(() => {
    try {
      const saved = localStorage.getItem('octa_recent_projects');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse recent projects:', e);
    }
    return [];
  });

  const recordRecentProject = useCallback((name: string, filePath: string) => {
    setRecentProjects((prev) => {
      const filtered = prev.filter((p) => p.filePath !== filePath);
      const next: RecentProject[] = [
        {
          id: 'proj-' + Date.now(),
          name,
          filePath,
          lastOpenedAt: new Date().toISOString(),
        },
        ...filtered,
      ].slice(0, 15);

      try {
        localStorage.setItem('octa_recent_projects', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save recent projects to localStorage', e);
      }
      return next;
    });
  }, []);

  const handleRemoveRecent = (filePath: string) => {
    setRecentProjects((prev) => {
      const next = prev.filter((p) => p.filePath !== filePath);
      try {
        localStorage.setItem('octa_recent_projects', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to update recent projects in localStorage', e);
      }
      return next;
    });
    showToast('Removed from recents', 'info');
  };

  const handleClearRecents = () => {
    setRecentProjects([]);
    try {
      localStorage.removeItem('octa_recent_projects');
    } catch (e) {
      console.warn('Failed to clear recents in localStorage', e);
    }
    showToast('Cleared recent projects history', 'info');
  };

  return {
    recentProjects,
    recordRecentProject,
    handleRemoveRecent,
    handleClearRecents,
  };
}
