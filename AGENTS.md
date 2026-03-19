Always review in Japanese.

## 開発前提

- 開発環境は Windows を想定すること。
- 日本語と英単語・数値の間には半角スペースを入れること。
- 例: `111円です` ではなく `111 円です`

## セキュリティレビュー方針（必須）

以下はレビュー時の必須確認項目です。実装・変更時は常に満たしてください。

### 1) ECharts Security Guidelines の遵守

- ECharts 公式の Security Guidelines に沿って設計・実装すること。
- `tooltip.formatter` など HTML を返せる箇所は、必ずサニタイズしてから描画すること。
- `link` / `sublink` 等の URL は許可リスト方式で検証し、未許可スキーム・ホストを拒否すること。
- `toolbox.saveAsImage` 等の外部露出パラメータ（例: ファイル名）は安全な文字へ制限すること。
- 入力データ（投稿 JSON、LLM 出力、ユーザー入力）を信頼せず、検証・正規化を行うこと。

### 2) LLM 生成コードを安全に実行できる構成

- LLM が生成した JavaScript は、アプリ本体と分離したサンドボックス（`iframe sandbox`）でのみ実行すること。
- CSP は `unsafe-eval` に依存しない構成を維持すること。
- 実行前に静的検証（禁止パターン検査、URL 検査、スキーマ検証）を通すこと。
- 検証失敗時はフェイルクローズし、`code_only` / `skip` へフォールバックして継続可能にすること。
- `render` 以外へ遷移した際は描画フレームを必ずリセットし、古い可視化が残らないこと。

### 3) CI / 運用での担保

- 生成物の安全モード（`render` / `code_only` / `skip`）が UI と整合することを確認すること。
- セキュリティ要件を緩和する変更は、理由と影響を README / docs に明記すること。

## 改行コード方針

- 文字コードは UTF-8 を使用すること。
- 改行コードは、`repository` 上は `LF` を正とすること。
- `Windows` ローカル環境では `CRLF` で作業してよいこと。
- `.gitattributes` は `* text=auto` を基本とし、`Git` の正規化で `commit` 時に `LF` へ統一すること。
- `line ending` を変更する設定変更時は、影響範囲を `README` または `docs` に明記すること。
