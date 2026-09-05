export async function stageGitFile(repoPath: string, filePath: string): Promise<void> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.StageFile) {
      await w.go.main.App.StageFile(repoPath, filePath);
      return;
    }
    if (w?.go?.main?.GitService?.StageFile) {
      await w.go.main.GitService.StageFile(repoPath, filePath);
      return;
    }
  } catch (e) {
    console.error('[Git StageFile Error]:', e);
    throw e;
  }
}

export async function unstageGitFile(repoPath: string, filePath: string): Promise<void> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.UnstageFile) {
      await w.go.main.App.UnstageFile(repoPath, filePath);
      return;
    }
    if (w?.go?.main?.GitService?.UnstageFile) {
      await w.go.main.GitService.UnstageFile(repoPath, filePath);
      return;
    }
  } catch (e) {
    console.error('[Git UnstageFile Error]:', e);
    throw e;
  }
}

export async function stageAllGitFiles(repoPath: string): Promise<void> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.StageAll) {
      await w.go.main.App.StageAll(repoPath);
      return;
    }
    if (w?.go?.main?.GitService?.StageAll) {
      await w.go.main.GitService.StageAll(repoPath);
      return;
    }
  } catch (e) {
    console.error('[Git StageAll Error]:', e);
    throw e;
  }
}

export async function unstageAllGitFiles(repoPath: string): Promise<void> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.UnstageAll) {
      await w.go.main.App.UnstageAll(repoPath);
      return;
    }
    if (w?.go?.main?.GitService?.UnstageAll) {
      await w.go.main.GitService.UnstageAll(repoPath);
      return;
    }
  } catch (e) {
    console.error('[Git UnstageAll Error]:', e);
    throw e;
  }
}

export async function commitGitChanges(repoPath: string, message: string): Promise<void> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.CommitChanges) {
      await w.go.main.App.CommitChanges(repoPath, message);
      return;
    }
    if (w?.go?.main?.GitService?.CommitChanges) {
      await w.go.main.GitService.CommitChanges(repoPath, message);
      return;
    }
  } catch (e) {
    console.error('[Git CommitChanges Error]:', e);
    throw e;
  }
}

export async function pushGitChanges(repoPath: string): Promise<void> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.PushChanges) {
      await w.go.main.App.PushChanges(repoPath);
      return;
    }
    if (w?.go?.main?.GitService?.PushChanges) {
      await w.go.main.GitService.PushChanges(repoPath);
      return;
    }
  } catch (e) {
    console.error('[Git PushChanges Error]:', e);
    throw e;
  }
}

export async function pullGitChanges(repoPath: string): Promise<void> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.PullChanges) {
      await w.go.main.App.PullChanges(repoPath);
      return;
    }
    if (w?.go?.main?.GitService?.PullChanges) {
      await w.go.main.GitService.PullChanges(repoPath);
      return;
    }
  } catch (e) {
    console.error('[Git PullChanges Error]:', e);
    throw e;
  }
}

export async function fetchGitChanges(repoPath: string): Promise<void> {
  try {
    const w = window as any;
    if (w?.go?.main?.App?.FetchChanges) {
      await w.go.main.App.FetchChanges(repoPath);
      return;
    }
    if (w?.go?.main?.GitService?.FetchChanges) {
      await w.go.main.GitService.FetchChanges(repoPath);
      return;
    }
  } catch (e) {
    console.error('[Git FetchChanges Error]:', e);
    throw e;
  }
}
