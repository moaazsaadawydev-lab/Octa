import type * as monaco from 'monaco-editor';

/**
 * Registers custom dark and light themes for Monaco Editor
 */
export const registerOctaMonacoThemes = (monacoInstance: typeof monaco) => {
  if (!monacoInstance || !monacoInstance.editor) return;

  // 1. Octa Dark Theme (Charcoal / Zinc / Emerald / Sky)
  monacoInstance.editor.defineTheme('octa-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '38bdf8', fontStyle: 'bold' },
      { token: 'keyword.json', foreground: 'c084fc', fontStyle: 'bold' },
      { token: 'string.key.json', foreground: '38bdf8', fontStyle: 'bold' },
      { token: 'type.property.name', foreground: '38bdf8', fontStyle: 'bold' },
      { token: 'string.value.json', foreground: '34d399' },
      { token: 'string', foreground: '34d399' },
      { token: 'number', foreground: 'f59e0b' },
      { token: 'number.json', foreground: 'f59e0b' },
      { token: 'constant.language', foreground: 'f43f5e' },
      { token: 'null', foreground: 'f43f5e' },
      { token: 'comment', foreground: '71717a', fontStyle: 'italic' },
      { token: 'delimiter', foreground: 'a1a1aa' },
      { token: 'delimiter.bracket', foreground: 'e4e4e7' },
      { token: 'operator.sql', foreground: '94a3b8' },
      { token: 'type.sql', foreground: 'c084fc' },
      { token: 'keyword.redis', foreground: '38bdf8', fontStyle: 'bold' },
      { token: 'type.redis', foreground: 'a78bfa' },
    ],
    colors: {
      'editor.background': '#141416',
      'editor.foreground': '#f4f4f5',
      'editor.lineHighlightBackground': '#ffffff08',
      'editor.lineHighlightBorder': '#00000000',
      'editorLineNumber.foreground': '#52525b',
      'editorLineNumber.activeForeground': '#a1a1aa',
      'editorGutter.background': '#141416',
      'editorIndentGuide.background': '#27272a',
      'editorIndentGuide.activeBackground': '#3f3f46',
      'editorWidget.background': '#18181b',
      'editorWidget.border': '#27272a',
      'editorSuggestWidget.background': '#18181b',
      'editorSuggestWidget.border': '#27272a',
      'editorSuggestWidget.selectedBackground': '#27272a',
      'editorSuggestWidget.highlightForeground': '#38bdf8',
      'scrollbarSlider.background': '#ffffff10',
      'scrollbarSlider.hoverBackground': '#ffffff18',
      'scrollbarSlider.activeBackground': '#ffffff24',
      'editor.selectionBackground': '#38bdf825',
      'editor.inactiveSelectionBackground': '#38bdf812',
    },
  });

  // 2. Octa Light Theme (Clean White / Slate / Sapphire / Emerald)
  monacoInstance.editor.defineTheme('octa-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '0284c7', fontStyle: 'bold' },
      { token: 'keyword.json', foreground: '7c3aed', fontStyle: 'bold' },
      { token: 'string.key.json', foreground: '0284c7', fontStyle: 'bold' },
      { token: 'type.property.name', foreground: '0284c7', fontStyle: 'bold' },
      { token: 'string.value.json', foreground: '059669' },
      { token: 'string', foreground: '059669' },
      { token: 'number', foreground: 'd97706' },
      { token: 'number.json', foreground: 'd97706' },
      { token: 'constant.language', foreground: 'e11d48' },
      { token: 'null', foreground: 'e11d48' },
      { token: 'comment', foreground: '94a3b8', fontStyle: 'italic' },
      { token: 'delimiter', foreground: '64748b' },
      { token: 'delimiter.bracket', foreground: '334155' },
      { token: 'operator.sql', foreground: '64748b' },
      { token: 'type.sql', foreground: '7c3aed' },
      { token: 'keyword.redis', foreground: '0284c7', fontStyle: 'bold' },
      { token: 'type.redis', foreground: '7c3aed' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#0f172a',
      'editor.lineHighlightBackground': '#f8fafc',
      'editor.lineHighlightBorder': '#00000000',
      'editorLineNumber.foreground': '#94a3b8',
      'editorLineNumber.activeForeground': '#334155',
      'editorGutter.background': '#ffffff',
      'editorIndentGuide.background': '#e2e8f0',
      'editorIndentGuide.activeBackground': '#cbd5e1',
      'editorWidget.background': '#ffffff',
      'editorWidget.border': '#e2e8f0',
      'editorSuggestWidget.background': '#ffffff',
      'editorSuggestWidget.border': '#e2e8f0',
      'editorSuggestWidget.selectedBackground': '#f1f5f9',
      'editorSuggestWidget.highlightForeground': '#0284c7',
      'scrollbarSlider.background': '#00000010',
      'scrollbarSlider.hoverBackground': '#00000018',
      'scrollbarSlider.activeBackground': '#00000024',
      'editor.selectionBackground': '#0284c720',
      'editor.inactiveSelectionBackground': '#0284c710',
    },
  });
};

export const getMonacoThemeName = (resolvedTheme: 'dark' | 'light'): string => {
  return resolvedTheme === 'dark' ? 'octa-dark' : 'octa-light';
};
