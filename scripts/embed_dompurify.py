"""
Embed DOMPurify into `site/sandbox.html`.

This script updates two files:
1. `site/assets/dompurify.inline.js`
2. `site/sandbox.html` between inline markers
"""

import re
from scripts.common import ROOT_DIR, SITE_DIR

START = "/*__DOMPURIFY_INLINE_START__*/"
END = "/*__DOMPURIFY_INLINE_END__*/"


def _load_bundle() -> str:
    source_path = ROOT_DIR / "node_modules" / "dompurify" / "dist" / "purify.min.js"
    bundle_path = SITE_DIR / "assets" / "dompurify.inline.js"

    if source_path.exists():
        bundle = source_path.read_text(encoding="utf-8").strip()
        bundle = re.sub(r"\n//# sourceMappingURL=.*$", "", bundle, flags=re.MULTILINE).strip()
        if not bundle:
            raise SystemExit(f"{source_path} is empty.")
        bundle_path.write_text(bundle + "\n", encoding="utf-8", newline="\n")
        return bundle

    if bundle_path.exists():
        bundle = bundle_path.read_text(encoding="utf-8").strip()
        bundle = re.sub(r"\n//# sourceMappingURL=.*$", "", bundle, flags=re.MULTILINE).strip()
        if bundle:
            return bundle

    raise SystemExit(
        "DOMPurify bundle was not found. Install dependency first: npm install dompurify"
    )


def main() -> int:
    sandbox_path = SITE_DIR / "sandbox.html"
    sandbox_html = sandbox_path.read_text(encoding="utf-8")
    bundle = _load_bundle()

    pattern = re.compile(
        rf"{re.escape(START)}.*?{re.escape(END)}",
        re.DOTALL,
    )
    if not pattern.search(sandbox_html):
        raise SystemExit("Inline markers were not found in site/sandbox.html")

    replacement = f"{START}\n{bundle}\n    {END}"
    patched = pattern.sub(lambda _m: replacement, sandbox_html, count=1)
    sandbox_path.write_text(patched, encoding="utf-8", newline="\n")
    print(f"embedded: DOMPurify -> {sandbox_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
