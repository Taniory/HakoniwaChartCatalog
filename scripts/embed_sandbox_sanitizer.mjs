import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const siteDir = path.join(rootDir, "site");
const sourceEntryPath = path.join(
  rootDir,
  "src",
  "sandbox",
  "sanitizer-browser-entry.js",
);
const inlineBundlePath = path.join(
  siteDir,
  "assets",
  "sandbox-sanitizer.inline.js",
);
const sandboxHtmlPath = path.join(siteDir, "sandbox.html");

const START = "/*__SANDBOX_SANITIZER_INLINE_START__*/";
const END = "/*__SANDBOX_SANITIZER_INLINE_END__*/";

function replaceBetweenMarkers(html, code) {
  const escapedStart = START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedEnd = END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`${escapedStart}[\\s\\S]*?${escapedEnd}`);

  if (!pattern.test(html)) {
    throw new Error("Inline markers were not found in site/sandbox.html");
  }

  return html.replace(pattern, `${START}\n${code}\n    ${END}`);
}

async function buildInlineBundle() {
  const result = await build({
    entryPoints: [sourceEntryPath],
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
    throw new Error("sandbox sanitizer bundle is empty");
  }
  return output;
}

async function main() {
  const bundle = await buildInlineBundle();
  await fs.writeFile(inlineBundlePath, `${bundle}\n`, "utf8");

  const sandboxHtml = await fs.readFile(sandboxHtmlPath, "utf8");
  const patched = replaceBetweenMarkers(sandboxHtml, bundle);
  await fs.writeFile(sandboxHtmlPath, patched, "utf8");
  console.log(`embedded: ${inlineBundlePath} -> ${sandboxHtmlPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
