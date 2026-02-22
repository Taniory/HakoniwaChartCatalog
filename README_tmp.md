# Daily Uncommon Charts

Gemini で日次のチャート投稿 JSON を生成し、React + sandbox iframe で描画するプロジェクトです。  
公開先は GitHub Pages (`site/`) です。

現在のリリースチャンネル: `alpha`（`0.1.0-alpha.1`）

## 生成AIの利用

- 本プロジェクトの投稿コンテンツと描画コードは生成AIを利用して作成しています。
- 生成結果はバリデーションと手動確認を前提に運用してください。

## リポジトリ構成

```text
src/                        # React UI
  sandbox/
    template.html           # 生成 JS 実行用 sandbox のソース (コミット対象)
site/
  index.html                # Vite ビルド出力
  sandbox.html              # template.html から自動生成されたアーティファクト (gitignore)
  posts/                    # 日次投稿 JSON
  assets/echarts.inline.js  # 埋め込み ECharts
  state/
    config.json             # 生成設定
    history.json            # 直近 chart_id 履歴
scripts/
  generate_daily_post.py
  validate_generated_js.py
  repair_with_gemini.py
  build_index.py
  embed_echarts.py
.github/workflows/
  daily_generate_pr.yml
  pages_deploy.yml
```

## 前提環境

- Python 3.11+
- Node.js 20+

## セットアップ

```bash
pip install -r requirements.txt
npm install
```

必要な環境変数:

- `GEMINI_API_KEY`

## ローカル実行

1. 日次投稿生成（LLM）

```bash
python -m scripts.generate_daily_post --date 2026-02-13
```

2. 生成 JS 検証と修復

```bash
python -m scripts.validate_generated_js --date 2026-02-13
python -m scripts.repair_with_gemini --date 2026-02-13 --max-attempts 2
python -m scripts.validate_generated_js --date 2026-02-13 --allow-violations
```

3. サンドボックス初期化と埋め込み

```bash
python -m scripts.init_sandbox_template
python -m scripts.embed_echarts
python -m scripts.embed_dompurify
npm run embed:sandbox-runtime
python -m scripts.build_index
```

4. フロント確認

```bash
npm run dev
```

## テスト

```bash
python -m unittest discover -s tests -p "test_*.py" -v
npm run build
```

## GitHub Actions

### `daily_generate_pr.yml`

- 毎日 UTC 00:10 に実行（`workflow_dispatch` でも手動実行可）
- `generate -> validate -> repair -> re-validate -> build_index -> embed` を実行
- 自動で日次 PR を作成

### `pages_deploy.yml`

- `main` への push で `npm run build`
- `site/` を GitHub Pages にデプロイ

## 運用メモ

- 生成前にプロンプトの簡易 PII チェックを実施
- `paper` や `generated_by` が不正な型でも、保存前に正規化してから Pydantic 検証
- `chart_candidates` は「例示」であり、LLM は候補外の `chart_id` を自由に提案可能
- `sandbox.html` との通信は `request_id` と `channel_token` で照合して処理
