// Re-export useGlobalShortcuts for backward compatibility
export {
  useGlobalShortcuts as useKeyboardShortcuts,
  isTypingInInput,
} from './useGlobalShortcuts';
export type { GlobalShortcutsOptions as KeyboardShortcutsOptions } from './useGlobalShortcuts';
