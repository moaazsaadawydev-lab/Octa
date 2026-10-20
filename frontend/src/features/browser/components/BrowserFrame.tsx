import React, { useState, useEffect } from 'react';
import { BrowserTab, VIEWPORT_CONFIG } from '../types';
import { RefreshCw, WifiOff, ExternalLink, ShieldCheck } from 'lucide-react';
import { GetLocalhostProxy } from '../../../../wailsjs/go/main/App';

interface BrowserFrameProps {
  tab: BrowserTab;
  iframeRef?: React.RefObject<HTMLIFrameElement | null>;
  onUpdateTabMeta: (tabId: string, meta: { title?: string; faviconUrl?: string }) => void;
  onOpenContextMenu: (x: number, y: number, selectedText?: string) => void;
  onCloseContextMenu: () => void;
}

function buildProxiedUrl(targetUrl: string, proxyBaseUrl: string): string {
  try {
    const targetObj = new URL(targetUrl.startsWith('http') ? targetUrl : `http://${targetUrl}`);
    const proxyObj = new URL(proxyBaseUrl);
    proxyObj.pathname = targetObj.pathname;
    proxyObj.search = targetObj.search;
    proxyObj.hash = targetObj.hash;
    return proxyObj.toString();
  } catch {
    return proxyBaseUrl;
  }
}

export const BrowserFrame: React.FC<BrowserFrameProps> = ({
  tab,
  iframeRef,
  onUpdateTabMeta,
  onOpenContextMenu,
  onCloseContextMenu,
}) => {
  const internalRef = React.useRef<HTMLIFrameElement | null>(null);
  const currentRef = iframeRef || internalRef;

  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [iframeSrc, setIframeSrc] = useState<string>(tab.url);
  const [isProxied, setIsProxied] = useState(false);

  const config = VIEWPORT_CONFIG[tab.viewportMode];
  const isConstrained = tab.viewportMode !== 'desktop';

  // Listen for meta events & context menu events from the injected bridge
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (currentRef.current && e.source && e.source !== currentRef.current.contentWindow) {
        return;
      }
      if (e.data.type === 'OCTA_BROWSER_PAGE_META') {
        const { title, favicon } = e.data;
        if (title || favicon) {
          onUpdateTabMeta(tab.id, { title, faviconUrl: favicon });
        }
      } else if (e.data.type === 'OCTA_CONTEXT_MENU') {
        const rect = currentRef.current?.getBoundingClientRect();
        const screenX = (rect?.left || 0) + (e.data.clientX || 0);
        const screenY = (rect?.top || 0) + (e.data.clientY || 0);
        onOpenContextMenu(screenX, screenY, e.data.selectedText);
      } else if (e.data.type === 'OCTA_CLOSE_CONTEXT_MENU') {
        onCloseContextMenu();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [tab.id, onUpdateTabMeta, onOpenContextMenu, onCloseContextMenu, currentRef]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setHasError(false);

    if (typeof GetLocalhostProxy === 'function') {
      GetLocalhostProxy(tab.url)
        .then((proxyBase: string) => {
          if (!isMounted) return;
          if (proxyBase && proxyBase !== tab.url) {
            setIframeSrc(buildProxiedUrl(tab.url, proxyBase));
            setIsProxied(true);
          } else {
            setIframeSrc(tab.url);
            setIsProxied(false);
          }
        })
        .catch(() => {
          if (!isMounted) return;
          setIframeSrc(tab.url);
          setIsProxied(false);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });
    } else {
      setIframeSrc(tab.url);
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [tab.url, tab.reloadKey]);

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenContextMenu(e.clientX, e.clientY);
      }}
      className="flex-1 flex flex-col items-center justify-center w-full h-full min-h-0 min-w-0 bg-slate-100 dark:bg-[#0c0d11] overflow-auto relative p-0 sm:p-2"
    >
      {/* Responsive Wrapper */}
      <div
        style={{ width: config.width }}
        className={`h-full flex flex-col transition-all duration-300 relative bg-white dark:bg-[#090a0e] ${
          isConstrained
            ? 'rounded-xl shadow-2xl border border-slate-300/80 dark:border-zinc-700/60 overflow-hidden my-auto max-h-[96%]'
            : 'w-full'
        }`}
      >
        {isConstrained && (
          <div className="h-6 bg-slate-200/90 dark:bg-[#181920] border-b border-slate-300/60 dark:border-zinc-700/40 flex items-center justify-between px-3 text-[10px] text-slate-500 dark:text-zinc-400 font-mono select-none">
            <span>{config.label}</span>
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-zinc-700 rounded-full" />
            <div className="flex items-center gap-1">
              {isProxied && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
              <span>Localhost</span>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-slate-200 dark:bg-zinc-800 overflow-hidden z-20">
            <div className="h-full bg-brand-500 animate-pulse w-full" />
          </div>
        )}

        <iframe
          ref={currentRef}
          key={`${tab.id}-${tab.reloadKey}-${iframeSrc}`}
          src={iframeSrc}
          title={tab.title}
          onLoad={() => setIsLoading(false)}
          onError={() => setHasError(true)}
          allow="cross-origin-isolated; clipboard-read; clipboard-write; fullscreen"
          className="w-full flex-1 border-0 bg-white dark:bg-[#090a0e]"
        />

        {hasError && (
          <div className="absolute inset-0 bg-white/95 dark:bg-[#090a0f]/95 flex flex-col items-center justify-center p-6 text-center select-none z-30">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-3 text-rose-500 shadow-sm">
              <WifiOff className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-1">
              Could not reach localhost server
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mb-4 leading-relaxed font-mono">
              Ensure your development server is running on <span className="text-brand-500 font-bold">{tab.url}</span>.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHasError(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium shadow-sm transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof (window as any).runtime?.BrowserOpenURL === 'function') {
                    (window as any).runtime.BrowserOpenURL(tab.url);
                  } else {
                    window.open(tab.url, '_blank');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-medium shadow-sm transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Externally</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
