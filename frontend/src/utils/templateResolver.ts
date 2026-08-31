import { Environment, EnvironmentVariable, ResolvedVariableInfo } from '../types/environments';

// Generate standard UUID v4
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Built-in Dynamic Macros resolver
export function resolveDynamicMacro(macroName: string): string | null {
  const normalized = macroName.trim().toLowerCase();
  switch (normalized) {
    case '$randomuuid':
    case '$guid':
      return generateUUID();
    case '$timestamp':
      return String(Date.now());
    case '$isotimestamp':
      return new Date().toISOString();
    case '$randomint':
      return String(Math.floor(Math.random() * 1000) + 1);
    case '$randomalpha':
      return Math.random().toString(36).substring(2, 8);
    default:
      return null;
  }
}

// Get flattened Map of all available variables based on priority
export function getAvailableVariablesMap(
  activeEnv: Environment | null,
  globals?: EnvironmentVariable[]
): Map<string, ResolvedVariableInfo> {
  const map = new Map<string, ResolvedVariableInfo>();

  // 1. Global variables (lower priority)
  if (globals && Array.isArray(globals)) {
    for (const g of globals) {
      if (g && g.enabled && g.key && g.key.trim()) {
        map.set(g.key.trim(), {
          key: g.key.trim(),
          value: g.value || '',
          source: 'global',
          isSecret: g.type === 'secret',
        });
      }
    }
  }

  // 2. Active Environment variables (override globals)
  if (activeEnv && Array.isArray(activeEnv.variables)) {
    for (const v of activeEnv.variables) {
      if (v && v.enabled && v.key && v.key.trim()) {
        map.set(v.key.trim(), {
          key: v.key.trim(),
          value: v.value || '',
          source: 'environment',
          isSecret: v.type === 'secret',
        });
      }
    }
  }

  return map;
}

// Resolve {{variableName}} and {{$macro}} tokens in a string
export function resolveTemplate(
  text: string,
  activeEnv: Environment | null,
  globals?: EnvironmentVariable[]
): string {
  if (!text || typeof text !== 'string') return text ?? '';
  if (!text.includes('{{')) return text;

  const varsMap = getAvailableVariablesMap(activeEnv, globals);

  return text.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (match, rawKey) => {
    const key = rawKey.trim();

    // 1. Check exact key match in active env / globals
    if (varsMap.has(key)) {
      return varsMap.get(key)!.value;
    }

    // 2. Case-insensitive fallback match (e.g. baseUrl vs baseURL)
    const lowerKey = key.toLowerCase();
    for (const [k, v] of varsMap.entries()) {
      if (k.toLowerCase() === lowerKey) {
        return v.value;
      }
    }

    // 3. Check dynamic macros ($randomUUID, $timestamp, etc.)
    const macroVal = resolveDynamicMacro(key);
    if (macroVal !== null) {
      return macroVal;
    }

    // 4. If unresolved, retain raw template token
    return match;
  });
}

// Extract all {{variableName}} keys from text
export function extractVariablesFromTemplate(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(/\{\{\s*([^{}]+?)\s*\}\}/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((m) => m.replace(/[{}]/g, '').trim())));
}
