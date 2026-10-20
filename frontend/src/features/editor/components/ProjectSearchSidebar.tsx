import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, ChevronRight, ChevronDown, FileText, Loader2 } from 'lucide-react';
import { ProjectSearchResult, FileSearchResult, SearchMatch } from '../../../types/editor';
import { searchProjectContent } from '../services/editorApi';

interface ProjectSearchSidebarProps {
  rootPath: string | null;
  onSelectLocation: (filePath: string, line: number, col: number, matchLen: number) => void;
  width?: number;
}

export const ProjectSearchSidebar: React.FC<ProjectSearchSidebarProps> = ({
  rootPath,
  onSelectLocation,
  width,
}) => {
  const [query, setQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProjectSearchResult | null>(null);
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(new Set());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performSearch = useCallback(
    async (searchTerm: string, isCaseSensitive: boolean) => {
      if (!rootPath || !searchTerm.trim()) {
        setResult(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      const res = await searchProjectContent(rootPath, searchTerm.trim(), isCaseSensitive, 300);
      setResult(res);
      setLoading(false);
      setCollapsedFiles(new Set());
    },
    [rootPath]
  );

  const handleQueryChange = (val: string) => {
    setQuery(val);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (!val.trim()) {
      setResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceTimerRef.current = setTimeout(() => {
      performSearch(val, caseSensitive);
    }, 280);
  };

  const toggleCase = () => {
    const next = !caseSensitive;
    setCaseSensitive(next);
    if (query.trim()) {
      performSearch(query, next);
    }
  };

  const toggleFile = (filePath: string) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) next.delete(filePath);
      else next.add(filePath);
      return next;
    });
  };

  const renderHighlightedSnippet = (text: string, term: string) => {
    if (!term) return text;
    const flags = caseSensitive ? 'g' : 'gi';
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, flags);
    const parts = text.split(regex);
    return parts.map((part, i) =>
      part.toLowerCase() === term.toLowerCase() ? (
        <span key={i} className="bg-amber-400/40 text-amber-200 font-bold px-0.5 rounded">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div
      style={{ width: width ? `${width}px` : undefined }}
      className="w-64 min-w-[160px] h-full bg-slate-50 dark:bg-[#0c0d12] flex flex-col select-none text-xs flex-shrink-0"
    >
      {/* Search Input Area */}
      <div className="p-2.5 border-b border-slate-200 dark:border-zinc-800">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search across files..."
            className="w-full pl-7 pr-14 py-1.5 bg-white dark:bg-[#15171f] border border-slate-200 dark:border-zinc-700/80 rounded text-xs text-slate-900 dark:text-zinc-200 placeholder-slate-400 focus:outline-none focus:border-brand-500 font-sans"
          />
          <div className="absolute right-1.5 flex items-center gap-1">
            <button
              type="button"
              onClick={toggleCase}
              title="Match Case"
              className={`px-1 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                caseSensitive
                  ? 'bg-brand-500 text-white font-bold'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200'
              }`}
            >
              Aa
            </button>
            {query && (
              <button
                type="button"
                onClick={() => handleQueryChange('')}
                className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Status Line */}
        <div className="mt-1.5 px-0.5 text-[11px] text-slate-500 dark:text-zinc-400 flex items-center justify-between">
          {loading ? (
            <span className="flex items-center gap-1 text-brand-500">
              <Loader2 className="w-3 h-3 animate-spin" /> Searching project...
            </span>
          ) : result ? (
            <span>
              {result.totalMatches} {result.totalMatches === 1 ? 'match' : 'matches'} in {result.files.length} {result.files.length === 1 ? 'file' : 'files'}
            </span>
          ) : (
            <span>{rootPath ? 'Type to search project' : 'Open a project folder first'}</span>
          )}
        </div>
      </div>

      {/* Results Tree */}
      <div className="flex-1 overflow-y-auto p-1 font-mono text-[11px]">
        {result && result.files.length === 0 && !loading && (
          <div className="p-4 text-center text-slate-400 dark:text-zinc-500 font-sans">
            No matches found for "{result.query}"
          </div>
        )}

        {result?.files.map((f: FileSearchResult) => {
          const isCollapsed = collapsedFiles.has(f.filePath);
          return (
            <div key={f.filePath} className="mb-1">
              {/* File Header */}
              <div
                onClick={() => toggleFile(f.filePath)}
                className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 cursor-pointer text-slate-700 dark:text-zinc-300 font-semibold truncate group"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
                )}
                <FileText className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
                <span className="truncate flex-1" title={f.relPath}>
                  {f.fileName}
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 ml-1.5 font-normal">
                    {f.relPath.replace('/' + f.fileName, '')}
                  </span>
                </span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 font-mono">
                  {f.matches.length}
                </span>
              </div>

              {/* Match Rows */}
              {!isCollapsed && (
                <div className="pl-4 pr-1 py-0.5 space-y-0.5 border-l border-slate-200 dark:border-zinc-800 ml-3 mt-0.5">
                  {f.matches.map((m: SearchMatch, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => onSelectLocation(f.filePath, m.line, m.column, m.matchLen)}
                      title={`Line ${m.line}: ${m.lineText}`}
                      className="flex items-start gap-2 px-1.5 py-0.5 rounded hover:bg-brand-500/10 hover:text-brand-600 dark:hover:text-brand-400 cursor-pointer text-slate-600 dark:text-zinc-400 group transition-colors"
                    >
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 w-6 text-right flex-shrink-0 select-none">
                        {m.line}
                      </span>
                      <span className="truncate flex-1 font-mono text-[11px] leading-tight">
                        {renderHighlightedSnippet(m.lineText, result.query)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
