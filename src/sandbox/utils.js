export function createLocalHostAllowList() {
  return new Set([window.location.hostname, "localhost", "127.0.0.1"]);
}

export function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

export function isAllowedParentOrigin(origin, allowedHosts) {
  if (typeof origin !== "string" || !origin || origin === "null") {
    return false;
  }
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    return allowedHosts.has(parsed.hostname);
  } catch {
    return false;
  }
}

export function createSectionRunner() {
  let sectionCounter = 0;

  function buildSectionScriptText(executionKey, sectionSource) {
    return [
      '"use strict";',
      "(() => {",
      "const state = window.__sandboxExecutionState;",
      `if (!state || state.key !== ${JSON.stringify(executionKey)}) { return; }`,
      "const context = state.context;",
      "const post = context.post;",
      "const echarts = context.echarts;",
      "const rawData = context.rawData;",
      "let transformedData = context.transformedData;",
      "let option = context.option;",
      sectionSource,
      "context.transformedData = transformedData;",
      "context.option = option;",
      "})();",
    ].join("\n");
  }

  function onError(executionKey, event) {
    const current = window.__sandboxExecutionState;
    if (!current || current.key !== executionKey) {
      return;
    }
    const message = event?.message || "script error";
    current.error = event?.error || new Error(message);
    event.preventDefault();
  }

  return function runSection(source, context) {
    if (!source) {
      return;
    }

    const executionKey = `section_${Date.now()}_${sectionCounter++}`;
    window.__sandboxExecutionState = {
      key: executionKey,
      context,
      error: null,
    };
    const errorListener = (event) => onError(executionKey, event);
    window.addEventListener("error", errorListener);

    let result = null;
    try {
      const script = document.createElement("script");
      script.text = buildSectionScriptText(executionKey, source);
      document.body.appendChild(script);
      script.remove();
      result = window.__sandboxExecutionState;
    } finally {
      window.removeEventListener("error", errorListener);
      delete window.__sandboxExecutionState;
    }

    if (result && result.error) {
      throw result.error;
    }
  };
}
