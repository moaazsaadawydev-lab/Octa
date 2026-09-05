import { useState, useEffect, useCallback, RefObject } from 'react';
import { RedisConnectionConfig } from '../../../types/redis';
import { executeRedisCommand } from '../../../services/api';
import { CommandHistoryItem, DEFAULT_WORKBENCH_SCRIPT } from './types';

interface UseRedisExecutionProps {
  currentConfig: (RedisConnectionConfig & { db: number }) | null;
  editorRef: RefObject<any>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useRedisExecution({
  currentConfig,
  editorRef,
  showToast,
}: UseRedisExecutionProps) {
  const [commandText, setCommandText] = useState<string>(DEFAULT_WORKBENCH_SCRIPT);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [history, setHistory] = useState<CommandHistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const handleRun = useCallback(async () => {
    if (!currentConfig) {
      showToast('No active Redis connection selected', 'error');
      return;
    }

    let codeToRun = '';
    if (editorRef.current) {
      const selection = editorRef.current.getSelection();
      if (selection && !selection.isEmpty()) {
        codeToRun = editorRef.current.getModel()?.getValueInRange(selection)?.trim() || '';
      }
      if (!codeToRun) {
        codeToRun = editorRef.current.getValue()?.trim() || '';
      }
    } else {
      codeToRun = commandText.trim();
    }

    if (!codeToRun) {
      showToast('Please enter a Redis command to run', 'info');
      return;
    }

    const lines = codeToRun
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));

    if (lines.length === 0) {
      showToast('No executable command found (only comments)', 'info');
      return;
    }

    setIsRunning(true);

    try {
      for (const line of lines) {
        const res = await executeRedisCommand(currentConfig, line);
        const newItem: CommandHistoryItem = {
          id: 'cmd-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          command: line,
          result: res,
          timestamp: new Date().toLocaleTimeString(),
        };

        setHistory((prev) => [newItem, ...prev.slice(0, 49)]);
        setActiveHistoryId(newItem.id);

        if (res.resultType === 'error') {
          showToast(`Error: ${res.error || 'Command failed'}`, 'error');
          break;
        }
      }
    } catch (err: any) {
      showToast(`Execution failed: ${err?.message || String(err)}`, 'error');
    } finally {
      setIsRunning(false);
    }
  }, [currentConfig, commandText, showToast, editorRef]);

  useEffect(() => {
    const handleGlobalRun = () => {
      handleRun();
    };
    window.addEventListener('octa:redis:run', handleGlobalRun);
    return () => window.removeEventListener('octa:redis:run', handleGlobalRun);
  }, [handleRun]);

  const handleInsertTemplate = useCallback(
    (snippet: string) => {
      if (editorRef.current) {
        const position = editorRef.current.getPosition();
        editorRef.current.executeEdits('template-insert', [
          {
            range: {
              startLineNumber: position?.lineNumber || 1,
              startColumn: position?.column || 1,
              endLineNumber: position?.lineNumber || 1,
              endColumn: position?.column || 1,
            },
            text: '\n' + snippet + '\n',
            forceMoveMarkers: true,
          },
        ]);
        editorRef.current.focus();
      } else {
        setCommandText((prev) => prev + '\n' + snippet);
      }
    },
    [editorRef]
  );

  return {
    commandText,
    setCommandText,
    isRunning,
    history,
    setHistory,
    activeHistoryId,
    setActiveHistoryId,
    handleRun,
    handleInsertTemplate,
  };
}
