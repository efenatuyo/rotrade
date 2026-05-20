import js from '@eslint/js';

import globals from 'globals';

export default [
    {
        ignores: ['node_modules/**', 'dist/**', '3.5.8_0/**'],
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
                    caughtErrors: 'none',
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
        files: ['background/handlers/**/*.js'],
        rules: {
            'no-unused-vars': [
                'warn',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^(_|handle[A-Z])',
                    caughtErrors: 'none',
                },
            ],
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
                    caughtErrors: 'none',
                },
            ],
            'no-prototype-builtins': 'off',
            'no-empty': 'off',
            'no-async-promise-executor': 'off',
            'no-useless-catch': 'off',
            'no-constant-binary-expression': 'off',
            'no-self-assign': 'off',
            'no-restricted-syntax': [
                'warn',
                {
                    selector: "CallExpression[callee.name='setInterval']",
                    message:
                        'Use window.Scheduler.everyVisible(name, ms, fn) so this poll pauses when the tab is hidden and shares one timer per cadence. If you genuinely need a raw setInterval (e.g. inside Scheduler itself, a Scheduler-unavailable fallback, or a content script in a different world), add an eslint-disable-next-line comment.',
                },
            ],
        },
    },
    {
        files: [
            'core/scheduler.js',
            'trading/status/cleanup.js',
            'trading/status/monitoring.js',
            'content/account-change-detector.js',
            'content/rolimons-trade-ad-create.js',
        ],
        rules: {
            'no-restricted-syntax': 'off',
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
