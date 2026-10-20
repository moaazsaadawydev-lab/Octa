import { useRef, useEffect, useCallback } from 'react';
import { AppSettings } from '../../../types/settings';
import { EditorTab } from '../../../types/editor';

interface UseEditorAutoSaveOptions {
  settings?: AppSettings;
  activeTab: EditorTab | null;
  updateContent: (val: string) => void;
  saveActiveTab: () => Promise<void>;
}

export function useEditorAutoSave({
  settings,
  activeTab,
  updateContent,
  saveActiveTab,
}: UseEditorAutoSaveOptions) {
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleContentChange = useCallback(
    (newVal: string) => {
      updateContent(newVal);
      if (settings?.editorAutoSave === 'afterDelay') {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
          saveActiveTab();
        }, settings?.editorAutoSaveDelay || 1000);
      }
    },
    [updateContent, saveActiveTab, settings?.editorAutoSave, settings?.editorAutoSaveDelay]
  );

  useEffect(() => {
    if (settings?.editorAutoSave !== 'onFocusChange') return;
    const handleBlur = () => {
      if (activeTab?.isDirty) {
        saveActiveTab();
      }
    };
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [settings?.editorAutoSave, activeTab?.isDirty, saveActiveTab]);

  return { handleContentChange };
}
