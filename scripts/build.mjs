#!/usr/bin/env node
// Builds the deployable site into dist/: the static files the page loads, nothing else.
// There is no bundling or transpiling; the site runs as-is from plain ES modules.
// Left out: tests, scripts, docs, and the translation editor (it can only save through the dev server).
// Usage: npm run build
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "dist");

const INCLUDE = ["index.html", "LICENSE", "assets", "data", "locales", "src"];
const EXCLUDE = new Set(["src/i18n/editor", "src/styles/editor.css"]);
const skip = rel => EXCLUDE.has(rel) || rel.endsWith(".md");

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
let files = 0;
for (const entry of INCLUDE) {
  fs.cpSync(path.join(root, entry), path.join(out, entry), {
    recursive: true,
    filter: src => {
      const rel = path.relative(root, src).split(path.sep).join("/");
      if (skip(rel)) return false;
      if (fs.statSync(src).isFile()) files++;
      return true;
    }
  });
}
// GitHub Pages runs Jekyll by default, which can drop files; this serves the folder as-is.
fs.writeFileSync(path.join(out, ".nojekyll"), "");
console.log(`✓ built ${files} files into dist/`);
