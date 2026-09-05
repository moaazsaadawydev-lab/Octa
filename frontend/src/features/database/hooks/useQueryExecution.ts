import { useState, useCallback } from 'react';
import { format } from 'sql-formatter';
import { ActiveSession, QueryResult, QueryHistoryEntry, ExplainPlanResult } from '../types';
import { executeRawQuery, explainQuery } from '../../../services/api';

export interface UseQueryExecutionOptions {
  activeSession: ActiveSession | null;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  onSuccess?: (results: QueryResult[]) => void;
}

export function useQueryExecution({ activeSession, showToast = () => {}, onSuccess }: UseQueryExecutionOptions) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<QueryResult[] | null>(null);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [explainPlan, setExplainPlan] = useState<ExplainPlanResult | null>(null);
  const [history, setHistory] = useState<QueryHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('octa_query_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Failed to parse query history', e);
    }
    return [];
  });

  const runQuery = useCallback(async (sql: string): Promise<QueryResult[] | null> => {
    if (!activeSession) {
      showToast('Please connect to a database first', 'error');
      return null;
    }
    const trimmed = sql.trim();
    if (!trimmed) {
      showToast('Query editor is empty', 'info');
      return null;
    }

    setIsExecuting(true);
    const startTs = Date.now();
    try {
      const queryResults = await executeRawQuery(
        activeSession.connection,
        activeSession.activeDatabase,
        trimmed
      );
      const totalDuration = Date.now() - startTs;
      const totalRows = queryResults.reduce(
        (sum, r) => sum + (r.isSelect ? (r.rows?.length || 0) : (r.rowsAffected || 0)),
        0
      );
      const hasError = queryResults.some((r) => r.error);

      const newEntry: QueryHistoryEntry = {
        id: 'hist-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        query: trimmed,
        timestamp: new Date(),
        executionTime: totalDuration,
        status: hasError ? 'error' : 'success',
        rowCount: totalRows,
        errorMessage: queryResults.find((r) => r.error)?.error,
        database: activeSession.activeDatabase,
      };

      setHistory((prev) => {
        const next = [newEntry, ...prev.slice(0, 99)];
        try {
          localStorage.setItem('octa_query_history', JSON.stringify(next));
        } catch {}
        return next;
      });

      setResults(queryResults);
      setActiveResultIndex(0);
      onSuccess?.(queryResults);

      if (hasError) {
        showToast(queryResults.find((r) => r.error)?.error || 'Query failed', 'error');
      } else {
        showToast(`Query completed in ${totalDuration}ms (${totalRows} rows affected/returned)`, 'success');
      }
      return queryResults;
    } catch (err: any) {
      const totalDuration = Date.now() - startTs;
      const newEntry: QueryHistoryEntry = {
        id: 'hist-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        query: trimmed,
        timestamp: new Date(),
        executionTime: totalDuration,
        status: 'error',
        errorMessage: err?.message || String(err),
        database: activeSession.activeDatabase,
      };
      setHistory((prev) => [newEntry, ...prev.slice(0, 99)]);
      showToast('Query execution failed: ' + (err?.message || err), 'error');
      return null;
    } finally {
      setIsExecuting(false);
    }
  }, [activeSession, onSuccess, showToast]);

  const runExplain = useCallback(async (sql: string, analyze: boolean = false): Promise<ExplainPlanResult | null> => {
    if (!activeSession) {
      showToast('Please connect to a database first', 'error');
      return null;
    }
    const trimmed = sql.trim();
    if (!trimmed) {
      showToast('Query editor is empty', 'info');
      return null;
    }

    setIsExecuting(true);
    const startTs = Date.now();
    try {
      const plan = await explainQuery(
        activeSession.connection,
        activeSession.activeDatabase,
        trimmed,
        analyze
      );
      setExplainPlan(plan);
      const totalDuration = Date.now() - startTs;
      showToast(
        analyze
          ? `Explain Analyze completed in ${totalDuration}ms`
          : `Plan cost: ${plan.totalCost.toFixed(2)}`,
        'success'
      );
      return plan;
    } catch (err: any) {
      showToast('Explain failed: ' + (err?.message || err), 'error');
      return null;
    } finally {
      setIsExecuting(false);
    }
  }, [activeSession, showToast]);

  const formatSql = useCallback((sql: string): string => {
    try {
      return format(sql, {
        language: 'postgresql',
        keywordCase: 'upper',
        tabWidth: 2,
        linesBetweenQueries: 2,
      });
    } catch (err: any) {
      showToast('Failed to format SQL: ' + (err?.message || err), 'error');
      return sql;
    }
  }, [showToast]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem('octa_query_history');
    } catch {}
    showToast('Query history cleared', 'info');
  }, [showToast]);

  return {
    isExecuting,
    results,
    setResults,
    activeResultIndex,
    setActiveResultIndex,
    explainPlan,
    setExplainPlan,
    history,
    runQuery,
    runExplain,
    formatSql,
    clearHistory,
  };
}
