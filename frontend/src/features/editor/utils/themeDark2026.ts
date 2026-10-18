import type { Monaco } from '@monaco-editor/react';

export const THEME_DARK_2026 = 'octa-dark-2026';

const TS_CONTROL_KEYWORDS = [
  'import', 'from', 'as', 'export', 'default', 'return',
  'if', 'else', 'switch', 'case', 'break', 'continue', 'default',
  'while', 'for', 'in', 'of', 'do',
  'try', 'catch', 'finally', 'throw',
  'await', 'yield',
];

const TS_STORAGE_KEYWORDS = [
  'const', 'let', 'var', 'function', 'class', 'interface', 'type', 'enum',
  'extends', 'implements', 'new', 'this', 'super',
];

const TS_MODIFIERS = [
  'public', 'private', 'protected', 'readonly', 'static', 'abstract', 'override',
];

const TS_BUILTIN_TYPES = [
  'any', 'void', 'number', 'string', 'boolean', 'symbol', 'never', 'unknown', 'object', 'undefined', 'null',
];

export function defineDark2026Theme(monaco: Monaco) {
  // 1. Define the Dark 2026 Theme
  monaco.editor.defineTheme(THEME_DARK_2026, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'E6EDF3', background: '111216' },
      { token: 'comment', foreground: '6A737D', fontStyle: 'italic' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'string.escape', foreground: 'D7BA7D' },
      { token: 'number', foreground: 'B5CEA8' },
      // Control flow & imports (Purple / Magenta)
      { token: 'keyword.control', foreground: 'C586C0' },
      { token: 'keyword.async', foreground: '4FC1FF' },
      // Storage declarations (Coral / Red)
      { token: 'storage.type', foreground: 'FF7B72' },
      { token: 'storage.modifier', foreground: 'FF7B72' },
      // Types, Classes, Interfaces (Mint / Bright Aqua Green)
      { token: 'type.identifier', foreground: '4EC9B0' },
      { token: 'type.keyword', foreground: '4EC9B0' },
      // Functions & Methods (Warm Yellow)
      { token: 'entity.name.function', foreground: 'DCDCAA' },
      { token: 'annotation', foreground: 'FFE585' },
      // Identifiers & Variables (Light Cyan / Blue)
      { token: 'variable.name', foreground: '9CDCFE' },
      { token: 'identifier', foreground: '9CDCFE' },
      { token: 'variable.parameter', foreground: '9CDCFE' },
      // Operators & Delimiters
      { token: 'operator', foreground: '79C0FF' },
      { token: 'delimiter', foreground: 'D4D4D4' },
      { token: 'delimiter.bracket', foreground: 'FFD700' },
    ],
    colors: {
      'editor.background': '#111216',
      'editor.foreground': '#E6EDF3',
      'editor.lineHighlightBackground': '#181A22',
      'editor.lineHighlightBorder': '#222530',
      'editorCursor.foreground': '#58A6FF',
      'editorLineNumber.foreground': '#4E5565',
      'editorLineNumber.activeForeground': '#F0F6FC',
      'editor.selectionBackground': '#264F78',
      'editor.inactiveSelectionBackground': '#1F344B',
      'editorIndentGuide.background': '#1E222B',
      'editorIndentGuide.activeBackground': '#383F4D',
      'editorGutter.background': '#111216',
      'diffEditor.insertedTextBackground': '#23863626',
      'diffEditor.removedTextBackground': '#da363326',
    },
  });

  // 2. Enhance TypeScript and JavaScript Monarch Lexer for Dark 2026
  ['typescript', 'javascript'].forEach((lang) => {
    try {
      monaco.languages.setMonarchTokensProvider(lang, {
        defaultToken: '',
        tokenPostfix: `.${lang}`,
        controlKeywords: TS_CONTROL_KEYWORDS,
        storageKeywords: TS_STORAGE_KEYWORDS,
        modifiers: TS_MODIFIERS,
        builtinTypes: TS_BUILTIN_TYPES,
        tokenizer: {
          root: [
            // Comments
            [/\/\/.*$/, 'comment'],
            [/\/\*/, 'comment', '@comment'],

            // Strings
            [/"([^"\\]|\\.)*$/, 'string.invalid'],
            [/'([^'\\]|\\.)*$/, 'string.invalid'],
            [/"/, 'string', '@string_double'],
            [/'/, 'string', '@string_single'],
            [/`/, 'string', '@string_backtick'],

            // Decorators (@Controller, @Inject, etc.)
            [/@[a-zA-Z_$][\w$]*/, 'annotation'],

            // Numbers
            [/\b\d+(\.\d+)?([eE][+-]?\d+)?\b/, 'number'],
            [/\b0[xX][0-9a-fA-F]+\b/, 'number'],

            // Operators
            [/=>/, 'operator'],
            [/===|!==|==|!=|<=|>=|<|>|\+|\-|\*|\/|%|\&\&|\|\||!|\?|:|\=/, 'operator'],

            // Delimiters
            [/[{}()\[\]]/, 'delimiter.bracket'],
            [/[;,.]/, 'delimiter'],

            // Special async
            [/\basync\b/, 'keyword.async'],

            // Identifiers / Keywords matching
            [
              /[a-zA-Z_$][\w$]*/,
              {
                cases: {
                  '@controlKeywords': 'keyword.control',
                  '@storageKeywords': 'storage.type',
                  '@modifiers': 'storage.modifier',
                  '@builtinTypes': 'type.keyword',
                  // PascalCase Identifiers -> Classes / Types / Interfaces
                  '^[A-Z][a-zA-Z0-9_$]*$': 'type.identifier',
                  '@default': 'variable.name',
                },
              },
            ],

            // Function calls: foo(...)
            [/([a-zA-Z_$][\w$]*)(?=\s*\()/, 'entity.name.function'],
          ],

          comment: [
            [/[^\/*]+/, 'comment'],
            [/\*\//, 'comment', '@pop'],
            [/[\/*]/, 'comment'],
          ],

          string_double: [
            [/[^\\"]+/, 'string'],
            [/\\./, 'string.escape'],
            [/"/, 'string', '@pop'],
          ],

          string_single: [
            [/[^\\']+/, 'string'],
            [/\\./, 'string.escape'],
            [/'/, 'string', '@pop'],
          ],

          string_backtick: [
            [/\$\{/, { token: 'delimiter.bracket', next: '@bracketCounting' }],
            [/[^\\`$]+/, 'string'],
            [/\\./, 'string.escape'],
            [/`/, 'string', '@pop'],
          ],

          bracketCounting: [
            [/\{/, 'delimiter.bracket', '@push'],
            [/\}/, 'delimiter.bracket', '@pop'],
            { include: 'root' },
          ],
        },
      });
    } catch (e) {
      console.warn(`[themeDark2026] Could not override monarch for ${lang}:`, e);
    }
  });

  // 3. Disable false diagnostics & red squiggles (lightweight reviewer without node_modules/LSP)
  try {
    const ts = (monaco.languages as any)?.typescript;
    if (ts) {
      ts.typescriptDefaults?.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: true,
        noSuggestionDiagnostics: true,
      });
      ts.javascriptDefaults?.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: true,
        noSuggestionDiagnostics: true,
      });
      ts.typescriptDefaults?.setCompilerOptions({
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        allowNonTsExtensions: true,
        allowJs: true,
      });
    }
  } catch (e) {
    console.warn('[themeDark2026] Could not disable diagnostics:', e);
  }
}
