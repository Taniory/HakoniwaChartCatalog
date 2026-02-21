const BLOCKED_HTML_TAGS = Object.freeze([
  "script",
  "iframe",
  "object",
  "embed",
  "link",
  "meta",
  "style",
  "base",
  "form",
]);

const URL_ATTRS = new Set([
  "href",
  "src",
  "xlink:href",
  "action",
  "formaction",
  "poster",
  "srcset",
]);

const DANGEROUS_SCHEME_RE = /^(?:javascript|data|vbscript|file):/i;
const NETWORK_PATH_RE = /^\/\//;
const SAFE_RELATIVE_RE = /^(?:\/(?!\/)|\.\/|\.\.\/|#)/;
const ILLEGAL_FILENAME_RE = /[\\/:*?"<>|\u0000-\u001f]/g;

function toBaseHref(baseHref) {
  if (typeof baseHref === "string" && baseHref) {
    return baseHref;
  }
  return "http://localhost/";
}

function isAllowedUrl(raw, allowedHosts, baseHref) {
  if (typeof raw !== "string") {
    return false;
  }
  const value = raw.trim();
  if (!value) {
    return true;
  }
  if (DANGEROUS_SCHEME_RE.test(value)) {
    return false;
  }
  if (NETWORK_PATH_RE.test(value)) {
    return false;
  }
  if (SAFE_RELATIVE_RE.test(value)) {
    return true;
  }
  try {
    const parsed = new URL(value, toBaseHref(baseHref));
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    return allowedHosts.has(parsed.hostname);
  } catch {
    return false;
  }
}

function sanitizeHtml(input, ctx) {
  const { domPurify, allowedHosts, baseHref } = ctx;
  const hook = (_node, data) => {
    const name = (data?.attrName || "").toLowerCase();
    const value = data?.attrValue || "";
    if (URL_ATTRS.has(name) && !isAllowedUrl(value, allowedHosts, baseHref)) {
      data.keepAttr = false;
    }
  };

  domPurify.addHook("uponSanitizeAttribute", hook);
  try {
    return domPurify.sanitize(String(input), {
      FORBID_TAGS: [...BLOCKED_HTML_TAGS],
      FORBID_ATTR: ["style"],
      ALLOW_DATA_ATTR: false,
      RETURN_TRUSTED_TYPE: false,
    });
  } finally {
    domPurify.removeHook("uponSanitizeAttribute", hook);
  }
}

function sanitizeHtmlResult(result, ctx) {
  if (result == null) {
    return result;
  }
  if (typeof result === "string") {
    return sanitizeHtml(result, ctx);
  }
  if (
    result &&
    typeof result === "object" &&
    typeof result.outerHTML === "string"
  ) {
    return sanitizeHtml(result.outerHTML, ctx);
  }
  return result;
}

function wrapHtmlFormatter(target, key, ctx) {
  if (!target || typeof target !== "object" || !(key in target)) {
    return;
  }
  const original = target[key];
  if (typeof original === "function") {
    target[key] = function wrappedFormatter(...args) {
      return sanitizeHtmlResult(original.apply(this, args), ctx);
    };
    return;
  }
  if (typeof original === "string") {
    target[key] = sanitizeHtml(original, ctx);
  }
}

function validateOptionUrls(value, ctx, path = "option") {
  if (!value || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      validateOptionUrls(item, ctx, `${path}[${index}]`);
    });
    return;
  }
  for (const [key, nextValue] of Object.entries(value)) {
    const currentPath = `${path}.${key}`;
    if (
      (key === "link" || key === "sublink") &&
      typeof nextValue === "string" &&
      !isAllowedUrl(nextValue, ctx.allowedHosts, ctx.baseHref)
    ) {
      throw new Error(`disallowed URL: ${currentPath}`);
    }
    if (nextValue && typeof nextValue === "object") {
      validateOptionUrls(nextValue, ctx, currentPath);
    }
  }
}

function enforceSaveAsImageName(option) {
  const saveAsImage = option?.toolbox?.feature?.saveAsImage;
  if (!saveAsImage || typeof saveAsImage !== "object") {
    return;
  }
  const text = String(saveAsImage.name || "chart")
    .normalize("NFKC")
    .replace(ILLEGAL_FILENAME_RE, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64);
  saveAsImage.name = text || "chart";
}

function hardenOption(option, ctx) {
  if (!option || typeof option !== "object") {
    throw new Error("option must be an object");
  }

  wrapHtmlFormatter(option.tooltip, "formatter", ctx);
  if (Array.isArray(option.series)) {
    for (const series of option.series) {
      wrapHtmlFormatter(series?.tooltip, "formatter", ctx);
    }
  }
  wrapHtmlFormatter(option?.toolbox?.feature?.dataView, "optionToContent", ctx);
  validateOptionUrls(option, ctx);
  enforceSaveAsImageName(option);
}

function createSandboxSanitizer(params) {
  const domPurify = params?.domPurify;
  if (!domPurify || typeof domPurify.sanitize !== "function") {
    throw new Error("DOMPurify is unavailable");
  }
  return {
    hardenOption(option, allowedHosts) {
      const ctx = {
        domPurify,
        allowedHosts: allowedHosts instanceof Set ? allowedHosts : new Set(),
        baseHref: toBaseHref(params?.baseHref),
      };
      hardenOption(option, ctx);
    },
  };
}

export {
  BLOCKED_HTML_TAGS,
  createSandboxSanitizer,
  enforceSaveAsImageName,
  hardenOption,
  isAllowedUrl,
  sanitizeHtml,
  validateOptionUrls,
};
