import js from '@eslint/js';

import globals from 'globals';

export default [
    {
        ignores: ['node_modules/**', 'dist/**'],
    },
    {
        files: ['background/**/*.js'],
        ignores: ['background/cache.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                ...globals.worker,
                ...globals.commonjs,
                chrome: 'readonly',
                rolimonsCache: 'writable',
            },
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-undef': 'off',
            'no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            'no-prototype-builtins': 'off',
            'no-empty': 'off',
            'no-async-promise-executor': 'off',
            'no-useless-catch': 'off',
            'no-constant-binary-expression': 'off',
            'no-self-assign': 'off',
        },
    },
    {
        files: ['**/*.js'],
        ignores: ['background/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                ...globals.worker,
                ...globals.commonjs,
                chrome: 'readonly',
            },
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-undef': 'off',
            'no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            'no-prototype-builtins': 'off',
            'no-empty': 'off',
            'no-async-promise-executor': 'off',
            'no-useless-catch': 'off',
            'no-constant-binary-expression': 'off',
            'no-self-assign': 'off',
        },
    },
    {
        files: ['scripts/**/*.mjs'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
        },
    },
];
