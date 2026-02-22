"""
Initialize `site/sandbox.html` from `src/sandbox/template.html`.
Run this script before any embed scripts to ensure a clean slate.
"""

import shutil
from scripts.common import ROOT_DIR, SITE_DIR

def main() -> int:
    template_path = ROOT_DIR / "src" / "sandbox" / "template.html"
    sandbox_path = SITE_DIR / "sandbox.html"
    
    if not template_path.exists():
        raise SystemExit(f"Template not found: {template_path}")
        
    shutil.copy2(template_path, sandbox_path)
    print(f"Initialized {sandbox_path.name} from template.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
