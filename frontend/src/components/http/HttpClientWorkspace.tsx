import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import {
  Send,
  Sliders,
  Key,
  Plus,
  FolderPlus,
  Search,
  Copy,
  Trash2,
  Globe,
  Edit2,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  Layers,
  MoreVertical,
  Files,
  X,
  Check,
  Columns2,
  Rows2,
  Sparkles,
  Minimize2,
  Upload,
  Paperclip,
  CheckCircle2,
  AlertCircle,
  Code2,
  FileCode,
  FileText,
  File as FileIcon,
  Eye,
  EyeOff,
  ShieldCheck,
  Cookie as CookieIcon
} from 'lucide-react';
import interfaceSvg from '../../assets/interface.svg';
import { saveHttpClientData, loadHttpClientData, executeHttpRequest, selectFilesDialog, saveEnvironmentsData, loadEnvironmentsData, HttpRequestPayload, FormFieldPayload, HttpResponsePayload } from '../../services/api';
import { Environment, EnvironmentVariable, EnvironmentVariableType } from '../../types/environments';
import { mapPostmanCollection } from '../../services/postmanMapper';
import { UrlHighlightInput } from './UrlHighlightInput';
import { resolveTemplate, getAvailableVariablesMap } from '../../utils/templateResolver';
import { useTheme } from '../../context/ThemeContext';

// Configure Monaco to use locally bundled version
loader.config({ monaco });

import {
  HttpMethod,
  HttpBodyType,
  HttpHeader,
  HttpParam,
  FormFileMeta,
  FormDataField,
  UrlEncodedField,
  HttpRequestItem,
  HttpFolderItem,
  HttpTreeItem,
  HttpResponseState,
  AutoHeaderDefinition,
  StoredCookie,
  DEFAULT_JSON_BODY,
  HTTP_METHODS,
  METHOD_COLORS,
  defineOctaTheme,
  parseSetCookie,
  getMatchingCookies,
  formatCookieHeader,
  getDynamicAutoHeaderDefinitions,
  getComputedAutoHeaders,
  safeDecodeUriComponent,
  parseQueryParamsFromUrl,
  buildUrlWithParams,
  createDefaultRequest,
  createDefaultFolder,
  createDefaultCollection,
} from '../../types/http';

defineOctaTheme(monaco);
// Helper: Format file size in human-readable units
function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

// Helper: Count total requests inside a folder / collection recursively
function countRequests(item: HttpTreeItem): number {
  if (item.type === 'request') return 1;
  return item.items.reduce((sum, child) => sum + countRequests(child), 0);
}

// Helper: Check if targetId is a descendant of parentId
function isDescendant(tree: HttpTreeItem[], parentId: string, targetId: string): boolean {
  for (const item of tree) {
    if (item.id === parentId) {
      if (item.type === 'request') return false;
      const searchDescendants = (children: HttpTreeItem[]): boolean => {
        for (const child of children) {
          if (child.id === targetId) return true;
          if (child.type !== 'request' && searchDescendants(child.items)) return true;
        }
        return false;
      };
      return searchDescendants(item.items);
    }
    if (item.type !== 'request') {
      if (isDescendant(item.items, parentId, targetId)) return true;
    }
  }
  return false;
}

// Helper: Find item by ID
function findItemById(tree: HttpTreeItem[], id: string): HttpTreeItem | null {
  for (const item of tree) {
    if (item.id === id) return item;
    if (item.type !== 'request') {
      const found = findItemById(item.items, id);
      if (found) return found;
    }
  }
  return null;
}

// Helper: Find parent of an item
function findParentOfItem(
  tree: HttpFolderItem[],
  id: string
): { parent: HttpFolderItem | null; index: number } | null {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === id) {
      return { parent: null, index: i };
    }
  }
  for (const folder of tree) {
    const res = findInFolder(folder, id);
    if (res) return res;
  }
  function findInFolder(
    parent: HttpFolderItem,
    targetId: string
  ): { parent: HttpFolderItem; index: number } | null {
    for (let i = 0; i < parent.items.length; i++) {
      if (parent.items[i].id === targetId) {
        return { parent, index: i };
      }
      const child = parent.items[i];
      if (child.type !== 'request') {
        const nested = findInFolder(child, targetId);
        if (nested) return nested;
      }
    }
    return null;
  }
  return null;
}

// Helper: Normalize collections
function normalizeCollections(data: any): HttpFolderItem[] {
  if (!Array.isArray(data)) return [];
  return data.map((col: any) => {
    if (col.type === 'collection' || col.type === 'folder') {
      return {
        ...col,
        isOpen: col.isOpen !== false,
        items: Array.isArray(col.items) ? normalizeItems(col.items) : [],
      };
    }
    return {
      id: col.id || 'col-' + Date.now(),
      type: 'collection',
      name: col.name || 'Untitled Collection',
      isOpen: true,
      items: Array.isArray(col.requests)
        ? col.requests.map((r: any) => ({ ...r, type: 'request' }))
        : [],
    };
  });
}

function normalizeItems(items: any[]): (HttpFolderItem | HttpRequestItem)[] {
  return items.map((item) => {
    if (item.type === 'collection' || item.type === 'folder') {
      return {
        ...item,
        isOpen: item.isOpen !== false,
        items: Array.isArray(item.items) ? normalizeItems(item.items) : [],
      };
    }
    return {
      ...item,
      type: 'request',
      headers: Array.isArray(item.headers) ? item.headers : [],
      params: Array.isArray(item.params) ? item.params : [],
      bodyType: (item.bodyType as HttpBodyType) || (item.bodyContent ? 'json' : 'none'),
      bodyContent: item.bodyContent || (item.bodyType === 'json' ? DEFAULT_JSON_BODY : ''),
      bodyFormData: Array.isArray(item.bodyFormData) ? item.bodyFormData : [],
      bodyUrlEncoded: Array.isArray(item.bodyUrlEncoded) ? item.bodyUrlEncoded : [],
      disabledAutoHeaders: Array.isArray(item.disabledAutoHeaders) ? item.disabledAutoHeaders : [],
      isDirty: false,
    };
  });
}

// --- Custom Method Dropdown Component ---
interface HttpMethodDropdownProps {
  value: HttpMethod;
  onChange: (method: HttpMethod) => void;
}

const HttpMethodDropdown: React.FC<HttpMethodDropdownProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = HTTP_METHODS.find((m) => m.method === value) || HTTP_METHODS[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={
          'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer shadow-sm ' +
          selectedOption.badge
        }
      >
        <span>{selectedOption.label}</span>
        <ChevronDown className="w-3 h-3 opacity-70" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-32 bg-[#18181b] border border-zinc-700/80 rounded-xl shadow-2xl py-1 z-50 animate-scale-up backdrop-blur-md">
          {HTTP_METHODS.map((m) => (
            <button
              key={m.method}
              type="button"
              onClick={() => {
                onChange(m.method);
                setIsOpen(false);
              }}
              className={
                'w-full flex items-center justify-between px-3 py-1.5 text-xs font-mono font-bold text-left transition-colors cursor-pointer ' +
                (m.method === value
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60')
              }
            >
              <span className={m.color}>{m.label}</span>
              {m.method === value && <Check className="w-3 h-3 text-brand-400" />}
            </button>
          ))}
        </div>
      )}



    </div>
  );
};

// Helper to detect response language and format response value for Monaco Viewer
const getResponseEditorConfig = (responseState: HttpResponseState | null) => {
  if (!responseState || responseState.data === undefined || responseState.data === null) {
    return { language: 'plaintext', value: '' };
  }

  const headers = responseState.headers || {};
  let contentType = '';
  for (const k of Object.keys(headers)) {
    if (k.toLowerCase() === 'content-type') {
      contentType = String(headers[k]).toLowerCase();
      break;
    }
  }

  let language = 'plaintext';
  let value = '';

  if (typeof responseState.data === 'object' && responseState.data !== null) {
    language = 'json';
    try {
      value = JSON.stringify(responseState.data, null, 2);
    } catch {
      value = String(responseState.data);
    }
  } else if (typeof responseState.data === 'string') {
    const trimmed = responseState.data.trim();
    if (
      contentType.includes('application/json') ||
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      language = 'json';
      try {
        const parsed = JSON.parse(trimmed);
        value = JSON.stringify(parsed, null, 2);
      } catch {
        value = responseState.data;
      }
    } else if (
      contentType.includes('text/html') ||
      trimmed.startsWith('<!DOCTYPE html') ||
      trimmed.startsWith('<html')
    ) {
      language = 'html';
      value = responseState.data;
    } else if (
      contentType.includes('application/xml') ||
      contentType.includes('text/xml') ||
      trimmed.startsWith('<?xml') ||
      (trimmed.startsWith('<') && trimmed.endsWith('>'))
    ) {
      language = 'xml';
      value = responseState.data;
    } else {
      language = 'plaintext';
      value = responseState.data;
    }
  } else {
    value = String(responseState.data ?? '');
  }

  return { language, value };
};

import { ProjectHttpClient } from '../../types/project';

interface HttpClientWorkspaceProps {
  data?: ProjectHttpClient;
  onUpdateData?: (data: ProjectHttpClient) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const HttpClientWorkspace: React.FC<HttpClientWorkspaceProps> = ({
  data: propData,
  onUpdateData,
  showToast,
}) => {
  const { monacoTheme } = useTheme();
  const liveFileObjectsRef = useRef<Map<string, File>>(new Map());

  // --- Environments & Variables State ---
  const [environments, setEnvironments] = useState<Environment[]>(() => {
    try {
      const saved = localStorage.getItem('octa_http_environments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse environments from localStorage', e);
    }
    return propData?.environments || [];
  });

  const [activeEnvironmentId, setActiveEnvironmentId] = useState<string | null>(() => {
    return propData?.activeEnvironmentId ?? null;
  });

  const [globalVariables, setGlobalVariables] = useState<EnvironmentVariable[]>(() => {
    return propData?.globalVariables || [];
  });

  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [selectedEnvIdInModal, setSelectedEnvIdInModal] = useState<string | 'globals'>('env-localhost');
  const [isEnvDropdownOpen, setIsEnvDropdownOpen] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const envDropdownRef = useRef<HTMLDivElement>(null);

  // Sync environments to localStorage & desktop storage
  useEffect(() => {
    try {
      const json = JSON.stringify(environments);
      localStorage.setItem('octa_http_environments', json);
      saveEnvironmentsData(json);
    } catch (e) {
      console.warn('Failed to save environments:', e);
    }
  }, [environments]);

  // Sync active environment ID
  useEffect(() => {
    try {
      localStorage.setItem('octa_http_active_env_id', activeEnvironmentId ? activeEnvironmentId : 'null');
    } catch (e) {
      console.warn('Failed to save activeEnvironmentId:', e);
    }
  }, [activeEnvironmentId]);

  // Sync global variables
  useEffect(() => {
    try {
      localStorage.setItem('octa_http_global_vars', JSON.stringify(globalVariables));
    } catch (e) {
      console.warn('Failed to save globalVariables:', e);
    }
  }, [globalVariables]);

  // Load environments from desktop storage on mount
  useEffect(() => {
    async function loadDesktopEnvs() {
      try {
        const data = await loadEnvironmentsData();
        if (data && data.trim() !== '' && data !== '[]') {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEnvironments(parsed);
          }
        }
      } catch (err) {
        console.warn('Error loading desktop environments:', err);
      }
    }
    loadDesktopEnvs();
  }, []);

  // Close environment dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (envDropdownRef.current && !envDropdownRef.current.contains(event.target as Node)) {
        setIsEnvDropdownOpen(false);
      }
    }
    if (isEnvDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEnvDropdownOpen]);

  // Active Environment Helper
  const activeEnvironment = environments.find((e) => e.id === activeEnvironmentId) || null;

  // Environment CRUD Handlers
  const handleCreateEnvironment = () => {
    const newId = 'env-' + Date.now();
    const newEnv: Environment = {
      id: newId,
      name: 'New Environment',
      variables: [
        { id: 'var-' + Date.now(), key: '', value: '', enabled: true, type: 'default' },
      ],
    };
    setEnvironments([...environments, newEnv]);
    setSelectedEnvIdInModal(newId);
    showToast('Created new environment', 'success');
  };

  const handleDuplicateEnvironment = (id: string) => {
    const target = environments.find((e) => e.id === id);
    if (!target) return;
    const newId = 'env-' + Date.now();
    const duplicated: Environment = {
      id: newId,
      name: target.name + ' (Copy)',
      variables: target.variables.map((v) => ({ ...v, id: 'var-' + Math.random().toString(36).substring(2, 8) })),
    };
    setEnvironments([...environments, duplicated]);
    setSelectedEnvIdInModal(newId);
    showToast('Duplicated environment', 'info');
  };

  const handleDeleteEnvironment = (id: string) => {
    if (environments.length <= 1) {
      showToast('Cannot delete the only environment', 'error');
      return;
    }
    const filtered = environments.filter((e) => e.id !== id);
    setEnvironments(filtered);
    if (activeEnvironmentId === id) {
      setActiveEnvironmentId(filtered[0]?.id || null);
    }
    if (selectedEnvIdInModal === id) {
      setSelectedEnvIdInModal(filtered[0]?.id || 'globals');
    }
    showToast('Deleted environment', 'info');
  };

  const handleUpdateCurrentEnv = (updated: Partial<Environment>) => {
    if (selectedEnvIdInModal === 'globals') return;
    setEnvironments(
      environments.map((e) => (e.id === selectedEnvIdInModal ? { ...e, ...updated } : e))
    );
  };

  const handleOpenManageEnvironments = (scopeId?: string) => {
    if (scopeId) {
      setSelectedEnvIdInModal(scopeId);
    }
    setIsEnvModalOpen(true);
  };

  const handleUpdateVariableFromInput = (key: string, newValue: string, source?: 'environment' | 'global') => {
    if (source === 'global') {
      const existing = globalVariables.find((v) => v.key.trim().toLowerCase() === key.trim().toLowerCase());
      if (existing) {
        setGlobalVariables(
          globalVariables.map((v) =>
            v.key.trim().toLowerCase() === key.trim().toLowerCase() ? { ...v, value: newValue } : v
          )
        );
      } else {
        setGlobalVariables([
          ...globalVariables,
          { id: 'gv-' + Date.now(), key, value: newValue, enabled: true, type: 'default' },
        ]);
      }
    } else {
      if (!activeEnvironment) {
        handleUpdateVariableFromInput(key, newValue, 'global');
        return;
      }
      const currentVars = [...activeEnvironment.variables];
      const existingIdx = currentVars.findIndex(
        (v) => v.key.trim().toLowerCase() === key.trim().toLowerCase()
      );
      if (existingIdx !== -1) {
        currentVars[existingIdx] = { ...currentVars[existingIdx], value: newValue };
      } else {
        currentVars.push({
          id: 'var-' + Date.now(),
          key,
          value: newValue,
          enabled: true,
          type: 'default',
        });
      }
      setEnvironments(
        environments.map((e) => (e.id === activeEnvironment.id ? { ...e, variables: currentVars } : e))
      );
    }
  };

  // 1. Collections & Requests Tree State
  const [collections, setCollections] = useState<HttpFolderItem[]>(() => {
    if (propData?.collections && propData.collections.length > 0) {
      return normalizeCollections(propData.collections);
    }
    return [];
  });

  // Cookie Jar State (Persisted in localStorage)
  const [cookieJar, setCookieJar] = useState<StoredCookie[]>(() => {
    try {
      const saved = localStorage.getItem('octa_cookie_jar');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse cookie jar from localStorage', e);
    }
    return [];
  });

  const saveCookieJar = (newJar: StoredCookie[]) => {
    setCookieJar(newJar);
    try {
      localStorage.setItem('octa_cookie_jar', JSON.stringify(newJar));
    } catch (e) {
      console.warn('Failed to persist cookie jar', e);
    }
  };

  // Cookie Jar Modal / Popover State
  const [isCookieJarOpen, setIsCookieJarOpen] = useState(false);

  // Load from Go backend on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const diskData = await loadHttpClientData();
        if (diskData && diskData.trim() && isMounted) {
          const parsed = JSON.parse(diskData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCollections(normalizeCollections(parsed));
          }
        }
      } catch (err) {
        console.warn('Failed to load HTTP client data from disk:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Persist tree helper and notify parent project store
  const saveTreeData = (nextCols: HttpFolderItem[]) => {
    setCollections(nextCols);
    if (onUpdateData) {
      onUpdateData({
        collections: nextCols,
        environments,
        globalVariables,
        activeEnvironmentId,
      });
    }
    try {
      const jsonStr = JSON.stringify(nextCols);
      localStorage.setItem('octa_http_collections', jsonStr);
      saveHttpClientData(jsonStr).catch((err) => {
        console.warn('Backend saveHttpClientData failed:', err);
      });
    } catch (e) {
      console.warn('Failed to persist http collections:', e);
    }
  };

  // 2. Multi-Tab State (strictly empty on clean project load)
  const [openTabs, setOpenTabs] = useState<HttpRequestItem[]>([]);

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    return openTabs[0]?.id || '';
  });

  const activeRequest: HttpRequestItem | null =
    openTabs.find((t) => t.id === activeTabId) || null;

  // Active Request Sub-Tabs: params | headers | body
  const [requestTab, setRequestTab] = useState<'params' | 'headers' | 'body'>('params');

  // Auto-Generated Headers Visibility Toggle State
  const [showAutoHeaders, setShowAutoHeaders] = useState<boolean>(() => {
    const saved = localStorage.getItem('octa_show_auto_headers');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('octa_show_auto_headers', String(showAutoHeaders));
  }, [showAutoHeaders]);

  // Layout Orientation: horizontal (side-by-side) vs vertical (stacked)
  const [layoutOrientation, setLayoutOrientation] = useState<'horizontal' | 'vertical'>(() => {
    const saved = localStorage.getItem('octa_http_layout_orientation');
    return saved === 'vertical' ? 'vertical' : 'horizontal';
  });

  // Save orientation preference
  useEffect(() => {
    localStorage.setItem('octa_http_layout_orientation', layoutOrientation);
  }, [layoutOrientation]);

  // Request Execution & Response States
  const [isSending, setIsSending] = useState(false);
  const [responseMap, setResponseMap] = useState<Record<string, HttpResponseState>>({});
  const activeResponseState = activeRequest ? responseMap[activeRequest.id] : null;

  // In-Place Inline Naming State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Tree Action Context Menus
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, []);

  // Explorer Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Drag & Drop State
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{
    id: string;
    position: 'before' | 'inside' | 'after';
  } | null>(null);

  // Computed Auto Headers & Active Counts (Dynamic based on Method, Body, Cookies, Token)
  const computedAutoHeaders = getComputedAutoHeaders(activeRequest, cookieJar);
  const userActiveHeadersCount = activeRequest?.headers.filter((h) => h.enabled && h.key.trim()).length || 0;
  const autoActiveHeadersCount = computedAutoHeaders.filter((h) => h.isEnabled).length;
  const totalActiveHeadersCount = userActiveHeadersCount + autoActiveHeadersCount;

  // Matching cookies for current active request
  const matchingCookies = activeRequest ? getMatchingCookies(cookieJar, activeRequest.url) : [];

  // Update active request in open tabs and in tree
  const updateActiveRequest = (updated: HttpRequestItem) => {
    setOpenTabs((prev) =>
      prev.map((t) => (t.id === updated.id ? { ...updated, isDirty: true } : t))
    );

    const updateRecursively = (items: (HttpFolderItem | HttpRequestItem)[]): (HttpFolderItem | HttpRequestItem)[] => {
      return items.map((item) => {
        if (item.id === updated.id) {
          return { ...updated, isDirty: true };
        }
        if (item.type !== 'request') {
          return {
            ...item,
            items: updateRecursively(item.items),
          };
        }
        return item;
      });
    };

    saveTreeData(updateRecursively(collections) as HttpFolderItem[]);
  };

  // Toggle Auto-Generated Header
  const handleToggleAutoHeader = (headerKey: string, enable: boolean) => {
    if (!activeRequest) return;
    const currentDisabled = (activeRequest.disabledAutoHeaders || []).map((k) => k.toLowerCase());
    const targetKey = headerKey.toLowerCase();
    let nextDisabled: string[];
    if (enable) {
      nextDisabled = currentDisabled.filter((k) => k !== targetKey);
    } else {
      nextDisabled = currentDisabled.includes(targetKey) ? currentDisabled : [...currentDisabled, targetKey];
    }
    updateActiveRequest({
      ...activeRequest,
      disabledAutoHeaders: nextDisabled,
    });
  };

  // Postman File Import Ref and Handler
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const result = mapPostmanCollection(json);

      const nextCols = [...collections, result.collection];
      saveTreeData(nextCols);

      if (result.variables.length > 0) {
        const newEnv: Environment = {
          id: 'env-' + Date.now(),
          name: `${result.collection.name} Env`,
          variables: result.variables,
        };
        const nextEnvs = [...environments, newEnv];
        setEnvironments(nextEnvs);
        if (!activeEnvironmentId) {
          setActiveEnvironmentId(newEnv.id);
        }
        if (onUpdateData) {
          onUpdateData({
            collections: nextCols,
            environments: nextEnvs,
            globalVariables,
            activeEnvironmentId: activeEnvironmentId || newEnv.id,
          });
        }
      } else if (onUpdateData) {
        onUpdateData({
          collections: nextCols,
          environments,
          globalVariables,
          activeEnvironmentId,
        });
      }

      showToast(
        `Imported "${result.collection.name}" (${result.totalRequests} requests, ${result.totalFolders} folders)`,
        'success'
      );
    } catch (err: any) {
      showToast(`Failed to import Postman collection: ${err?.message || err}`, 'error');
    } finally {
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  // Two-Way Sync Handlers for URL and Query Parameters
  const handleUrlChange = (newUrl: string) => {
    if (!activeRequest) return;
    const newParams = parseQueryParamsFromUrl(newUrl, activeRequest.params);
    updateActiveRequest({
      ...activeRequest,
      url: newUrl,
      params: newParams,
    });
  };

  const handleParamsChange = (newParams: HttpParam[]) => {
    if (!activeRequest) return;
    const newUrl = buildUrlWithParams(activeRequest.url, newParams);
    updateActiveRequest({
      ...activeRequest,
      url: newUrl,
      params: newParams,
    });
  };

  // Body Type Switching Helper
  const handleSwitchBodyType = (newType: HttpBodyType) => {
    if (!activeRequest) return;
    updateActiveRequest({
      ...activeRequest,
      bodyType: newType,
    });
  };

  // Select / Open a request in tabs
  const handleOpenRequestInTab = (req: HttpRequestItem) => {
    const exists = openTabs.find((t) => t.id === req.id);
    if (!exists) {
      setOpenTabs((prev) => [...prev, req]);
    }
    setActiveTabId(req.id);
  };

  // Close a tab
  const handleCloseTab = (tabId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const idx = openTabs.findIndex((t) => t.id === tabId);
    if (idx === -1) return;

    const nextTabs = openTabs.filter((t) => t.id !== tabId);
    setOpenTabs(nextTabs);

    if (nextTabs.length === 0) {
      setActiveTabId('');
    } else if (activeTabId === tabId) {
      const nextActive = nextTabs[Math.max(0, idx - 1)];
      setActiveTabId(nextActive.id);
    }
  };

  // Create new tab directly from tab strip
  const handleNewTab = () => {
    const newReq = createDefaultRequest('Untitled Request');
    if (collections.length > 0) {
      const nextCols = [
        {
          ...collections[0],
          items: [newReq, ...collections[0].items],
        },
        ...collections.slice(1),
      ];
      saveTreeData(nextCols);
    }
    setOpenTabs((prev) => [...prev, newReq]);
    setActiveTabId(newReq.id);
    setEditingId(newReq.id);
    setEditingName(newReq.name);
    showToast('New request tab opened', 'info');
  };

  // Toggle folder / collection expanded state
  const toggleFolderOpen = (folderId: string) => {
    const toggleRecursively = (items: HttpFolderItem[]): HttpFolderItem[] => {
      return items.map((col) => {
        if (col.id === folderId) {
          return { ...col, isOpen: !col.isOpen };
        }
        return {
          ...col,
          items: col.items.map((child) => {
            if (child.type !== 'request') {
              return toggleRecursively([child])[0];
            }
            return child;
          }),
        };
      });
    };
    saveTreeData(toggleRecursively(collections));
  };

  // Commit in-place name change
  const commitNameEdit = () => {
    if (!editingId) return;
    const finalName = editingName.trim();
    if (!finalName) {
      setEditingId(null);
      return;
    }

    const renameRecursively = (items: (HttpFolderItem | HttpRequestItem)[]): (HttpFolderItem | HttpRequestItem)[] => {
      return items.map((item) => {
        if (item.id === editingId) {
          return { ...item, name: finalName };
        }
        if (item.type !== 'request') {
          return {
            ...item,
            items: renameRecursively(item.items),
          };
        }
        return item;
      });
    };

    saveTreeData(renameRecursively(collections) as HttpFolderItem[]);
    setOpenTabs((prev) =>
      prev.map((t) => (t.id === editingId ? { ...t, name: finalName } : t))
    );
    setEditingId(null);
  };

  // 1. Create New Top-Level Collection
  const handleCreateNewCollection = () => {
    const newCol = createDefaultCollection('Untitled Collection');
    const next = [...collections, newCol];
    saveTreeData(next);
    setEditingId(newCol.id);
    setEditingName(newCol.name);
    setMenuOpenId(null);
    showToast('Created new collection', 'success');
  };

  // 2. Create Folder inside target parent
  const handleCreateFolder = (parentId: string | null) => {
    const newFolder = createDefaultFolder('New Folder');
    if (!parentId || collections.length === 0) {
      const newCol = createDefaultCollection('Untitled Collection');
      newCol.items.push(newFolder);
      saveTreeData([...collections, newCol]);
      setEditingId(newFolder.id);
      setEditingName(newFolder.name);
      setMenuOpenId(null);
      return;
    }

    const insertRecursively = (items: HttpFolderItem[]): HttpFolderItem[] => {
      return items.map((folder) => {
        if (folder.id === parentId) {
          return {
            ...folder,
            isOpen: true,
            items: [...folder.items, newFolder],
          };
        }
        return {
          ...folder,
          items: folder.items.map((child) => {
            if (child.type !== 'request') {
              return insertRecursively([child])[0];
            }
            return child;
          }),
        };
      });
    };

    saveTreeData(insertRecursively(collections));
    setEditingId(newFolder.id);
    setEditingName(newFolder.name);
    setMenuOpenId(null);
    showToast('Created new folder', 'info');
  };

  // 3. Create Request inside target parent
  const handleCreateNewRequest = (parentId?: string | null) => {
    const newReq = createDefaultRequest('Untitled Request');
    if (collections.length === 0) {
      const newCol = createDefaultCollection('My Collection');
      newCol.items.push(newReq);
      saveTreeData([newCol]);
      setOpenTabs([newReq]);
      setActiveTabId(newReq.id);
      setEditingId(newReq.id);
      setEditingName(newReq.name);
      return;
    }

    const targetParentId = parentId || collections[0].id;
    const insertRecursively = (items: HttpFolderItem[]): HttpFolderItem[] => {
      return items.map((folder) => {
        if (folder.id === targetParentId) {
          return {
            ...folder,
            isOpen: true,
            items: [newReq, ...folder.items],
          };
        }
        return {
          ...folder,
          items: folder.items.map((child) => {
            if (child.type !== 'request') {
              return insertRecursively([child])[0];
            }
            return child;
          }),
        };
      });
    };

    saveTreeData(insertRecursively(collections));
    handleOpenRequestInTab(newReq);
    setEditingId(newReq.id);
    setEditingName(newReq.name);
    setMenuOpenId(null);
    showToast('Created new request', 'info');
  };

  // 4. Duplicate Request
  const handleDuplicateRequest = (reqId: string) => {
    const original = findItemById(collections, reqId) as HttpRequestItem;
    if (!original || original.type !== 'request') return;

    const duplicated: HttpRequestItem = {
      ...original,
      id: 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name: original.name + ' (Copy)',
      isDirty: false,
    };

    const duplicateInTree = (items: (HttpFolderItem | HttpRequestItem)[]): (HttpFolderItem | HttpRequestItem)[] => {
      const next: (HttpFolderItem | HttpRequestItem)[] = [];
      for (const item of items) {
        next.push(item);
        if (item.id === reqId) {
          next.push(duplicated);
        } else if (item.type !== 'request') {
          item.items = duplicateInTree(item.items);
        }
      }
      return next;
    };

    saveTreeData(duplicateInTree(collections) as HttpFolderItem[]);
    handleOpenRequestInTab(duplicated);
    setMenuOpenId(null);
    showToast('Request duplicated', 'success');
  };

  // 5. Delete Item
  const handleDeleteItem = (id: string) => {
    const deleteRecursively = (items: (HttpFolderItem | HttpRequestItem)[]): (HttpFolderItem | HttpRequestItem)[] => {
      return items
        .filter((item) => item.id !== id)
        .map((item) => {
          if (item.type !== 'request') {
            return {
              ...item,
              items: deleteRecursively(item.items),
            };
          }
          return item;
        });
    };

    const nextTree = deleteRecursively(collections) as HttpFolderItem[];
    saveTreeData(nextTree);

    if (openTabs.some((t) => t.id === id)) {
      handleCloseTab(id);
    }
    setMenuOpenId(null);
    showToast('Deleted successfully', 'info');
  };

  // 6. Tree Drag & Drop Logic
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetItem: HttpTreeItem) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedId || draggedId === targetItem.id) return;
    if (isDescendant(collections, draggedId, targetItem.id)) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const height = rect.height;

    let position: 'before' | 'inside' | 'after' = 'inside';

    if (targetItem.type === 'request') {
      position = offsetY < height / 2 ? 'before' : 'after';
    } else {
      if (offsetY < height * 0.25) {
        position = 'before';
      } else if (offsetY > height * 0.75) {
        position = 'after';
      } else {
        position = 'inside';
      }
    }

    setDragOverTarget({ id: targetItem.id, position });
  };

  const handleDragLeave = (e: React.DragEvent, id: string) => {
    e.stopPropagation();
    if (dragOverTarget?.id === id) {
      setDragOverTarget(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetItem: HttpTreeItem) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedId || draggedId === targetItem.id || !dragOverTarget) {
      setDraggedId(null);
      setDragOverTarget(null);
      return;
    }

    if (isDescendant(collections, draggedId, targetItem.id)) {
      setDraggedId(null);
      setDragOverTarget(null);
      return;
    }

    const extractedItem = findItemById(collections, draggedId);
    if (!extractedItem) return;

    const removeDragged = (items: (HttpFolderItem | HttpRequestItem)[]): (HttpFolderItem | HttpRequestItem)[] => {
      return items
        .filter((item) => item.id !== draggedId)
        .map((item) => {
          if (item.type !== 'request') {
            return {
              ...item,
              items: removeDragged(item.items),
            };
          }
          return item;
        });
    };

    const treeWithoutDragged = removeDragged(collections) as HttpFolderItem[];
    const { position } = dragOverTarget;

    if (position === 'inside' && targetItem.type !== 'request') {
      const insertInside = (items: HttpFolderItem[]): HttpFolderItem[] => {
        return items.map((folder) => {
          if (folder.id === targetItem.id) {
            return {
              ...folder,
              isOpen: true,
              items: [...folder.items, extractedItem],
            };
          }
          return {
            ...folder,
            items: folder.items.map((child) => {
              if (child.type !== 'request') {
                return insertInside([child])[0];
              }
              return child;
            }),
          };
        });
      };
      saveTreeData(insertInside(treeWithoutDragged));
    } else {
      const parentInfo = findParentOfItem(treeWithoutDragged, targetItem.id);
      if (!parentInfo) {
        const targetIdx = treeWithoutDragged.findIndex((c) => c.id === targetItem.id);
        const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
        const newCols = [...treeWithoutDragged];
        newCols.splice(insertIdx, 0, extractedItem as HttpFolderItem);
        saveTreeData(newCols);
      } else {
        const { parent, index } = parentInfo;
        const insertIdx = position === 'before' ? index : index + 1;

        if (parent === null) {
          const newCols = [...treeWithoutDragged];
          newCols.splice(insertIdx, 0, extractedItem as HttpFolderItem);
          saveTreeData(newCols);
        } else {
          const insertInParent = (items: HttpFolderItem[]): HttpFolderItem[] => {
            return items.map((folder) => {
              if (folder.id === parent.id) {
                const newItems = [...folder.items];
                newItems.splice(insertIdx, 0, extractedItem);
                return {
                  ...folder,
                  items: newItems,
                };
              }
              return {
                ...folder,
                items: folder.items.map((child) => {
                  if (child.type !== 'request') {
                    return insertInParent([child])[0];
                  }
                  return child;
                }),
              };
            });
          };
          saveTreeData(insertInParent(treeWithoutDragged));
        }
      }
    }

    setDraggedId(null);
    setDragOverTarget(null);
  };

  // Helper to convert browser File / Blob object to Base64 string
  const fileToBase64 = (file: File | Blob | any): Promise<string> => {
    return new Promise((resolve) => {
      if (!file) {
        resolve('');
        return;
      }
      if (typeof file === 'string') {
        if (file.startsWith('data:')) {
          const commaIdx = file.indexOf(',');
          resolve(commaIdx !== -1 ? file.substring(commaIdx + 1) : file);
          return;
        }
        resolve(file);
        return;
      }
      if (file.base64 && typeof file.base64 === 'string') {
        let b = file.base64;
        if (b.startsWith('data:')) {
          const commaIdx = b.indexOf(',');
          b = commaIdx !== -1 ? b.substring(commaIdx + 1) : b;
        }
        resolve(b);
        return;
      }
      const isBlob =
        typeof Blob !== 'undefined' &&
        (file instanceof Blob ||
          file instanceof File ||
          (typeof file === 'object' && file !== null && typeof file.slice === 'function' && typeof file.size === 'number'));

      if (isBlob) {
        try {
          const reader = new FileReader();
          reader.onload = () => {
            const res = (reader.result as string) || '';
            const commaIdx = res.indexOf(',');
            const clean = commaIdx !== -1 ? res.substring(commaIdx + 1) : res;
            resolve(clean);
          };
          reader.onerror = (err) => {
            console.warn('FileReader error:', err);
            resolve('');
          };
          reader.readAsDataURL(file);
          return;
        } catch (err) {
          console.warn('FileReader error:', err);
          resolve('');
          return;
        }
      }

      resolve('');
    });
  };

  const readFileAsBase64 = fileToBase64;

  // Send HTTP Request Dispatcher with Native Go Backend, Cookie Jar & Auto-Generated Headers Integration
  const handleSendRequest = async () => {
    if (!activeRequest) return;
    if (!activeRequest.url.trim()) {
      showToast('Please enter a request URL', 'error');
      return;
    }

    setIsSending(true);
    const startTs = Date.now();
    const reqId = activeRequest.id;

    try {
      const activeEnv = environments.find((e) => e.id === activeEnvironmentId) || null;
      const rawUrl = activeRequest.url.trim();
      if (!rawUrl) {
        showToast('Please enter a request URL', 'error');
        setIsSending(false);
        return;
      }

      // 1. Resolve variables and dynamic macros in URL FIRST
      let targetUrl = resolveTemplate(rawUrl, activeEnv, globalVariables).trim();

      // 2. Prepend protocol if not specified
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }

      console.log('[DEBUG] Raw Request URL:', rawUrl);
      console.log('[DEBUG] Resolved Target URL:', targetUrl);
      console.log('[DEBUG] Active Environment:', activeEnv?.name || 'No Environment');

      // Query Params
      const queryParamsObj: Record<string, string> = {};
      const enabledParams = activeRequest.params.filter((p) => p.enabled && p.key);
      enabledParams.forEach((p) => {
        queryParamsObj[p.key.trim()] = p.value;
      });

      // Request Headers Merging: Auto-Generated Headers (including Cookie, Token, Content-Type, Content-Length) + Custom Headers
      const reqHeaders: Record<string, string> = {};

      // 1. Inject active auto-generated headers first
      const computedAuto = getComputedAutoHeaders(activeRequest, cookieJar);
      for (const ah of computedAuto) {
        if (ah.isEnabled && ah.value && !ah.value.startsWith('<')) {
          reqHeaders[ah.key] = ah.value;
        }
      }

      // 2. Custom headers override auto headers (with template resolution)
      activeRequest.headers.forEach((h) => {
        if (h.enabled && h.key.trim()) {
          const resolvedHeaderKey = resolveTemplate(h.key.trim(), activeEnvironment, globalVariables);
          const resolvedHeaderVal = resolveTemplate(h.value, activeEnvironment, globalVariables);
          if (resolvedHeaderKey) {
            reqHeaders[resolvedHeaderKey] = resolvedHeaderVal;
          }
        }
      });

      // Request Body Construction
      const formDataPayload: FormFieldPayload[] = [];
      const urlEncodedPayload: Record<string, string> = {};

      if (activeRequest.method !== 'GET' && activeRequest.method !== 'HEAD') {
        if (activeRequest.bodyType === 'form-data') {
          const rows = activeRequest.bodyFormData || [];
          for (const row of rows) {
            if (!row.enabled || !row.key.trim()) continue;
            if (row.type === 'file') {
              const fileNames: string[] = [];
              const filePaths: string[] = [];
              const fileBase64: string[] = [];

              const rawFilesList: FormFileMeta[] =
                row.files && row.files.length > 0
                  ? row.files
                  : (row as any).file
                  ? [{
                      id: 'file-single',
                      name: (row as any).fileName || 'upload.bin',
                      size: (row as any).file?.size || 0,
                      type: (row as any).file?.type || 'application/octet-stream',
                      file: (row as any).file,
                      fileObj: (row as any).file,
                      filePath: (row as any).filePath || '',
                      base64: (row as any).base64Data || '',
                    }]
                  : [];

              if (rawFilesList.length > 0) {
                for (const f of rawFilesList) {
                  fileNames.push(f.name || 'file');
                  const path = f.filePath || (f.file && (f.file as any).path) || (f.fileObj && (f.fileObj as any).path) || '';
                  filePaths.push(path);

                  let b64 = f.base64 || '';
                  if (!b64) {
                    const candidateFile = (f.id && liveFileObjectsRef.current.get(f.id)) || f.file || f.fileObj || (row as any).file;
                    if (candidateFile && (candidateFile instanceof File || candidateFile instanceof Blob || typeof candidateFile === 'object')) {
                      try {
                        b64 = await fileToBase64(candidateFile);
                      } catch (readErr) {
                        console.warn('Failed to read candidate file as base64:', readErr);
                      }
                    }
                  }

                  if (b64 && b64.startsWith('data:')) {
                    const cIdx = b64.indexOf(',');
                    b64 = cIdx !== -1 ? b64.substring(cIdx + 1) : b64;
                  }
                  fileBase64.push(b64);
                }
              }

              const firstFilePath = filePaths[0] || (row.filePath ? String(row.filePath).trim() : '') || (row.value ? String(row.value).trim() : '');
              const firstBase64 = fileBase64[0] || row.base64Data || (row as any).base64Data || '';
              const firstFileName = fileNames[0] || row.fileName || (row as any).fileName || (row.value ? String(row.value) : 'upload.bin');

              formDataPayload.push({
                key: row.key.trim(),
                value: row.value || '',
                type: 'file',
                fileName: firstFileName,
                filePath: firstFilePath,
                base64Data: firstBase64,
                contentType: (rawFilesList[0]?.type) || 'application/octet-stream',
                fileNames,
                filePaths,
                fileBase64,
              });
            } else {
              formDataPayload.push({
                key: row.key.trim(),
                value: String(row.value ?? ''),
                type: 'text',
              });
            }
          }
        } else if (activeRequest.bodyType === 'x-www-form-urlencoded') {
          const rows = activeRequest.bodyUrlEncoded || [];
          for (const row of rows) {
            if (row.enabled && row.key.trim()) {
              urlEncodedPayload[row.key.trim()] = row.value || '';
            }
          }
        }
      }

      console.log('Prepared Form Data to send:', formDataPayload);

      // Diagnostic Logging for Multipart & Request Payload
      if (activeRequest.bodyType === 'form-data') {
        console.log("[DEBUG Frontend Payload]", activeRequest.bodyFormData);
        console.log("=== [DEBUG] FRONTEND FORM-DATA PAYLOAD ===");
        formDataPayload.forEach((field, index) => {
          console.log(`Field #${index}:`, {
            key: field.key,
            type: field.type,
            value: field.value,
            fileName: field.fileName,
            filePath: field.filePath,
            base64Len: field.base64Data ? field.base64Data.length : 0,
            fileNames: field.fileNames,
            filePaths: field.filePaths,
            fileBase64Lengths: (field.fileBase64 || []).map((b) => (b ? b.length : 0)),
          });
        });
      }

      // Dispatch through Go Native Runtime (bypasses browser CORS & forbidden headers)
      let res: HttpResponsePayload;
      try {
        res = await executeHttpRequest({
          method: activeRequest.method,
          url: targetUrl,
          headers: reqHeaders,
          queryParams: queryParamsObj,
          bodyType: activeRequest.bodyType,
          bodyContent: resolveTemplate(activeRequest.bodyContent || '', activeEnvironment, globalVariables),
          formData: formDataPayload.map((field) => ({
            ...field,
            key: resolveTemplate(field.key, activeEnvironment, globalVariables),
            value: resolveTemplate(field.value, activeEnvironment, globalVariables),
          })),
          urlEncoded: Object.entries(urlEncodedPayload).reduce((acc, [k, v]) => {
            acc[resolveTemplate(k, activeEnvironment, globalVariables)] = resolveTemplate(v, activeEnvironment, globalVariables);
            return acc;
          }, {} as Record<string, string>),
        });
      } catch (backendErr) {
        // Fallback to fetch if running outside Wails desktop runtime
        console.warn('Native Go client dispatch failed, falling back to fetch:', backendErr);
        const options: RequestInit = {
          method: activeRequest.method,
          headers: reqHeaders,
        };
        let finalUrl = targetUrl;
        if (enabledParams.length > 0) {
          const queryStr = enabledParams
            .map((p) => encodeURIComponent(p.key) + '=' + encodeURIComponent(p.value))
            .join('&');
          finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryStr;
        }

        if (activeRequest.method !== 'GET' && activeRequest.method !== 'HEAD') {
          if (activeRequest.bodyType === 'json') {
            options.body = activeRequest.bodyContent;
          } else if (activeRequest.bodyType === 'form-data') {
            const fd = new FormData();
            const rows = activeRequest.bodyFormData || [];
            for (const row of rows) {
              if (!row.enabled || !row.key.trim()) continue;
              if (row.type === 'file') {
                if (row.files && row.files.length > 0) {
                  for (const f of row.files) {
                    if (f.fileObj && typeof Blob !== 'undefined' && (f.fileObj instanceof Blob || typeof (f.fileObj as any).slice === 'function')) {
                      fd.append(row.key, f.fileObj, f.name);
                    } else if (f.name) {
                      fd.append(row.key, new Blob([]), f.name);
                    }
                  }
                }
              } else {
                fd.append(row.key, String(row.value ?? ''));
              }
            }
            options.body = fd;
          } else if (activeRequest.bodyType === 'x-www-form-urlencoded') {
            const p = new URLSearchParams();
            for (const k in urlEncodedPayload) {
              p.append(k, urlEncodedPayload[k]);
            }
            options.body = p.toString();
          }
        }

        const fetchRes = await fetch(finalUrl, options);
        const durationMs = Date.now() - startTs;
        const text = await fetchRes.text();
        let jsonData: any = null;
        try {
          jsonData = JSON.parse(text);
        } catch {
          jsonData = text;
        }
        const resHeaders: Record<string, string> = {};
        const setCookiesReceived: string[] = [];
        fetchRes.headers.forEach((v, k) => {
          resHeaders[k] = v;
          if (k.toLowerCase() === 'set-cookie') setCookiesReceived.push(v);
        });
        res = {
          status: fetchRes.status,
          statusText: fetchRes.statusText || (fetchRes.ok ? 'OK' : 'Error'),
          durationMs,
          sizeKb: Number((text.length / 1024).toFixed(2)),
          data: jsonData,
          headers: resHeaders,
          cookies: setCookiesReceived,
        };
      }

      // Update Cookie Jar if cookies received from Go backend or fetch
      const cookiesList = res.cookies || [];
      if (res.headers) {
        for (const k of Object.keys(res.headers)) {
          if (k.toLowerCase() === 'set-cookie' && res.headers[k]) {
            cookiesList.push(res.headers[k]);
          }
        }
      }

      if (cookiesList.length > 0) {
        let updatedJar = [...cookieJar];
        for (const sc of cookiesList) {
          const parsed = parseSetCookie(sc, targetUrl);
          if (parsed) {
            updatedJar = updatedJar.filter(
              (c) => !(c.name === parsed.name && c.domain === parsed.domain && c.path === parsed.path)
            );
            updatedJar.push(parsed);
          }
        }
        saveCookieJar(updatedJar);
      }

      const isSuccess = res.status >= 200 && res.status < 400;
      const result: HttpResponseState = {
        status: res.status,
        statusText: res.statusText || (res.status === 0 ? 'Network Error' : isSuccess ? 'OK' : 'Error'),
        durationMs: res.durationMs || Date.now() - startTs,
        sizeKb: res.sizeKb || 0,
        data: res.data,
        headers: res.headers || {},
      };

      setResponseMap((prev) => ({ ...prev, [reqId]: result }));
      if (res.status === 0) {
        showToast('Network error: ' + (res.error || 'Check server connection'), 'error');
      } else {
        showToast('Response: ' + res.status + ' ' + (res.statusText || ''), isSuccess ? 'success' : 'error');
      }
    } catch (err: any) {
      const durationMs = Date.now() - startTs;
      const errorResult: HttpResponseState = {
        status: 0,
        statusText: 'Network Error',
        durationMs,
        sizeKb: 0,
        data: { error: err?.message || String(err), hint: 'Check target URL, network connection, or server status' },
        headers: {},
      };
      setResponseMap((prev) => ({ ...prev, [reqId]: errorResult }));
      showToast('Request failed: ' + (err?.message || err), 'error');
    } finally {
      setIsSending(false);
    }
  };

  // JSON Formatting action
  const handleFormatJson = () => {
    if (!activeRequest || !activeRequest.bodyContent?.trim()) return;
    try {
      const parsed = JSON.parse(activeRequest.bodyContent);
      const formatted = JSON.stringify(parsed, null, 2);
      updateActiveRequest({ ...activeRequest, bodyContent: formatted });
      showToast('JSON Formatted', 'success');
    } catch (e: any) {
      showToast('Invalid JSON: ' + e?.message, 'error');
    }
  };

  // JSON Minifying action
  const handleMinifyJson = () => {
    if (!activeRequest || !activeRequest.bodyContent?.trim()) return;
    try {
      const parsed = JSON.parse(activeRequest.bodyContent);
      const minified = JSON.stringify(parsed);
      updateActiveRequest({ ...activeRequest, bodyContent: minified });
      showToast('JSON Minified', 'success');
    } catch (e: any) {
      showToast('Invalid JSON: ' + e?.message, 'error');
    }
  };

  // Clear JSON
  const handleClearJson = () => {
    if (!activeRequest) return;
    updateActiveRequest({ ...activeRequest, bodyContent: '' });
  };

  // JSON Validation Status
  const getJsonValidity = (content: string): { isValid: boolean; error?: string } => {
    if (!content || !content.trim()) return { isValid: true };
    try {
      JSON.parse(content);
      return { isValid: true };
    } catch (e: any) {
      return { isValid: false, error: e?.message || 'Syntax Error' };
    }
  };

  // Keyboard shortcut support (Ctrl+W, Ctrl+T, Ctrl+Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === 'w' || e.key === 'W') {
          e.preventDefault();
          if (activeTabId) {
            handleCloseTab(activeTabId);
          }
        } else if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          handleNewTab();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleSendRequest();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, activeRequest]);

  // Render Explorer Tree Item recursively
  const renderTreeItem = (item: HttpTreeItem, depth: number = 0) => {
    const isFolder = item.type === 'collection' || item.type === 'folder';
    const isCollection = item.type === 'collection';
    const isEditing = editingId === item.id;
    const isMenuOpen = menuOpenId === item.id;
    const isDragging = draggedId === item.id;
    const isDragTarget = dragOverTarget?.id === item.id;
    const dropPosition = isDragTarget ? dragOverTarget.position : null;

    if (searchQuery.trim()) {
      const matchSelf = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (item.type === 'request' && !matchSelf) return null;
      if (isFolder && !matchSelf) {
        const hasMatchingChild = (children: HttpTreeItem[]): boolean => {
          return children.some((c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (c.type !== 'request' && hasMatchingChild(c.items))
          );
        };
        if (!hasMatchingChild(item.items)) return null;
      }
    }

    return (
      <div
        key={item.id}
        draggable
        onDragStart={(e) => handleDragStart(e, item.id)}
        onDragOver={(e) => handleDragOver(e, item)}
        onDragLeave={(e) => handleDragLeave(e, item.id)}
        onDrop={(e) => handleDrop(e, item)}
        className={'relative transition-opacity select-none ' + (isDragging ? 'opacity-40' : 'opacity-100')}
      >
        {/* Drop Line: Before */}
        {dropPosition === 'before' && (
          <div className="h-0.5 w-full bg-brand-400 my-0.5 rounded shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
        )}

        {/* Row Item Container */}
        <div
          style={{ paddingLeft: depth * 14 + 8 }}
          onClick={() => {
            if (isFolder) {
              toggleFolderOpen(item.id);
            } else {
              handleOpenRequestInTab(item as HttpRequestItem);
            }
          }}
          className={
            'group relative flex items-center justify-between py-1.5 pr-2 rounded-lg text-xs cursor-pointer transition-all ' +
            (dropPosition === 'inside' ? 'bg-brand-500/20 ring-1 ring-brand-400/50 ' : '') +
            (!isFolder && activeTabId === item.id
              ? 'bg-blue-50 dark:bg-[#1f1f23] text-blue-900 dark:text-white font-medium shadow-sm border border-blue-200 dark:border-zinc-700/60'
              : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#18181b]')
          }
        >
          {/* Left Title & Icons */}
          <div className="flex items-center gap-2 truncate flex-1 mr-1">
            {isFolder ? (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {item.isOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
                )}
                {isCollection ? (
                  <Layers className="w-3.5 h-3.5 text-brand-400" />
                ) : item.isOpen ? (
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-amber-400/80" />
                )}
              </div>
            ) : (
              <span
                className={
                  'text-[9px] font-mono font-bold px-1 py-0.2 rounded border flex-shrink-0 ' +
                  (METHOD_COLORS[(item as HttpRequestItem).method]?.badge || METHOD_COLORS.GET.badge)
                }
              >
                {(item as HttpRequestItem).method}
              </span>
            )}

            {/* In-Place Name or Display Text */}
            {isEditing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  commitNameEdit();
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center flex-1"
              >
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={commitNameEdit}
                  className="w-full px-1.5 py-0.5 text-xs bg-[#1f1f23] border border-brand-500 rounded text-white outline-none font-mono"
                />
              </form>
            ) : (
              <span
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setEditingId(item.id);
                  setEditingName(item.name);
                }}
                className="truncate select-none font-sans"
              >
                {item.name}
              </span>
            )}
          </div>

          {/* Right Metrics / Quick Actions */}
          {!isEditing && (
            <div className="flex items-center gap-1 flex-shrink-0">
              {isFolder && (
                <span className="text-[10px] text-zinc-600 font-mono group-hover:opacity-0 transition-opacity">
                  {countRequests(item)}
                </span>
              )}

              {/* Three-Dot Menu Trigger Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId(isMenuOpen ? null : item.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-750 text-zinc-400 hover:text-white transition-opacity cursor-pointer"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {/* Context Dropdown Menu */}
              {isMenuOpen && (
                <div
                  ref={menuRef}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-2 top-8 w-44 bg-[#18181b] border border-zinc-700/80 rounded-xl shadow-2xl py-1.5 z-50 animate-scale-up backdrop-blur-md text-xs"
                >
                  {isFolder && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleCreateNewRequest(item.id)}
                        className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-brand-400" />
                        <span>Add Request</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCreateFolder(item.id)}
                        className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                      >
                        <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                        <span>Add Folder</span>
                      </button>
                      <div className="my-1 border-t border-zinc-800/80" />
                    </>
                  )}

                  {!isFolder && (
                    <button
                      type="button"
                      onClick={() => handleDuplicateRequest(item.id)}
                      className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-sky-400" />
                      <span>Duplicate</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(item.id);
                      setEditingName(item.name);
                      setMenuOpenId(null);
                    }}
                    className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Rename</span>
                  </button>

                  <div className="my-1 border-t border-zinc-800/80" />

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drop Line: After */}
        {dropPosition === 'after' && (
          <div className="h-0.5 w-full bg-brand-400 my-0.5 rounded shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
        )}

        {/* Render Children for Open Folders */}
        {isFolder && item.isOpen && item.items.length > 0 && (
          <div className="space-y-0.5">
            {item.items.map((child) => renderTreeItem(child, depth + 1))}
          </div>
        )}

        {/* Render Empty State for Empty Open Folders */}
        {isFolder && item.isOpen && item.items.length === 0 && (
          <div
            style={{ paddingLeft: (depth + 1) * 14 + 12 }}
            className="py-1 text-[11px] text-zinc-600 italic select-none"
          >
            Empty folder
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 flex h-full bg-slate-50 dark:bg-[#121214] text-slate-900 dark:text-zinc-100 overflow-hidden select-none font-sans relative transition-colors">
      {/* Resizable Panel Group (Level 1: Sidebar vs Main Workspace) */}
      <Group orientation="horizontal" id="octa_http_main_split" className="h-full w-full">
        {/* 1. Request Explorer Tree Sidebar */}
        <Panel defaultSize="22%" minSize="14%" maxSize="40%" className="flex flex-col h-full bg-white dark:bg-[#161618] border-r border-slate-200 dark:border-[#26262a]">
          {/* Sidebar Header */}
          <div className="p-3 border-b border-slate-200 dark:border-[#26262a] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-brand-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-200 uppercase tracking-wider">Explorer</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Import Postman Collection (JSON)"
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-brand-600 dark:hover:text-brand-400 border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleCreateNewCollection}
                title="New Collection"
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-zinc-100 border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleCreateNewRequest()}
                title="New HTTP Request"
                className="p-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Filter Input */}
          {collections.length > 0 && (
            <div className="px-3 py-2 border-b border-slate-200 dark:border-[#26262a]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter requests & folders..."
                  className="w-full pl-8 pr-2.5 py-1 text-xs bg-slate-100 dark:bg-[#1a1a1c] border border-slate-200 dark:border-[#2b2b30] rounded-md text-slate-900 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-500 focus:border-brand-500 outline-none font-mono"
                />
              </div>
            </div>
          )}

          {/* Tree View Area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {collections.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-4 text-center select-none text-zinc-500">
                <div className="w-10 h-10 rounded-xl bg-surface-800 border border-[#2b2b2b] flex items-center justify-center mb-3 text-zinc-400">
                  <FolderPlus className="w-5 h-5 text-zinc-400" />
                </div>
                <span className="text-xs font-semibold text-zinc-300">No Collections</span>
                <span className="text-[11px] text-zinc-500 mt-1 mb-4 leading-normal">
                  Create a collection to organize and save your API endpoints in folders.
                </span>
                <div className="flex flex-col gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => handleCreateNewRequest()}
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
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-800 hover:bg-surface-750 text-zinc-300 hover:text-brand-300 border border-[#2b2b2b] text-xs transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-brand-400" />
                    <span>Import Postman Collection</span>
                  </button>
                </div>
              </div>
            ) : (
              collections.map((col) => renderTreeItem(col, 0))
            )}
          </div>
        </Panel>

        {/* Resize Handle 1 (Sidebar vs Workspace) */}
        <Separator className="w-1 bg-slate-200 dark:bg-[#202023] hover:bg-brand-500/60 active:bg-brand-500 transition-colors cursor-col-resize relative flex items-center justify-center group/h1">
          <div className="w-0.5 h-8 bg-zinc-600 rounded-full group-hover/h1:bg-brand-300 transition-colors" />
        </Separator>

        {/* 2. Main API Workspace Panel */}
        <Panel defaultSize="78%" minSize="40%" className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-[#121214]">
          {/* Top Multi-Tab Bar Strip */}
          <div className="bg-white dark:bg-[#141416] border-b border-slate-200 dark:border-[#242428] flex items-center justify-between pl-2 pr-3 flex-shrink-0 select-none min-h-[38px]">
            {/* Scrollable Tabs List */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 py-1.5">
              {openTabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                const methodColor = METHOD_COLORS[tab.method] || METHOD_COLORS.GET;
                return (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    onAuxClick={(e) => {
                      if (e.button === 1) handleCloseTab(tab.id, e);
                    }}
                    title={tab.name + ' (' + tab.method + ')'}
                    className={
                      'group/tab relative flex items-center gap-2 px-3 py-1 rounded-lg text-xs transition-all cursor-pointer border max-w-[200px] ' +
                      (isActive
                        ? 'bg-slate-100 dark:bg-[#1e1e22] text-slate-900 dark:text-white border-slate-300 dark:border-zinc-700/80 shadow-sm font-medium'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#18181c] border-transparent')
                    }
                  >
                    {/* Method Tag */}
                    <span className={'text-[9px] font-bold font-mono px-1 py-0.2 rounded border ' + methodColor.badge}>
                      {tab.method}
                    </span>

                    {/* Tab Title */}
                    <span className="truncate flex-1">{tab.name}</span>

                    {/* Dirty Dot Indicator */}
                    {tab.isDirty && (
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                    )}

                    {/* Close Tab Button */}
                    <button
                      type="button"
                      onClick={(e) => handleCloseTab(tab.id, e)}
                      title="Close Tab (Ctrl+W)"
                      className="opacity-0 group-hover/tab:opacity-100 p-0.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/60 transition-all cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}

              {/* Add Tab Button */}
              <button
                type="button"
                onClick={handleNewTab}
                title="New Request Tab (Ctrl+T)"
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer ml-1"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Top Right Controls (Environment Selector + Cookie Jar + Layout Switcher) */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800 flex-shrink-0">
              {/* Environment Selector Dropdown */}
              <div className="relative" ref={envDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsEnvDropdownOpen(!isEnvDropdownOpen)}
                  title="Select active environment or manage variables"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/30 transition-colors cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[11px] font-medium truncate max-w-[110px]">
                    {activeEnvironment ? activeEnvironment.name : 'No Environment'}
                  </span>
                  <ChevronDown className="w-3 h-3 text-emerald-500" />
                </button>

                {isEnvDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl bg-[#18181b] border border-zinc-700/80 shadow-2xl z-50 p-1.5 animate-in fade-in zoom-in-95 duration-100 font-sans">
                    <div className="px-2 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                      Environments
                    </div>

                    {/* No Environment */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveEnvironmentId(null);
                        setIsEnvDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left cursor-pointer ${
                        activeEnvironmentId === null
                          ? 'bg-emerald-950/60 text-emerald-300 font-medium'
                          : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      <span className="truncate">No Environment</span>
                      {activeEnvironmentId === null && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>

                    {/* Available Environments */}
                    {environments.map((env) => (
                      <button
                        key={env.id}
                        type="button"
                        onClick={() => {
                          setActiveEnvironmentId(env.id);
                          setIsEnvDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg transition-colors text-left cursor-pointer ${
                          activeEnvironmentId === env.id
                            ? 'bg-emerald-950/60 text-emerald-300 font-medium'
                            : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="truncate">{env.name}</span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            ({env.variables.filter((v) => v.enabled).length})
                          </span>
                        </div>
                        {activeEnvironmentId === env.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </button>
                    ))}

                    <div className="h-px bg-zinc-800 my-1" />

                    {/* Manage Environments Trigger */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsEnvDropdownOpen(false);
                        setIsEnvModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg text-brand-400 hover:bg-brand-950/40 hover:text-brand-300 transition-colors text-left cursor-pointer font-medium"
                    >
                      <Sliders className="w-3.5 h-3.5 text-brand-400" />
                      <span>Manage Environments...</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Cookie Jar Trigger Button */}
              <button
                type="button"
                onClick={() => setIsCookieJarOpen(true)}
                title="Cookie Jar (Manage active session cookies)"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-amber-400 hover:text-amber-300 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-500/30 transition-colors cursor-pointer"
              >
                <CookieIcon className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px] font-mono">Cookies ({cookieJar.length})</span>
              </button>

              {/* Layout Orientation Switcher (only when active request exists) */}
              {activeRequest && (
                <button
                  type="button"
                  onClick={() => setLayoutOrientation(layoutOrientation === 'horizontal' ? 'vertical' : 'horizontal')}
                  title={
                    layoutOrientation === 'horizontal'
                      ? 'Switch to Stacked View (Top/Bottom)'
                      : 'Switch to Side-by-Side View (Left/Right)'
                  }
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 border border-zinc-800 transition-colors cursor-pointer"
                >
                  {layoutOrientation === 'horizontal' ? (
                    <>
                      <Columns2 className="w-3.5 h-3.5 text-brand-400" />
                      <span className="text-[11px] hidden sm:inline">Side-by-Side</span>
                    </>
                  ) : (
                    <>
                      <Rows2 className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] hidden sm:inline">Stacked</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Main Area: Empty Workspace Landing or Active Request Workspace */}
          {!activeRequest ? (
            <div className="flex-1 w-full h-full bg-slate-50 dark:bg-[#121212] flex flex-col items-center justify-center select-none overflow-hidden p-8">
              {/* Central Geometric Watermark Matching Database Empty State */}
              <div className="w-[320px] h-[320px] sm:w-[400px] sm:h-[400px] md:w-[440px] md:h-[440px] max-w-[50vw] max-h-[50vh] flex items-center justify-center pointer-events-none">
                <img
                  src={interfaceSvg}
                  className="w-full h-full object-contain opacity-45 select-none pointer-events-none drop-shadow-2xl"
                  alt="Empty Workspace"
                />
              </div>

              {/* Subtitle / Action */}
              <div className="mt-4 flex flex-col items-center text-center">
                <span className="text-sm font-semibold text-zinc-300">No Request Selected</span>
                <span className="text-xs text-zinc-500 mt-1 max-w-sm">
                  Click a request in the explorer sidebar to open or click + to create a new tab.
                </span>
                <button
                  type="button"
                  onClick={handleNewTab}
                  className="mt-6 flex items-center gap-2 px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700 active:scale-[0.98] border border-zinc-700/60 hover:border-zinc-600 rounded-lg shadow-sm transition-all duration-150 cursor-pointer group"
                >
                  <Plus className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                  <span>New Request</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Request Header Bar (Custom Method Dropdown + URL + Send Button) */}
              <div className="p-3 border-b border-slate-200 dark:border-[#242428] bg-white dark:bg-[#161619] flex flex-col gap-2 flex-shrink-0">
                {/* Request Name Header */}
                <div className="flex items-center gap-2">
                  {editingId === activeRequest.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        commitNameEdit();
                      }}
                      className="flex items-center gap-1.5"
                    >
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={commitNameEdit}
                        className="px-2 py-0.5 text-xs font-semibold bg-[#1f1f23] border border-brand-500 rounded text-white outline-none"
                      />
                    </form>
                  ) : (
                    <div
                      onClick={() => {
                        setEditingId(activeRequest.id);
                        setEditingName(activeRequest.name);
                      }}
                      title="Click to rename request"
                      className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200 hover:text-white cursor-pointer group"
                    >
                      <span>{activeRequest.name}</span>
                      <Edit2 className="w-3 h-3 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>

                {/* URL Input & Custom Method Bar */}
                <div className="flex items-center gap-2">
                  {/* Custom HTTP Method Dropdown */}
                  <HttpMethodDropdown
                    value={activeRequest.method}
                    onChange={(newMethod) => updateActiveRequest({ ...activeRequest, method: newMethod })}
                  />

                  {/* URL Input with Variable Syntax Highlighting & Visual Badging */}
                  <UrlHighlightInput
                    value={activeRequest.url}
                    onChange={handleUrlChange}
                    placeholder="https://api.example.com/v1/resource"
                    activeEnv={activeEnvironment}
                    globalVariables={globalVariables}
                    onUpdateVariable={handleUpdateVariableFromInput}
                    onOpenManageEnvironments={handleOpenManageEnvironments}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSending) {
                        handleSendRequest();
                      }
                    }}
                  />

                  {/* Send Button */}
                  <button
                    type="button"
                    onClick={handleSendRequest}
                    disabled={isSending}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 active:scale-[0.98] text-white font-semibold text-xs shadow-md shadow-brand-600/20 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSending ? 'Sending...' : 'Send'}</span>
                  </button>
                </div>
              </div>

              {/* Level 2 Resizable Panel Group (Request Builder vs Response Viewer) */}
              <div className="flex-1 overflow-hidden">
                <Group
                  key={layoutOrientation}
                  orientation={layoutOrientation}
                  id={'octa_http_workspace_' + layoutOrientation}
                  className="h-full w-full"
                >
                  {/* Left / Top: Request Builder Panel */}
                  <Panel defaultSize="50%" minSize="20%" className="flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-[#131316]">
                    {/* Request Tabs Header */}
                    <div className="px-3 border-b border-slate-200 dark:border-[#242428] bg-slate-50 dark:bg-[#161619] flex items-center gap-1 text-xs flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setRequestTab('params')}
                        className={
                          'px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer ' +
                          (requestTab === 'params'
                            ? 'border-brand-500 dark:border-brand-400 text-brand-600 dark:text-brand-300 font-semibold'
                            : 'border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200')
                        }
                      >
                        Params ({activeRequest.params.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setRequestTab('headers')}
                        className={
                          'px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer ' +
                          (requestTab === 'headers'
                            ? 'border-brand-500 dark:border-brand-400 text-brand-600 dark:text-brand-300 font-semibold'
                            : 'border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200')
                        }
                      >
                        Headers ({totalActiveHeadersCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setRequestTab('body')}
                        className={
                          'px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ' +
                          (requestTab === 'body'
                            ? 'border-brand-500 dark:border-brand-400 text-brand-600 dark:text-brand-300 font-semibold'
                            : 'border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200')
                        }
                      >
                        <span>Body</span>
                        {activeRequest.bodyType !== 'none' && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-brand-950/80 border border-brand-500/40 text-brand-300 font-mono">
                            {activeRequest.bodyType}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Request Tab Content */}
                    <div className={"p-3 min-h-0 bg-white dark:bg-[#131316] " + (requestTab === 'body' && activeRequest.bodyType === 'json' ? 'flex-1 flex flex-col h-full overflow-hidden' : 'flex-1 overflow-y-auto')}>
                      {/* 1. QUERY PARAMS TAB with Bidirectional Two-Way URL Sync */}
                      {requestTab === 'params' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                              Query Parameters ({activeRequest.params.length})
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              Auto-syncs with URL
                            </span>
                          </div>

                          {activeRequest.params.length === 0 && (
                            <div className="text-xs text-zinc-500 py-3 text-center border border-dashed border-zinc-800 rounded-lg">
                              No query parameters. Type <code className="text-zinc-400 font-mono">?key=value</code> in the URL bar or click below.
                            </div>
                          )}

                          {activeRequest.params.map((p, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={p.enabled}
                                onChange={(e) => {
                                  const next = [...activeRequest.params];
                                  next[idx] = { ...next[idx], enabled: e.target.checked };
                                  handleParamsChange(next);
                                }}
                                className="rounded bg-zinc-800 border-zinc-700 text-brand-500 cursor-pointer"
                              />
                              <input
                                type="text"
                                value={p.key}
                                onChange={(e) => {
                                  const next = [...activeRequest.params];
                                  next[idx] = { ...next[idx], key: e.target.value };
                                  handleParamsChange(next);
                                }}
                                placeholder="Key"
                                className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-[#1a1a1e] border border-slate-200 dark:border-[#2b2b30] rounded text-slate-900 dark:text-zinc-200 font-mono outline-none focus:border-brand-500"
                              />
                              <input
                                type="text"
                                value={p.value}
                                onChange={(e) => {
                                  const next = [...activeRequest.params];
                                  next[idx] = { ...next[idx], value: e.target.value };
                                  handleParamsChange(next);
                                }}
                                placeholder="Value"
                                className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-[#1a1a1e] border border-slate-200 dark:border-[#2b2b30] rounded text-slate-900 dark:text-zinc-200 font-mono outline-none focus:border-brand-500"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const next = activeRequest.params.filter((_, i) => i !== idx);
                                  handleParamsChange(next);
                                }}
                                title="Remove Parameter"
                                className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => {
                              const next = [...activeRequest.params, { key: '', value: '', enabled: true }];
                              handleParamsChange(next);
                            }}
                            className="text-xs text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1 cursor-pointer mt-2"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Parameter</span>
                          </button>
                        </div>
                      )}

                      {/* 2. HEADERS TAB (Dynamic Auto-Generated Headers + Custom Headers) */}
                      {requestTab === 'headers' && (
                        <div className="space-y-4">
                          {/* Top Header Controls Bar */}
                          <div className="flex items-center justify-between pb-1 border-b border-[#26262a]">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                                Headers
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono">
                                ({totalActiveHeadersCount} active)
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Cookie Jar Indicator */}
                              {matchingCookies.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setIsCookieJarOpen(true)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 text-[10px] font-mono cursor-pointer hover:bg-amber-950/70 transition-colors"
                                >
                                  <CookieIcon className="w-3 h-3 text-amber-400" />
                                  <span>{matchingCookies.length} cookie(s)</span>
                                </button>
                              )}

                              {/* Visibility Toggle for Auto-Generated Headers */}
                              <button
                                type="button"
                                onClick={() => setShowAutoHeaders(!showAutoHeaders)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 border border-zinc-800 transition-colors cursor-pointer"
                              >
                                {showAutoHeaders ? (
                                  <>
                                    <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
                                    <span>Hide auto-generated headers ({computedAutoHeaders.length})</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3.5 h-3.5 text-brand-400" />
                                    <span>Show auto-generated headers ({computedAutoHeaders.length})</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* AUTO-GENERATED SYSTEM HEADERS TABLE */}
                          {showAutoHeaders && (
                            <div className="border border-slate-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-zinc-900/60 animate-fade-in">
                              <div className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 text-[11px] font-semibold text-slate-700 dark:text-zinc-400 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <ShieldCheck className="w-3.5 h-3.5 text-brand-400" />
                                  <span>Auto-Generated System Headers</span>
                                </div>
                                <span className="text-[10px] text-zinc-500 font-normal italic hidden sm:inline">
                                  Custom headers with matching key override these
                                </span>
                              </div>

                              <div className="divide-y divide-slate-200 dark:divide-zinc-800/80">
                                {computedAutoHeaders.map((ah) => (
                                  <div
                                    key={ah.key}
                                    className={
                                      'grid grid-cols-[36px_1.5fr_2fr_100px] items-center gap-2 px-3 py-1.5 text-xs transition-colors ' +
                                      (ah.isOverridden
                                        ? 'bg-slate-100/50 dark:bg-[#151517]/50 opacity-50'
                                        : ah.isChecked
                                        ? 'bg-white dark:bg-[#161618]/40 hover:bg-slate-50 dark:hover:bg-[#18181c]/60'
                                        : 'bg-slate-50/60 dark:bg-[#141416]/40 opacity-60')
                                    }
                                  >
                                    {/* Checkbox */}
                                    <div className="flex items-center justify-center">
                                      <input
                                        type="checkbox"
                                        checked={ah.isChecked}
                                        disabled={ah.isOverridden}
                                        onChange={(e) => handleToggleAutoHeader(ah.key, e.target.checked)}
                                        className="rounded bg-zinc-800 border-zinc-700 text-brand-500 cursor-pointer disabled:opacity-40"
                                      />
                                    </div>

                                    {/* Key */}
                                    <div className="flex items-center gap-1.5">
                                      <span
                                        className={
                                          'px-2.5 py-1 rounded bg-slate-100 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 font-mono text-[11px] select-text ' +
                                          (ah.isOverridden ? 'line-through text-slate-400 dark:text-zinc-600' : 'text-slate-700 dark:text-zinc-300 italic')
                                        }
                                      >
                                        {ah.key}
                                      </span>
                                    </div>

                                    {/* Value */}
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span
                                        className={
                                          'px-2.5 py-1 rounded bg-slate-100 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800/80 font-mono text-[11px] select-text truncate w-full ' +
                                          (ah.isOverridden ? 'line-through text-slate-400 dark:text-zinc-600' : 'text-slate-800 dark:text-zinc-200 italic')
                                        }
                                        title={ah.value}
                                      >
                                        {ah.value}
                                      </span>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="flex items-center justify-end">
                                      {ah.isOverridden ? (
                                        <span
                                          className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 text-slate-500 dark:text-zinc-500 font-mono"
                                          title="Overridden by custom user header"
                                        >
                                          overridden
                                        </span>
                                      ) : (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-brand-950/60 border border-slate-300 dark:border-brand-500/30 text-slate-700 dark:text-brand-400 font-mono">
                                          auto
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* USER CUSTOM HEADERS SECTION */}
                          <div className="space-y-2">
                            <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                              Custom Headers ({activeRequest.headers.length})
                            </div>
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
                                  className="rounded bg-zinc-800 border-zinc-700 text-brand-500 cursor-pointer"
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
                                  className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-[#1a1a1e] border border-slate-200 dark:border-[#2b2b30] rounded text-slate-900 dark:text-zinc-200 font-mono outline-none focus:border-brand-500"
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
                                  className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-[#1a1a1e] border border-slate-200 dark:border-[#2b2b30] rounded text-slate-900 dark:text-zinc-200 font-mono outline-none focus:border-brand-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = activeRequest.headers.filter((_, i) => i !== idx);
                                    updateActiveRequest({ ...activeRequest, headers: next });
                                  }}
                                  title="Remove Header"
                                  className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer transition-colors"
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
                        </div>
                      )}

                      {/* 3. REQUEST BODY TAB (Monaco JSON + Multipart Form-Data + Form URL Encoded) */}
                      {requestTab === 'body' && (
                        <div className="flex-1 flex flex-col min-h-0 h-full space-y-3">
                          {/* Body Type Sub-Navigation Radio Bar */}
                          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-lg text-xs self-start flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleSwitchBodyType('none')}
                              className={
                                'px-3 py-1 rounded-md text-xs transition-all cursor-pointer font-medium ' +
                                (activeRequest.bodyType === 'none'
                                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-sm border border-slate-200/80 dark:border-transparent'
                                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/40')
                              }
                            >
                              none
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSwitchBodyType('json')}
                              className={
                                'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all cursor-pointer font-medium ' +
                                (activeRequest.bodyType === 'json'
                                  ? 'bg-brand-600 text-white shadow-sm'
                                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/40')
                              }
                            >
                              <Code2 className="w-3.5 h-3.5" />
                              <span>json</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSwitchBodyType('form-data')}
                              className={
                                'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all cursor-pointer font-medium ' +
                                (activeRequest.bodyType === 'form-data'
                                  ? 'bg-amber-600 text-white shadow-sm'
                                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/40')
                              }
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>form-data</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSwitchBodyType('x-www-form-urlencoded')}
                              className={
                                'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition-all cursor-pointer font-medium ' +
                                (activeRequest.bodyType === 'x-www-form-urlencoded'
                                  ? 'bg-purple-600 text-white shadow-sm'
                                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/40')
                              }
                            >
                              <Globe className="w-3.5 h-3.5" />
                              <span>x-www-form-urlencoded</span>
                            </button>
                          </div>

                          {/* NONE VIEW */}
                          {activeRequest.bodyType === 'none' && (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 select-none">
                              <span className="text-xs">This request does not include a body payload.</span>
                              <span className="text-[11px] text-zinc-600 mt-1">
                                Select <strong className="text-zinc-400">json</strong>, <strong className="text-zinc-400">form-data</strong>, or <strong className="text-zinc-400">x-www-form-urlencoded</strong> above to configure payload data.
                              </span>
                            </div>
                          )}

                          {/* RAW JSON VIEW WITH MONACO EDITOR */}
                          {activeRequest.bodyType === 'json' && (
                            <div className="flex-1 flex flex-col min-h-[260px] h-full border border-[#2b2b30] rounded-xl overflow-hidden bg-[#141416]">
                              {/* Monaco Editor JSON Action Toolbar */}
                              <div className="px-3 py-1.5 border-b border-[#242428] bg-[#18181c] flex items-center justify-between gap-2 flex-shrink-0">
                                {/* Left Validation Badge */}
                                <div className="flex items-center gap-2 text-xs">
                                  {(() => {
                                    const validity = getJsonValidity(activeRequest.bodyContent);
                                    if (!activeRequest.bodyContent?.trim()) {
                                      return <span className="text-[11px] text-zinc-500 font-mono">Empty JSON</span>;
                                    }
                                    if (validity.isValid) {
                                      return (
                                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium font-mono">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                          <span>Valid JSON</span>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-500/30 text-rose-400 text-[10px] font-medium font-mono truncate max-w-xs" title={validity.error}>
                                        <AlertCircle className="w-3 h-3 text-rose-400 flex-shrink-0" />
                                        <span className="truncate">{validity.error}</span>
                                      </div>
                                    );
                                  })()}
                                </div>

                                {/* Right Toolbar Buttons: Format, Minify, Clear */}
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={handleFormatJson}
                                    title="Format JSON (Prettier)"
                                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#222226] hover:bg-[#2b2b30] text-zinc-300 hover:text-white border border-zinc-700/60 text-xs transition-colors cursor-pointer"
                                  >
                                    <Sparkles className="w-3 h-3 text-amber-400" />
                                    <span>Format</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleMinifyJson}
                                    title="Minify / Compress JSON"
                                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#222226] hover:bg-[#2b2b30] text-zinc-300 hover:text-white border border-zinc-700/60 text-xs transition-colors cursor-pointer"
                                  >
                                    <Minimize2 className="w-3 h-3 text-sky-400" />
                                    <span>Minify</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleClearJson}
                                    title="Clear JSON"
                                    className="p-1 rounded bg-[#222226] hover:bg-rose-950/50 text-zinc-400 hover:text-rose-300 border border-zinc-700/60 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Monaco Editor Instance */}
                              <div className="flex-1 w-full h-full min-h-[220px] relative overflow-hidden bg-white dark:bg-[#141416]">
                                <Editor
                                  height="100%"
                                  width="100%"
                                  language="json"
                                  theme={monacoTheme}
                                  beforeMount={(monacoInstance) => defineOctaTheme(monacoInstance)}
                                  onMount={(editor) => {
                                    setTimeout(() => {
                                      try {
                                        editor.layout();
                                      } catch {}
                                    }, 60);
                                  }}
                                  value={activeRequest.bodyContent !== undefined ? activeRequest.bodyContent : DEFAULT_JSON_BODY}
                                  onChange={(val) => {
                                    updateActiveRequest({
                                      ...activeRequest,
                                      bodyContent: val || '',
                                      bodyType: 'json',
                                    });
                                  }}
                                  options={{
                                    fontSize: 12.5,
                                    fontFamily: "JetBrains Mono, Fira Code, Menlo, Monaco, Consolas, 'Courier New', monospace",
                                    minimap: { enabled: false },
                                    lineNumbers: 'on',
                                    lineNumbersMinChars: 3,
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    tabSize: 2,
                                    wordWrap: 'on',
                                    bracketPairColorization: { enabled: true },
                                    formatOnPaste: true,
                                    padding: { top: 12, bottom: 12 },
                                    scrollbar: {
                                      verticalScrollbarSize: 8,
                                      horizontalScrollbarSize: 8,
                                      alwaysConsumeMouseWheel: false,
                                    },
                                    overviewRulerBorder: false,
                                    renderLineHighlight: 'all',
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          {/* MULTIPART FORM-DATA VIEW */}
                          {activeRequest.bodyType === 'form-data' && (
                            <div className="flex-1 flex flex-col space-y-2 min-h-0">
                              <div className="flex items-center justify-between text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                                <span>Multipart Form-Data Fields</span>
                                <span className="text-[10px] lowercase font-normal text-zinc-500">
                                  Supports text inputs and direct file attachments
                                </span>
                              </div>

                              {/* Form-Data Fields Table */}
                              <div className="border border-slate-200 dark:border-[#26262a] rounded-xl overflow-hidden bg-white dark:bg-[#161618]">
                                <div className="grid grid-cols-[36px_1.5fr_110px_2.5fr_40px] items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-[#1a1a1e] border-b border-slate-200 dark:border-[#26262a] text-[11px] font-semibold text-slate-700 dark:text-zinc-400">
                                  <span className="text-center">#</span>
                                  <span>Key</span>
                                  <span>Type</span>
                                  <span>Value</span>
                                  <span className="text-right"></span>
                                </div>

                                <div className="divide-y divide-slate-100 dark:divide-[#222226]">
                                  {(activeRequest.bodyFormData || []).map((row, idx) => (
                                    <div
                                      key={row.id || idx}
                                      className="grid grid-cols-[36px_1.5fr_110px_2.5fr_40px] items-center gap-2 px-3 py-2 text-xs bg-white dark:bg-[#161618] hover:bg-slate-50 dark:hover:bg-[#19191d] transition-colors"
                                    >
                                      {/* Enabled Checkbox */}
                                      <div className="flex items-center justify-center">
                                        <input
                                          type="checkbox"
                                          checked={row.enabled}
                                          onChange={(e) => {
                                            const next = [...(activeRequest.bodyFormData || [])];
                                            next[idx].enabled = e.target.checked;
                                            updateActiveRequest({ ...activeRequest, bodyFormData: next });
                                          }}
                                          className="rounded bg-zinc-800 border-zinc-700 text-brand-500 cursor-pointer"
                                        />
                                      </div>

                                      {/* Key Input */}
                                      <input
                                        type="text"
                                        value={row.key}
                                        onChange={(e) => {
                                          const next = [...(activeRequest.bodyFormData || [])];
                                          next[idx].key = e.target.value;
                                          updateActiveRequest({ ...activeRequest, bodyFormData: next });
                                        }}
                                        placeholder="Field Name (e.g. file)"
                                        className="w-full px-2.5 py-1 bg-slate-50 dark:bg-[#1a1a1d] border border-slate-200 dark:border-[#2b2b30] rounded text-slate-900 dark:text-zinc-200 font-mono text-xs outline-none focus:border-brand-500"
                                      />

                                      {/* Type Dropdown (Text vs File) */}
                                      <select
                                        value={row.type}
                                        onChange={(e) => {
                                          const next = [...(activeRequest.bodyFormData || [])];
                                          const nextType = e.target.value as 'text' | 'file';
                                          next[idx].type = nextType;
                                          if (nextType === 'file') {
                                            next[idx].files = next[idx].files || [];
                                          }
                                          updateActiveRequest({ ...activeRequest, bodyFormData: next });
                                        }}
                                        className="w-full px-2 py-1 bg-slate-100 dark:bg-[#1f1f23] border border-slate-200 dark:border-[#2b2b30] rounded text-slate-800 dark:text-zinc-200 text-xs outline-none font-medium cursor-pointer"
                                      >
                                        <option value="text">Text</option>
                                        <option value="file">File</option>
                                      </select>

                                      {/* Value Column: Text Input vs File Picker Chips */}
                                      {row.type === 'text' ? (
                                        <input
                                          type="text"
                                          value={row.value}
                                          onChange={(e) => {
                                            const next = [...(activeRequest.bodyFormData || [])];
                                            next[idx].value = e.target.value;
                                            updateActiveRequest({ ...activeRequest, bodyFormData: next });
                                          }}
                                          placeholder="Value"
                                          className="w-full px-2.5 py-1 bg-slate-50 dark:bg-[#1a1a1d] border border-slate-200 dark:border-[#2b2b30] rounded text-slate-900 dark:text-zinc-200 font-mono text-xs outline-none focus:border-brand-500"
                                        />
                                      ) : (
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {/* Selected File Chips */}
                                          {(row.files || []).map((fileItem, fIdx) => (
                                            <div
                                              key={fileItem.id || fIdx}
                                              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-[#222227] border border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 text-[11px] font-mono group/chip"
                                            >
                                              <Paperclip className="w-3 h-3 text-amber-400 flex-shrink-0" />
                                              <span className="truncate max-w-[120px]" title={fileItem.name}>
                                                {fileItem.name}
                                              </span>
                                              <span className="text-[10px] text-zinc-500">
                                                ({formatFileSize(fileItem.size)})
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const next = [...(activeRequest.bodyFormData || [])];
                                                  next[idx].files = next[idx].files?.filter((_, i) => i !== fIdx);
                                                  updateActiveRequest({ ...activeRequest, bodyFormData: next });
                                                }}
                                                className="p-0.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-zinc-700/50 transition-colors cursor-pointer"
                                              >
                                                <X className="w-2.5 h-2.5" />
                                              </button>
                                            </div>
                                          ))}

                                          {/* File Picker Trigger */}
                                          <div className="flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              onClick={async () => {
                                                // Try native desktop dialog first
                                                try {
                                                  const nativeFiles = await selectFilesDialog();
                                                  if (nativeFiles && nativeFiles.length > 0) {
                                                    const formattedFiles: FormFileMeta[] = nativeFiles.map((nf: any) => ({
                                                      id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                                                      name: nf.name || 'file.bin',
                                                      size: nf.size || 0,
                                                      type: nf.contentType || 'application/octet-stream',
                                                      filePath: nf.path || nf.filePath || '',
                                                      base64: nf.base64Data || nf.base64 || '',
                                                    }));
                                                    const next = [...(activeRequest.bodyFormData || [])];
                                                    next[idx].files = [...(next[idx].files || []), ...formattedFiles];
                                                    next[idx].fileName = formattedFiles[0]?.name;
                                                    next[idx].filePath = formattedFiles[0]?.filePath;
                                                    next[idx].base64Data = formattedFiles[0]?.base64;
                                                    updateActiveRequest({ ...activeRequest, bodyFormData: next });
                                                    showToast('Attached ' + formattedFiles.length + ' file(s)', 'info');
                                                    return;
                                                  }
                                                } catch (err) {
                                                  console.warn('Native file picker error, falling back to input', err);
                                                }
                                                // Trigger hidden file input fallback
                                                const fileInput = document.getElementById('file-input-' + (row.id || idx)) as HTMLInputElement;
                                                if (fileInput) fileInput.click();
                                              }}
                                              className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-[#202024] dark:hover:bg-[#28282e] text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-zinc-700/80 text-xs font-medium cursor-pointer transition-colors"
                                            >
                                              <Upload className="w-3 h-3 text-brand-400" />
                                              <span>{row.files && row.files.length > 0 ? 'Add Files' : 'Select Files'}</span>
                                            </button>
                                            <input
                                              id={'file-input-' + (row.id || idx)}
                                              type="file"
                                              multiple
                                              className="hidden"
                                              onChange={async (e) => {
                                                if (e.target.files && e.target.files.length > 0) {
                                                  const promises = Array.from(e.target.files).map(async (f) => {
                                                    const b64 = await fileToBase64(f);
                                                    return {
                                                      id: 'file-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                                                      name: f.name,
                                                      size: f.size,
                                                      type: f.type || 'application/octet-stream',
                                                      filePath: (f as any).path || '',
                                                      base64: b64,
                                                      fileObj: f,
                                                    };
                                                  });
                                                  const newFiles = await Promise.all(promises);
                                                  const next = [...(activeRequest.bodyFormData || [])];
                                                  next[idx].files = [...(next[idx].files || []), ...newFiles];
                                                  next[idx].fileName = newFiles[0]?.name;
                                                  next[idx].filePath = newFiles[0]?.filePath;
                                                  next[idx].base64Data = newFiles[0]?.base64;
                                                  updateActiveRequest({ ...activeRequest, bodyFormData: next });
                                                  showToast('Attached ' + newFiles.length + ' file(s)', 'info');
                                                }
                                              }}
                                            />
                                          </div>
                                        </div>
                                      )}

                                      {/* Delete Row Button */}
                                      <div className="flex items-center justify-end">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const next = (activeRequest.bodyFormData || []).filter((_, i) => i !== idx);
                                            updateActiveRequest({ ...activeRequest, bodyFormData: next });
                                          }}
                                          title="Remove Field"
                                          className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Add Field Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const newField: FormDataField = {
                                    id: 'fd-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                                    key: '',
                                    value: '',
                                    type: 'text',
                                    enabled: true,
                                    files: [],
                                  };
                                  updateActiveRequest({
                                    ...activeRequest,
                                    bodyFormData: [...(activeRequest.bodyFormData || []), newField],
                                  });
                                }}
                                className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer self-start mt-2"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Field</span>
                              </button>
                            </div>
                          )}

                          {/* X-WWW-FORM-URLENCODED VIEW */}
                          {activeRequest.bodyType === 'x-www-form-urlencoded' && (
                            <div className="flex-1 flex flex-col space-y-2 min-h-0">
                              <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                                URL Encoded Key-Value Pairs
                              </div>

                              <div className="border border-[#26262a] rounded-xl overflow-hidden bg-[#161618]">
                                <div className="grid grid-cols-[36px_1fr_1fr_40px] items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-[#1a1a1e] border-b border-slate-200 dark:border-[#26262a] text-[11px] font-semibold text-slate-700 dark:text-zinc-400">
                                  <span className="text-center">#</span>
                                  <span>Key</span>
                                  <span>Value</span>
                                  <span className="text-right"></span>
                                </div>

                                <div className="divide-y divide-[#222226]">
                                  {(activeRequest.bodyUrlEncoded || []).map((row, idx) => (
                                    <div
                                      key={row.id || idx}
                                      className="grid grid-cols-[36px_1fr_1fr_40px] items-center gap-2 px-3 py-2 text-xs bg-white dark:bg-[#161618] hover:bg-slate-50 dark:hover:bg-[#19191d] transition-colors"
                                    >
                                      {/* Enabled Checkbox */}
                                      <div className="flex items-center justify-center">
                                        <input
                                          type="checkbox"
                                          checked={row.enabled}
                                          onChange={(e) => {
                                            const next = [...(activeRequest.bodyUrlEncoded || [])];
                                            next[idx].enabled = e.target.checked;
                                            updateActiveRequest({ ...activeRequest, bodyUrlEncoded: next });
                                          }}
                                          className="rounded bg-zinc-800 border-zinc-700 text-purple-500 cursor-pointer"
                                        />
                                      </div>

                                      {/* Key Input */}
                                      <input
                                        type="text"
                                        value={row.key}
                                        onChange={(e) => {
                                          const next = [...(activeRequest.bodyUrlEncoded || [])];
                                          next[idx].key = e.target.value;
                                          updateActiveRequest({ ...activeRequest, bodyUrlEncoded: next });
                                        }}
                                        placeholder="Key"
                                        className="w-full px-2.5 py-1 bg-slate-50 dark:bg-[#1a1a1d] border border-slate-200 dark:border-[#2b2b30] rounded text-slate-900 dark:text-zinc-200 font-mono text-xs outline-none focus:border-purple-500"
                                      />

                                      {/* Value Input */}
                                      <input
                                        type="text"
                                        value={row.value}
                                        onChange={(e) => {
                                          const next = [...(activeRequest.bodyUrlEncoded || [])];
                                          next[idx].value = e.target.value;
                                          updateActiveRequest({ ...activeRequest, bodyUrlEncoded: next });
                                        }}
                                        placeholder="Value"
                                        className="w-full px-2.5 py-1 bg-slate-50 dark:bg-[#1a1a1d] border border-slate-200 dark:border-[#2b2b30] rounded text-slate-900 dark:text-zinc-200 font-mono text-xs outline-none focus:border-purple-500"
                                      />

                                      {/* Delete Row */}
                                      <div className="flex items-center justify-end">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const next = (activeRequest.bodyUrlEncoded || []).filter((_, i) => i !== idx);
                                            updateActiveRequest({ ...activeRequest, bodyUrlEncoded: next });
                                          }}
                                          title="Remove Field"
                                          className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Add Field Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  const newField: UrlEncodedField = {
                                    id: 'urlenc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
                                    key: '',
                                    value: '',
                                    enabled: true,
                                  };
                                  updateActiveRequest({
                                    ...activeRequest,
                                    bodyUrlEncoded: [...(activeRequest.bodyUrlEncoded || []), newField],
                                  });
                                }}
                                className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer self-start mt-2"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Field</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Panel>

                  {/* Resize Handle 2 (Request vs Response) */}
                  <Separator
                    className={
                      layoutOrientation === 'horizontal'
                        ? 'w-1 bg-[#202023] hover:bg-brand-500/60 active:bg-brand-500 transition-colors cursor-col-resize relative flex items-center justify-center group/h2'
                        : 'h-1 bg-[#202023] hover:bg-brand-500/60 active:bg-brand-500 transition-colors cursor-row-resize relative flex items-center justify-center group/h2'
                    }
                  >
                    <div
                      className={
                        layoutOrientation === 'horizontal'
                          ? 'w-0.5 h-8 bg-zinc-600 rounded-full group-hover/h2:bg-brand-300 transition-colors'
                          : 'h-0.5 w-8 bg-zinc-600 rounded-full group-hover/h2:bg-brand-300 transition-colors'
                      }
                    />
                  </Separator>

                  {/* Right / Bottom: Response Inspector Panel with Monaco Viewer */}
                  <Panel defaultSize="50%" minSize="20%" className="flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-[#141417]">
                    {/* Response Status Bar */}
                    <div className="px-3 py-2 border-b border-slate-200 dark:border-[#242428] bg-slate-50 dark:bg-[#17171a] flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Response</span>
                        {activeResponseState && (
                          <div className="flex items-center gap-2">
                            <span
                              className={
                                'text-xs font-mono font-bold px-2 py-0.5 rounded border ' +
                                (activeResponseState.status >= 200 && activeResponseState.status < 300
                                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                                  : 'bg-rose-950/70 border-rose-500/40 text-rose-300')
                              }
                            >
                              {activeResponseState.status} {activeResponseState.statusText}
                            </span>
                            <span className="text-xs font-mono text-zinc-400">{activeResponseState.durationMs} ms</span>
                            <span className="text-xs font-mono text-zinc-500">•</span>
                            <span className="text-xs font-mono text-zinc-400">{activeResponseState.sizeKb} KB</span>
                            <span className="text-xs font-mono text-zinc-500">•</span>
                            <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                              {getResponseEditorConfig(activeResponseState).language}
                            </span>
                          </div>
                        )}
                      </div>

                      {activeResponseState && (
                        <button
                          type="button"
                          onClick={() => {
                            const config = getResponseEditorConfig(activeResponseState);
                            navigator.clipboard.writeText(config.value);
                            showToast('Response copied to clipboard', 'success');
                          }}
                          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white px-2 py-1 rounded bg-[#202024] border border-zinc-700/60 cursor-pointer transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </button>
                      )}
                    </div>

                    {/* Response Body Inspector with Read-Only Monaco Editor */}
                    <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden bg-white dark:bg-[#111114]">
                      {activeResponseState ? (
                        <Editor
                          height="100%"
                          language={getResponseEditorConfig(activeResponseState).language}
                          theme={monacoTheme}
                          beforeMount={(monacoInstance) => defineOctaTheme(monacoInstance)}
                          value={getResponseEditorConfig(activeResponseState).value}
                          options={{
                            readOnly: true,
                            domReadOnly: true,
                            fontSize: 12.5,
                            fontFamily: "JetBrains Mono, Fira Code, Menlo, Monaco, Consolas, 'Courier New', monospace",
                            minimap: { enabled: false },
                            lineNumbers: 'on',
                            lineNumbersMinChars: 3,
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                            tabSize: 2,
                            wordWrap: 'on',
                            bracketPairColorization: { enabled: true },
                            padding: { top: 8, bottom: 8 },
                            scrollbar: {
                              verticalScrollbarSize: 8,
                              horizontalScrollbarSize: 8,
                              alwaysConsumeMouseWheel: false,
                            },
                            overviewRulerBorder: false,
                            renderLineHighlight: 'all',
                          }}
                        />
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center select-none text-slate-500 dark:text-zinc-500">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#1a1a1e] border border-slate-200 dark:border-[#2b2b30] flex items-center justify-center mb-3 text-slate-500 dark:text-zinc-400 shadow-sm">
                            <Send className="w-5 h-5 text-brand-500 dark:text-brand-400 opacity-80" />
                          </div>
                          <span className="text-xs font-semibold text-slate-800 dark:text-zinc-300">No response yet</span>
                          <span className="text-[11px] text-slate-500 dark:text-zinc-500 mt-1 max-w-xs leading-normal">
                            Enter a URL and click <strong className="text-brand-500 dark:text-brand-400 font-semibold">Send</strong> to execute the request and view response data, headers, and status metrics.
                          </span>
                        </div>
                      )}
                    </div>
                  </Panel>
                </Group>
              </div>
            </div>
          )}
        </Panel>
      </Group>

      {/* Hidden Postman File Importer Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,application/json"
        onChange={handleFileImportChange}
        className="hidden"
      />

      {/* Cookie Jar Management Modal */}
      {isCookieJarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-[#161619] border border-slate-200 dark:border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-[#26262a] bg-slate-50 dark:bg-[#1a1a1e] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CookieIcon className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-zinc-200">Cookie Jar</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-500/30 text-amber-300">
                  {cookieJar.length} stored
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCookieJarOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Cookies List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cookieJar.length === 0 ? (
                <div className="py-8 text-center text-zinc-500">
                  <CookieIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2 opacity-60" />
                  <span className="text-xs">No cookies in jar</span>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    Cookies received via Set-Cookie response headers will automatically appear here.
                  </p>
                </div>
              ) : (
                <div className="border border-[#26262a] rounded-xl overflow-hidden divide-y divide-[#222226]">
                  {cookieJar.map((c, idx) => (
                    <div key={idx} className="p-3 bg-[#131316] hover:bg-[#18181c] transition-colors flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-amber-300">{c.name}</span>
                          <span className="text-zinc-600">=</span>
                          <span className="font-mono text-zinc-300 truncate max-w-xs" title={c.value}>
                            {c.value}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono">
                          <span>Domain: <strong className="text-zinc-400">{c.domain}</strong></span>
                          <span>Path: <strong className="text-zinc-400">{c.path}</strong></span>
                          {c.expires && (
                            <span>Expires: <strong className="text-zinc-400">{new Date(c.expires).toLocaleDateString()}</strong></span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const next = cookieJar.filter((_, i) => i !== idx);
                          saveCookieJar(next);
                          showToast('Removed cookie: ' + c.name, 'info');
                        }}
                        title="Delete cookie"
                        className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-4 py-3 border-t border-[#26262a] bg-[#1a1a1e] flex items-center justify-between">
              {cookieJar.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    saveCookieJar([]);
                    showToast('Cookie jar cleared', 'info');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-500/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All Cookies</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => setIsCookieJarOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Manage Environments Modal */}
      {isEnvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 p-4">
          <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-4xl h-[620px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-[#18181b]/60 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                    <span>Environments & Variables</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Configure scoped environment variables and global variables referenced via <code className="text-brand-400 font-mono bg-zinc-800/80 px-1 py-0.5 rounded text-[11px]">&#123;&#123;variableName&#125;&#125;</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEnvModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Split Pane */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Pane: Environment List */}
              <div className="w-64 border-r border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-[#121214] flex flex-col overflow-hidden">
                <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Scopes</span>
                  <button
                    type="button"
                    onClick={handleCreateEnvironment}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 hover:text-brand-300 border border-brand-500/30 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {/* Globals Scope Item */}
                  <button
                    type="button"
                    onClick={() => setSelectedEnvIdInModal('globals')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                      selectedEnvIdInModal === 'globals'
                        ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>Globals</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">
                      {globalVariables.filter((v) => v.enabled).length}
                    </span>
                  </button>

                  <div className="h-px bg-zinc-800/80 my-1.5" />

                  {/* Environments List */}
                  {environments.map((env) => {
                    const isSelected = selectedEnvIdInModal === env.id;
                    const isActive = activeEnvironmentId === env.id;
                    return (
                      <div
                        key={env.id}
                        onClick={() => setSelectedEnvIdInModal(env.id)}
                        className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Globe className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-zinc-500'}`} />
                          <span className="truncate">{env.name}</span>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            title="Duplicate Environment"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicateEnvironment(env.id);
                            }}
                            className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            title="Delete Environment"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteEnvironment(env.id);
                            }}
                            className="p-1 rounded hover:bg-rose-950/60 text-zinc-500 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Pane: Variable Editor Table */}
              <div className="flex-1 flex flex-col bg-white dark:bg-[#141416] overflow-hidden">
                {selectedEnvIdInModal === 'globals' ? (
                  /* Globals Editor */
                  <div className="flex-1 flex flex-col p-6 overflow-hidden">
                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-200">Global Variables</h3>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Variables available globally across all requests regardless of active environment.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newVar: EnvironmentVariable = {
                            id: 'gv-' + Date.now(),
                            key: '',
                            value: '',
                            enabled: true,
                            type: 'default',
                          };
                          setGlobalVariables([...globalVariables, newVar]);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/50 hover:bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Variable</span>
                      </button>
                    </div>

                    {/* Table */}
                    <div className="flex-1 border border-zinc-800 rounded-xl overflow-y-auto bg-[#18181b]/40">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                            <th className="py-2.5 px-3 w-10 text-center">Active</th>
                            <th className="py-2.5 px-3 w-1/3">Variable (Key)</th>
                            <th className="py-2.5 px-3 w-28">Type</th>
                            <th className="py-2.5 px-3">Value</th>
                            <th className="py-2.5 px-3 w-12 text-center"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 font-mono text-xs text-zinc-200">
                          {globalVariables.map((v, idx) => {
                            const isSecret = v.type === 'secret';
                            const isRevealed = revealedSecrets[v.id];
                            return (
                              <tr key={v.id} className="hover:bg-zinc-850/40 transition-colors">
                                <td className="py-2 px-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={v.enabled}
                                    onChange={(e) => {
                                      const next = [...globalVariables];
                                      next[idx].enabled = e.target.checked;
                                      setGlobalVariables(next);
                                    }}
                                    className="accent-brand-500 rounded cursor-pointer"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    value={v.key}
                                    onChange={(e) => {
                                      const next = [...globalVariables];
                                      next[idx].key = e.target.value;
                                      setGlobalVariables(next);
                                    }}
                                    placeholder="e.g. appVersion"
                                    className="w-full bg-transparent outline-none text-zinc-100 placeholder:text-zinc-600 focus:text-brand-400"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <select
                                    value={v.type || 'default'}
                                    onChange={(e) => {
                                      const next = [...globalVariables];
                                      next[idx].type = e.target.value as EnvironmentVariableType;
                                      setGlobalVariables(next);
                                    }}
                                    className="bg-zinc-900 border border-zinc-700/60 rounded px-2 py-0.5 text-[11px] text-zinc-300 outline-none cursor-pointer"
                                  >
                                    <option value="default">Default</option>
                                    <option value="secret">Secret</option>
                                  </select>
                                </td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type={isSecret && !isRevealed ? 'password' : 'text'}
                                      value={v.value}
                                      onChange={(e) => {
                                        const next = [...globalVariables];
                                        next[idx].value = e.target.value;
                                        setGlobalVariables(next);
                                      }}
                                      placeholder="Value"
                                      className="flex-1 bg-transparent outline-none text-zinc-100 placeholder:text-zinc-600"
                                    />
                                    {isSecret && (
                                      <button
                                        type="button"
                                        onClick={() => setRevealedSecrets({ ...revealedSecrets, [v.id]: !isRevealed })}
                                        className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                                      >
                                        {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setGlobalVariables(globalVariables.filter((_, i) => i !== idx));
                                    }}
                                    className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  /* Environment Variables Editor */
                  (() => {
                    const currentEnv = environments.find((e) => e.id === selectedEnvIdInModal);
                    if (!currentEnv) return null;
                    return (
                      <div className="flex-1 flex flex-col p-6 overflow-hidden">
                        {/* Environment Header */}
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                          <div className="flex-1 max-w-sm mr-4">
                            <input
                              type="text"
                              value={currentEnv.name}
                              onChange={(e) => handleUpdateCurrentEnv({ name: e.target.value })}
                              placeholder="Environment Name"
                              className="text-base font-semibold text-zinc-100 bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-brand-500 outline-none pb-0.5 w-full transition-colors font-sans"
                            />
                            <p className="text-xs text-zinc-500 mt-0.5">
                              Variables in this environment take precedence over global variables.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {activeEnvironmentId !== currentEnv.id && (
                              <button
                                type="button"
                                onClick={() => setActiveEnvironmentId(currentEnv.id)}
                                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-medium transition-colors cursor-pointer"
                              >
                                Set as Active
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const newVar: EnvironmentVariable = {
                                  id: 'var-' + Date.now(),
                                  key: '',
                                  value: '',
                                  enabled: true,
                                  type: 'default',
                                };
                                handleUpdateCurrentEnv({ variables: [...currentEnv.variables, newVar] });
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/50 hover:bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-colors cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Variable</span>
                            </button>
                          </div>
                        </div>

                        {/* Table */}
                        <div className="flex-1 border border-zinc-800 rounded-xl overflow-y-auto bg-[#18181b]/40">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                                <th className="py-2.5 px-3 w-10 text-center">Active</th>
                                <th className="py-2.5 px-3 w-1/3">Variable (Key)</th>
                                <th className="py-2.5 px-3 w-28">Type</th>
                                <th className="py-2.5 px-3">Value</th>
                                <th className="py-2.5 px-3 w-12 text-center"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60 font-mono text-xs text-zinc-200">
                              {currentEnv.variables.map((v, idx) => {
                                const isSecret = v.type === 'secret';
                                const isRevealed = revealedSecrets[v.id];
                                return (
                                  <tr key={v.id} className="hover:bg-zinc-850/40 transition-colors">
                                    <td className="py-2 px-3 text-center">
                                      <input
                                        type="checkbox"
                                        checked={v.enabled}
                                        onChange={(e) => {
                                          const next = [...currentEnv.variables];
                                          next[idx].enabled = e.target.checked;
                                          handleUpdateCurrentEnv({ variables: next });
                                        }}
                                        className="accent-brand-500 rounded cursor-pointer"
                                      />
                                    </td>
                                    <td className="py-2 px-3">
                                      <input
                                        type="text"
                                        value={v.key}
                                        onChange={(e) => {
                                          const next = [...currentEnv.variables];
                                          next[idx].key = e.target.value;
                                          handleUpdateCurrentEnv({ variables: next });
                                        }}
                                        placeholder="e.g. baseUrl"
                                        className="w-full bg-transparent outline-none text-zinc-100 placeholder:text-zinc-600 focus:text-brand-400"
                                      />
                                    </td>
                                    <td className="py-2 px-3">
                                      <select
                                        value={v.type || 'default'}
                                        onChange={(e) => {
                                          const next = [...currentEnv.variables];
                                          next[idx].type = e.target.value as EnvironmentVariableType;
                                          handleUpdateCurrentEnv({ variables: next });
                                        }}
                                        className="bg-zinc-900 border border-zinc-700/60 rounded px-2 py-0.5 text-[11px] text-zinc-300 outline-none cursor-pointer"
                                      >
                                        <option value="default">Default</option>
                                        <option value="secret">Secret</option>
                                      </select>
                                    </td>
                                    <td className="py-2 px-3">
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type={isSecret && !isRevealed ? 'password' : 'text'}
                                          value={v.value}
                                          onChange={(e) => {
                                            const next = [...currentEnv.variables];
                                            next[idx].value = e.target.value;
                                            handleUpdateCurrentEnv({ variables: next });
                                          }}
                                          placeholder="Value"
                                          className="flex-1 bg-transparent outline-none text-zinc-100 placeholder:text-zinc-600"
                                        />
                                        {isSecret && (
                                          <button
                                            type="button"
                                            onClick={() => setRevealedSecrets({ ...revealedSecrets, [v.id]: !isRevealed })}
                                            className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                                          >
                                            {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                    <td className="py-2 px-3 text-center">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          handleUpdateCurrentEnv({
                                            variables: currentEnv.variables.filter((_, i) => i !== idx),
                                          });
                                        }}
                                        className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* Built-in Dynamic Macros Cheat Sheet */}
                <div className="px-6 py-2.5 bg-[#121214] border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 flex-shrink-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-zinc-300 font-sans">Dynamic Macros:</span>
                    <code className="bg-zinc-850 px-1.5 py-0.5 rounded text-amber-300 font-mono text-[10px]">&#123;&#123;$randomUUID&#125;&#125;</code>
                    <code className="bg-zinc-850 px-1.5 py-0.5 rounded text-amber-300 font-mono text-[10px]">&#123;&#123;$timestamp&#125;&#125;</code>
                    <code className="bg-zinc-850 px-1.5 py-0.5 rounded text-amber-300 font-mono text-[10px]">&#123;&#123;$isoTimestamp&#125;&#125;</code>
                    <code className="bg-zinc-850 px-1.5 py-0.5 rounded text-amber-300 font-mono text-[10px]">&#123;&#123;$randomInt&#125;&#125;</code>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEnvModalOpen(false)}
                    className="px-4 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs shadow-sm transition-all cursor-pointer font-sans"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
