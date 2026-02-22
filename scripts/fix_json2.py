import glob
import json
import os

files = glob.glob('site/posts/2026-03-*.json')
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # 1. Replace all literal "\n" character sequences with ACTUAL newlines.
    # This fixes the formatting of the JSON structure, but also introduces
    # real newlines inside string values (like transform_js).
    content = content.replace('\\n', '\n')
    
    try:
        # 2. Parse the JSON. strict=False allows unescaped newlines inside strings!
        obj = json.loads(content, strict=False)
        
        # 3. Dump it back out to properly encode the newlines inside strings as \n
        with open(f, 'w', encoding='utf-8') as out:
            json.dump(obj, out, ensure_ascii=False, indent=2)
        print(f"Successfully fixed {f}")
    except Exception as e:
        print(f"Failed to fix {f}: {e}")
