import React, { useState, useEffect } from 'react';
import {
  Send,
  Plus,
  FolderPlus,
  Search,
  Copy,
  Trash2,
  Globe,
  Edit2
} from 'lucide-react';

export interface HttpHeader {
  key: string;
  value: string;
  enabled: boolean;
}

export interface HttpParam {
  key: string;
  value: string;
  enabled: boolean;
}

export interface HttpRequest {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers: HttpHeader[];
  params: HttpParam[];
  bodyType: 'json' | 'raw' | 'none';
  bodyContent: string;
}

export interface CollectionFolder {
  id: string;
  name: string;
  requests: HttpRequest[];
}

export interface HttpResponseState {
  status: number;
  statusText: string;
  durationMs: number;
  sizeKb: number;
  data: any;
  headers: Record<string, string>;
}

const METHOD_COLORS: Record<string, { badge: string; text: string }> = {
  GET: { badge: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300', text: 'text-emerald-400' },
  POST: { badge: 'bg-amber-950/70 border-amber-500/40 text-amber-300', text: 'text-amber-400' },
  PUT: { badge: 'bg-blue-950/70 border-blue-500/40 text-blue-300', text: 'text-blue-400' },
  PATCH: { badge: 'bg-purple-950/70 border-purple-500/40 text-purple-300', text: 'text-purple-400' },
  DELETE: { badge: 'bg-rose-950/70 border-rose-500/40 text-rose-300', text: 'text-rose-400' },
};

const createDefaultRequest = (): HttpRequest => ({
  id: 'req-' + Date.now(),
  name: 'Untitled Request',
  method: 'GET',
  url: '',
  headers: [],
  params: [],
  bodyType: 'none',
  bodyContent: '',
});

interface HttpClientWorkspaceProps {
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const HttpClientWorkspace: React.FC<HttpClientWorkspaceProps> = ({ showToast }) => {
  // Collections loaded from localStorage (default: empty array)
  const [collections, setCollections] = useState<CollectionFolder[]>(() => {
    try {
      const saved = localStorage.getItem('octa_http_collections');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to parse http collections from localStorage', e);
    }
    return [];
  });

  // Active Request State
  const [activeRequest, setActiveRequest] = useState<HttpRequest>(() => {
    try {
      const savedCollections = localStorage.getItem('octa_http_collections');
      if (savedCollections) {
        const parsed = JSON.parse(savedCollections);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.requests?.length > 0) {
          return parsed[0].requests[0];
        }
      }
    } catch {
      // fallback
    }
    return createDefaultRequest();
  });

  const [requestTab, setRequestTab] = useState<'params' | 'headers' | 'body'>('params');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [editingReqId, setEditingReqId] = useState<string | null>(null);
  const [editingReqName, setEditingReqName] = useState('');

  // Response State (Starts null - zero pre-rendered mock data)
  const [responseState, setResponseState] = useState<HttpResponseState | null>(null);

  // Persist collections to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('octa_http_collections', JSON.stringify(collections));
    } catch (e) {
      console.warn('Failed to persist http collections', e);
    }
  }, [collections]);

  // Sync active request changes back to collections
  const updateActiveRequest = (updated: HttpRequest) => {
    setActiveRequest(updated);
    setCollections((prev) =>
      prev.map((col) => ({
        ...col,
        requests: col.requests.map((r) => (r.id === updated.id ? updated : r)),
      }))
    );
  };

  const handleSendRequest = async () => {
    if (!activeRequest.url.trim()) {
      showToast('Please enter a request URL', 'error');
      return;
    }

    setIsSending(true);
    const startTs = Date.now();
    try {
      let targetUrl = activeRequest.url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      const enabledParams = activeRequest.params.filter((p) => p.enabled && p.key);
      if (enabledParams.length > 0) {
        const queryStr = enabledParams
          .map((p) => encodeURIComponent(p.key) + '=' + encodeURIComponent(p.value))
          .join('&');
        targetUrl += (targetUrl.includes('?') ? '&' : '?') + queryStr;
      }

      const reqHeaders: Record<string, string> = {};
      activeRequest.headers.forEach((h) => {
        if (h.enabled && h.key) reqHeaders[h.key] = h.value;
      });

      const options: RequestInit = {
        method: activeRequest.method,
        headers: reqHeaders,
      };

      if (activeRequest.method !== 'GET' && activeRequest.bodyContent && activeRequest.bodyType !== 'none') {
        options.body = activeRequest.bodyContent;
      }

      const res = await fetch(targetUrl, options);
      const durationMs = Date.now() - startTs;
      const text = await res.text();
      let jsonData: any = null;
      try {
        jsonData = JSON.parse(text);
      } catch {
        jsonData = text;
      }

      const resHeaders: Record<string, string> = {};
      res.headers.forEach((v, k) => {
        resHeaders[k] = v;
      });

      setResponseState({
        status: res.status,
        statusText: res.statusText || (res.ok ? 'OK' : 'Error'),
        durationMs,
        sizeKb: Number((text.length / 1024).toFixed(2)),
        data: jsonData,
        headers: resHeaders,
      });

      showToast('Response: ' + res.status + ' ' + (res.statusText || ''), res.ok ? 'success' : 'error');
    } catch (err: any) {
      const durationMs = Date.now() - startTs;
      setResponseState({
        status: 0,
        statusText: 'Network Error',
        durationMs,
        sizeKb: 0,
        data: { error: err?.message || String(err), hint: 'Check target URL, network connection, or CORS permissions' },
        headers: {},
      });
      showToast('Request failed: ' + (err?.message || err), 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateNewCollection = () => {
    const newReq = createDefaultRequest();
    const newCol: CollectionFolder = {
      id: 'col-' + Date.now(),
      name: 'Collection ' + (collections.length + 1),
      requests: [newReq],
    };
    setCollections((prev) => [...prev, newCol]);
    setActiveRequest(newReq);
    setResponseState(null);
    showToast('Created "' + newCol.name + '"', 'success');
  };

  const handleCreateNewRequest = () => {
    const newReq = createDefaultRequest();
    if (collections.length === 0) {
      const newCol: CollectionFolder = {
        id: 'col-' + Date.now(),
        name: 'My Collection',
        requests: [newReq],
      };
      setCollections([newCol]);
    } else {
      setCollections((prev) => [
        {
          ...prev[0],
          requests: [newReq, ...prev[0].requests],
        },
        ...prev.slice(1),
      ]);
    }
    setActiveRequest(newReq);
    setResponseState(null);
    showToast('New request created', 'info');
  };

  const handleDeleteRequest = (reqId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollections((prev) =>
      prev.map((col) => ({
        ...col,
        requests: col.requests.filter((r) => r.id !== reqId),
      }))
    );
    if (activeRequest.id === reqId) {
      setActiveRequest(createDefaultRequest());
      setResponseState(null);
    }
    showToast('Request deleted', 'info');
  };

  const handleDeleteCollection = (colId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollections((prev) => prev.filter((c) => c.id !== colId));
    setActiveRequest(createDefaultRequest());
    setResponseState(null);
    showToast('Collection deleted', 'info');
  };

  return (
    <div className="flex-1 flex h-full bg-[#121212] text-zinc-100 overflow-hidden select-none font-sans">
      {/* 1. HTTP Collections & History Sidebar */}
      <div className="w-64 border-r border-[#262626] bg-[#161616] flex flex-col flex-shrink-0">
        {/* Sidebar Header */}
        <div className="p-3 border-b border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-brand-400" />
            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">API Client</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCreateNewCollection}
              title="New Collection"
              className="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-750 text-zinc-400 hover:text-zinc-200 border border-[#2b2b2b] transition-colors cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleCreateNewRequest}
              title="New HTTP Request"
              className="p-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Filter Input (only when collections exist) */}
        {collections.length > 0 && (
          <div className="px-3 py-2 border-b border-[#262626]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter requests..."
                className="w-full pl-8 pr-2.5 py-1 text-xs bg-[#1a1a1a] border border-[#2b2b2b] rounded-md text-zinc-200 placeholder-zinc-500 focus:border-brand-500 outline-none font-mono"
              />
            </div>
          </div>
        )}

        {/* Collections Tree or Clean Empty State */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {collections.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4 text-center select-none text-zinc-500">
              <div className="w-10 h-10 rounded-xl bg-surface-800 border border-[#2b2b2b] flex items-center justify-center mb-3 text-zinc-400">
                <FolderPlus className="w-5 h-5 text-zinc-400" />
              </div>
              <span className="text-xs font-semibold text-zinc-300">No Collections</span>
              <span className="text-[11px] text-zinc-500 mt-1 mb-4 leading-normal">
                Create a collection to organize and save your API endpoints.
              </span>
              <div className="flex flex-col gap-2 w-full">
                <button
                  type="button"
                  onClick={handleCreateNewRequest}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Request</span>
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewCollection}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-750 text-zinc-300 hover:text-white border border-[#2b2b2b] text-xs transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5 text-zinc-400" />
                  <span>New Collection</span>
                </button>
              </div>
            </div>
          ) : (
            collections.map((col) => (
              <div key={col.id} className="space-y-1">
                <div className="px-2 py-1 flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider group/col">
                  <span className="truncate">{col.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-zinc-600 font-mono text-[10px]">{col.requests.length}</span>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCollection(col.id, e)}
                      title="Delete Collection"
                      className="opacity-0 group-hover/col:opacity-100 p-0.5 text-zinc-500 hover:text-rose-400 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="space-y-0.5">
                  {col.requests
                    .filter(
                      (r) =>
                        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        r.url.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((req) => {
                      const isSelected = activeRequest.id === req.id;
                      const methodColor = METHOD_COLORS[req.method] || METHOD_COLORS.GET;
                      return (
                        <div
                          key={req.id}
                          onClick={() => {
                            setActiveRequest(req);
                            setResponseState(null);
                          }}
                          className={'w-full px-2.5 py-1.5 rounded-md flex items-center gap-2 text-left transition-colors cursor-pointer group/req ' + (isSelected ? 'bg-surface-800 text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1f1f1f]')}
                        >
                          <span
                            className={'text-[10px] font-bold font-mono px-1.5 py-0.2 rounded border ' + methodColor.badge}
                          >
                            {req.method}
                          </span>
                          <span className="text-xs truncate flex-1">{req.name}</span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteRequest(req.id, e)}
                            title="Delete Request"
                            className="opacity-0 group-hover/req:opacity-100 p-0.5 text-zinc-500 hover:text-rose-400 transition-opacity cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Main HTTP Workspace Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#121212]">
        {/* Top Request Title & URL Bar */}
        <div className="p-3 border-b border-[#262626] bg-[#171717] flex flex-col gap-2 flex-shrink-0">
          {/* Request Name Header */}
          <div className="flex items-center gap-2">
            {editingReqId === activeRequest.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editingReqName.trim()) {
                    updateActiveRequest({ ...activeRequest, name: editingReqName.trim() });
                  }
                  setEditingReqId(null);
                }}
                className="flex items-center gap-1.5"
              >
                <input
                  type="text"
                  value={editingReqName}
                  onChange={(e) => setEditingReqName(e.target.value)}
                  autoFocus
                  onBlur={() => {
                    if (editingReqName.trim()) {
                      updateActiveRequest({ ...activeRequest, name: editingReqName.trim() });
                    }
                    setEditingReqId(null);
                  }}
                  className="px-2 py-0.5 text-xs font-semibold bg-[#1f1f1f] border border-cyan-500 rounded text-white outline-none"
                />
              </form>
            ) : (
              <div
                onClick={() => {
                  setEditingReqId(activeRequest.id);
                  setEditingReqName(activeRequest.name);
                }}
                title="Click to rename request"
                className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200 hover:text-white cursor-pointer group"
              >
                <span>{activeRequest.name}</span>
                <Edit2 className="w-3 h-3 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
          </div>

          {/* URL Input & Method Bar */}
          <div className="flex items-center gap-2">
            {/* Method Dropdown */}
            <select
              value={activeRequest.method}
              onChange={(e) => updateActiveRequest({ ...activeRequest, method: e.target.value as any })}
              className={'px-3 py-1.5 text-xs font-mono font-bold rounded-lg border bg-[#1c1c1c] outline-none cursor-pointer ' + (METHOD_COLORS[activeRequest.method]?.badge || '')}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>

            {/* URL Input */}
            <input
              type="text"
              value={activeRequest.url}
              onChange={(e) => updateActiveRequest({ ...activeRequest, url: e.target.value })}
              placeholder="https://api.example.com/v1/resource"
              className="flex-1 px-3 py-1.5 text-xs font-mono bg-[#1a1a1a] border border-[#2b2b2b] rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-brand-500 outline-none"
            />

            {/* Send Button */}
            <button
              type="button"
              onClick={handleSendRequest}
              disabled={isSending}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSending ? 'Sending...' : 'Send'}</span>
            </button>
          </div>
        </div>

        {/* Middle Section: Request Details & Response Inspector */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left / Top: Request Builder */}
          <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-[#262626] overflow-hidden">
            {/* Request Tabs Header */}
            <div className="px-3 border-b border-[#262626] bg-[#161616] flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setRequestTab('params')}
                className={'px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer ' + (requestTab === 'params' ? 'border-brand-400 text-brand-300' : 'border-transparent text-zinc-400 hover:text-zinc-200')}
              >
                Params ({activeRequest.params.length})
              </button>
              <button
                type="button"
                onClick={() => setRequestTab('headers')}
                className={'px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer ' + (requestTab === 'headers' ? 'border-brand-400 text-brand-300' : 'border-transparent text-zinc-400 hover:text-zinc-200')}
              >
                Headers ({activeRequest.headers.length})
              </button>
              <button
                type="button"
                onClick={() => setRequestTab('body')}
                className={'px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer ' + (requestTab === 'body' ? 'border-brand-400 text-brand-300' : 'border-transparent text-zinc-400 hover:text-zinc-200')}
              >
                Body
              </button>
            </div>

            {/* Request Tab Content */}
            <div className="flex-1 p-3 overflow-y-auto bg-[#141414]">
              {requestTab === 'params' && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    Query Parameters
                  </div>
                  {activeRequest.params.map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        onChange={(e) => {
                          const next = [...activeRequest.params];
                          next[idx].enabled = e.target.checked;
                          updateActiveRequest({ ...activeRequest, params: next });
                        }}
                        className="rounded bg-zinc-800 border-zinc-700 text-brand-500"
                      />
                      <input
                        type="text"
                        value={p.key}
                        onChange={(e) => {
                          const next = [...activeRequest.params];
                          next[idx].key = e.target.value;
                          updateActiveRequest({ ...activeRequest, params: next });
                        }}
                        placeholder="Key"
                        className="flex-1 px-2.5 py-1 text-xs bg-[#1a1a1a] border border-[#2b2b2b] rounded text-zinc-200 font-mono outline-none"
                      />
                      <input
                        type="text"
                        value={p.value}
                        onChange={(e) => {
                          const next = [...activeRequest.params];
                          next[idx].value = e.target.value;
                          updateActiveRequest({ ...activeRequest, params: next });
                        }}
                        placeholder="Value"
                        className="flex-1 px-2.5 py-1 text-xs bg-[#1a1a1a] border border-[#2b2b2b] rounded text-zinc-200 font-mono outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = activeRequest.params.filter((_, i) => i !== idx);
                          updateActiveRequest({ ...activeRequest, params: next });
                        }}
                        title="Remove Parameter"
                        className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveRequest({
                        ...activeRequest,
                        params: [...activeRequest.params, { key: '', value: '', enabled: true }],
                      });
                    }}
                    className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 cursor-pointer mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Parameter</span>
                  </button>
                </div>
              )}

              {requestTab === 'headers' && (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Headers</div>
                  {activeRequest.headers.map((h, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={h.enabled}
                        onChange={(e) => {
                          const next = [...activeRequest.headers];
                          next[idx].enabled = e.target.checked;
                          updateActiveRequest({ ...activeRequest, headers: next });
                        }}
                        className="rounded bg-zinc-800 border-zinc-700 text-brand-500"
                      />
                      <input
                        type="text"
                        value={h.key}
                        onChange={(e) => {
                          const next = [...activeRequest.headers];
                          next[idx].key = e.target.value;
                          updateActiveRequest({ ...activeRequest, headers: next });
                        }}
                        placeholder="Header Name"
                        className="flex-1 px-2.5 py-1 text-xs bg-[#1a1a1a] border border-[#2b2b2b] rounded text-zinc-200 font-mono outline-none"
                      />
                      <input
                        type="text"
                        value={h.value}
                        onChange={(e) => {
                          const next = [...activeRequest.headers];
                          next[idx].value = e.target.value;
                          updateActiveRequest({ ...activeRequest, headers: next });
                        }}
                        placeholder="Value"
                        className="flex-1 px-2.5 py-1 text-xs bg-[#1a1a1a] border border-[#2b2b2b] rounded text-zinc-200 font-mono outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const next = activeRequest.headers.filter((_, i) => i !== idx);
                          updateActiveRequest({ ...activeRequest, headers: next });
                        }}
                        title="Remove Header"
                        className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      updateActiveRequest({
                        ...activeRequest,
                        headers: [...activeRequest.headers, { key: '', value: '', enabled: true }],
                      });
                    }}
                    className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 cursor-pointer mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Header</span>
                  </button>
                </div>
              )}

              {requestTab === 'body' && (
                <div className="h-full flex flex-col space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      JSON Body
                    </span>
                  </div>
                  <textarea
                    value={activeRequest.bodyContent}
                    onChange={(e) =>
                      updateActiveRequest({ ...activeRequest, bodyContent: e.target.value, bodyType: 'json' })
                    }
                    placeholder="Enter raw JSON body..."
                    rows={12}
                    className="w-full flex-1 p-3 text-xs font-mono bg-[#161616] border border-[#2b2b2b] rounded-lg text-zinc-200 outline-none resize-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right / Bottom: Response Inspector */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#151515]">
            {/* Response Status Bar */}
            <div className="px-3 py-2 border-b border-[#262626] bg-[#181818] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Response</span>
                {responseState && (
                  <div className="flex items-center gap-2">
                    <span
                      className={'text-xs font-mono font-bold px-2 py-0.5 rounded border ' + (responseState.status >= 200 && responseState.status < 300 ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/70 border-rose-500/40 text-rose-300')}
                    >
                      {responseState.status} {responseState.statusText}
                    </span>
                    <span className="text-xs font-mono text-zinc-400">{responseState.durationMs} ms</span>
                    <span className="text-xs font-mono text-zinc-500">•</span>
                    <span className="text-xs font-mono text-zinc-400">{responseState.sizeKb} KB</span>
                  </div>
                )}
              </div>

              {responseState && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      typeof responseState.data === 'object'
                        ? JSON.stringify(responseState.data, null, 2)
                        : String(responseState.data)
                    );
                    showToast('Response copied to clipboard', 'success');
                  }}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-[#202020] border border-zinc-700/60 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              )}
            </div>

            {/* Response Body Inspector */}
            <div className="flex-1 overflow-auto p-3 bg-[#131313]">
              {responseState ? (
                <pre className="text-xs font-mono text-zinc-200 whitespace-pre leading-relaxed select-text">
                  {typeof responseState.data === 'object'
                    ? JSON.stringify(responseState.data, null, 2)
                    : responseState.data}
                </pre>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center select-none text-zinc-500">
                  <div className="w-12 h-12 rounded-2xl bg-[#1a1a1a] border border-[#2b2b2b] flex items-center justify-center mb-3 text-zinc-400">
                    <Send className="w-5 h-5 text-brand-400 opacity-80" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-300">No response yet</span>
                  <span className="text-[11px] text-zinc-500 mt-1 max-w-xs leading-normal">
                    Enter a URL and click <strong className="text-brand-400">Send</strong> to execute the request and view response data, headers, and status metrics.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
