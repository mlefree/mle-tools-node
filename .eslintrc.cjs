module.exports = {
    // Parser options
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
    },

    // Environment settings
    env: {
        node: true,
        es2020: true,
    },

    // Extend base configurations
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:prettier/recommended',
    ],

    // Plugin settings
    plugins: ['@typescript-eslint', 'prettier'],

    // Report unused eslint-disable comments
    reportUnusedDisableDirectives: true,

    // Default rules for all files
    rules: {
        // Base rules will be inherited from recommended configs
    },

    // Specific overrides based on file patterns
    overrides: [
        // TypeScript files
        {
            files: ['**/*.ts'],
            rules: {
                'no-console': 'off',
                '@typescript-eslint/no-explicit-any': 'warn',
                '@typescript-eslint/no-require-imports': 'off',
                '@typescript-eslint/no-unused-vars': 'off',
                'prefer-const': 'error',
                'no-var': 'error',
                'no-case-declarations': 'off',
                eqeqeq: ['error', 'always'],
                curly: ['error', 'all'],
                'prettier/prettier': 'warn',
            },
        },

        // JavaScript files
        {
            files: ['**/*.js'],
            rules: {
                '@typescript-eslint/no-var-requires': 'off',
                'no-console': 'off',
            },
        },

        // Test files
        {
            files: ['**/*.spec.ts'],
            rules: {
                'max-len': 'off',
                'no-console': 'off',
                '@typescript-eslint/no-explicit-any': 'off',
            },
        },
    ],

    // Ignoring specific patterns (replaces .eslintignore)
    ignorePatterns: [
        'node_modules/**',
        'dist/**',
        '.gen/**',
        'coverage/**',
        '.coverage/**',
        '.nyc_output/**',
        'specs/**',
        'scripts/**',
    ],
};
