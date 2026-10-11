import { useEffect, useRef, useState, useMemo } from 'react';
import * as monaco from 'monaco-editor';
import { ActiveSession } from '../types';
import { getDatabaseSchemaDetails, getDatabases } from '../../../services/api';
import { analyzeSqlContext } from '../utils/sqlContextAnalyzer';
import {
  STATEMENT_KEYWORDS,
  CLAUSE_KEYWORDS,
  OPERATOR_KEYWORDS,
} from '../utils/sqlCompletionData';
import { buildSuggestions } from '../utils/sqlSuggestionBuilder';

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
  databases?: string[];
  monacoInstance?: any;
}

export function useMonacoSQLCompletion({
  activeSession,
  schemaTables: propSchemaTables,
  schemaColumns: propSchemaColumns,
  tables: propTables,
  columns: propColumns,
  databases: propDatabases,
  monacoInstance,
}: UseMonacoSQLCompletionOptions = {}) {
  const [fetchedTables, setFetchedTables] = useState<SchemaTable[]>([]);
  const [fetchedColumns, setFetchedColumns] = useState<SchemaColumn[]>([]);
  const [fetchedDatabases, setFetchedDatabases] = useState<string[]>([]);

  useEffect(() => {
    let isCancelled = false;
    if (!activeSession?.connection || !activeSession?.activeDatabase) {
      setFetchedTables([]);
      setFetchedColumns([]);
      setFetchedDatabases([]);
      return;
    }

    getDatabaseSchemaDetails(activeSession.connection, activeSession.activeDatabase)
      .then((schema) => {
        if (isCancelled || !schema?.tables) return;
        setFetchedTables(schema.tables.map((t) => ({ name: t.name })));
        setFetchedColumns(
          schema.tables.flatMap((t) =>
            (t.columns || []).map((c) => ({
              name: c.name,
              tableName: t.name,
              dataType: c.dataType || '',
            }))
          )
        );
      })
      .catch((err) => console.warn('[useMonacoSQLCompletion] Schema fetch error:', err));

    getDatabases(activeSession.connection)
      .then((dbs) => {
        if (!isCancelled && Array.isArray(dbs)) setFetchedDatabases(dbs);
      })
      .catch(() => {
        if (!isCancelled && activeSession.activeDatabase) {
          setFetchedDatabases([activeSession.activeDatabase]);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeSession?.connection?.id, activeSession?.activeDatabase]);

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

  const databases = useMemo<string[]>(() => {
    if (propDatabases && propDatabases.length > 0) return propDatabases;
    return fetchedDatabases;
  }, [propDatabases, fetchedDatabases]);

  const tablesRef = useRef(schemaTables);
  const columnsRef = useRef(schemaColumns);
  const databasesRef = useRef(databases);
  useEffect(() => { tablesRef.current = schemaTables; }, [schemaTables]);
  useEffect(() => { columnsRef.current = schemaColumns; }, [schemaColumns]);
  useEffect(() => { databasesRef.current = databases; }, [databases]);

  useEffect(() => {
    const monacoApi = monacoInstance || (window as any).monaco || monaco;
    if (!monacoApi?.languages?.registerCompletionItemProvider) return;

    const provider: monaco.languages.CompletionItemProvider = {
      triggerCharacters: ['.'],
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: position.column,
        };

        const fullText = model.getValue();
        const textBeforeCursor = model.getValueInRange({
          startLineNumber: Math.max(1, position.lineNumber - 15),
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const ctx = analyzeSqlContext(textBeforeCursor, fullText);
        const suggestions = buildSuggestions(
          monacoApi,
          range,
          ctx,
          tablesRef.current,
          columnsRef.current,
          databasesRef.current,
          STATEMENT_KEYWORDS,
          CLAUSE_KEYWORDS,
          OPERATOR_KEYWORDS
        );

        return { suggestions };
      },
    };

    const disposable = monacoApi.languages.registerCompletionItemProvider('sql', provider);
    return () => { disposable.dispose(); };
  }, [monacoInstance, activeSession?.connection?.id, activeSession?.activeDatabase]);

  return { schemaTables, schemaColumns, databases };
}
