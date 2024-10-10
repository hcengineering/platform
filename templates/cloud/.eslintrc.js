module.exports = {
  extends: ['./node_modules/@hcengineering/platform-rig/profiles/node/eslint.config.json'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json'
  }
}
