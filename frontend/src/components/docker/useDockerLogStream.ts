import { useState, useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import { SearchAddon } from '@xterm/addon-search';
import { startDockerLogStream, stopDockerLogStream } from '../../services/api';
import * as runtime from '../../../wailsjs/runtime/runtime';

interface UseDockerLogStreamOptions {
  containerId: string | undefined;
  activeTab: 'logs' | 'terminal';
}

export function useDockerLogStream({ containerId, activeTab }: UseDockerLogStreamOptions) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const autoScrollRef = useRef(autoScroll);

  useEffect(() => {
    autoScrollRef.current = autoScroll;
    if (autoScroll && termRef.current) {
      termRef.current.scrollToBottom();
    }
  }, [autoScroll]);

  const handleClear = () => {
    if (termRef.current) {
      termRef.current.clear();
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (!searchAddonRef.current) return;
    if (value.trim()) {
      searchAddonRef.current.findNext(value, { incremental: true });
    } else {
      searchAddonRef.current.clearDecorations();
    }
  };

  const handleFindNext = () => {
    if (searchAddonRef.current && searchTerm.trim()) {
      searchAddonRef.current.findNext(searchTerm);
    }
  };

  const handleFindPrevious = () => {
    if (searchAddonRef.current && searchTerm.trim()) {
      searchAddonRef.current.findPrevious(searchTerm);
    }
  };

  useEffect(() => {
    if (activeTab !== 'logs' || !containerId || !containerRef.current) {
      return;
    }

    const domNode = containerRef.current;

    const term = new Terminal({
      disableStdin: true,
      cursorBlink: false,
      cursorStyle: 'underline',
      convertEol: true,
      fontSize: 12,
      fontFamily: 'Consolas, "Cascadia Code", "Fira Code", monospace',
      theme: {
        background: '#090a0f',
        foreground: '#d4d4d8',
        black: '#18181b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#f4f4f5',
        brightBlack: '#71717a',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#fde047',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#ffffff',
      },
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(searchAddon);
    term.open(domNode);

    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        webglAddon.dispose();
      });
      term.loadAddon(webglAddon);
    } catch {
      // Fallback
    }

    requestAnimationFrame(() => {
      try {
        fitAddon.fit();
      } catch {
        // Ignore
      }
    });

    termRef.current = term;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    const scrollDisposable = term.onScroll(() => {
      const buffer = term.buffer.active;
      const isBottom = buffer.viewportY >= buffer.baseY;
      if (!isBottom && autoScrollRef.current) {
        setAutoScroll(false);
      } else if (isBottom && !autoScrollRef.current) {
        setAutoScroll(true);
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        try {
          fitAddon.fit();
        } catch {
          // Ignore
        }
      });
    });
    resizeObserver.observe(domNode);

    const eventName = 'docker:logs:' + containerId;
    let unsubscribe: (() => void) | undefined;

    if (runtime && typeof runtime.EventsOn === 'function') {
      unsubscribe = runtime.EventsOn(eventName, (chunk: string) => {
        if (!chunk) return;
        term.write(chunk);
        if (autoScrollRef.current) {
          term.scrollToBottom();
        }
      });
    }

    startDockerLogStream(containerId);

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      } else if (runtime && typeof runtime.EventsOff === 'function') {
        runtime.EventsOff(eventName);
      }
      stopDockerLogStream(containerId);
      scrollDisposable.dispose();
      resizeObserver.disconnect();
      term.dispose();
      termRef.current = null;
      fitAddonRef.current = null;
      searchAddonRef.current = null;
    };
  }, [containerId, activeTab]);

  return {
    containerRef,
    autoScroll,
    setAutoScroll,
    searchTerm,
    handleClear,
    handleSearchChange,
    handleFindNext,
    handleFindPrevious,
  };
}
