import React, { useRef, useEffect } from 'react';
import Editor, { loader, OnMount, BeforeMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { format } from 'sql-formatter';
import { useTheme } from '../../context/ThemeContext';
import { registerOctaMonacoThemes } from '../../utils/monacoThemes';

// Configure Monaco to use locally bundled monaco-editor package rather than fetching from CDN
loader.config({ monaco });

interface QueryEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  onExecute: (queryToRun?: string) => void;
  onFormat?: () => void;
  onSave?: () => void;
  isExecuting?: boolean;
  tables?: string[];
  columns?: string[];
}

let isProvidersRegistered = false;

export const QueryEditor: React.FC<QueryEditorProps> = ({
  value,
  onChange,
  onExecute,
  onFormat,
  onSave,
  isExecuting,
  tables = [],
  columns = [],
}) => {
  const { monacoTheme } = useTheme();
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const tablesRef = useRef<string[]>(tables);
  const columnsRef = useRef<string[]>(columns);

  useEffect(() => {
    tablesRef.current = tables;
  }, [tables]);

  useEffect(() => {
    columnsRef.current = columns;
  }, [columns]);

  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(monacoTheme);
    }
  }, [monacoTheme]);

  const handleBeforeMount: BeforeMount = (monacoInstance) => {
    registerOctaMonacoThemes(monacoInstance);

    if (!isProvidersRegistered) {
      isProvidersRegistered = true;

      // Register Document Formatting Provider using sql-formatter
      monacoInstance.languages.registerDocumentFormattingEditProvider('sql', {
        provideDocumentFormattingEdits: (model: any) => {
          try {
            const text = model.getValue();
            const formatted = format(text, {
              language: 'postgresql',
              keywordCase: 'upper',
              tabWidth: 2,
              linesBetweenQueries: 2,
            });
            return [
              {
                range: model.getFullModelRange(),
                text: formatted,
              },
            ];
          } catch (e) {
            console.warn('SQL format failed:', e);
            return [];
          }
        },
      });

      // Register Rich SQL Completion Provider
      monacoInstance.languages.registerCompletionItemProvider('sql', {
        provideCompletionItems: (model: any, position: any) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions: any[] = [];

          // 1. Standard SQL Keywords
          const sqlKeywords = [
            'SELECT',
            'FROM',
            'WHERE',
            'INSERT INTO',
            'UPDATE',
            'DELETE FROM',
            'JOIN',
            'LEFT JOIN',
            'RIGHT JOIN',
            'INNER JOIN',
            'FULL OUTER JOIN',
            'GROUP BY',
            'ORDER BY',
            'HAVING',
            'LIMIT',
            'OFFSET',
            'CREATE TABLE',
            'ALTER TABLE',
            'DROP TABLE',
            'TRUNCATE TABLE',
            'RETURNING',
            'UNION ALL',
            'EXISTS',
            'DISTINCT',
            'CASE WHEN',
            'COALESCE',
            'NOW()',
            'COUNT',
            'SUM',
            'AVG',
            'MAX',
            'MIN',
            'VACUUM',
            'EXPLAIN ANALYZE',
          ];

          sqlKeywords.forEach((kw) => {
            suggestions.push({
              label: kw,
              kind: monacoInstance.languages.CompletionItemKind.Keyword,
              insertText: kw,
              range,
            });
          });

          // 2. Useful SQL Snippets
          suggestions.push({
            label: 'sel (SELECT * FROM ...)',
            kind: monacoInstance.languages.CompletionItemKind.Snippet,
            insertText: 'SELECT * FROM ${1:table} WHERE ${2:condition};',
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Basic SELECT statement with WHERE clause',
            range,
          });

          suggestions.push({
            label: 'ins (INSERT INTO ...)',
            kind: monacoInstance.languages.CompletionItemKind.Snippet,
            insertText: 'INSERT INTO ${1:table} (${2:columns})\nVALUES (${3:values});',
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Insert statement',
            range,
          });

          suggestions.push({
            label: 'upd (UPDATE ...)',
            kind: monacoInstance.languages.CompletionItemKind.Snippet,
            insertText: 'UPDATE ${1:table}\nSET ${2:column} = ${3:value}\nWHERE ${4:condition};',
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Update statement',
            range,
          });

          suggestions.push({
            label: 'del (DELETE FROM ...)',
            kind: monacoInstance.languages.CompletionItemKind.Snippet,
            insertText: 'DELETE FROM ${1:table}\nWHERE ${2:condition};',
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Delete statement',
            range,
          });

          suggestions.push({
            label: 'join (SELECT JOIN ...)',
            kind: monacoInstance.languages.CompletionItemKind.Snippet,
            insertText: 'SELECT ${1:a}.*, ${2:b}.*\nFROM ${3:table_a} ${1:a}\nJOIN ${4:table_b} ${2:b} ON ${1:a}.${5:id} = ${2:b}.${6:a_id};',
            insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: 'Inner Join query template',
            range,
          });

          // 3. Dynamic Database Tables
          tablesRef.current.forEach((tbl) => {
            suggestions.push({
              label: tbl,
              kind: monacoInstance.languages.CompletionItemKind.Class,
              insertText: tbl,
              detail: 'Database Table',
              range,
            });
          });

          // 4. Dynamic Database Columns
          columnsRef.current.forEach((col) => {
            suggestions.push({
              label: col,
              kind: monacoInstance.languages.CompletionItemKind.Field,
              insertText: col,
              detail: 'Table Column',
              range,
            });
          });

          return { suggestions };
        },
      });
    }
  };

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    monacoRef.current = monacoInstance;

    // Set active theme on editor mount
    monacoInstance.editor.setTheme(monacoTheme);

    // Shortcut: Ctrl+Enter / Cmd+Enter runs query
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

    // Shortcut: Ctrl+S marks saved
    editor.addCommand(monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.KeyS, () => {
      if (onSave) {
        onSave();
      }
    });

    // Shortcut: Ctrl+Shift+F formats document
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
          fontFamily: "Fira Code, MesloLGS NF, Menlo, Monaco, 'Courier New', monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          lineNumbers: 'on',
          renderLineHighlight: 'all',
          suggestOnTriggerCharacters: true,
          quickSuggestions: { other: true, comments: false, strings: false },
          tabSize: 2,
          wordWrap: 'on',
          padding: { top: 10, bottom: 10 },
        }}
      />
    </div>
  );
};
