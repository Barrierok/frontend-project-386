import sonarjs from "eslint-plugin-sonarjs";
import testingLibrary from "eslint-plugin-testing-library";
import { defineConfig } from "oxlint";

type ESLintRuleConfig = "off" | "warn" | "error" | [string, ...unknown[]];
type ESLintRules = Record<string, ESLintRuleConfig>;

function hasRules(config: unknown): config is { rules: ESLintRules } {
  return typeof config === "object" && config !== null && "rules" in config;
}

const sonarRecommended = sonarjs.configs?.recommended;
const sonarRecommendedRules = hasRules(sonarRecommended) ? sonarRecommended.rules : {};

const testingLibraryRecommended = testingLibrary.configs["flat/react"];
const testingLibraryRecommendedRules = hasRules(testingLibraryRecommended)
  ? testingLibraryRecommended.rules
  : {};

export default defineConfig({
  plugins: [
    "eslint",
    "typescript",
    "unicorn",
    "oxc",
    "import",
    "react",
    "react-perf",
    "nextjs",
    "jsx-a11y",
    "promise",
    "node",
    "vitest",
  ],
  jsPlugins: ["eslint-plugin-sonarjs", "eslint-plugin-testing-library"],
  categories: {
    correctness: "error",
    suspicious: "warn",
    pedantic: "off",
    perf: "off",
    style: "off",
    restriction: "off",
    nursery: "off",
  },
  env: {
    browser: true,
    node: true,
    es2024: true,
  },
  rules: {
    ...sonarRecommendedRules,

    // Дублируют встроенные правила oxlint
    "sonarjs/no-unused-vars": "off",
    "sonarjs/unused-import": "off",

    // Слишком шумно для React-кода
    "sonarjs/no-nested-functions": "off",
    "sonarjs/no-nested-conditional": "warn",
    "sonarjs/cognitive-complexity": "warn",
    "sonarjs/no-identical-functions": "warn",

    // Базовые правила
    "eslint/no-console": ["warn", { allow: ["warn", "error"] }],
    "eslint/eqeqeq": ["error", "smart"],
    "eslint/no-var": "error",
    "eslint/prefer-const": "error",
    "eslint/no-debugger": "error",

    // TypeScript
    "typescript/consistent-type-imports": [
      "error",
      { prefer: "type-imports", fixStyle: "separate-type-imports" },
    ],
    "typescript/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "typescript/no-explicit-any": "warn",

    // React / Next.js
    "react/react-in-jsx-scope": "off",
    "react/self-closing-comp": "error",
    "react/jsx-boolean-value": ["error", "never"],

    // Импорты (порядок сортирует oxfmt)
    "import/no-duplicates": "error",
    "import/no-self-import": "error",
    "import/no-cycle": "warn",
    "import/no-unassigned-import": "off",
  },
  overrides: [
    {
      files: [
        "**/*.test.{js,jsx,ts,tsx}",
        "**/*.spec.{js,jsx,ts,tsx}",
        "**/__tests__/**/*.{js,jsx,ts,tsx}",
      ],
      env: { vitest: true },
      rules: {
        ...testingLibraryRecommendedRules,

        // RTL не включает автоочистку при выключенных глобалах Vitest
        "testing-library/no-manual-cleanup": "off",

        // В тестах дублирование допустимо
        "sonarjs/no-identical-functions": "off",
        "sonarjs/no-duplicate-string": "off",

        "eslint/no-console": "off",
      },
    },
  ],
  ignorePatterns: [
    "**/.next/**",
    "**/coverage/**",
    "**/dist/**",
    "**/build/**",
    "next-env.d.ts",
    "**/.agents/**",
  ],
});
