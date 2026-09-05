import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Environment, EnvironmentVariable } from '../../types/environments';
import { VariableToken, SHARED_TYPOGRAPHY_STYLE } from './urlHighlight/types';
import { useUrlTokens } from './urlHighlight/useUrlTokens';
import { UrlVariablePopover } from './urlHighlight/UrlVariablePopover';

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

  const tokens = useUrlTokens(value, activeEnv, globalVariables);

  const handleScroll = useCallback(() => {
    if (inputRef.current && highlightRef.current) {
      highlightRef.current.scrollLeft = inputRef.current.scrollLeft;
    }
  }, []);

  useEffect(() => {
    handleScroll();
  }, [value, handleScroll]);

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

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

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
      <input
        ref={inputRef}
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onKeyUp={handleScroll}
        onClick={handleScroll}
        onSelect={handleScroll}
        onScroll={handleScroll}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        style={SHARED_TYPOGRAPHY_STYLE}
        className="w-full h-full px-3 py-1.5 bg-slate-100 dark:bg-[#1a1a1d] border border-slate-200 dark:border-[#2b2b30] rounded-lg text-transparent caret-brand-600 dark:caret-brand-400 placeholder:text-slate-400 dark:placeholder:text-zinc-500 selection:bg-brand-500/30 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 outline-none transition-all relative z-0"
      />

      <div
        ref={highlightRef}
        aria-hidden="true"
        style={{
          ...SHARED_TYPOGRAPHY_STYLE,
          scrollbarWidth: 'none',
        }}
        className="absolute inset-0 px-3 py-1.5 border border-transparent rounded-lg overflow-x-hidden overflow-y-hidden pointer-events-none select-none z-10"
      >
        {tokens.length === 0 ? (
          <span className="text-transparent"></span>
        ) : (
          tokens.map((tok, idx) => {
            if (tok.type === 'text') {
              return (
                <span key={idx} className="text-slate-900 dark:text-zinc-100 pointer-events-none">
                  {tok.text}
                </span>
              );
            }

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
                className={`pointer-events-auto cursor-pointer rounded-sm px-0 mx-0 font-semibold transition-colors hover:brightness-125 ${
                  isValid
                    ? 'text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-500/20 shadow-[inset_0_0_0_1px_rgba(56,189,248,0.35)]'
                    : 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/20 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.4)]'
                }`}
              >
                {tok.text}
              </span>
            );
          })
        )}
      </div>

      {activePopoverToken && (
        <UrlVariablePopover
          token={activePopoverToken}
          popoverRef={popoverRef}
          popoverLeft={popoverLeft}
          editValue={editValue}
          activeEnv={activeEnv}
          onClose={() => setActivePopoverToken(null)}
          onEditChange={handleSaveEdit}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
          onOpenManageEnvironments={onOpenManageEnvironments}
        />
      )}
    </div>
  );
};
