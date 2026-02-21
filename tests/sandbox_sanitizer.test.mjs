import assert from "node:assert/strict";
import test from "node:test";

import {
  createSandboxSanitizer,
  enforceSaveAsImageName,
  isAllowedUrl,
  validateOptionUrls,
} from "../src/sandbox/sanitizer-core.js";

function createDomPurifyStub() {
  const hooks = new Set();
  const calls = [];
  const attrRe = /\s([a-zA-Z:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;

  return {
    calls,
    addHook(name, fn) {
      if (name === "uponSanitizeAttribute") {
        hooks.add(fn);
      }
    },
    removeHook(name, fn) {
      if (name === "uponSanitizeAttribute") {
        hooks.delete(fn);
      }
    },
    sanitize(input, options) {
      calls.push(options);
      let output = String(input);

      for (const tag of options?.FORBID_TAGS ?? []) {
        const re = new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi");
        output = output.replace(re, "");
      }

      output = output.replace(
        /\sstyle\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,
        "",
      );
      output = output.replace(/\son[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");

      output = output.replace(attrRe, (full, name, dq, sq, bare) => {
        const value = dq ?? sq ?? bare ?? "";
        const data = { attrName: name, attrValue: value, keepAttr: true };
        for (const hook of hooks) {
          hook(null, data);
        }
        if (!data.keepAttr) {
          return "";
        }
        const escaped = String(data.attrValue).replace(/"/g, "&quot;");
        return ` ${name}="${escaped}"`;
      });

      return output;
    },
    hookCount() {
      return hooks.size;
    },
  };
}

test("isAllowedUrl validates schemes and host allow list", () => {
  const allowedHosts = new Set(["localhost", "example.com"]);
  const baseHref = "http://localhost/sandbox.html";

  assert.equal(isAllowedUrl("/local/path", allowedHosts, baseHref), true);
  assert.equal(isAllowedUrl("./relative", allowedHosts, baseHref), true);
  assert.equal(isAllowedUrl("../up", allowedHosts, baseHref), true);
  assert.equal(isAllowedUrl("#hash", allowedHosts, baseHref), true);
  assert.equal(isAllowedUrl("javascript:alert(1)", allowedHosts, baseHref), false);
  assert.equal(isAllowedUrl("//evil.example/a.js", allowedHosts, baseHref), false);
  assert.equal(isAllowedUrl("https://example.com/chart", allowedHosts, baseHref), true);
  assert.equal(isAllowedUrl("https://evil.example/chart", allowedHosts, baseHref), false);
});

test("hardenOption sanitizes tooltip string and removes temporary hook", () => {
  const domPurify = createDomPurifyStub();
  const sanitizer = createSandboxSanitizer({
    domPurify,
    baseHref: "http://localhost/sandbox.html",
  });
  const option = {
    tooltip: {
      formatter:
        '<a href="javascript:alert(1)" style="color:red" onclick="x()">unsafe</a>',
    },
  };

  sanitizer.hardenOption(option, new Set(["localhost"]));

  assert.equal(option.tooltip.formatter, "<a>unsafe</a>");
  assert.equal(domPurify.hookCount(), 0);
  assert.equal(domPurify.calls.length, 1);
  assert.deepEqual(domPurify.calls[0].FORBID_ATTR, ["style"]);
});

test("hardenOption wraps formatter function and sanitizes HTML return", () => {
  const domPurify = createDomPurifyStub();
  const sanitizer = createSandboxSanitizer({
    domPurify,
    baseHref: "http://localhost/sandbox.html",
  });
  const option = {
    tooltip: {
      formatter: () =>
        '<img src="https://evil.example/x.png" style="width:10px" onerror="x()" />',
    },
  };

  sanitizer.hardenOption(option, new Set(["localhost"]));
  const html = option.tooltip.formatter();
  assert.equal(html, "<img />");
});

test("validateOptionUrls blocks untrusted link fields", () => {
  const ctx = {
    allowedHosts: new Set(["localhost"]),
    baseHref: "http://localhost/sandbox.html",
  };

  assert.throws(
    () => validateOptionUrls({ series: [{ link: "https://evil.example" }] }, ctx),
    /disallowed URL: option\.series\[0\]\.link/,
  );
  assert.doesNotThrow(() =>
    validateOptionUrls({ series: [{ link: "https://localhost/x" }] }, ctx),
  );
});

test("enforceSaveAsImageName normalizes unsafe filename", () => {
  const option = {
    toolbox: {
      feature: {
        saveAsImage: { name: '  bad:/\\*?"<>|name  ' },
      },
    },
  };

  enforceSaveAsImageName(option);
  assert.equal(option.toolbox.feature.saveAsImage.name, "bad_________name");
});

test("hardenOption throws when option is not object", () => {
  const domPurify = createDomPurifyStub();
  const sanitizer = createSandboxSanitizer({
    domPurify,
    baseHref: "http://localhost/sandbox.html",
  });

  assert.throws(() => sanitizer.hardenOption(null, new Set(["localhost"])), {
    message: "option must be an object",
  });
});
