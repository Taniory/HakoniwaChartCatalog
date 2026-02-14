import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const MODE_LABELS = {
  render: "描画",
  code_only: "コード表示のみ",
  skip: "スキップ"
};

function randomId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function resolveSitePath(pathFromSiteRoot) {
  const normalized = pathFromSiteRoot.replace(/^\.?\//, "");
  if (import.meta.env.DEV) {
    return `/site/${normalized}`;
  }
  return `./${normalized}`;
}

function normalizePostPath(path) {
  if (import.meta.env.DEV) {
    if (path.startsWith("/site/")) {
      return path;
    }
    if (path.startsWith("/")) {
      return `/site${path}`;
    }
    if (path.startsWith("./")) {
      return `/site/${path.slice(2)}`;
    }
    return `/site/${path}`;
  }

  if (path.startsWith("/")) {
    return `.${path}`;
  }
  if (path.startsWith("./")) {
    return path;
  }
  return `./${path}`;
}

function modeText(mode) {
  return MODE_LABELS[mode] || mode || "";
}

function statusClass(kind) {
  if (kind === "ok") {
    return "status ok";
  }
  if (kind === "error") {
    return "status error";
  }
  return "status";
}

export default function App() {
  const frameRef = useRef(null);
  const activeRequestIdRef = useRef(null);
  const channelTokenRef = useRef(randomId());
  const renderTimeoutIdRef = useRef(null);
  const pendingPostRef = useRef(null);

  const [indexRows, setIndexRows] = useState([]);
  const [activePost, setActivePost] = useState(null);
  const [status, setStatus] = useState({ text: "", kind: "" });
  const [fallback, setFallback] = useState("");
  const [frameReady, setFrameReady] = useState(false);
  const [frameNonce, setFrameNonce] = useState(0);

  const sandboxSrc = useMemo(() => resolveSitePath("sandbox.html"), []);

  const clearRenderTimeout = useCallback(() => {
    if (renderTimeoutIdRef.current !== null) {
      window.clearTimeout(renderTimeoutIdRef.current);
      renderTimeoutIdRef.current = null;
    }
  }, []);

  const setStatusText = useCallback((text, kind = "") => {
    setStatus({ text, kind });
  }, []);

  const hardResetFrame = useCallback(() => {
    setFrameReady(false);
    setFrameNonce((value) => value + 1);
  }, []);

  const fallbackToCodeOnly = useCallback(
    (message) => {
      setFallback(`コード表示モード: ${message}`);
      setStatusText("コード表示のみ", "error");
    },
    [setStatusText]
  );

  const sendRender = useCallback(
    (post) => {
      const frameWindow = frameRef.current?.contentWindow;
      if (!frameWindow) {
        fallbackToCodeOnly("レンダラーに接続できません。");
        return;
      }

      clearRenderTimeout();
      const requestId = randomId();
      activeRequestIdRef.current = requestId;
      setStatusText("描画中...", "");

      renderTimeoutIdRef.current = window.setTimeout(() => {
        hardResetFrame();
        fallbackToCodeOnly("レンダラーが3秒でタイムアウトしました。");
      }, 3000);

      frameWindow.postMessage(
        {
          type: "render",
          request_id: requestId,
          channel_token: channelTokenRef.current,
          post
        },
        "*"
      );
    },
    [clearRenderTimeout, fallbackToCodeOnly, hardResetFrame, setStatusText]
  );

  const requestRender = useCallback(
    (post) => {
      clearRenderTimeout();
      setFallback("");

      const mode = post?.safety?.mode || "render";
      if (mode !== "render") {
        pendingPostRef.current = null;
        hardResetFrame();
        if (mode === "skip") {
          fallbackToCodeOnly("この投稿は描画をスキップします。");
        } else {
          fallbackToCodeOnly("安全モード設定により描画しません。");
        }
        return;
      }

      if (!frameReady) {
        pendingPostRef.current = post;
        setStatusText("レンダラー読み込み中...", "");
        return;
      }

      sendRender(post);
    },
    [clearRenderTimeout, fallbackToCodeOnly, frameReady, sendRender, setStatusText]
  );

  const loadPost = useCallback(async (path) => {
    const response = await fetch(normalizePostPath(path), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`投稿の読み込みに失敗しました: ${path}`);
    }
    return response.json();
  }, []);

  const selectPost = useCallback(
    async (row) => {
      try {
        const post = await loadPost(row.path);
        setActivePost(post);
        requestRender(post);
      } catch (error) {
        setStatusText("読み込みエラー", "error");
        setFallback(error?.message || String(error));
      }
    },
    [loadPost, requestRender, setStatusText]
  );

  useEffect(() => {
    let ignore = false;

    async function boot() {
      try {
        const response = await fetch(resolveSitePath("posts/index.json"), { cache: "no-store" });
        if (!response.ok) {
          throw new Error("posts/index.json を読み込めませんでした。");
        }

        const rows = await response.json();
        if (ignore) {
          return;
        }
        setIndexRows(rows);

        if (rows.length === 0) {
          setStatusText("投稿がありません", "error");
          return;
        }

        const firstPost = await loadPost(rows[0].path);
        if (ignore) {
          return;
        }
        setActivePost(firstPost);
        requestRender(firstPost);
      } catch (error) {
        if (ignore) {
          return;
        }
        setStatusText("読み込みエラー", "error");
        setFallback(error?.message || String(error));
      }
    }

    void boot();
    return () => {
      ignore = true;
      clearRenderTimeout();
    };
  }, [clearRenderTimeout, loadPost, requestRender, setStatusText]);

  useEffect(() => {
    function onMessage(event) {
      if (event.source !== frameRef.current?.contentWindow) {
        return;
      }

      const data = event.data || {};
      if (data.channel_token !== channelTokenRef.current) {
        return;
      }
      if (data.request_id !== activeRequestIdRef.current) {
        return;
      }

      if (data.type === "render_ok") {
        clearRenderTimeout();
        setStatusText("描画完了", "ok");
        return;
      }

      if (data.type === "render_error") {
        clearRenderTimeout();
        hardResetFrame();
        fallbackToCodeOnly(data.error || "不明な描画エラーです。");
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [clearRenderTimeout, fallbackToCodeOnly, hardResetFrame, setStatusText]);

  const handleFrameLoad = useCallback(() => {
    setFrameReady(true);
    if (pendingPostRef.current) {
      const post = pendingPostRef.current;
      pendingPostRef.current = null;
      sendRender(post);
    }
  }, [sendRender]);

  const paperView = useMemo(() => {
    if (!activePost?.paper?.url) {
      return <span>参考論文はありません。</span>;
    }

    try {
      const parsed = new URL(activePost.paper.url, window.location.href);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return <span>論文URLが不正です。</span>;
      }
      return (
        <span>
          <a href={parsed.href} target="_blank" rel="noopener noreferrer">
            {activePost.paper.title || activePost.paper.url}
          </a>
          {activePost.paper.venue ? ` (${activePost.paper.venue}, ${activePost.paper.year || ""})` : ""}
        </span>
      );
    } catch {
      return <span>論文URLが不正です。</span>;
    }
  }, [activePost]);

  const currentMode = modeText(activePost?.safety?.mode || "render");
  const isRenderMode = (activePost?.safety?.mode || "render") === "render";

  return (
    <div className="layout">
      <aside className="panel sidebar">
        <h1>
          日次・珍しい可視化 <span className="version-tag">alpha</span>
        </h1>
        <p className="subtitle">サンドボックスで生成チャートを表示します。</p>
        <p className="disclosure">このサイトの投稿とコードは生成AIを用いて作成しています。</p>
        <div className="post-list">
          {indexRows.map((row) => (
            <button
              type="button"
              key={row.date}
              className={`post-item ${activePost?.date === row.date ? "active" : ""}`}
              onClick={() => {
                void selectPost(row);
              }}
            >
              <div className="post-date">{row.date}</div>
              <div className="post-title">{row.title}</div>
            </button>
          ))}
        </div>
      </aside>

      <main className="panel main">
        <div>
          <h2 id="title">{activePost?.title || "読み込み中..."}</h2>
          <div className="meta">
            <span className="badge">{activePost?.date || ""}</span>
            <span className="badge">{`チャートID: ${activePost?.chart_id || ""}`}</span>
            <span className="badge">{`モード: ${currentMode}`}</span>
            <span className={statusClass(status.kind)}>{status.text}</span>
          </div>
        </div>

        {isRenderMode ? (
          <div className="chart-shell">
            <iframe
              key={frameNonce}
              ref={frameRef}
              className="chart-frame"
              src={sandboxSrc}
              title="チャート描画フレーム"
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
              onLoad={handleFrameLoad}
            />
          </div>
        ) : null}

        {fallback ? <div className="fallback">{fallback}</div> : null}

        <section className="section">
          <h2>この図の新規性</h2>
          <p>{activePost?.novelty_reason || ""}</p>
        </section>

        <section className="section">
          <h2>この図が有効な理由</h2>
          <p>{activePost?.why_it_works || ""}</p>
        </section>

        <section className="section">
          <h2>読み方</h2>
          <ul>
            {(activePost?.how_to_read || []).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className="section">
          <h2>サンプルデータ</h2>
          <details>
            <summary>サンプルJSONを表示</summary>
            <pre>{JSON.stringify(activePost?.sample_data_json || {}, null, 2)}</pre>
          </details>
        </section>

        <section className="section">
          <h2>参考論文</h2>
          <p className="paper">{paperView}</p>
        </section>

        <section className="section">
          <h2>生成コード</h2>
          <div className="code-grid">
            <div>
              <strong>transform_js</strong>
              <pre>{activePost?.transform_js || ""}</pre>
            </div>
            <div>
              <strong>echarts_js</strong>
              <pre>{activePost?.echarts_js || ""}</pre>
            </div>
            <div>
              <strong>custom_series_js</strong>
              <pre>{activePost?.custom_series_js || ""}</pre>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
