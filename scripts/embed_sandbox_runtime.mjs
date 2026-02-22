import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const siteDir = path.join(rootDir, "site");

const sanitizerEntryPath = path.join(
  rootDir,
  "src",
  "sandbox",
  "sanitizer-browser-entry.js",
);

const mainEntryPath = path.join(
  rootDir,
  "src",
  "sandbox",
  "main-browser-entry.js",
);

const sandboxHtmlPath = path.join(siteDir, "sandbox.html");

const INLINES = [
  {
    start: "/*__SANDBOX_SANITIZER_INLINE_START__*/",
    end: "/*__SANDBOX_SANITIZER_INLINE_END__*/",
    entry: sanitizerEntryPath,
  },
  {
    start: "/*__SANDBOX_MAIN_INLINE_START__*/",
    end: "/*__SANDBOX_MAIN_INLINE_END__*/",
    entry: mainEntryPath,
  },
];

function replaceBetweenMarkers(html, start, end, code) {
  const escapedStart = start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}`);

  if (!pattern.test(html)) {
    throw new Error(`Inline markers were not found: ${start} ... ${end}`);
  }

  return html.replace(pattern, `${start}\n${code}\n    ${end}`);
}

async function buildInlineBundle(entryPoint) {
  const result = await build({
    entryPoints: [entryPoint],
    bundle: true,
    format: "iife",
    minify: true,
    platform: "browser",
    write: false,
    charset: "utf8",
    logLevel: "silent",
  });
  const output = result.outputFiles?.[0]?.text?.trim();
  if (!output) {
    throw new Error(`bundle logic empty for ${entryPoint}`);
  }
  return output;
}

async function main() {
  let sandboxHtml = await fs.readFile(sandboxHtmlPath, "utf8");

  for (const { start, end, entry } of INLINES) {
    const bundle = await buildInlineBundle(entry);
    sandboxHtml = replaceBetweenMarkers(sandboxHtml, start, end, bundle);
    console.log(`embedded JS from: ${path.basename(entry)}`);
  }

  await fs.writeFile(sandboxHtmlPath, sandboxHtml, "utf8");
  console.log(`Successfully updated: ${sandboxHtmlPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
