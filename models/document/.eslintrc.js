module.exports = {
  extends: ['./node_modules/@hcengineering/model-rig/profiles/default/config/eslint.config.json'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json'
  }
}
