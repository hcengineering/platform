import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import configPrettier from "eslint-config-prettier";

/** @type {import('eslint').Linter.Config[]} */
export default [
  pluginJs.configs.recommended,
  prettierRecommended,
  configPrettier,
  ...tseslint.configs.recommended,
  {files: ["**/*.ts"], rules: {"@typescript-eslint/no-explicit-any": "off", '@typescript-eslint/no-empty-object-type': 'off'}},
];

