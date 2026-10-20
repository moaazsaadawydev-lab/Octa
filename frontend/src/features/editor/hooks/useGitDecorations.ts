import { useEffect, useRef, useCallback } from 'react';
import { EditorTab } from '../../../types/editor';
import { computeLineDiff } from '../utils/gitLineDiff';

export function useGitDecorations(
  editorRef: React.MutableRefObject<any>,
  monacoRef: React.MutableRefObject<any>,
  activeTab: EditorTab | null
) {
  const decorationsRef = useRef<string[]>([]);

  const updateDecorations = useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco || !activeTab) return;

    if (!activeTab.originalContent && activeTab.originalContent !== '') {
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
      return;
    }

    const changes = computeLineDiff(activeTab.originalContent || '', activeTab.content);
    const newDecorations = changes.map((c) => ({
      range: new monaco.Range(c.startLine, 1, c.endLine, 1),
      options: {
        isWholeLine: true,
        linesDecorationsClassName: `git-gutter-${c.type}`,
        overviewRuler: {
          color: c.type === 'added' ? '#2ea043' : c.type === 'modified' ? '#0078d4' : '#f85149',
          position: monaco.editor.OverviewRulerLane.Left,
        },
        minimap: {
          color: c.type === 'added' ? '#2ea043' : c.type === 'modified' ? '#0078d4' : '#f85149',
          position: monaco.editor.MinimapPosition.Inline,
        },
      },
    }));

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [activeTab, editorRef, monacoRef]);

  useEffect(() => {
    updateDecorations();
  }, [updateDecorations]);

  return { updateGitDecorations: updateDecorations };
}
