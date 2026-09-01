import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Environment, EnvironmentVariable } from '../types/environments';
import { getAvailableVariablesMap, resolveDynamicMacro } from '../utils/templateResolver';
import { Globe, Key, Sparkles, AlertCircle, ArrowUpRight, X } from 'lucide-react';

interface UrlHighlightInputProps {
  value: string;
  onChange: (val: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  activeEnv: Environment | null;
  globalVariables?: EnvironmentVariable[];
  onUpdateVariable?: (key: string, newValue: string, source?: 'environment' | 'global') => void;
  onOpenManageEnvironments?: (scopeId?: string) => void;
  className?: string;
  disabled?: boolean;
}

interface VariableToken {
  type: 'text' | 'variable';
  text: string;
  rawKey?: string;
  resolved?: boolean;
  value?: string;
  source?: 'environment' | 'global' | 'macro';
  scope?: string;
  isSecret?: boolean;
  startIndex?: number;
}

export const UrlHighlightInput: React.FC<UrlHighlightInputProps> = ({
  value,
  onChange,
  onKeyDown,
  placeholder = 'https://api.example.com/v1/resource',
  activeEnv,
  globalVariables,
  onUpdateVariable,
  onOpenManageEnvironments,
  className = '',
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<any>(null);

  const [activePopoverToken, setActivePopoverToken] = useState<VariableToken | null>(null);
  const [popoverLeft, setPopoverLeft] = useState<number>(8);
  const [editValue, setEditValue] = useState<string>('');

  // Sync horizontal scrolling between input and highlight overlay
  const handleScroll = () => {
    if (inputRef.current && highlightRef.current) {
      highlightRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  };

  // Close popover on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setActivePopoverToken(null);
      }
    };
    if (activePopoverToken) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activePopoverToken]);

  // Clean up hover timeout
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Parse URL string into syntax tokens
  const tokens = React.useMemo(() => {
    if (!value) return [];
    const result: VariableToken[] = [];
    const varsMap = getAvailableVariablesMap(activeEnv, globalVariables);
    const regex = /\{\{\s*([^{}]+?)\s*\}\}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(value)) !== null) {
      if (match.index > lastIndex) {
        result.push({
          type: 'text',
          text: value.substring(lastIndex, match.index),
          startIndex: lastIndex,
        });
      }

      const rawKey = match[1].trim();
      let resolved = false;
      let resolvedVal = '';
      let source: 'environment' | 'global' | 'macro' | undefined = undefined;
      let scope = '';
      let isSecret = false;

      // 1. Exact match in active environment or globals
      if (varsMap.has(rawKey)) {
        const vInfo = varsMap.get(rawKey)!;
        resolved = true;
        resolvedVal = vInfo.value;
        source = vInfo.source;
        scope = vInfo.source === 'environment' ? (activeEnv?.name || 'Active Environment') : 'Globals';
        isSecret = !!vInfo.isSecret;
      } else {
        // 2. Case-insensitive fallback
        const lowerKey = rawKey.toLowerCase();
        for (const [k, vInfo] of varsMap.entries()) {
          if (k.toLowerCase() === lowerKey) {
            resolved = true;
            resolvedVal = vInfo.value;
            source = vInfo.source;
            scope = vInfo.source === 'environment' ? (activeEnv?.name || 'Active Environment') : 'Globals';
            isSecret = !!vInfo.isSecret;
            break;
          }
        }
      }

      // 3. Built-in Dynamic Macros
      if (!resolved) {
        const macroVal = resolveDynamicMacro(rawKey);
        if (macroVal !== null) {
          resolved = true;
          resolvedVal = macroVal;
          source = 'macro';
          scope = 'Dynamic Macro';
        }
      }

      result.push({
        type: 'variable',
        text: match[0],
        rawKey,
        resolved,
        value: resolvedVal,
        source,
        scope,
        isSecret,
        startIndex: match.index,
      });

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < value.length) {
      result.push({
        type: 'text',
        text: value.substring(lastIndex),
        startIndex: lastIndex,
      });
    }

    return result;
  }, [value, activeEnv, globalVariables]);

  const openTokenPopover = useCallback((tok: VariableToken, targetEl: HTMLElement) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const calculatedLeft = Math.max(8, targetRect.left - containerRect.left);
      setPopoverLeft(calculatedLeft);
    }
    setActivePopoverToken(tok);
    setEditValue(tok.value || '');
  }, []);

  const handleTokenMouseEnter = (tok: VariableToken, targetEl: HTMLElement) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      openTokenPopover(tok, targetEl);
    }, 80);
  };

  const handleTokenMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setActivePopoverToken(null);
    }, 200);
  };

  const handlePopoverMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  const handlePopoverMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setActivePopoverToken(null);
    }, 200);
  };

  const handleSaveEdit = (newVal: string) => {
    setEditValue(newVal);
    if (activePopoverToken && activePopoverToken.rawKey && onUpdateVariable) {
      const src = activePopoverToken.source === 'global' ? 'global' : 'environment';
      onUpdateVariable(activePopoverToken.rawKey, newVal, src);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 flex items-center min-w-0 font-mono text-xs ${className}`}
    >
      {/* Foreground Native Transparent Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onScroll={handleScroll}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        className="w-full h-full px-3 py-1.5 text-xs font-mono bg-[#1a1a1d] border border-[#2b2b30] rounded-lg text-transparent caret-brand-400 placeholder:text-zinc-500 selection:bg-brand-500/30 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all relative z-0"
      />

      {/* Syntax Highlighting & Interactive Hover Trigger Overlay */}
      <div
        ref={highlightRef}
        aria-hidden="true"
        className="absolute inset-0 px-3 py-1.5 flex items-center whitespace-pre overflow-x-hidden overflow-y-hidden pointer-events-none select-none text-xs font-mono leading-none z-10"
        style={{ scrollbarWidth: 'none' }}
      >
        {tokens.length === 0 ? (
          <span className="text-transparent"></span>
        ) : (
          tokens.map((tok, idx) => {
            if (tok.type === 'text') {
              return (
                <span key={idx} className="text-zinc-100 pointer-events-none">
                  {tok.text}
                </span>
              );
            }

            // COLOR RULE:
            // Valid resolved with non-empty value -> Blue / Cyan
            // Unresolved OR empty value -> Red / Warning
            const isValid = tok.resolved && tok.value !== undefined && tok.value.trim() !== '';

            return (
              <span
                key={idx}
                onMouseEnter={(e) => handleTokenMouseEnter(tok, e.currentTarget)}
                onMouseLeave={handleTokenMouseLeave}
                onClick={(e) => {
                  e.stopPropagation();
                  openTokenPopover(tok, e.currentTarget);
                }}
                className={`pointer-events-auto cursor-pointer rounded px-1 py-0.5 font-semibold transition-all shadow-sm hover:brightness-125 active:scale-95 ${
                  isValid
                    ? 'text-sky-400 bg-sky-500/10 border border-sky-500/25 hover:border-sky-400'
                    : 'text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:border-rose-400'
                }`}
              >
                {tok.text}
              </span>
            );
          })
        )}
      </div>

      {/* Postman-Style Floating Popover Anchored to Variable Token */}
      {activePopoverToken && (
        <div
          ref={popoverRef}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
          style={{ left: `${Math.min(Math.max(8, popoverLeft), 400)}px` }}
          className="absolute top-full mt-2 w-80 bg-[#18181b] border border-zinc-700/80 rounded-xl shadow-2xl z-50 p-3 animate-in fade-in zoom-in-95 duration-100 font-sans"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800/80">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-xs font-mono font-bold text-zinc-100 truncate">
                &#123;&#123;{activePopoverToken.rawKey}&#125;&#125;
              </span>
            </div>

            <button
              type="button"
              onClick={() => setActivePopoverToken(null)}
              className="p-1 text-zinc-500 hover:text-zinc-300 rounded hover:bg-zinc-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Popover Body: Value Editor */}
          {activePopoverToken.source === 'macro' ? (
            <div className="space-y-2 py-1">
              <div className="text-[11px] text-zinc-400">
                Generated dynamic macro value:
              </div>
              <div className="p-2 bg-[#121214] border border-zinc-800 rounded-lg font-mono text-xs text-amber-300 select-all break-all">
                {activePopoverToken.value}
              </div>
            </div>
          ) : (
            <div className="space-y-2 py-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-400 font-medium">Value:</span>
                {activePopoverToken.resolved && (
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {editValue.length} chars
                  </span>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={editValue}
                  autoFocus
                  onChange={(e) => handleSaveEdit(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape' || e.key === 'Enter') {
                      setActivePopoverToken(null);
                    }
                  }}
                  placeholder="Enter variable value..."
                  className="w-full px-2.5 py-1.5 bg-[#121214] border border-zinc-700/80 focus:border-sky-500 rounded-lg text-xs font-mono text-zinc-100 placeholder:text-zinc-600 outline-none transition-all shadow-inner"
                />
              </div>

              {editValue.trim() === '' && (
                <div className="text-[10px] text-rose-400 flex items-center gap-1 font-medium pt-0.5">
                  <AlertCircle className="w-3 h-3" />
                  <span>Value is empty (token renders in Red)</span>
                </div>
              )}
            </div>
          )}

          {/* Popover Footer: Scope Bar & Edit Link */}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-zinc-800/80 text-[11px]">
            <div className="flex items-center gap-1.5 text-zinc-400 truncate">
              {activePopoverToken.resolved ? (
                activePopoverToken.source === 'macro' ? (
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                ) : activePopoverToken.source === 'global' ? (
                  <Key className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                )
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
              )}
              <span className="truncate font-medium text-zinc-300">
                {activePopoverToken.scope || 'Unresolved Scope'}
              </span>
            </div>

            {activePopoverToken.source !== 'macro' && (
              <button
                type="button"
                onClick={() => {
                  setActivePopoverToken(null);
                  if (onOpenManageEnvironments) {
                    onOpenManageEnvironments(
                      activePopoverToken.source === 'global' ? 'globals' : (activeEnv?.id || 'globals')
                    );
                  }
                }}
                className="flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium hover:underline transition-colors flex-shrink-0 cursor-pointer ml-2"
              >
                <span>Edit in Environment</span>
                <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
