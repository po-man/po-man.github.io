import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://po-man.github.io",
  trailingSlash: "always",
  build: {
    format: "directory",
    inlineStylesheets: "auto"
  },
  compressHTML: true
});