import { GitStatusResult, InitRepoOptions } from '../types/git';

export async function isGitRepository(repoPath: string): Promise<boolean> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.IsGitRepository) {
      return await w.go.main.App.IsGitRepository(repoPath);
    }
    if (w?.go?.main?.GitService?.IsGitRepository) {
      return await w.go.main.GitService.IsGitRepository(repoPath);
    }
  } catch (e) {
    console.error('[Git IsGitRepository Error]:', e);
  }
  return false;
}

export async function initializeRepositoryWithOptions(opts: InitRepoOptions): Promise<void> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.InitializeRepositoryWithOptions) {
      await w.go.main.App.InitializeRepositoryWithOptions(opts);
      return;
    }
    if (w?.go?.main?.GitService?.InitializeRepositoryWithOptions) {
      await w.go.main.GitService.InitializeRepositoryWithOptions(opts);
      return;
    }
  } catch (e) {
    console.error('[Git InitializeRepositoryWithOptions Error]:', e);
    throw e;
  }
}

export async function openGitRepositoryDialog(): Promise<string> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.OpenRepositoryDialog) {
      const res = await w.go.main.App.OpenRepositoryDialog();
      return res || '';
    }
    if (w?.go?.main?.GitService?.OpenRepositoryDialog) {
      const res = await w.go.main.GitService.OpenRepositoryDialog();
      return res || '';
    }
  } catch (e) {
    console.error('[Git OpenRepositoryDialog Error]:', e);
    throw e;
  }
  return '';
}

export async function initGitRepository(repoPath: string): Promise<void> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.InitRepository) {
      await w.go.main.App.InitRepository(repoPath);
      return;
    }
    if (w?.go?.main?.GitService?.InitRepository) {
      await w.go.main.GitService.InitRepository(repoPath);
      return;
    }
  } catch (e) {
    console.error('[Git InitRepository Error]:', e);
    throw e;
  }
}

export async function getGitRepoStatus(repoPath: string): Promise<GitStatusResult> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.GetRepoStatus) {
      return await w.go.main.App.GetRepoStatus(repoPath);
    }
    if (w?.go?.main?.GitService?.GetRepoStatus) {
      return await w.go.main.GitService.GetRepoStatus(repoPath);
    }
  } catch (e) {
    console.error('[Git GetRepoStatus Error]:', e);
    throw e;
  }
  return {
    isRepo: false,
    repoPath,
    branch: '',
    upstream: '',
    ahead: 0,
    behind: 0,
    stagedFiles: [],
    unstagedFiles: [],
    untrackedFiles: [],
  };
}

export async function getGitFileDiff(
  repoPath: string,
  filePath: string,
  staged: boolean = false
): Promise<string> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.GetFileDiff) {
      const res = await w.go.main.App.GetFileDiff(repoPath, filePath, staged);
      return res || '';
    }
    if (w?.go?.main?.GitService?.GetFileDiff) {
      const res = await w.go.main.GitService.GetFileDiff(repoPath, filePath, staged);
      return res || '';
    }
  } catch (e) {
    console.error('[Git GetFileDiff Error]:', e);
    throw e;
  }
  return '';
}

export async function startGitAutoWatch(repoPath: string): Promise<boolean> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.StartAutoWatch) {
      await w.go.main.App.StartAutoWatch(repoPath);
      return true;
    }
    if (w?.go?.main?.GitService?.StartAutoWatch) {
      await w.go.main.GitService.StartAutoWatch(repoPath);
      return true;
    }
  } catch (e) {
    console.warn('[Git StartAutoWatch Error]:', e);
  }
  return false;
}

export async function stopGitAutoWatch(): Promise<boolean> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.StopAutoWatch) {
      await w.go.main.App.StopAutoWatch();
      return true;
    }
    if (w?.go?.main?.GitService?.StopAutoWatch) {
      await w.go.main.GitService.StopAutoWatch();
      return true;
    }
  } catch (e) {
    console.warn('[Git StopAutoWatch Error]:', e);
  }
  return false;
}
