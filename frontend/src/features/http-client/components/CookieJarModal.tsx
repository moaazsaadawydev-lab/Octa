import React, { useState, useEffect } from 'react';
import { Cookie as CookieIcon, X } from 'lucide-react';
import { StoredCookie } from '../types';
import { CookieListPane } from './cookies/CookieListPane';
import { CookieEditorPane } from './cookies/CookieEditorPane';

export interface CookieJarModalProps {
  isOpen: boolean;
  onClose: () => void;
  cookieJar: StoredCookie[];
  saveCookieJar: (jar: StoredCookie[]) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  activeUrl?: string;
}

function extractDomain(url?: string): string {
  if (!url) return 'localhost';
  try {
    const parsed = new URL(url.startsWith('http') ? url : `http://${url}`);
    return parsed.hostname || 'localhost';
  } catch {
    return 'localhost';
  }
}

export const CookieJarModal: React.FC<CookieJarModalProps> = ({
  isOpen,
  onClose,
  cookieJar,
  saveCookieJar,
  showToast,
  activeUrl,
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newCookieDraft, setNewCookieDraft] = useState<StoredCookie | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Automatically select the first cookie when modal opens if available
  useEffect(() => {
    if (isOpen) {
      if (cookieJar.length > 0 && selectedIndex === null && !isCreatingNew) {
        setSelectedIndex(0);
      } else if (cookieJar.length === 0) {
        setSelectedIndex(null);
        setIsCreatingNew(false);
      }
    }
  }, [isOpen, cookieJar.length]);

  if (!isOpen) return null;

  const handleStartAddCookie = () => {
    const draft: StoredCookie = {
      name: '',
      value: '',
      domain: extractDomain(activeUrl),
      path: '/',
      httpOnly: false,
      secure: false,
    };
    setNewCookieDraft(draft);
    setIsCreatingNew(true);
    setSelectedIndex(null);
  };

  const handleSaveCookie = (updated: StoredCookie) => {
    if (isCreatingNew) {
      const nextJar = [...cookieJar, updated];
      saveCookieJar(nextJar);
      setIsCreatingNew(false);
      setNewCookieDraft(null);
      setSelectedIndex(nextJar.length - 1);
      showToast(`Cookie "${updated.name}" added to jar`, 'success');
    } else if (selectedIndex !== null && selectedIndex >= 0 && selectedIndex < cookieJar.length) {
      const nextJar = [...cookieJar];
      nextJar[selectedIndex] = updated;
      saveCookieJar(nextJar);
      showToast(`Cookie "${updated.name}" updated`, 'success');
    }
  };

  const handleDeleteCookie = (index: number) => {
    const deletedName = cookieJar[index]?.name;
    const nextJar = cookieJar.filter((_, i) => i !== index);
    saveCookieJar(nextJar);
    showToast(`Deleted cookie "${deletedName || 'Unnamed'}"`, 'info');

    if (selectedIndex === index) {
      if (nextJar.length > 0) {
        setSelectedIndex(Math.max(0, index - 1));
      } else {
        setSelectedIndex(null);
      }
    } else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleClearAll = () => {
    saveCookieJar([]);
    setSelectedIndex(null);
    setIsCreatingNew(false);
    setNewCookieDraft(null);
    showToast('All cookies cleared from jar', 'info');
  };

  const activeCookie = isCreatingNew
    ? newCookieDraft
    : selectedIndex !== null && selectedIndex >= 0 && selectedIndex < cookieJar.length
    ? cookieJar[selectedIndex]
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 p-4">
      <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-zinc-800/80 rounded-2xl w-full max-w-5xl h-[660px] max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-[#0f141c] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500">
              <CookieIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">
                  Cookie Jar & Tokens
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400">
                  {cookieJar.length} stored
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Inspect, modify, and manage session cookies and large authentication tokens sent with requests.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Two-Pane Master/Detail Workspace */}
        <div className="flex-1 flex overflow-hidden">
          <CookieListPane
            cookies={cookieJar}
            selectedIndex={isCreatingNew ? -1 : selectedIndex}
            onSelectCookie={(idx) => {
              setIsCreatingNew(false);
              setNewCookieDraft(null);
              setSelectedIndex(idx);
            }}
            onAddCookie={handleStartAddCookie}
            onDeleteCookie={handleDeleteCookie}
            onClearAll={handleClearAll}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          <CookieEditorPane
            cookie={activeCookie}
            isNew={isCreatingNew}
            onSave={handleSaveCookie}
            onDelete={() => {
              if (selectedIndex !== null) handleDeleteCookie(selectedIndex);
            }}
            onCreateNew={handleStartAddCookie}
            showToast={showToast}
          />
        </div>
      </div>
    </div>
  );
};
