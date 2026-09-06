import { useState, useCallback } from 'react';
import {
  explainTerminalError,
  askAIFollowUp,
  ChatMessage,
} from '../../../services/aiApi';
import { useTerminalHistory } from '../../../components/terminal/useTerminalHistory';
import { formatSelectedCommandPayload } from '../../../components/terminal/terminalHistoryParser';

interface UseTerminalAIOptions {
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export type TerminalAIViewMode = 'picker' | 'chat';

export function useTerminalAI(options?: UseTerminalAIOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<TerminalAIViewMode>('picker');
  const [isExplaining, setIsExplaining] = useState(false);
  const [isSendingFollowUp, setIsSendingFollowUp] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentShell, setCurrentShell] = useState<string>('PowerShell');
  const [activeSessionId, setActiveSessionId] = useState<string>('');

  const history = useTerminalHistory();

  const openDrawer = useCallback(
    (shellType: string, sessionId: string) => {
      setIsOpen(true);
      setCurrentShell(shellType);
      setActiveSessionId(sessionId);

      // Refresh command history from the active terminal buffer
      history.loadSessionHistory(sessionId);

      // If no diagnosis has been generated yet, start in picker mode
      if (messages.length === 0) {
        setViewMode('picker');
      }
    },
    [history, messages.length]
  );

  const switchToPicker = useCallback(() => {
    setViewMode('picker');
  }, []);

  const switchToChat = useCallback(() => {
    setViewMode('chat');
  }, []);

  const explainSelected = useCallback(async () => {
    if (history.selectedIds.size === 0) {
      options?.showToast?.('Please select at least one command to diagnose', 'info');
      return;
    }

    const payload = formatSelectedCommandPayload(history.blocks, history.selectedIds, 3500);
    if (!payload) {
      options?.showToast?.('Selected commands contain no executable content', 'info');
      return;
    }

    setViewMode('chat');
    setIsExplaining(true);
    setMessages([]);

    try {
      const res = await explainTerminalError(currentShell, payload);
      if (res.success && res.explanation) {
        setMessages([{ role: 'model', content: res.explanation }]);
      } else {
        const errorText = res.error || 'Unable to explain error.';
        setMessages([
          {
            role: 'model',
            content: `⚠️ Diagnosis Failed: ${errorText}\n\nPlease verify your Gemini API key in Settings -> AI Engine.`,
          },
        ]);
        options?.showToast?.(errorText, 'error');
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to diagnose terminal error';
      setMessages([{ role: 'model', content: `⚠️ Error: ${errMsg}` }]);
      options?.showToast?.(errMsg, 'error');
    } finally {
      setIsExplaining(false);
    }
  }, [history.blocks, history.selectedIds, currentShell, options]);

  const sendFollowUp = useCallback(
    async (query: string) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) return;

      const userMsg: ChatMessage = { role: 'user', content: trimmedQuery };
      const updatedHistory = [...messages, userMsg];
      setMessages(updatedHistory);
      setIsSendingFollowUp(true);

      try {
        const res = await askAIFollowUp(updatedHistory, trimmedQuery);
        if (res.success && res.response) {
          setMessages([...updatedHistory, { role: 'model', content: res.response }]);
        } else {
          setMessages([
            ...updatedHistory,
            {
              role: 'model',
              content: `⚠️ Failed to get reply: ${res.error || 'Gemini service error.'}`,
            },
          ]);
          options?.showToast?.(res.error || 'Follow-up query failed', 'error');
        }
      } catch (err: any) {
        const errMsg = err?.message || 'Failed to send follow-up query';
        setMessages([...updatedHistory, { role: 'model', content: `⚠️ Error: ${errMsg}` }]);
        options?.showToast?.(errMsg, 'error');
      } finally {
        setIsSendingFollowUp(false);
      }
    },
    [messages, options]
  );

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearHistory = useCallback(() => {
    setMessages([]);
    setViewMode('picker');
  }, []);

  return {
    isOpen,
    viewMode,
    isExplaining,
    isSendingFollowUp,
    messages,
    currentShell,
    activeSessionId,
    history,
    openDrawer,
    switchToPicker,
    switchToChat,
    explainSelected,
    sendFollowUp,
    closeDrawer,
    clearHistory,
  };
}
