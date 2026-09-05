import React from 'react';
import { Globe, X, Plus } from 'lucide-react';
import { Environment, EnvironmentVariable } from '../types';
import { VariableTable } from './environments/VariableTable';
import { ScopeList } from './environments/ScopeList';

export interface EnvironmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  environments: Environment[];
  activeEnvironmentId: string | null;
  globalVariables: EnvironmentVariable[];
  selectedEnvIdInModal: string | 'globals';
  revealedSecrets: Record<string, boolean>;
  setSelectedEnvIdInModal: (id: string | 'globals') => void;
  setActiveEnvironmentId: (id: string | null) => void;
  setGlobalVariables: (vars: EnvironmentVariable[]) => void;
  handleCreateEnvironment: () => void;
  handleDuplicateEnvironment: (id: string) => void;
  handleDeleteEnvironment: (id: string) => void;
  handleUpdateCurrentEnv: (updated: Partial<Environment>) => void;
  toggleSecretReveal: (id: string) => void;
}

export const EnvironmentModal: React.FC<EnvironmentModalProps> = ({
  isOpen,
  onClose,
  environments,
  activeEnvironmentId,
  globalVariables,
  selectedEnvIdInModal,
  revealedSecrets,
  setSelectedEnvIdInModal,
  setActiveEnvironmentId,
  setGlobalVariables,
  handleCreateEnvironment,
  handleDuplicateEnvironment,
  handleDeleteEnvironment,
  handleUpdateCurrentEnv,
  toggleSecretReveal,
}) => {
  if (!isOpen) return null;

  const currentEnv = environments.find((e) => e.id === selectedEnvIdInModal);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-150 p-4">
      <div className="bg-white dark:bg-[#141416] border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-4xl h-[620px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-[#18181b]/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-zinc-100">Environments & Variables</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Configure scoped variables referenced via <code className="text-brand-400 font-mono bg-zinc-800/80 px-1 py-0.5 rounded text-[11px]">&#123;&#123;variableName&#125;&#125;</code>
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 flex overflow-hidden">
          <ScopeList
            environments={environments}
            activeEnvironmentId={activeEnvironmentId}
            selectedEnvIdInModal={selectedEnvIdInModal}
            globalVariablesCount={globalVariables.filter((v) => v.enabled).length}
            onSelectScope={setSelectedEnvIdInModal}
            onCreateEnvironment={handleCreateEnvironment}
            onDuplicateEnvironment={handleDuplicateEnvironment}
            onDeleteEnvironment={handleDeleteEnvironment}
          />

          <div className="flex-1 flex flex-col bg-white dark:bg-[#141416] overflow-hidden">
            {selectedEnvIdInModal === 'globals' ? (
              <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-200">Global Variables</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Variables available across all requests regardless of active environment.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGlobalVariables([...globalVariables, { id: 'gv-' + Date.now(), key: '', value: '', enabled: true, type: 'default' }])}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/50 hover:bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Variable</span>
                  </button>
                </div>
                <VariableTable
                  variables={globalVariables}
                  onChange={setGlobalVariables}
                  revealedSecrets={revealedSecrets}
                  onToggleSecret={toggleSecretReveal}
                  placeholderKey="e.g. appVersion"
                />
              </div>
            ) : currentEnv ? (
              <div className="flex-1 flex flex-col p-6 overflow-hidden">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <div className="flex-1 max-w-sm mr-4">
                    <input
                      type="text"
                      value={currentEnv.name}
                      onChange={(e) => handleUpdateCurrentEnv({ name: e.target.value })}
                      placeholder="Environment Name"
                      className="text-base font-semibold text-slate-900 dark:text-zinc-100 bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-brand-500 outline-none pb-0.5 w-full transition-colors font-sans"
                    />
                    <p className="text-xs text-zinc-500 mt-0.5">Variables in this environment override global variables.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeEnvironmentId !== currentEnv.id && (
                      <button
                        type="button"
                        onClick={() => setActiveEnvironmentId(currentEnv.id)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-750 text-slate-800 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-zinc-700 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Set as Active
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleUpdateCurrentEnv({ variables: [...currentEnv.variables, { id: 'var-' + Date.now(), key: '', value: '', enabled: true, type: 'default' }] })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/50 hover:bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-xs font-medium transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Variable</span>
                    </button>
                  </div>
                </div>
                <VariableTable
                  variables={currentEnv.variables}
                  onChange={(vars) => handleUpdateCurrentEnv({ variables: vars })}
                  revealedSecrets={revealedSecrets}
                  onToggleSecret={toggleSecretReveal}
                  placeholderKey="e.g. baseUrl"
                />
              </div>
            ) : null}

            {/* Dynamic Macros Footer */}
            <div className="px-6 py-2.5 bg-slate-50 dark:bg-[#121214] border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 flex-shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-700 dark:text-zinc-300 font-sans">Dynamic Macros:</span>
                <code className="bg-slate-200 dark:bg-zinc-850 px-1.5 py-0.5 rounded text-amber-500 dark:text-amber-300 font-mono text-[10px]">&#123;&#123;$randomUUID&#125;&#125;</code>
                <code className="bg-slate-200 dark:bg-zinc-850 px-1.5 py-0.5 rounded text-amber-500 dark:text-amber-300 font-mono text-[10px]">&#123;&#123;$timestamp&#125;&#125;</code>
                <code className="bg-slate-200 dark:bg-zinc-850 px-1.5 py-0.5 rounded text-amber-500 dark:text-amber-300 font-mono text-[10px]">&#123;&#123;$isoTimestamp&#125;&#125;</code>
                <code className="bg-slate-200 dark:bg-zinc-850 px-1.5 py-0.5 rounded text-amber-500 dark:text-amber-300 font-mono text-[10px]">&#123;&#123;$randomInt&#125;&#125;</code>
              </div>
              <button type="button" onClick={onClose} className="px-4 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs shadow-sm transition-all cursor-pointer font-sans">
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
