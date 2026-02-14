"""
ECharts バンドルを `site/sandbox.html` にインライン埋め込みする補助スクリプト。

なぜ埋め込むか:
- sandbox 側で外部 CDN 読み込みを避け、`iframe sandbox` + 厳格 CSP 方針を維持するため。
- ネットワーク障害や CDN 変更の影響を受けず、描画を安定させるため。
- 生成コード実行環境を 1 ファイル内で完結させ、再現性を上げるため。

使い方:
1. `site/assets/echarts.inline.js` に ECharts 本体（minified JS）を配置する。
2. `python -m scripts.embed_echarts` を実行する。
3. `site/sandbox.html` の `/*__ECHARTS_INLINE_START__*/` から
   `/*__ECHARTS_INLINE_END__*/` の間が置換される。
"""
import re
from scripts.common import SITE_DIR

# `site/sandbox.html` 内のマーカー。
# このマーカー間をローカルの ECharts バンドルで置換する。
START = "/*__ECHARTS_INLINE_START__*/"
END = "/*__ECHARTS_INLINE_END__*/"


def main() -> int:
    # リポジトリ構成に基づく固定パス（入力バンドルと出力先HTML）。
    sandbox_path = SITE_DIR / "sandbox.html"
    bundle_path = SITE_DIR / "assets" / "echarts.inline.js"

    sandbox_html = sandbox_path.read_text(encoding="utf-8")
    bundle = bundle_path.read_text(encoding="utf-8").strip()

    # 空バンドルだと壊れた sandbox.html を生成してしまうため即時失敗させる。
    if not bundle:
        raise SystemExit(f"{bundle_path} is empty. Place ECharts source first.")

    # 非貪欲マッチで、対象のマーカーブロックだけを正確に捕捉する。
    pattern = re.compile(
        rf"{re.escape(START)}.*?{re.escape(END)}",
        re.DOTALL,
    )

    # テンプレート側のマーカー欠落を明示的に検出する。
    if not pattern.search(sandbox_html):
        raise SystemExit("Inline markers were not found in site/sandbox.html")

    # 想定外の複数ブロック書き換えを避けるため、最初の1箇所のみ置換する。
    replacement = f"{START}\n{bundle}\n    {END}"
    # 置換文字列内の `\d` などを正規表現エスケープとして解釈させないため、
    # 関数形式でそのまま文字列を返す。
    patched = pattern.sub(lambda _m: replacement, sandbox_html, count=1)
    sandbox_path.write_text(patched, encoding="utf-8", newline="\n")
    print(f"embedded: {bundle_path} -> {sandbox_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
