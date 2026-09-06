import React, { useRef, useEffect } from 'react';
import Editor, { loader, OnMount, BeforeMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { useTheme } from '../../../context/ThemeContext';
import { registerOctaMonacoThemes } from '../../../utils/monacoThemes';
import { useEditorLigatures, EDITOR_FONT_FAMILY } from '../../../utils/editorSettings';
import { registerSqlProviders } from '../utils/sqlCompletionProvider';
import { ActiveSession } from '../types';
import { useMonacoSQLCompletion, SchemaTable, SchemaColumn } from '../hooks/useMonacoSQLCompletion';

loader.config({ monaco });

export interface SqlCodeEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  onExecute: (queryToRun?: string) => void;
  onFormat?: () => void;
  onSave?: () => void;
  isExecuting?: boolean;
  tables?: string[];
  columns?: string[];
  schemaTables?: SchemaTable[];
  schemaColumns?: SchemaColumn[];
  activeSession?: ActiveSession | null;
  externalEditorRef?: React.MutableRefObject<any>;
}

export const SqlCodeEditor: React.FC<SqlCodeEditorProps> = ({
  value,
  onChange,
  onExecute,
  onFormat,
  onSave,
  tables = [],
  columns = [],
  schemaTables,
  schemaColumns,
  activeSession,
  externalEditorRef,
}) => {
  const { monacoTheme } = useTheme();
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const [monacoInstance, setMonacoInstance] = React.useState<any>(() => monaco);
  const editorFontLigatures = useEditorLigatures(editorRef);

  useMonacoSQLCompletion({
    activeSession,
    schemaTables,
    schemaColumns,
    tables,
    columns,
    monacoInstance,
  });

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(monacoTheme);
    }
  }, [monacoTheme]);

  const handleBeforeMount: BeforeMount = (instance) => {
    setMonacoInstance(instance);
    registerOctaMonacoThemes(instance);
    registerSqlProviders(instance);
  };

  const handleEditorDidMount: OnMount = (editor, instance) => {
    editorRef.current = editor;
    if (externalEditorRef) {
      externalEditorRef.current = editor;
    }
    monacoRef.current = instance;
    setMonacoInstance(instance);
    instance.editor.setTheme(monacoTheme);

    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter, () => {
      const model = editor.getModel();
      const selection = editor.getSelection();
      let queryToExecute = '';
      if (model && selection && !selection.isEmpty()) {
        queryToExecute = model.getValueInRange(selection).trim();
      } else {
        queryToExecute = editor.getValue().trim();
      }
      onExecute(queryToExecute);
    });

    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
      onSave?.();
    });

    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyMod.Shift | monacoInstance.KeyCode.KeyF,
      () => {
        if (onFormat) {
          onFormat();
        } else {
          editor.getAction('editor.action.formatDocument')?.run();
        }
      }
    );

    editor.focus();
  };

  return (
    <div className="w-full h-full flex flex-col flex-1 min-h-0 relative overflow-hidden bg-white dark:bg-[#141416]">
      <Editor
        height="100%"
        width="100%"
        defaultLanguage="sql"
        language="sql"
        theme={monacoTheme}
        value={value ?? ''}
        onChange={(val) => onChange(val || '')}
        loading={
          <div className="flex items-center justify-center h-full w-full bg-white dark:bg-[#141416] text-slate-400 dark:text-zinc-500 text-xs gap-2 font-mono select-none">
            <div className="w-3.5 h-3.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <span>Loading SQL Editor...</span>
          </div>
        }
        beforeMount={handleBeforeMount}
        onMount={handleEditorDidMount}
        options={{
          theme: monacoTheme,
          fontSize: 14,
          fontFamily: EDITOR_FONT_FAMILY,
          fontLigatures: editorFontLigatures,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          suggestOnTriggerCharacters: true,
          quickSuggestions: { other: true, comments: false, strings: true },
          tabSize: 2,
          wordWrap: 'on',
          padding: { top: 10, bottom: 10 },
        }}
      />
    </div>
  );
};
