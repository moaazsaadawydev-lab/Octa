import { useState, useCallback } from 'react';
import { generateCommitMessage } from '../../services/aiApi';

interface UseCommitAIOptions {
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useCommitAI(options?: UseCommitAIOptions) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = useCallback(
    async (repoPath: string, onGenerated: (msg: string) => void) => {
      if (!repoPath) {
        options?.showToast?.('No active Git repository', 'error');
        return;
      }

      setIsGenerating(true);
      try {
        const res = await generateCommitMessage(repoPath);
        if (res.success && res.message) {
          onGenerated(res.message);
          options?.showToast?.('AI commit message generated!', 'success');
        } else {
          const lowerMsg = (res.message || '').toLowerCase();
          if (lowerMsg.includes('no changes found')) {
            options?.showToast?.(
              'No changes found to generate a commit message.',
              'info'
            );
          } else if (lowerMsg.includes('api key is not configured')) {
            options?.showToast?.(
              'Gemini API key not configured. Open Settings -> AI Engine.',
              'error'
            );
          } else {
            options?.showToast?.(
              res.message || 'Failed to generate commit message',
              'error'
            );
          }
        }
      } catch (err: any) {
        options?.showToast?.(
          err?.message || 'Error generating commit message',
          'error'
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [options]
  );

  return {
    isGenerating,
    generate,
  };
}
