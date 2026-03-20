import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeBlock from "./components/CodeBlock";
import Header from "./components/Header";
import SampleDataViewer from "./components/SampleDataViewer";
import MasonryGallery from "./components/MasonryGallery";
import PromptCopyButton from "./components/PromptCopyButton";

const MODE_LABELS = {
  render: "描画",
  code_only: "コード表示のみ",
  skip: "スキップ",
};

const DEFAULT_RENDER_TIMEOUT_MS = 3000;
const MAX_RENDER_TIMEOUT_MS = 10 * 60 * 1000;

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

function formatGeneratedAtLabel(value) {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  const text = parsed.toISOString().replace("T", " ").slice(0, 16);
  return `${text} UTC`;
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

function resolveRenderTimeoutMs() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("render_timeout_ms");
  if (!raw) {
    return DEFAULT_RENDER_TIMEOUT_MS;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === "off" || normalized === "none" || normalized === "false") {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_RENDER_TIMEOUT_MS;
  }
  if (parsed === 0) {
    return null;
  }
  return Math.min(Math.floor(parsed), MAX_RENDER_TIMEOUT_MS);
}

export default function App() {
  const frameRef = useRef(null);
  const activeRequestIdRef = useRef(null);
  const channelTokenRef = useRef(randomId());
  const renderTimeoutIdRef = useRef(null);
  const pendingPostRef = useRef(null);
  const postRequestSeqRef = useRef(0);
  const requestRenderRef = useRef(null);

  const [indexRows, setIndexRows] = useState([]);
  const [activePost, setActivePost] = useState(null);
  const [activePostPath, setActivePostPath] = useState("");
  const [status, setStatus] = useState({ text: "", kind: "" });
  const [fallback, setFallback] = useState("");
  const [frameReady, setFrameReady] = useState(false);
  const [frameNonce, setFrameNonce] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("gallery"); // "gallery" | "detail"

  const sandboxSrc = useMemo(() => resolveSitePath("sandbox.html"), []);
  const renderTimeoutMs = useMemo(() => resolveRenderTimeoutMs(), []);

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
    [setStatusText],
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

      if (renderTimeoutMs !== null) {
        renderTimeoutIdRef.current = window.setTimeout(() => {
          hardResetFrame();
          fallbackToCodeOnly("レンダラーがタイムアウトしました。");
        }, renderTimeoutMs);
      }

      frameWindow.postMessage(
        {
          type: "render",
          request_id: requestId,
          channel_token: channelTokenRef.current,
          post,
        },
        "*",
      );
    },
    [
      clearRenderTimeout,
      fallbackToCodeOnly,
      hardResetFrame,
      renderTimeoutMs,
      setStatusText,
    ],
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
    [
      clearRenderTimeout,
      fallbackToCodeOnly,
      frameReady,
      sendRender,
      setStatusText,
    ],
  );

  const loadPost = useCallback(async (path) => {
    const response = await fetch(normalizePostPath(path), {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`投稿の読み込みに失敗しました: ${path}`);
    }
    return response.json();
  }, []);

  const selectPost = useCallback(
    async (row) => {
      postRequestSeqRef.current += 1;
      const requestSeq = postRequestSeqRef.current;
      try {
        const post = await loadPost(row.path);
        if (requestSeq !== postRequestSeqRef.current) {
          return;
        }
        setActivePost(post);
        setActivePostPath(row.path);
        setViewMode("detail");
        window.scrollTo(0, 0);
        requestRender(post);
      } catch (error) {
        if (requestSeq !== postRequestSeqRef.current) {
          return;
        }
        setStatusText("読み込みエラー", "error");
        setFallback(error?.message || String(error));
      }
    },
    [loadPost, requestRender, setStatusText],
  );

  useEffect(() => {
    requestRenderRef.current = requestRender;
  }, [requestRender]);

  useEffect(() => {
    let ignore = false;

    async function boot() {
      let firstPostRequestSeq = 0;
      try {
        const response = await fetch(resolveSitePath("posts/index.json"), {
          cache: "no-store",
        });
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

        postRequestSeqRef.current += 1;
        const requestSeq = postRequestSeqRef.current;
        firstPostRequestSeq = requestSeq;
        const firstPost = await loadPost(rows[0].path);
        if (ignore || requestSeq !== postRequestSeqRef.current) {
          return;
        }
        setActivePost(firstPost);
        setActivePostPath(rows[0].path);
        requestRenderRef.current?.(firstPost);
      } catch (error) {
        if (ignore) {
          return;
        }
        if (
          firstPostRequestSeq !== 0 &&
          firstPostRequestSeq !== postRequestSeqRef.current
        ) {
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
  }, [clearRenderTimeout, loadPost, setStatusText]);

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
          {activePost.paper.venue
            ? ` (${activePost.paper.venue}, ${activePost.paper.year || ""})`
            : ""}
        </span>
      );
    } catch {
      return <span>論文URLが不正です。</span>;
    }
  }, [activePost]);

  const currentMode = modeText(activePost?.safety?.mode || "render");
  const isRenderMode = (activePost?.safety?.mode || "render") === "render";
  const searchKeyword = searchQuery.trim().toLowerCase();

  const sortedRows = useMemo(() => {
    return [...indexRows].sort((left, right) => {
      const byGeneratedAt = String(right.generated_at || "").localeCompare(
        String(left.generated_at || ""),
      );
      if (byGeneratedAt !== 0) {
        return byGeneratedAt;
      }
      return String(right.date || "").localeCompare(String(left.date || ""));
    });
  }, [indexRows]);

  const recentRows = useMemo(() => {
    return sortedRows.slice(0, 5);
  }, [sortedRows]);

  const filteredSortedRows = useMemo(() => {
    if (!searchKeyword) {
      return sortedRows;
    }
    return sortedRows.filter((row) => {
      const tagsStr = Array.isArray(row?.tags) ? row.tags.join(" ") : "";
      const aliasesStr = Array.isArray(row?.aliases) ? row.aliases.join(" ") : "";
      const text =
        `${row?.date || ""} ${row?.generated_at || ""} ${row?.chart_id || ""} ${row?.title || ""} ${tagsStr} ${aliasesStr}`.toLowerCase();
      return text.includes(searchKeyword);
    });
  }, [searchKeyword, sortedRows]);

  const visibleRows = useMemo(() => {
    return searchKeyword ? filteredSortedRows : recentRows;
  }, [filteredSortedRows, recentRows, searchKeyword]);

  return (
    <div className="app-shell">
      <Header title="Hakoniwa Chart Catalog" />
      <div className="layout">
        {viewMode === "gallery" ? (
          <div className="gallery-full-view">
            <div className="gallery-search-container">
              <input
                type="search"
                className="gallery-search-input"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="チャートを検索 (タイトル / 日付 / タグ)"
              />
            </div>
            {filteredSortedRows.length > 0 ? (
              <MasonryGallery
                rows={filteredSortedRows}
                onSelectRow={(node) => void selectPost(node)}
              />
            ) : (
              <p className="gallery-empty">該当する チャート が ありません。</p>
            )}
          </div>
        ) : (
          <>
            <aside className="panel sidebar">
          <section className="sidebar-search">
            <label htmlFor="post-search" className="sidebar-label">
              投稿検索
            </label>
            <input
              id="post-search"
              type="search"
              className="sidebar-search-input"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
              }}
              placeholder="タイトル / 日付 / タグ"
            />
          </section>
          <section className="recent-posts">
            <div className="recent-head">
              <h2 className="recent-title">最近の投稿</h2>
              <span className="recent-count">{visibleRows.length} 件</span>
            </div>
            {visibleRows.length > 0 ? (
              <div className="post-list">
                {visibleRows.map((row) => (
                  <button
                    type="button"
                    key={row.post_id || row.path}
                    className={`post-item ${activePostPath === row.path ? "active" : ""}`}
                    onClick={() => {
                      void selectPost(row);
                    }}
                  >
                    <div className="post-date">
                      {row.date}
                      {row.generated_at
                        ? ` (${formatGeneratedAtLabel(row.generated_at)})`
                        : ""}
                    </div>
                    <div className="post-title">{row.title}</div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="post-empty">該当する 投稿 が ありません。</p>
            )}
          </section>
          </aside>

          <main className="panel main">
            <button
              type="button"
              className="back-to-gallery-btn"
              onClick={() => {
                setViewMode("gallery");
                clearRenderTimeout();
                hardResetFrame();
              }}
            >
              ← ギャラリーに戻る
            </button>
            <div>
              <h2 id="title">{activePost?.title || "読み込み中..."}</h2>
            <div className="meta">
              <span className="badge">
                投稿日: {activePost?.date || ""}
              </span>
              <span className="badge">
                最終更新日時: {formatGeneratedAtLabel(
                  activePost?.generated_by?.generated_at || "",
                )}
              </span>
              <span className="badge">{`チャートID: ${activePost?.chart_id || ""}`}</span>
              {activePost?.chart_name && (
                <span className="badge badge-name">{activePost.chart_name}</span>
              )}
              {activePost?.aliases?.length > 0 && (
                <span className="badge badge-alias">別名: {activePost.aliases.join(", ")}</span>
              )}
              {activePost?.tags?.map((tag) => (
                <span key={tag} className="badge badge-tag">#{tag}</span>
              ))}
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

          {activePost?.use_cases?.length > 0 && (
            <section className="section">
              <h2>ユースケース</h2>
              <ul>
                {activePost.use_cases.map((uc, i) => (
                  <li key={i}>{uc}</li>
                ))}
              </ul>
            </section>
          )}

          {(activePost?.when_to_use?.length > 0 ||
            activePost?.when_not_to_use?.length > 0 ||
            activePost?.common_misreads?.length > 0) && (
            <section className="section">
              <h2>学習のポイント</h2>

              {activePost?.when_to_use?.length > 0 && (
                <>
                  <p><strong>向いている場面</strong></p>
                  <ul>
                    {activePost.when_to_use.map((line, i) => (
                      <li key={`when-to-use-${i}`}>{line}</li>
                    ))}
                  </ul>
                </>
              )}

              {activePost?.when_not_to_use?.length > 0 && (
                <>
                  <p><strong>避けたい場面</strong></p>
                  <ul>
                    {activePost.when_not_to_use.map((line, i) => (
                      <li key={`when-not-to-use-${i}`}>{line}</li>
                    ))}
                  </ul>
                </>
              )}

              {activePost?.common_misreads?.length > 0 && (
                <>
                  <p><strong>誤読しやすいポイント</strong></p>
                  <ul>
                    {activePost.common_misreads.map((line, i) => (
                      <li key={`common-misreads-${i}`}>{line}</li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          {activePost?.data_requirements?.length > 0 && (
            <section className="section">
              <h2>データ要件と制約</h2>
              <ul className="data-req-list">
                {activePost.data_requirements.map((req, i) => (
                  <li key={i}>
                    <strong>{req.name}</strong> <code>{req.type}</code>: {req.description}
                  </li>
                ))}
              </ul>
              {activePost?.optimal_conditions && (
                <div className="optimal-conditions">
                  <strong>推奨条件:</strong>
                  <ul>
                    {Object.entries(activePost.optimal_conditions).map(([k, v]) => (
                      <li key={k}>{k}: {String(v)}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          <section className="section">
            <h2>この チャート の 新規性</h2>
            <p>{activePost?.novelty_reason || ""}</p>
          </section>

          <section className="section">
            <h2>この チャート が 有効な 理由</h2>
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
            <SampleDataViewer data={activePost?.sample_data_json} />
          </section>

          {(activePost?.novelty_score !== undefined || activePost?.repeat_risk || activePost?.near_duplicates?.length > 0) && (
            <section className="section">
              <h2>評価・関連情報</h2>
              <ul>
                {activePost?.novelty_score !== undefined && (
                  <li><strong>新規性スコア:</strong> {activePost.novelty_score}</li>
                )}
                {activePost?.repeat_risk && (
                  <li><strong>重複リスク:</strong> {activePost.repeat_risk}</li>
                )}
                {activePost?.near_duplicates?.length > 0 && (
                  <li><strong>類似チャート:</strong> {activePost.near_duplicates.join(", ")}</li>
                )}
              </ul>
            </section>
          )}

          <section className="section">
            <h2>参考論文</h2>
            <p className="paper">{paperView}</p>
          </section>

          <section className="section">
            <h2>類似チャート生成プロンプト</h2>
            <p style={{ marginBottom: "12px", color: "var(--ink-soft)", fontSize: "0.9rem" }}>
              このチャートのJSONデータを元に、別のツールやLLMで類似のチャートを作成するためのプロンプトをコピーします。
            </p>
            <PromptCopyButton post={activePost} />
          </section>

          <section className="section">
            <h2>生成コード</h2>
            <div className="code-grid">
              <div>
                <strong>transform_js</strong>
                <CodeBlock code={activePost?.transform_js || ""} />
              </div>
              <div>
                <strong>echarts_js</strong>
                <CodeBlock code={activePost?.echarts_js || ""} />
              </div>
              <div>
                <strong>custom_series_js</strong>
                <CodeBlock code={activePost?.custom_series_js || ""} />
              </div>
            </div>
          </section>
        </main>
        </>
        )}
      </div>
      <p className="disclosure page-disclosure">
        この サイト の 投稿 と コード は 生成 AI を 用いて 作成しています。
      </p>
    </div>
  );
}
