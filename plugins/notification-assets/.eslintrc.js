module.exports = {
  extends: ['./node_modules/@anticrm/platform-rig/profiles/assets/config/eslint.config.json'],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: './tsconfig.json'
  }
}
