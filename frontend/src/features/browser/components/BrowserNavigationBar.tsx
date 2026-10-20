import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCw,
  ExternalLink,
  Copy,
  Check,
  Monitor,
  Tablet,
  Smartphone,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { ViewportMode, BrowserTab, BrowserHistoryItem } from '../types';
import { BrowserSuggestionsDropdown } from './BrowserSuggestionsDropdown';
import { openExternalUrl } from '../../../utils/urlUtils';

interface BrowserNavigationBarProps {
  activeTab: BrowserTab;
  onNavigate: (url: string) => void;
  onReload: () => void;
  onSetViewportMode: (mode: ViewportMode) => void;
  getSuggestions?: (query: string) => BrowserHistoryItem[];
  onRemoveHistoryItem?: (url: string) => void;
}

export const BrowserNavigationBar: React.FC<BrowserNavigationBarProps> = ({
  activeTab,
  onNavigate,
  onReload,
  onSetViewportMode,
  getSuggestions,
  onRemoveHistoryItem,
}) => {
  const [inputUrl, setInputUrl] = useState(activeTab.url);
  const [isCopied, setIsCopied] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputUrl(activeTab.url);
  }, [activeTab.url, activeTab.id]);

  const suggestions = isFocused && getSuggestions ? getSuggestions(inputUrl) : [];

  const handleSelectSuggestion = (item: BrowserHistoryItem) => {
    setInputUrl(item.url);
    onNavigate(item.url);
    setIsFocused(false);
    setSelectedIndex(-1);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      handleSelectSuggestion(suggestions[selectedIndex]);
      return;
    }
    if (inputUrl.trim()) {
      onNavigate(inputUrl.trim());
      setIsFocused(false);
      setSelectedIndex(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      setSelectedIndex(-1);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeTab.url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-2 h-10 px-3 bg-white dark:bg-[#14151a] border-b border-slate-200 dark:border-zinc-800 select-none flex-shrink-0 relative">
      {/* Reload Button */}
      <button
        type="button"
        onClick={onReload}
        title="Reload Page (Ctrl+R)"
        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
      >
        <RotateCw className="w-3.5 h-3.5" />
      </button>

      {/* URL Omnibox Form with Autocomplete */}
      <div className="flex-1 relative min-w-0">
        <form onSubmit={handleSubmit} className="flex items-center relative w-full">
          <div className="absolute left-2.5 flex items-center gap-1 pointer-events-none text-slate-400 dark:text-zinc-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          </div>

          <input
            type="text"
            value={inputUrl}
            onChange={(e) => {
              setInputUrl(e.target.value);
              setSelectedIndex(-1);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Search history or enter port (:9001) / URL..."
            className="w-full h-7 pl-8 pr-8 rounded-md bg-slate-100 dark:bg-[#1d1f27] border border-slate-200 dark:border-zinc-700/80 text-xs font-mono text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500/80 focus:border-brand-500 transition-all"
          />

          <button
            type="submit"
            title="Navigate"
            className="absolute right-1.5 p-1 rounded hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        </form>

        {/* Autocomplete History Suggestions Dropdown */}
        {isFocused && (
          <BrowserSuggestionsDropdown
            suggestions={suggestions}
            selectedIndex={selectedIndex}
            onSelect={handleSelectSuggestion}
            onRemoveItem={onRemoveHistoryItem}
            dropdownRef={dropdownRef}
          />
        )}
      </div>

      {/* Responsive Viewport Switcher */}
      <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-[#1d1f27] p-0.5 rounded-md border border-slate-200 dark:border-zinc-700/80">
        <button
          type="button"
          onClick={() => onSetViewportMode('desktop')}
          title="Desktop View (Full Width)"
          className={`p-1 rounded transition-colors cursor-pointer ${
            activeTab.viewportMode === 'desktop'
              ? 'bg-white dark:bg-zinc-800 text-brand-600 dark:text-brand-400 shadow-xs'
              : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onSetViewportMode('tablet')}
          title="Tablet View (768px)"
          className={`p-1 rounded transition-colors cursor-pointer ${
            activeTab.viewportMode === 'tablet'
              ? 'bg-white dark:bg-zinc-800 text-brand-600 dark:text-brand-400 shadow-xs'
              : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
          }`}
        >
          <Tablet className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onSetViewportMode('mobile')}
          title="Mobile View (375px)"
          className={`p-1 rounded transition-colors cursor-pointer ${
            activeTab.viewportMode === 'mobile'
              ? 'bg-white dark:bg-zinc-800 text-brand-600 dark:text-brand-400 shadow-xs'
              : 'text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Copy URL */}
      <button
        type="button"
        onClick={handleCopy}
        title="Copy URL"
        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
      >
        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>

      {/* Open in External System Browser */}
      <button
        type="button"
        onClick={() => openExternalUrl(activeTab.url)}
        title="Open in System Browser"
        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
