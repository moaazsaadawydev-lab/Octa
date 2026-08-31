import React, { useRef, useEffect } from 'react';
import Editor, { OnMount, BeforeMount } from '@monaco-editor/react';
import { format } from 'sql-formatter';

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

  const handleBeforeMount: BeforeMount = (monaco) => {
    // Define custom dark theme matching Octa palette
    monaco.editor.defineTheme('octa-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '38bdf8', fontStyle: 'bold' },
        { token: 'string', foreground: 'a3e635' },
        { token: 'number', foreground: 'f59e0b' },
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
        { token: 'operator.sql', foreground: '94a3b8' },
        { token: 'type.sql', foreground: 'c084fc' },
      ],
      colors: {
        'editor.background': '#121212',
        'editor.foreground': '#f3f4f6',
        'editor.lineHighlightBackground': '#181818',
        'editorLineNumber.foreground': '#4b5563',
        'editorLineNumber.activeForeground': '#9ca3af',
        'editorGutter.background': '#161616',
        'editorIndentGuide.background': '#262626',
        'editorIndentGuide.activeBackground': '#404040',
        'editorSuggestWidget.background': '#181818',
        'editorSuggestWidget.border': '#2d2d2d',
        'editorSuggestWidget.selectedBackground': '#262626',
        'editorSuggestWidget.highlightForeground': '#38bdf8',
      },
    });

    // Register Document Formatting Provider using sql-formatter
    monaco.languages.registerDocumentFormattingEditProvider('sql', {
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
    monaco.languages.registerCompletionItemProvider('sql', {
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
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            range,
          });
        });

        // 2. Useful SQL Snippets
        suggestions.push({
          label: 'sel (SELECT * FROM ...)',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'SELECT * FROM ${1:table} WHERE ${2:condition};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Basic SELECT statement with WHERE clause',
          range,
        });

        suggestions.push({
          label: 'ins (INSERT INTO ...)',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'INSERT INTO ${1:table} (${2:columns})\nVALUES (${3:values});',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Insert statement',
          range,
        });

        suggestions.push({
          label: 'upd (UPDATE ...)',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'UPDATE ${1:table}\nSET ${2:column} = ${3:value}\nWHERE ${4:condition};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Update statement',
          range,
        });

        suggestions.push({
          label: 'del (DELETE FROM ...)',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'DELETE FROM ${1:table}\nWHERE ${2:condition};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Delete statement',
          range,
        });

        suggestions.push({
          label: 'join (SELECT JOIN ...)',
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: 'SELECT ${1:a}.*, ${2:b}.*\nFROM ${3:table_a} ${1:a}\nJOIN ${4:table_b} ${2:b} ON ${1:a}.${5:id} = ${2:b}.${6:a_id};',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Inner Join query template',
          range,
        });

        // 3. Dynamic Database Tables
        tablesRef.current.forEach((tbl) => {
          suggestions.push({
            label: tbl,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: tbl,
            detail: 'Database Table',
            range,
          });
        });

        // 4. Dynamic Database Columns
        columnsRef.current.forEach((col) => {
          suggestions.push({
            label: col,
            kind: monaco.languages.CompletionItemKind.Field,
            insertText: col,
            detail: 'Table Column',
            range,
          });
        });

        return { suggestions };
      },
    });
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Shortcut: Ctrl+Enter / Cmd+Enter runs query
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
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
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      if (onSave) {
        onSave();
      }
    });

    editor.focus();
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#121212] relative">
      <Editor
        height="100%"
        defaultLanguage="sql"
        language="sql"
        value={value}
        onChange={(val) => onChange(val || '')}
        beforeMount={handleBeforeMount}
        onMount={handleEditorDidMount}
        options={{
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

