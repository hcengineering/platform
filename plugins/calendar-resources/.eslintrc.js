module.exports = {
  extends: ['./node_modules/@hcengineering/platform-rig/profiles/ui/config/eslint.config.json'],
  parserOptions: { tsconfigRootDir: __dirname },
  settings: {
    'svelte3/ignore-styles': () => true
  }
}
