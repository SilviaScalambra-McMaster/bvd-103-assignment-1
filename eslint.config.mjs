import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    ignores: [
      "node_modules/",
      "dist/",
      "build/",
      "playgrounds/",
      "adapter/assignment-1.ts",
      "adapter/assignment-4.ts",
    ],
  },
);
