import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  {
    ignores: ["dist", ".eslintrc.cjs", "vite.config.d.ts"],
  },

  js.configs.recommended,

  {
    files: ["**/*.{ts,tsx}"],

    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.node.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },

    plugins: {
      "@typescript-eslint": tsPlugin,
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },

    settings: {
      react: {
        version: "detect",
      },
    },

    rules: {
      ...tsPlugin.configs.recommended.rules,

      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],

      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      "@typescript-eslint/no-explicit-any": "off", // Turn off for React components/forms/event handlers

      "react/prop-types": "off",
    },
  },

  prettier,
];