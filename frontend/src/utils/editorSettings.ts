import { useState, useEffect } from 'react';
import { AppSettings } from '../types/settings';

export const EDITOR_FONT_FAMILY = "'Fira Code', 'Cascadia Code', 'JetBrains Mono', 'MesloLGS NF', Menlo, Monaco, Consolas, monospace";

export function getStoredEditorFontLigatures(): boolean {
  try {
    const saved = localStorage.getItem('octa_global_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.editorFontLigatures !== undefined) return Boolean(parsed.editorFontLigatures);
      if (parsed.editorLigatures !== undefined) return Boolean(parsed.editorLigatures);
    }
  } catch (e) {}
  return true;
}

export function useEditorLigatures(editorRef?: React.MutableRefObject<any>): boolean {
  const [ligatures, setLigatures] = useState<boolean>(getStoredEditorFontLigatures);

  useEffect(() => {
    const handleSettings = (e: Event) => {
      const customEvent = e as CustomEvent<AppSettings>;
      const s = customEvent.detail;
      if (s) {
        const val = Boolean((s.editorFontLigatures ?? s.editorLigatures) ?? true);
        setLigatures(val);
        if (editorRef?.current) {
          try {
            editorRef.current.updateOptions({
              fontLigatures: val,
              fontFamily: EDITOR_FONT_FAMILY,
            });
          } catch (err) {
            console.warn('[EditorSettings] Failed to update editor options:', err);
          }
        }
      }
    };
    window.addEventListener('octa:settings:changed', handleSettings);
    return () => window.removeEventListener('octa:settings:changed', handleSettings);
  }, [editorRef]);

  return ligatures;
}
