import type * as Monaco from 'monaco-editor';
import { resolveEditorDefinition } from '../services/editorApi';

export interface DefinitionProviderContext {
  getRootPath: () => string | null;
  openFileLocation: (fullPath: string, line?: number, col?: number) => Promise<any>;
}

let isGlobalDefinitionProviderRegistered = false;
let globalContext: DefinitionProviderContext | null = null;

export function updateDefinitionContext(context: DefinitionProviderContext) {
  globalContext = context;
}

export function initDefinitionProvider(monacoInstance: typeof Monaco) {
  if (isGlobalDefinitionProviderRegistered || !monacoInstance) return;
  isGlobalDefinitionProviderRegistered = true;

  const supportedLanguages = [
    'typescript',
    'javascript',
    'javascriptreact',
    'typescriptreact',
    'python',
  ];

  // 1. Register Code Editor Opener for Cross-File Jumps
  if (monacoInstance.editor && typeof monacoInstance.editor.registerEditorOpener === 'function') {
    monacoInstance.editor.registerEditorOpener({
      async openCodeEditor(_source, resource, selectionOrPosition) {
        if (!globalContext) return false;
        let targetPath = resource.fsPath || resource.path || resource.toString();
        // Clean Windows file:/// URI if needed
        if (targetPath.startsWith('file:///')) {
          targetPath = decodeURIComponent(targetPath.replace(/^file:\/\/\/?/, ''));
        }

        const line =
          (selectionOrPosition as any)?.startLineNumber ||
          (selectionOrPosition as any)?.lineNumber ||
          1;
        const col =
          (selectionOrPosition as any)?.startColumn ||
          (selectionOrPosition as any)?.column ||
          1;

        // In-memory model or anonymous model (e.g. /1 or \1 or inmemory://)
        if (
          (resource as any)?.scheme === 'inmemory' ||
          targetPath === '/1' ||
          targetPath === '\\1' ||
          targetPath === '1' ||
          targetPath.startsWith('inmemory:')
        ) {
          _source?.revealLineInCenter(line);
          _source?.setPosition({ lineNumber: line, column: col });
          return true;
        }

        const res = await globalContext.openFileLocation(targetPath, line, col);
        return !!res;
      },
    });
  }

  // 2. Register Cross-File Definition Provider for TS/JS and Python
  if (monacoInstance.languages && typeof monacoInstance.languages.registerDefinitionProvider === 'function') {
    monacoInstance.languages.registerDefinitionProvider(supportedLanguages, {
      async provideDefinition(model, position) {
        if (!globalContext) return null;
        const projectRoot = globalContext.getRootPath();
        if (!projectRoot) return null;

        const lineContent = model.getLineContent(position.lineNumber);
        const wordInfo = model.getWordAtPosition(position);
        let word = wordInfo ? wordInfo.word : '';

        // Check if cursor is on a quoted import path
        const quoteMatch = lineContent.match(/['"]([^'"]+)['"]/g);
        if (quoteMatch) {
          for (const q of quoteMatch) {
            const clean = q.slice(1, -1);
            const startCol = lineContent.indexOf(q) + 1;
            const endCol = startCol + q.length;
            if (position.column >= startCol && position.column <= endCol) {
              word = clean;
              break;
            }
          }
        }

        if (!word) return null;

        let currentFilePath = model.uri.fsPath || model.uri.path;
        if (currentFilePath.startsWith('/')) {
          // Normalize Windows path if leading slash before drive letter
          if (/^\/[a-zA-Z]:/.test(currentFilePath)) {
            currentFilePath = currentFilePath.slice(1);
          }
        }

        const loc = await resolveEditorDefinition(
          projectRoot,
          currentFilePath,
          word,
          lineContent
        );

        if (!loc || !loc.fullPath) return null;

        return {
          uri: monacoInstance.Uri.file(loc.fullPath),
          range: new monacoInstance.Range(
            loc.line,
            loc.column || 1,
            loc.line,
            loc.column || 1
          ),
        };
      },
    });
  }
}
