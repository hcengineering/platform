module.exports = {
  extends: ['./node_modules/@hcengineering/platform-rig/profiles/assets/eslint.config.json'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json'
  }
}
