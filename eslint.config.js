export default [
    {
        files: ['**/*.{js,ts}'],
        ignores: ['node_modules/**', 'build/**', 'dist/**', 'test-results/**', 'playwright-report/**'],
        languageOptions: {
            parser: await import('@typescript-eslint/parser'),
            ecmaVersion: 'latest',
            sourceType: 'module',
        },
        rules: {
            'no-unused-vars': 'warn',
            'no-console': 'off',
        },
    },
];
