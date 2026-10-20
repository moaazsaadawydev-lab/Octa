import * as AppApi from '../../../../wailsjs/go/main/App';
import { FileNode, ProjectSearchResult } from '../../../types/editor';

export async function fetchFileTree(rootPath: string, maxDepth = 6): Promise<FileNode[]> {
  try {
    const res = await (AppApi as any).GetFileTree(rootPath, maxDepth);
    return res || [];
  } catch (err) {
    console.error('Failed to load file tree:', err);
    return [];
  }
}

export async function readEditorFile(fullPath: string): Promise<string> {
  return await (AppApi as any).ReadEditorFile(fullPath);
}

export async function saveEditorFile(fullPath: string, content: string): Promise<void> {
  return await (AppApi as any).SaveEditorFile(fullPath, content);
}

export async function createEditorFile(fullPath: string): Promise<void> {
  return await (AppApi as any).CreateEditorFile(fullPath);
}

export async function createEditorFolder(fullPath: string): Promise<void> {
  return await (AppApi as any).CreateEditorFolder(fullPath);
}

export async function deleteEditorEntry(fullPath: string): Promise<void> {
  return await (AppApi as any).DeleteEditorEntry(fullPath);
}

export async function renameEditorEntry(oldPath: string, newPath: string): Promise<void> {
  return await (AppApi as any).RenameEditorEntry(oldPath, newPath);
}

export async function getGitOriginalFile(repoPath: string, relPath: string): Promise<string> {
  try {
    return await (AppApi as any).GetGitOriginalFile(repoPath, relPath);
  } catch {
    return '';
  }
}

export async function openEditorDirectoryDialog(): Promise<string> {
  try {
    return await (AppApi as any).OpenEditorDirectoryDialog();
  } catch {
    return '';
  }
}

export async function fetchGitStatus(repoPath: string) {
  try {
    return await (AppApi as any).GetRepoStatus(repoPath);
  } catch {
    return null;
  }
}

export async function resolveEditorDefinition(
  projectRoot: string,
  currentFilePath: string,
  word: string,
  lineContent: string
): Promise<{ fullPath: string; line: number; column: number } | null> {
  try {
    return await (AppApi as any).ResolveEditorDefinition(
      projectRoot,
      currentFilePath,
      word,
      lineContent
    );
  } catch (err) {
    console.error('Failed to resolve definition:', err);
    return null;
  }
}

export async function searchProjectContent(
  projectRoot: string,
  query: string,
  caseSensitive = false,
  maxResults = 500
): Promise<ProjectSearchResult | null> {
  try {
    return await (AppApi as any).SearchProjectContent(
      projectRoot,
      query,
      caseSensitive,
      maxResults
    );
  } catch (err) {
    console.error('Failed to search project:', err);
    return null;
  }
}
