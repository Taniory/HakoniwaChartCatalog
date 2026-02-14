# `site/sandbox.html` 解説

## 1. 概要と役割
`site/sandbox.html` は、生成されたチャート描画コードを実行するための専用ランタイムです。  
親画面（`src/App.jsx`）から `iframe` で読み込まれ、ECharts の描画だけを担当します。

## 2. なぜ必要か（機能の必要性）
このファイルを分離している理由は、次の3点です。

- 生成コードの実行を親UIから分離し、画面全体への影響を限定するため
- 描画失敗時に親側を落とさず、`code_only` 表示へ安全にフォールバックするため
- 生成コード実行環境を固定し、日次生成の再現性を上げるため

## 3. 全体アーキテクチャでの位置づけ
実行関係は次のとおりです。

1. `src/App.jsx` が `iframe` に `site/sandbox.html` を読み込む  
2. 親が `postMessage` で `render` 指示を送る  
3. `sandbox.html` が生成コードを実行して ECharts を描画  
4. 成功なら `render_ok`、失敗なら `render_error` を親へ返す

## 4. 読み込みと初期化の流れ
`site/sandbox.html` 内の初期化処理は以下です。

- `#chart` 要素を描画先として確保
- 埋め込み済み ECharts バンドルを利用可能にする
- `resize` / `ResizeObserver` でチャートの再計算を行う
- `message` イベントを待機し、`render` 受信時に描画開始

## 5. メッセージ通信プロトコル
親子間では次の情報を使います。

- `type`: `render` / `render_ok` / `render_error`
- `request_id`: リクエストと応答を対応づけるID
- `channel_token`: 現在の親子セッションを識別するトークン

`sandbox.html` 側は `event.source === parent` と `channel_token` を確認し、想定外メッセージを無視します。

## 6. 描画実行フロー
`render` 受信後の処理順は固定です。

1. `sample_data_json` を複製して `rawData` / `transformedData` を初期化
2. `transform_js` 実行
3. `echarts_js` 実行
4. `custom_series_js` 実行
5. `option` を検証して `chart.setOption(option)` 実行

この順序を固定することで、生成コード側の期待値を一定にしています。

## 7. 安全性と制約
`sandbox.html` は次の制約で運用しています。

- `iframe sandbox="allow-scripts"`（親側設定）
- `Content-Security-Policy` による通信・埋め込み制限
- 親子通信での `request_id` / `channel_token` 照合
- `tooltip.formatter` / `dataView.optionToContent` のHTML出力をサニタイズ
- `link` / `sublink` のURLを許可リスト（http/https/相対URL）で検証
- `saveAsImage.name` をファイル名として安全な文字に正規化
- 危険API検出は `scripts/validate_generated_js.py` 側で実施

## 8. エラー処理とフォールバック
描画中に例外が出た場合は、`render_error` とエラーメッセージを親へ返します。  
親側（`src/App.jsx`）はタイムアウト監視と合わせて、表示を `code_only` 相当に切り替えます。

## 9. 運用とメンテナンス
ECharts 本体は `site/assets/echarts.inline.js` から `scripts/embed_echarts.py` で埋め込みます。  
運用時の要点は以下です。

- `/*__ECHARTS_INLINE_START__*/` と `/*__ECHARTS_INLINE_END__*/` マーカーを壊さない
- `site/sandbox.html` の通信項目（`request_id` / `channel_token`）を親側と揃える
- 変更後は `npm run build` と手動描画確認を行う

## 10. トレードオフ
生成コード実行の柔軟性を維持するため、sandbox 内で動的実行自体は必要です。  
その代わり、本プロジェクトでは次を併用してリスクを下げています。

- 実行分離（iframe）
- 厳格なCSP（`unsafe-eval` なし）
- 親子通信のトークン照合
- HTMLサニタイズとURL検証
- 事前バリデーション（禁止API検出）
