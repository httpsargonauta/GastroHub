import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  ...compat.config({
    extends: ['next'],
    rules: {
      'react/no-unescaped-entities': 'off',
      '@next/next/no-page-custom-font': 'off',
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "prefer-const": "warn",
      "no-unused-vars": "warn",
      "no-undef": "warn",
      "no-console": "warn",
      "no-debugger": "warn",
      "no-alert": "warn",
      "no-duplicate-imports": "warn",
      "no-duplicate-case": "warn",
      "no-empty": "warn",
      "no-extra-boolean-cast": "warn",     
    },
  })
];

export default eslintConfig;
