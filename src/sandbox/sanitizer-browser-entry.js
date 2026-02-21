import { createSandboxSanitizer } from "./sanitizer-core.js";

(() => {
  const sanitizer = createSandboxSanitizer({
    domPurify: window.DOMPurify,
    baseHref: window.location.href,
  });
  window.SandboxSanitizer = {
    hardenOption: sanitizer.hardenOption,
  };
})();
