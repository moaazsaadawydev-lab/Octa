import { useMemo } from 'react';
import { Environment, EnvironmentVariable } from '../../../types/environments';
import { getAvailableVariablesMap, resolveDynamicMacro } from '../../../utils/templateResolver';
import { VariableToken } from './types';

export function useUrlTokens(
  value: string,
  activeEnv: Environment | null,
  globalVariables?: EnvironmentVariable[]
): VariableToken[] {
  return useMemo(() => {
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
}
