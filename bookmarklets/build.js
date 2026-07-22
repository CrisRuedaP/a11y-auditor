#!/usr/bin/env node
/**
 * Build script para A11Y Auditor.
 *
 * Los analizadores en src/ están escritos como módulos ES (import/export)
 * porque es la forma más legible de mantenerlos por separado. Un
 * bookmarklet, en cambio, tiene que ser un único script clásico (sin
 * import/export) empaquetado como `javascript:...`.
 *
 * Este script:
 *   1. Lee las clases de src/core y src/analyzers.
 *   2. Quita las líneas `import` / `export default` (son siempre líneas
 *      completas al inicio de archivo, así que quitarlas es seguro).
 *   3. Concatena todo dentro de un único IIFE junto con la lógica de
 *      orquestación de cada bookmarklet.
 *   4. Escribe el resultado legible en dist/ y genera bookmarklets.data.js,
 *      que la página de instalación (page/index.html) usa para construir
 *      los enlaces `javascript:` reales.
 *
 * Uso: node build.js  (o `npm run build`)
 * No requiere dependencias de npm.
 */

const fs = require("fs");
const path = require("path");

const SRC = path.join(__dirname, "src");
const DIST = path.join(__dirname, "dist");
const PAGE = path.join(__dirname, "page");

function readSrc(relativePath) {
  return fs.readFileSync(path.join(SRC, relativePath), "utf8");
}

/** Quita `import ... ;` y `export default X;` — siempre líneas completas en estos archivos. */
function stripModuleSyntax(source) {
  return source
    .replace(/^\s*import .*;\s*$/gm, "")
    .replace(/^\s*export default \w+;\s*$/gm, "");
}

function wrapIife(body) {
  return `(function () {\n"use strict";\n${body}\n})();`;
}

function toBookmarkletHref(code) {
  return "javascript:" + encodeURIComponent(code);
}

// --- Bookmarklet principal: todas las clases + el menú de main.js ---
const CORE_FILES = ["core/analyzer.js", "core/ui.js"];
const ANALYZER_FILES = [
  "analyzers/headings.js",
  "analyzers/axeCore.js",
  "analyzers/images.js",
  "analyzers/contrast.js",
  "analyzers/aria.js",
  "analyzers/forms.js",
  "analyzers/semantic.js",
  "analyzers/keyboard.js",
  "analyzers/links.js",
];
const REST_FILES = ["core/auditor.js", "utils/json.js"];

function buildMainBundle() {
  const parts = [...CORE_FILES, ...ANALYZER_FILES, ...REST_FILES].map(
    (file) => stripModuleSyntax(readSrc(file)).trim(),
  );

  const mainLogic = readSrc("bookmarklets/main.js").trim();
  parts.push(mainLogic);

  return wrapIife(parts.join("\n\n"));
}

// --- Bookmarklets individuales: ya son IIFEs autocontenidos ---
const INDIVIDUAL_BOOKMARKLETS = {
  headings: "bookmarklets/individual/headings.js",
  axe: "bookmarklets/individual/axe.js",
  images: "bookmarklets/individual/images.js",
  contrast: "bookmarklets/individual/contrast.js",
};

function buildIndividualBundle(relativePath) {
  return readSrc(relativePath).trim();
}

function main() {
  fs.mkdirSync(DIST, { recursive: true });

  const bookmarklets = {};

  const mainCode = buildMainBundle();
  fs.writeFileSync(path.join(DIST, "main.bookmarklet.js"), mainCode);
  bookmarklets.main = {
    name: "A11Y Auditor Principal",
    href: toBookmarkletHref(mainCode),
  };

  for (const [key, relativePath] of Object.entries(INDIVIDUAL_BOOKMARKLETS)) {
    const code = buildIndividualBundle(relativePath);
    fs.writeFileSync(path.join(DIST, `${key}.bookmarklet.js`), code);
    bookmarklets[key] = {
      name: key,
      href: toBookmarkletHref(code),
    };
  }

  const dataFile = `// Generado automáticamente por build.js — no editar a mano.
// Para regenerar: npm run build
window.A11Y_BOOKMARKLETS = ${JSON.stringify(bookmarklets, null, 2)};
`;
  fs.writeFileSync(path.join(PAGE, "bookmarklets.data.js"), dataFile);

  console.log("✓ Bookmarklets generados en bookmarklets/dist/");
  console.log("✓ bookmarklets/page/bookmarklets.data.js actualizado");
  for (const [key, { href }] of Object.entries(bookmarklets)) {
    console.log(`  - ${key}: ${(href.length / 1024).toFixed(1)} KB`);
  }
}

main();
