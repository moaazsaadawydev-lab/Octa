export function getMonarchTokensProvider(allKeywords: string[], optionsKeywords: string[]) {
  return {
    defaultToken: 'invalid',
    ignoreCase: true,
    tokenPostfix: '.redis',

    keywords: allKeywords,
    options: optionsKeywords,

    typeKeywords: ['string', 'hash', 'list', 'set', 'zset', 'stream', 'json'],

    operators: ['+', '-', '*', '/', '%', '=', '<', '>', '<=', '>=', '==', '!='],

    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

    tokenizer: {
      root: [
        // Identifiers and keywords
        [
          /[a-zA-Z_\\$][\w\\$\\.]*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@options': 'type',
              '@typeKeywords': 'type.identifier',
              '@default': 'identifier',
            },
          },
        ],

        // Whitespace
        { include: '@whitespace' },

        // Delimiters and operators
        [/[{}()\[\]]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [
          /@symbols/,
          {
            cases: {
              '@operators': 'operator',
              '@default': '',
            },
          },
        ],

        // Numbers
        [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/0[xX][0-9a-fA-F]+/, 'number.hex'],
        [/\d+/, 'number'],

        // Delimiter
        [/[;,.]/, 'delimiter'],

        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/'([^'\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string_double'],
        [/'/, 'string', '@string_single'],
      ],

      whitespace: [
        [/[ \t\r\n]+/, 'white'],
        [/(#|\/\/).*$/, 'comment'],
      ],

      string_double: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop'],
      ],

      string_single: [
        [/[^\\']+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/'/, 'string', '@pop'],
      ],
    },
  };
}
