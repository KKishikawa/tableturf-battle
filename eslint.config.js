import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

/** @type {readonly import('eslint').Linter.Config[]} */
const config = [
  js.configs.recommended,
  {
    ignores: [
      '**/.DS_Store',
      '**/node_modules/*',
      '**/dist',
      '**/package',
      '.env',
      '.env.*',
      '!.env.example',
      'package-lock.json',
    ],
  },
  {
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 5,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
];

export default config;
