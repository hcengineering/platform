module.exports = {
  extends: ['./node_modules/@hcengineering/platform-rig/profiles/default/eslint.config.json'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json'
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.ts', '**/*.spec.ts', '**/*.test.ts'],
      rules: {
        '@typescript-eslint/no-non-null-assertion': 'off'
      }
    }
  ]
}
