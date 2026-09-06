import { useState, useRef, useEffect, useMemo } from 'react';
import { Environment, EnvironmentVariable } from '../types';
import { getAvailableVariablesMap } from '../../../utils/templateResolver';

export interface UseEnvironmentsOptions {
  initialEnvironments?: Environment[];
  initialActiveEnvironmentId?: string | null;
  initialGlobalVariables?: EnvironmentVariable[];
  onDataChange?: (data: {
    environments: Environment[];
    globalVariables: EnvironmentVariable[];
    activeEnvironmentId: string | null;
  }) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export function useEnvironments({
  initialEnvironments = [],
  initialActiveEnvironmentId = null,
  initialGlobalVariables = [],
  onDataChange,
  showToast,
}: UseEnvironmentsOptions) {
  const [environments, setEnvironments] = useState<Environment[]>(initialEnvironments);
  const [activeEnvironmentId, setActiveEnvironmentId] = useState<string | null>(initialActiveEnvironmentId);
  const [globalVariables, setGlobalVariables] = useState<EnvironmentVariable[]>(initialGlobalVariables);
  const [isEnvModalOpen, setIsEnvModalOpen] = useState(false);
  const [selectedEnvIdInModal, setSelectedEnvIdInModal] = useState<string | 'globals'>('env-localhost');
  const [isEnvDropdownOpen, setIsEnvDropdownOpen] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});

  const activeEnvironment = useMemo(
    () => environments.find((e) => e.id === activeEnvironmentId) || null,
    [environments, activeEnvironmentId]
  );

  const availableVariablesMap = useMemo(
    () => getAvailableVariablesMap(activeEnvironment, globalVariables),
    [activeEnvironment, globalVariables]
  );

  const handleCreateEnvironment = () => {
    const newId = 'env-' + Date.now();
    const newEnv: Environment = {
      id: newId,
      name: 'New Environment',
      variables: [{ id: 'var-' + Date.now(), key: '', value: '', enabled: true, type: 'default' }],
    };
    const updated = [...environments, newEnv];
    setEnvironments(updated);
    setSelectedEnvIdInModal(newId);
    showToast('Created new environment', 'success');
    onDataChange?.({ environments: updated, globalVariables, activeEnvironmentId });
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
    const updated = [...environments, duplicated];
    setEnvironments(updated);
    setSelectedEnvIdInModal(newId);
    showToast('Duplicated environment', 'info');
    onDataChange?.({ environments: updated, globalVariables, activeEnvironmentId });
  };

  const handleDeleteEnvironment = (id: string) => {
    if (environments.length <= 1) {
      showToast('Cannot delete the only environment', 'error');
      return;
    }
    const filtered = environments.filter((e) => e.id !== id);
    const nextActive = activeEnvironmentId === id ? filtered[0]?.id || null : activeEnvironmentId;
    setEnvironments(filtered);
    setActiveEnvironmentId(nextActive);
    if (selectedEnvIdInModal === id) {
      setSelectedEnvIdInModal(filtered[0]?.id || 'globals');
    }
    showToast('Deleted environment', 'info');
    onDataChange?.({ environments: filtered, globalVariables, activeEnvironmentId: nextActive });
  };

  const handleUpdateCurrentEnv = (updated: Partial<Environment>) => {
    if (selectedEnvIdInModal === 'globals') return;
    setEnvironments((prev) => {
      const nextEnvs = prev.map((e) => (e.id === selectedEnvIdInModal ? { ...e, ...updated } : e));
      onDataChange?.({ environments: nextEnvs, globalVariables, activeEnvironmentId });
      return nextEnvs;
    });
  };

  const handleOpenManageEnvironments = (scopeId?: string) => {
    if (scopeId) {
      setSelectedEnvIdInModal(scopeId);
    }
    setIsEnvModalOpen(true);
  };

  const handleUpdateVariableFromInput = (key: string, newValue: string, source?: 'environment' | 'global') => {
    if (source === 'global') {
      setGlobalVariables((prev) => {
        const existing = prev.find((v) => v.key.trim().toLowerCase() === key.trim().toLowerCase());
        const nextGlobals = existing
          ? prev.map((v) => (v.key.trim().toLowerCase() === key.trim().toLowerCase() ? { ...v, value: newValue } : v))
          : [...prev, { id: 'gv-' + Date.now(), key, value: newValue, enabled: true, type: 'default' as const }];
        onDataChange?.({ environments, globalVariables: nextGlobals, activeEnvironmentId });
        return nextGlobals;
      });
    } else {
      if (!activeEnvironment) {
        handleUpdateVariableFromInput(key, newValue, 'global');
        return;
      }
      setEnvironments((prev) => {
        const updatedEnvs = prev.map((e) => {
          if (e.id !== activeEnvironment.id) return e;
          const currentVars = [...e.variables];
          const existingIdx = currentVars.findIndex((v) => v.key.trim().toLowerCase() === key.trim().toLowerCase());
          if (existingIdx !== -1) {
            currentVars[existingIdx] = { ...currentVars[existingIdx], value: newValue };
          } else {
            currentVars.push({ id: 'var-' + Date.now(), key, value: newValue, enabled: true, type: 'default' });
          }
          return { ...e, variables: currentVars };
        });
        onDataChange?.({ environments: updatedEnvs, globalVariables, activeEnvironmentId });
        return updatedEnvs;
      });
    }
  };

  return {
    environments,
    setEnvironments,
    activeEnvironmentId,
    setActiveEnvironmentId,
    globalVariables,
    setGlobalVariables,
    isEnvModalOpen,
    setIsEnvModalOpen,
    selectedEnvIdInModal,
    setSelectedEnvIdInModal,
    isEnvDropdownOpen,
    setIsEnvDropdownOpen,
    revealedSecrets,
    setRevealedSecrets,
    activeEnvironment,
    availableVariablesMap,
    handleCreateEnvironment,
    handleDuplicateEnvironment,
    handleDeleteEnvironment,
    handleUpdateCurrentEnv,
    handleOpenManageEnvironments,
    handleUpdateVariableFromInput,
  };
}
