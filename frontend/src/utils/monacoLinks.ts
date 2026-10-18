import type * as monaco from 'monaco-editor';
import { openExternalUrl } from './urlUtils';

const URL_REGEX = /(?:https?:\/\/|www\.)[^\s"'`<>(){}\[\]\\]+/gi;
const TRAILING_PUNCTUATION_REGEX = /[.,;:!?)}"'`]$/;

export interface UrlRangeMatch {
  url: string;
  startCol: number;
  endCol: number;
}

export function cleanUrlMatch(raw: string): { url: string; displayLength: number } {
  let cleaned = raw;
  while (cleaned.length > 0 && TRAILING_PUNCTUATION_REGEX.test(cleaned)) {
    cleaned = cleaned.slice(0, -1);
  }
  return {
    url: cleaned.startsWith('www.') ? 'https://' + cleaned : cleaned,
    displayLength: cleaned.length,
  };
}

export function findUrlRangeAtColumn(line: string, column: number): UrlRangeMatch | null {
  const regex = new RegExp(URL_REGEX.source, URL_REGEX.flags);
  let match: RegExpExecArray | null;
  while ((match = regex.exec(line)) !== null) {
    const { url, displayLength } = cleanUrlMatch(match[0]);
    const startCol = match.index + 1;
    const endCol = startCol + displayLength;
    if (column >= startCol && column <= endCol) {
      return { url, startCol, endCol };
    }
  }
  return null;
}

let isGlobalLinksInitialized = false;

export function initGlobalMonacoLinks(monacoInstance: typeof monaco): void {
  if (isGlobalLinksInitialized || !monacoInstance) return;
  isGlobalLinksInitialized = true;

  if (monacoInstance.editor && typeof monacoInstance.editor.registerLinkOpener === 'function') {
    monacoInstance.editor.registerLinkOpener({
      async open(resource) {
        const url = typeof resource === 'string' ? resource : resource.toString(true);
        if (/^(https?|mailto):/i.test(url) || url.startsWith('www.')) {
          openExternalUrl(url);
          return true;
        }
        return false;
      },
    });
  }

  if (monacoInstance.languages && typeof monacoInstance.languages.registerLinkProvider === 'function') {
    const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
    const tooltipText = isMac ? 'Follow link (Cmd + Click)' : 'Follow link (Ctrl + Click)';

    monacoInstance.languages.registerLinkProvider('*', {
      provideLinks(model) {
        const lineCount = model.getLineCount();
        const links: monaco.languages.ILink[] = [];

        for (let lineNum = 1; lineNum <= lineCount; lineNum++) {
          const line = model.getLineContent(lineNum);
          if (!line || (!line.includes('http') && !line.includes('www.'))) {
            continue;
          }

          const regex = new RegExp(URL_REGEX.source, URL_REGEX.flags);
          let match: RegExpExecArray | null;
          while ((match = regex.exec(line)) !== null) {
            const { url, displayLength } = cleanUrlMatch(match[0]);
            if (!url) continue;

            const startCol = match.index + 1;
            const endCol = startCol + displayLength;

            try {
              links.push({
                range: new monacoInstance.Range(lineNum, startCol, lineNum, endCol),
                url: monacoInstance.Uri.parse(url),
                tooltip: tooltipText,
              });
            } catch {
              // Ignore invalid URIs
            }
          }
        }

        return { links };
      },
    });
  }
}

export function attachEditorClickableLinks(editor: any, monacoInstance?: typeof monaco): () => void {
  if (!editor || typeof editor.onMouseDown !== 'function') {
    return () => {};
  }

  let activeHoverDecorations: string[] = [];

  const clearHoverDecorations = () => {
    if (activeHoverDecorations.length > 0) {
      activeHoverDecorations = editor.deltaDecorations(activeHoverDecorations, []);
    }
  };

  const mouseMoveDisposable = editor.onMouseMove((e: any) => {
    if (!e.event?.ctrlKey && !e.event?.metaKey) {
      clearHoverDecorations();
      return;
    }

    const pos = e.target?.position;
    if (!pos) {
      clearHoverDecorations();
      return;
    }

    const model = editor.getModel();
    if (!model) return;

    const line = model.getLineContent(pos.lineNumber);
    if (!line) {
      clearHoverDecorations();
      return;
    }

    const match = findUrlRangeAtColumn(line, pos.column);
    if (match && monacoInstance) {
      activeHoverDecorations = editor.deltaDecorations(activeHoverDecorations, [
        {
          range: new monacoInstance.Range(pos.lineNumber, match.startCol, pos.lineNumber, match.endCol),
          options: {
            inlineClassName: 'detected-link-active',
          },
        },
      ]);
    } else {
      clearHoverDecorations();
    }
  });

  const mouseLeaveDisposable = editor.onMouseLeave(() => {
    clearHoverDecorations();
  });

  const keyUpDisposable = editor.onKeyUp((e: any) => {
    if (e.keyCode === 5 || e.keyCode === 57) {
      clearHoverDecorations();
    }
  });

  const mouseDownDisposable = editor.onMouseDown((e: any) => {
    if (!e.event?.ctrlKey && !e.event?.metaKey) return;
    const pos = e.target?.position;
    if (!pos) return;

    const model = editor.getModel();
    if (!model) return;

    const line = model.getLineContent(pos.lineNumber);
    if (!line) return;

    const match = findUrlRangeAtColumn(line, pos.column);
    if (match) {
      e.event.preventDefault?.();
      e.event.stopPropagation?.();
      openExternalUrl(match.url);
    }
  });

  return () => {
    clearHoverDecorations();
    mouseDownDisposable.dispose();
    mouseMoveDisposable?.dispose();
    mouseLeaveDisposable?.dispose();
    keyUpDisposable?.dispose();
  };
}
