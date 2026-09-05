import { useState, useEffect, useCallback, useMemo } from 'react';
import { ActiveSession, TableColumn } from '../types';
import { getTables, getTableSchema } from '../../../services/api';

export interface UseSchemaExplorerOptions {
  activeSession: ActiveSession | null;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useSchemaExplorer({ activeSession, showToast = () => {} }: UseSchemaExplorerOptions) {
  const [tables, setTables] = useState<string[]>([]);
  const [tableSearch, setTableSearch] = useState('');
  const [loadingTables, setLoadingTables] = useState(false);
  const [schemas, setSchemas] = useState<Record<string, TableColumn[]>>({});
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  const [openTableTabs, setOpenTableTabs] = useState<string[]>([]);
  const [activeTableTab, setActiveTableTab] = useState<string | null>(null);

  const fetchTablesList = useCallback(async () => {
    if (!activeSession) {
      setTables([]);
      return;
    }
    setLoadingTables(true);
    try {
      const tbls = await getTables(activeSession.connection, activeSession.activeDatabase);
      setTables(tbls || []);
    } catch (err: any) {
      console.error('Failed to load tables:', err);
      showToast('Failed to load tables: ' + (err?.message || err), 'error');
      setTables([]);
    } finally {
      setLoadingTables(false);
    }
  }, [activeSession, showToast]);

  useEffect(() => {
    fetchTablesList();
    setOpenTableTabs([]);
    setActiveTableTab(null);
    setSchemas({});
    setExpandedTables({});
  }, [activeSession?.connection?.id, activeSession?.activeDatabase, fetchTablesList]);

  const fetchSchema = useCallback(async (tableName: string): Promise<TableColumn[]> => {
    if (!activeSession) return [];
    if (schemas[tableName]) return schemas[tableName];

    try {
      const cols = await getTableSchema(
        activeSession.connection,
        activeSession.activeDatabase,
        tableName
      );
      setSchemas((prev) => ({ ...prev, [tableName]: cols || [] }));
      return cols || [];
    } catch (err: any) {
      console.warn(`Failed to load schema for table ${tableName}:`, err);
      return [];
    }
  }, [activeSession, schemas]);

  const toggleExpandTable = useCallback(async (tableName: string) => {
    const isExpanded = Boolean(expandedTables[tableName]);
    setExpandedTables((prev) => ({ ...prev, [tableName]: !isExpanded }));
    if (!isExpanded && !schemas[tableName]) {
      await fetchSchema(tableName);
    }
  }, [expandedTables, fetchSchema, schemas]);

  const handleOpenTableTab = useCallback((tableName: string) => {
    if (!openTableTabs.includes(tableName)) {
      setOpenTableTabs((prev) => [...prev, tableName]);
    }
    setActiveTableTab(tableName);
    fetchSchema(tableName);
  }, [fetchSchema, openTableTabs]);

  const handleCloseTableTab = useCallback((tableName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenTableTabs((prev) => {
      const next = prev.filter((t) => t !== tableName);
      if (activeTableTab === tableName) {
        const closedIdx = prev.indexOf(tableName);
        const nextActive = next[closedIdx] || next[closedIdx - 1] || null;
        setActiveTableTab(nextActive);
      }
      return next;
    });
  }, [activeTableTab]);

  const filteredTables = useMemo(() => {
    if (!tableSearch.trim()) return tables;
    const q = tableSearch.toLowerCase();
    return tables.filter((t) => t.toLowerCase().includes(q));
  }, [tables, tableSearch]);

  return {
    tables,
    filteredTables,
    tableSearch,
    setTableSearch,
    loadingTables,
    schemas,
    expandedTables,
    openTableTabs,
    setOpenTableTabs,
    activeTableTab,
    setActiveTableTab,
    fetchTablesList,
    fetchSchema,
    toggleExpandTable,
    handleOpenTableTab,
    handleCloseTableTab,
  };
}
