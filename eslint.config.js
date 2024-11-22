import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import configPrettier from "eslint-config-prettier";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {files: ["**/*.ts"]},
  pluginJs.configs.recommended,
  prettierRecommended,
  configPrettier,
  ...tseslint.configs.recommended,
];

