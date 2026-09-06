import { useEffect, useRef, useState, useMemo } from 'react';
import * as monaco from 'monaco-editor';
import { ActiveSession } from '../types';
import { getDatabaseSchemaDetails } from '../../../services/api';

export interface SchemaTable {
  name: string;
}

export interface SchemaColumn {
  name: string;
  tableName: string;
  dataType: string;
}

export interface UseMonacoSQLCompletionOptions {
  activeSession?: ActiveSession | null;
  schemaTables?: SchemaTable[];
  schemaColumns?: SchemaColumn[];
  tables?: string[];
  columns?: string[];
  monacoInstance?: any;
}

export function useMonacoSQLCompletion({
  activeSession,
  schemaTables: propSchemaTables,
  schemaColumns: propSchemaColumns,
  tables: propTables,
  columns: propColumns,
  monacoInstance,
}: UseMonacoSQLCompletionOptions = {}) {
  const [fetchedTables, setFetchedTables] = useState<SchemaTable[]>([]);
  const [fetchedColumns, setFetchedColumns] = useState<SchemaColumn[]>([]);

  // 1. Fetch schema whenever active connection or active database changes
  useEffect(() => {
    let isCancelled = false;

    if (!activeSession?.connection || !activeSession?.activeDatabase) {
      setFetchedTables([]);
      setFetchedColumns([]);
      return;
    }

    getDatabaseSchemaDetails(activeSession.connection, activeSession.activeDatabase)
      .then((schema) => {
        if (isCancelled || !schema?.tables) return;
        const tables: SchemaTable[] = schema.tables.map((t) => ({ name: t.name }));
        const columns: SchemaColumn[] = schema.tables.flatMap((t) =>
          (t.columns || []).map((c) => ({
            name: c.name,
            tableName: t.name,
            dataType: c.dataType || '',
          }))
        );
        setFetchedTables(tables);
        setFetchedColumns(columns);
      })
      .catch((err) => {
        console.warn('[useMonacoSQLCompletion] Failed to fetch database schema:', err);
      });

    return () => {
      isCancelled = true;
    };
  }, [activeSession?.connection?.id, activeSession?.activeDatabase]);

  // 2. Compute effective tables and columns (props override fetched)
  const schemaTables = useMemo<SchemaTable[]>(() => {
    if (propSchemaTables && propSchemaTables.length > 0) return propSchemaTables;
    if (propTables && propTables.length > 0) return propTables.map((name) => ({ name }));
    return fetchedTables;
  }, [propSchemaTables, propTables, fetchedTables]);

  const schemaColumns = useMemo<SchemaColumn[]>(() => {
    if (propSchemaColumns && propSchemaColumns.length > 0) return propSchemaColumns;
    if (propColumns && propColumns.length > 0) {
      return propColumns.map((name) => ({ name, tableName: '', dataType: '' }));
    }
    return fetchedColumns;
  }, [propSchemaColumns, propColumns, fetchedColumns]);

  const tablesRef = useRef(schemaTables);
  const columnsRef = useRef(schemaColumns);

  useEffect(() => {
    tablesRef.current = schemaTables;
  }, [schemaTables]);

  useEffect(() => {
    columnsRef.current = schemaColumns;
  }, [schemaColumns]);

  // 3. Register and clean up Monaco completion provider
  useEffect(() => {
    const monacoApi = monacoInstance || (window as any).monaco || monaco;
    if (!monacoApi?.languages?.registerCompletionItemProvider) return;

    const provider: monaco.languages.CompletionItemProvider = {
      triggerCharacters: [' ', '.', '"'],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const lineContent = model.getLineContent(position.lineNumber);
        const hasOpeningQuote = word.startColumn > 1 && lineContent[word.startColumn - 2] === '"';
        const hasClosingQuote = lineContent[word.endColumn - 1] === '"';

        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: hasOpeningQuote ? word.startColumn - 1 : word.startColumn,
          endColumn: hasClosingQuote ? word.endColumn + 1 : word.endColumn,
        };

        const textBefore = lineContent.substring(0, word.startColumn - 1).trimEnd();
        const dotMatch = textBefore.match(/([a-zA-Z0-9_"]+)\.$/);
        const targetTable = dotMatch ? dotMatch[1].replace(/"/g, '').toLowerCase() : null;

        const filteredColumns = targetTable
          ? columnsRef.current.filter((col) => col.tableName.toLowerCase() === targetTable)
          : [];
        const columnsToSuggest = filteredColumns.length > 0 ? filteredColumns : columnsRef.current;

        const tableSuggestions = targetTable
          ? []
          : tablesRef.current.map((table) => ({
              label: table.name,
              kind: monacoApi.languages.CompletionItemKind.Class,
              detail: 'Table',
              insertText: `"${table.name}"`,
              range,
              sortText: `1_${table.name}`,
            }));

        const columnSuggestions = columnsToSuggest.map((col) => ({
          label: col.name,
          kind: monacoApi.languages.CompletionItemKind.Field,
          detail: col.tableName ? `${col.tableName} (${col.dataType || 'column'})` : 'Column',
          insertText: `"${col.name}"`,
          range,
          sortText: targetTable ? `0_${col.name}` : `2_${col.name}`,
        }));

        return { suggestions: [...tableSuggestions, ...columnSuggestions] };
      },
    };

    const disposable = monacoApi.languages.registerCompletionItemProvider('sql', provider);

    return () => {
      disposable.dispose();
    };
  }, [monacoInstance, activeSession?.connection?.id, activeSession?.activeDatabase]);

  return { schemaTables, schemaColumns };
}
