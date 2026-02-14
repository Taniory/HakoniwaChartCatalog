# アプリケーション仕様書：Daily Uncommon Charts（静的サイト＋日次生成＋安全サンドボックス）

> 目的：**「Chord 図級に珍しいが、読み筋が明確でわかりやすい可視化」**を毎日1件、自動生成して静的サイト（GitHub Pages）に掲載する。
> 生成物には「図の説明」「読み方」「サンプルデータ」「データ変形ロジック」「ECharts（custom series含む）実装」を含める。
> 実行時は **生成コードを安全に隔離してレンダリング**する（iframe sandbox + CSP + 事前検査 + 自動修正）。

---

## 1. システム概要

### 1.1 プラットフォーム

- ホスティング：GitHub Pages（静的）
- 定期実行：GitHub Actions（cron）
- 生成モデル：Google Gemini API（Structured OutputでJSON生成） ([Google AI for Developers][1])
- 参考論文（任意）：必要に応じて手動で付与
- コードレビュー：Codex（GitHub 連携 or GitHub Action）

### 1.2 主要な設計方針

- **生成コードは直接親ページで実行しない**
  → sandboxed iframe 内でのみ実行する（`sandbox="allow-scripts"`、`allow-same-origin` なし）
- **ネットワーク送信経路をCSPで遮断**
  → 生成コードが `fetch()` 等を含んでも外へ出にくい
- **ルールベースの静的検査 + Geminiへ再生成要求**
  → 危険API・迂回の兆候があれば修正生成を最大N回（推奨2回）
- **失敗時フェイルセーフ**
  → その日の更新をスキップ、または「説明＋コード表示のみ」に切り替える

---

## 2. 目的・ゴール・非ゴール

### 2.1 ゴール（必須）

1. 毎日1件の「珍しいがわかりやすい図」記事を生成し、静的サイトに反映する
2. 記事は以下を含む
    - 図の名前 / 背景 / どんなタスクに強いか
    - 読み方（箇条書き）
    - サンプルデータ（JSON）
    - 変形ロジック（JS）
    - ECharts 実装（JS、custom series含む）

3. 生成コードの実行は iframe sandbox 内に閉じる（安全設計）

### 2.2 非ゴール（当面やらない）

- ユーザー投稿・コメント・ログインなどのサーバ機能（完全静的）
- LLM生成コードの“完全な安全保証”（リスク低減はするがゼロ化はしない）
- 論文本文の再配布（メタ情報とリンクに限定）

---

## 3. 用語

- **Post**：1日分の記事（JSON 1ファイル）
- **Renderer**：sandbox iframe 内で ECharts を実行し描画する部品
- **Validator**：生成されたJS（transform / echarts / custom）を静的に検査するPythonロジック
- **Repair**：Validatorの指摘を Gemini に渡し、コード部分のみ修正させる再生成

---

## 4. リポジトリ構成（案）

```
repo/
  site/                      # Pages成果物
    index.html
    sandbox.html             # 生成コードを実行する iframe 側
    assets/
      echarts.inline.js      # ECharts本体（ビルド時にsandboxへ埋め込みでも可）
    posts/
      index.json             # 一覧
      2026-02-12.json        # 日次post
    state/
      history.json           # 直近採用したチャートID等（重複回避）
  scripts/
    generate_daily_post.py   # 生成（Gemini）
    validate_generated_js.py # 禁止API検査
    repair_with_gemini.py    # 違反があれば再生成
    build_index.py           # posts/index.json更新
    embed_echarts.py         # sandbox.htmlへECharts埋め込み（推奨）
  .github/workflows/
    daily_generate_pr.yml    # 生成→ブランチ→PR作成→（任意）@codex reviewコメント
    pr_codex_review.yml      # PR作成時にCodex Actionでレビュー（任意）
    pages_deploy.yml         # main更新時にPagesへデプロイ（またはdaily内でデプロイ）
  requirements.txt
  README.md
```

---

## 5. データ仕様（Post JSON）

### 5.1 Post JSONスキーマ（例）

**ファイル**：`site/posts/YYYY-MM-DD.json`

```json
{
  "schema_version": "1.0",
  "date": "YYYY-MM-DD",
  "title": "string",
  "chart_id": "string",
  "chart_name": "string",
  "novelty_reason": "string",
  "why_it_works": "string",
  "how_to_read": ["string", "string"],
  "sample_data_json": { "any": "json" },

  "transform_js": "string",
  "echarts_js": "string",
  "custom_series_js": "string",

  "paper": {
    "title": "string",
    "url": "string",
    "year": 2026,
    "venue": "string"
  },

  "safety": {
    "validator_version": "string",
    "attempts": 1,
    "violations": [
      {"rule_id": "NET_FETCH", "line": 12, "excerpt": "fetch(..."}
    ],
    "mode": "render|code_only|skip"
  },

  "generated_by": {
    "model": "gemini-xxx",
    "generated_at": "ISO-8601"
  }
}
```

### 5.2 `chart_id` の方針

- 英小文字＋ハイフン（例：`horizon-chart` / `upset` / `marimekko`）
- 重複回避と履歴管理に使う

---

## 6. 生成仕様（Gemini）

### 6.1 Structured Output（必須）

- Gemini出力は **JSONのみ**
- Python側は Pydantic 等のスキーマで検証し、**パース失敗＝生成失敗**として扱う ([Google AI for Developers][1])

### 6.2 生成プロンプトの要件（必須）

- 「Chord級に珍しいが、読み筋が明確」な図を選ぶ
- **禁止事項（安全）を明記**：
    - ネットワーク呼び出し禁止
    - navigation / popup 禁止
    - dynamic eval 禁止（`eval`, `Function`, 動的 import 等）
    - storage 禁止（localStorage等）
    - 難読化禁止（`atob/btoa`、文字列分割での回避等）

- 出力フィールドは **コード（transform/echarts/custom）を文字列で格納**

### 6.3 参考論文（任意）

- 参考論文は任意項目とし、必要時のみ手動入力
- Geminiには **与えたメタ情報のみ参照**させ、URL/DOIの捏造を禁止
  （論文は“ヒント”扱いで、なくても生成できる構成にする）

---

## 7. 安全設計（自由な custom series 実行）

### 7.1 実行分離（必須）

- 親ページ（`index.html`）では生成コードを実行しない
- sandbox iframe（`sandbox.html`）のみで実行する
    - `<iframe sandbox="allow-scripts">`（`allow-same-origin` なし）
    - `referrerpolicy="no-referrer"` 推奨

### 7.2 CSP（必須）

`sandbox.html` に **CSP meta** を入れ、通信経路を遮断する：

- `default-src 'none'`
- `connect-src 'none'`（fetch/WebSocket等） ([Google AI for Developers][1])
- `img-src 'none'`（画像ビーコン送信）
- `media-src 'none'` / `font-src 'none'`
- `script-src 'unsafe-inline'`（※ECharts本体を埋め込み、外部JSを不要にする）
- `style-src 'unsafe-inline'`
- `base-uri 'none'` / `form-action 'none'` / `object-src 'none'`

> 注：GitHub PagesではHTTPヘッダ制御が制約されるため、最低限 meta CSP で守る（ただし `frame-ancestors` はヘッダ向きで meta では効かない想定）。

### 7.3 EChartsの読み込み方針（必須）

- sandbox は CSP を厳しくするため、ECharts を **CDN から読まない**
- 推奨：ビルド手順で `echarts.min.js` を `sandbox.html` 内に **インライン埋め込み**
  （script-src を `'unsafe-inline'` に寄せるため）

### 7.4 postMessage プロトコル（必須）

親→子（sandbox）：

```json
{ "type": "render", "post": { ...Post JSON... }, "request_id": "uuid" }
```

子→親：

- 成功：

```json
{ "type": "render_ok", "request_id": "uuid" }
```

- 失敗：

```json
{ "type": "render_error", "request_id": "uuid", "error": "stack or message" }
```

親は `render_error` の場合：

- そのpostを **code_only 表示**に切り替える（図は表示しない）
- 連続で固まる場合、iframeをリロードして復帰する

### 7.5 DoS（無限ループ等）対策（必須）

- 親は `render` 送信後にタイムアウト（例：3秒）を設ける
    - `render_ok` が来なければ iframe を再読み込みし、当該postは code_only に落とす

- Validatorでも以下を追加検知（できれば）：
    - `for(;;)` / `while(true)` 等のパターン
    - 異常に大きい配列確保（`Array(1e8)` 等）

---

## 8. ルールベース Validator（必須）

### 8.1 対象

- `transform_js` + `echarts_js` + `custom_series_js` を連結した文字列

### 8.2 禁止API（最小セット）

- ネットワーク：`fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `new Image`
- ナビゲーション：`window.open`, `location=`, `location.href`, `history.pushState`
- 動的実行：`eval`, `Function`, `import(`, `importScripts`, `document.createElement('script')`
- 永続化：`localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`
- 難読化・迂回：`atob`, `btoa`, `__proto__`, `.constructor`

### 8.3 出力

- 違反一覧（rule_id / 行番号 / 抜粋）
- Post JSONの `safety.violations` に保存

---

## 9. 自動 Repair（Gemini 再質問）（必須）

### 9.1 修正方針

- Validatorが違反を検出したら、Geminiに **違反一覧を突きつけて**コード部分のみ修正させる
- 再試行回数：最大2回（推奨）
- 2回失敗したら、その日の mode は `skip` または `code_only`

### 9.2 Repairプロンプト要件（必須）

- “回避・難読化禁止”を明記
- “チャート型は変えない”を明記（逃げ防止）
- “コード部分のみ書き換え”を明記（説明文を変えない）

---

## 10. フロントエンド仕様（site/index.html）

### 10.1 表示要件

- 一覧：`site/posts/index.json` を読み込み、日付・タイトルをリスト/セレクト表示
- 詳細：
    - 説明文（why/how）
    - サンプルデータ（折りたたみ表示）
    - コード（transform/echarts/custom）はコードブロックで表示
    - 図の描画領域（iframe）

### 10.2 描画フロー

1. index.html が post JSON を fetch
2. iframe に postMessage（type=render）
3. sandbox.html が受け取り、CSP下で ECharts を初期化
4. `transform_js` → `echarts_js` → `custom_series_js` を実行して `option` を構築
5. `chart.setOption(option)`
6. 成功/失敗を postMessage で返す

---

## 11. GitHub Actions（CI/CD）仕様

### 11.1 Pages デプロイ方式（推奨）

- GitHub Pages は **“Source = GitHub Actions”** にする
- ワークフローは `actions/upload-pages-artifact` → `actions/deploy-pages` を使用 ([GitHub Docs][2])

### 11.2 日次生成 → PR作成（必須）

**ワークフロー**：`daily_generate_pr.yml`

- トリガー：`schedule`（cronはUTC）、`workflow_dispatch`
- 実行内容：
    1. `generate_daily_post.py`
    2. `validate_generated_js.py`
    3. 違反時 `repair_with_gemini.py`
    4. `build_index.py`
    5. `embed_echarts.py`（必要なら）
    6. ブランチ作成 `auto/daily-YYYY-MM-DD`
    7. 生成物をコミット
    8. PR作成（mainへ）

**cron（例）**：JST 09:10 に回したい → UTC 00:10
※scheduleは遅延することがある（厳密時刻保証なし）

### 11.3 PRマージ → Pages更新（必須）

**ワークフロー**：`pages_deploy.yml`

- トリガー：`push` on `main`
- `site/` を artifact としてアップロード → deploy

---

## 12. Codex によるコードレビュー連携

### 12.1 方法A（推奨）：PRコメントでトリガー

- PRに `@codex review` コメントを投稿するとCodexがレビューを返す ([OpenAI Developers][3])
- `daily_generate_pr.yml` の最後に PR番号を取得し、コメント投稿を行う（GitHub API / gh cli）

### 12.2 方法B（任意）：Codex GitHub Action

- `openai/codex-action@v1` を PRイベントで動かし、レビューをコメント/レビューとして投稿 ([OpenAI Developers][4])
- 必要：GitHub Secrets に `GEMINI_API_KEY` を登録
- メリット：レビュー条件やプロンプトをworkflow内で厳密に管理可能

> 実装では A をデフォルト、B はオプションとして切替可能にする。

---

## 13. Secrets / 設定

### 13.1 GitHub Secrets（必須）

- `GEMINI_API_KEY`

### 13.2 GitHub Secrets（任意）

- （任意）`OPENAI_API_KEY`（Codex Actionを使う場合）

### 13.3 設定ファイル（推奨）

- `site/state/config.json`：チャート候補リスト、重複回避日数、max retries など
- `site/state/history.json`：最近採用した `chart_id`、日付、失敗履歴

---

## 14. 失敗時の挙動（フェイルセーフ）

| フェーズ               | 失敗           | 挙動                                              |
| ---------------------- | -------------- | ------------------------------------------------- |
| Gemini出力がJSONでない | parse失敗      | その日は `skip`（PRを作らない）                   |
| Validator違反          | 修正生成       | 最大2回repair、ダメなら `code_only` または `skip` |
| sandbox描画で例外      | `render_error` | 親は code_only 表示に切替                         |
| sandboxが固まる        | タイムアウト   | iframe再読み込み + code_only                      |

---

## 15. テスト要件（最低限）

- Python単体：
    - Validatorのユニットテスト（禁止API検知）
    - Repairプロンプト生成テスト

- フロント：
    - postMessage の正常系/異常系（render_ok/render_error）
    - code_only 表示のフォールバック

- E2E（任意）：
    - GitHub Actions を `workflow_dispatch` で手動実行して生成→PR作成が完走すること

---

## 16. 受け入れ基準（Definition of Done）

1. `workflow_dispatch` で日次生成が動き、`site/posts/YYYY-MM-DD.json` が生成される
2. 違反のある生成コードは Validator で検出され、repair が走る
3. PRが自動作成され、（方法Aの場合）`@codex review` コメントが自動投稿される ([OpenAI Developers][3])
4. PRをマージすると Pages が更新され、最新postが index に表示される ([GitHub Docs][2])
5. sandbox iframe 内で custom series が実行され、ネットワーク通信なしで描画できる
6. 生成コードが壊れても、サイトが真っ白にならず code_only に落ちる

---

## 17. Codex への実装タスクリスト（この仕様書を渡す前提の指示）

Codexに依頼する実装は次の順で進める：

1. リポジトリ雛形作成（上記ディレクトリ構成）
2. `site/index.html` + `site/sandbox.html` を実装
    - postMessage プロトコル実装
    - タイムアウト＆フォールバック実装
    - sandbox.html に CSP meta を実装（通信遮断）

3. Python生成スクリプト群（generate/validate/repair/build_index/embed）
4. GitHub Actions
    - `daily_generate_pr.yml`（生成→PR作成→`@codex review` コメント）
    - `pages_deploy.yml`（main push で Pages デプロイ）

5. README（セットアップ手順：Secrets設定、Pages設定、手動実行）
6. 最低限のテスト（Validator）

---

必要なら、この仕様書の「禁止APIルール（正規表現一覧）」「Geminiのプロンプト雛形（本番用）」「PRコメント文面（@codex review への追加指示）」も、Codexがそのまま使える形で別紙として切り出して渡せるように整形します。

[1]: https://ai.google.dev/gemini-api/docs/structured-output?utm_source=chatgpt.com "Structured outputs | Gemini API - Google AI for Developers"
[2]: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages?utm_source=chatgpt.com "Using custom workflows with GitHub Pages"
[3]: https://developers.openai.com/codex/integrations/github/?utm_source=chatgpt.com "Use Codex in GitHub"
[4]: https://developers.openai.com/codex/github-action/?utm_source=chatgpt.com "Codex GitHub Action"

以下は、前に出した仕様書の **Post JSON スキーマを v1.1 として「最小差分」で更新**したパッチです。
（＝ネタ切れ対策の4項目を追加し、`schema_version` を 1.1 に更新。既存キーは壊さない）

---

## Post JSON スキーマ v1.1（最小差分パッチ）

### 変更点サマリ

- `schema_version`: `"1.0"` → `"1.1"`
- 追加（必須）
    - `novelty_score`（0〜100）
    - `repeat_risk`（`"low" | "medium" | "high"`）
    - `near_duplicates`（最大3、`RECENT_CHART_IDS` から）
    - `fallback_candidates`（最大3、`repeat_risk == "high"` のとき必須 / それ以外は空配列推奨）

---

## 1) v1.0 → v1.1 の差分（追加・変更のみ）

```diff
 {
-  "schema_version": "1.0",
+  "schema_version": "1.1",
   "date": "YYYY-MM-DD",
   "title": "string",
   "chart_id": "string",
   "chart_name": "string",
   "novelty_reason": "string",
+  "novelty_score": 0,
+  "repeat_risk": "low",
+  "near_duplicates": ["string"],
+  "fallback_candidates": ["string"],
   "why_it_works": "string",
   "how_to_read": ["string", "string"],
   "sample_data_json": { "any": "json" },

   "transform_js": "string",
   "echarts_js": "string",
   "custom_series_js": "string",

   "paper": {
     "title": "string",
     "url": "string",
     "year": 2026,
     "venue": "string"
   },

   "safety": {
     "validator_version": "string",
     "attempts": 1,
     "violations": [
       {"rule_id": "NET_FETCH", "line": 12, "excerpt": "fetch(..."}
     ],
     "mode": "render|code_only|skip"
   },

   "generated_by": {
     "model": "gemini-xxx",
     "generated_at": "ISO-8601"
   }
 }
```

---

## 2) v1.1 フィールド定義（追加分のみ）

### `novelty_score`（必須）

- 型：number（整数推奨）
- 範囲：0〜100
- 意味：モデルが自己評価する「新規性・珍しさ」のスコア
    - 例：70以上を採用、70未満なら `repeat_risk` を上げる運用も可能

### `repeat_risk`（必須）

- 型：string
- 値：`"low" | "medium" | "high"`
- 意味：直近の投稿（RECENT_CHART_IDS）との被りやすさの自己判定

### `near_duplicates`（必須）

- 型：string[]
- 制約：最大3件
- 意味：被りそうな `chart_id` を `RECENT_CHART_IDS` の中から列挙
- `repeat_risk=low` でも空配列または少数を許容（運用で統一）

### `fallback_candidates`（必須）

- 型：string[]
- 制約：最大3件
- ルール：
    - `repeat_risk == "high"` の場合：**3件埋める（必須）**
    - `repeat_risk != "high"` の場合：空配列推奨（または候補を入れても良いが運用統一推奨）

- 意味：被りが濃いときの代替 `chart_id`（次回生成やRepair誘導に利用）

---

## 3) v1.1 の例（最小のサンプル）

```json
{
  "schema_version": "1.1",
  "date": "2026-02-13",
  "title": "UpSetで集合の交差を一発で読む",
  "chart_id": "upset",
  "chart_name": "UpSet Plot",
  "novelty_reason": "ベン図が破綻する多集合の交差を、棒＋行列で読みやすく表現する。",
  "novelty_score": 86,
  "repeat_risk": "low",
  "near_duplicates": [],
  "fallback_candidates": [],
  "why_it_works": "集合の交差を比較でき、主要な組合せをランキング形式で示せる。",
  "how_to_read": [
    "上の棒：交差（intersection）の大きさを読む",
    "下の行列：どの集合が交差に含まれるかを見る"
  ],
  "sample_data_json": { "sets": [], "memberships": [] },
  "transform_js": "/* ... */",
  "echarts_js": "option = { /* ... */ };",
  "custom_series_js": "",
  "paper": null,
  "safety": {
    "validator_version": "v0.3",
    "attempts": 1,
    "violations": [],
    "mode": "render"
  },
  "generated_by": {
    "model": "gemini-2.5-flash",
    "generated_at": "2026-02-13T00:12:34Z"
  }
}
```

---

## 4) 実装側（Codex向け）で追加すべき最小チェック

**JSON検証（Pydantic等）**で次だけ追加すると本番が安定します：

- `0 <= novelty_score <= 100`
- `repeat_risk in {"low","medium","high"}`
- `len(near_duplicates) <= 3`
- `len(fallback_candidates) <= 3`
- `repeat_risk == "high" => len(fallback_candidates) == 3`
- `near_duplicates` / `fallback_candidates` の要素は `kebab-case` を推奨（軽い正規表現でOK）

---

必要なら、この v1.1 を **Pydantic モデル（Python）**としてそのまま貼れる形（クラス定義）も出します。
