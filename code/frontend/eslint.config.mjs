import eslintPluginBoundaries from "eslint-plugin-boundaries";
import unusedImports from "eslint-plugin-unused-imports";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";

export default [
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: {
      "react": reactPlugin,
      "react-hooks": reactHooksPlugin,
      "boundaries": eslintPluginBoundaries,
      "unused-imports": unusedImports,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      "react": {
        version: "detect",
      },
      "boundaries/elements": [
        { "type": "schemas", "pattern": "src/schemas/*" },
        { "type": "services", "pattern": "src/services/*" },
        { "type": "utils", "pattern": "src/utils/*" },
        { "type": "constants", "pattern": "src/constants/*" },
        { "type": "components", "pattern": "src/components/*" },
        { "type": "pages", "pattern": "src/pages/*" },
      ]
    },
    rules: {
      "no-unused-vars": "warn",
      "unused-imports/no-unused-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "boundaries/element-types": [
        "error",
        {
          "default": "allow",
          "rules": [
            {
              "from": ["schemas", "utils", "constants"],
              "disallow": ["components", "pages", "services"]
            }
          ]
        }
      ]
    }
  }
];
