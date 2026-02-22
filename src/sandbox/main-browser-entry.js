import {
  createLocalHostAllowList,
  cloneJson,
  isAllowedParentOrigin,
  createSectionRunner,
} from "./utils.js";

(() => {
  const sanitizer = window.SandboxSanitizer;
  if (!sanitizer || typeof sanitizer.hardenOption !== "function") {
    throw new Error("sandbox sanitizer is unavailable");
  }

  const chartDom = document.getElementById("chart");
  const allowedHosts = createLocalHostAllowList();
  const runSection = createSectionRunner();

  let chart = null;
  let parentOrigin = null;
  let channelToken = null;

  function send(type, requestId, payload) {
    if (!requestId || !channelToken || typeof parentOrigin !== "string") {
      return;
    }
    window.parent.postMessage(
      {
        type,
        request_id: requestId,
        channel_token: channelToken,
        ...payload,
      },
      parentOrigin,
    );
  }

  function renderPost(post, requestId) {
    if (!post || typeof post !== "object") {
      throw new Error("post payload is invalid");
    }

    const sourceData = post.sample_data_json || {};
    const context = {
      post,
      echarts: window.echarts,
      rawData: cloneJson(sourceData),
      transformedData: cloneJson(sourceData),
      option: {},
    };

    runSection(post.transform_js || "", context);
    runSection(post.echarts_js || "", context);
    runSection(post.custom_series_js || "", context);
    sanitizer.hardenOption(context.option, allowedHosts);

    if (chart && typeof chart.dispose === "function") {
      chart.dispose();
    }
    chart = window.echarts.init(chartDom, null, { renderer: "canvas" });
    chart.setOption(context.option);
    chart.resize();
    send("render_ok", requestId, {});
  }

  window.addEventListener("resize", () => {
    if (chart && typeof chart.resize === "function") {
      chart.resize();
    }
  });

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) {
      return;
    }

    const data = event.data || {};
    if (
      data.type !== "render" ||
      typeof data.request_id !== "string" ||
      typeof data.channel_token !== "string"
    ) {
      return;
    }

    if (!channelToken) {
      if (!isAllowedParentOrigin(event.origin, allowedHosts)) {
        return;
      }
      channelToken = data.channel_token;
      parentOrigin = event.origin;
    }
    if (data.channel_token !== channelToken) {
      return;
    }
    if (event.origin !== parentOrigin) {
      return;
    }

    const requestId = data.request_id;
    try {
      renderPost(data.post, requestId);
    } catch (error) {
      send("render_error", requestId, {
        error: error && error.stack ? error.stack : String(error),
      });
    }
  });
})();
