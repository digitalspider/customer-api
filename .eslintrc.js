module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module',
  },
  extends: [
    'plugin:@typescript-eslint/recommended', // recommended rules from the @typescript-eslint/eslint-plugin
    'plugin:import/recommended',
    'plugin:prettier/recommended', // Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
    'import/ignore': ['@aws-sdk'],
  },
  rules: {
    quotes: ['error', 'single', { avoidEscape: true }],
    semi: 2,
    indent: [2, 2, { SwitchCase: 1 }],
    'comma-dangle': [2, 'always-multiline'],
    'no-extra-semi': 2,
    'no-else-return': 2,
    'space-unary-ops': 2,
    'comma-spacing': [2, { before: false, after: true }],
    'no-multi-spaces': 2,
    'no-multiple-empty-lines': [2, { max: 1 }],
    'no-trailing-spaces': 2,
    'array-bracket-spacing': [2, 'never'],
    'brace-style': [2, '1tbs'],
    'block-spacing': 2,
    'max-len': [
      2,
      {
        code: 120,
        tabWidth: 2,
        ignoreComments: true,
        ignoreTrailingComments: true,
        ignoreUrls: true,
        ignoreStrings: true,
        ignoreTemplateLiterals: true,
        ignoreRegExpLiterals: true,
      },
    ],
    'linebreak-style': [2, require('os').EOL === '\r\n' ? 'windows' : 'unix'], // eslint-disable-line
    'no-mixed-spaces-and-tabs': 2,
    'no-prototype-builtins': 2,
    'import/no-named-as-default-member': 2,
    'import/no-unresolved': 2,
    'import/no-duplicates': 2,
    // --- warnings ---
    'no-unused-vars': 1,
    'prettier/prettier': [
      'error',
      {
        endOfLine: 'auto',
      },
    ],
  },
};
