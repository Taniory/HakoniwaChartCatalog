import glob
import re
import json

files = glob.glob('site/posts/2026-03-*.json')
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    # We want to replace actual string characters "\n" but ONLY inside the sample_data_json block
    # Actually, simpler: just remove "\\n" if it's literally breaking the json
    # Let's fix the specific patterns:
    content = content.replace('"sample_data_json": {\\n', '"sample_data_json": {\n')
    content = content.replace('\\n    "rows": [\\n', '\n    "rows": [\n')
    content = content.replace('      {', '{')
    # If the lines have `\n      {`, let's just do:
    content = content.replace('\\n      ', '\n      ')
    content = content.replace(' },\\n', ' },\n')
    content = content.replace(' ]\\n', ' ]\n')
    content = content.replace('\\n    ]\\n', '\n    ]\n')
    content = content.replace('  }\\n', '  }\n')
    content = content.replace('\\n  },', '\n  },')

    # Double check if it parses
    try:
        json.loads(content)
        with open(f, 'w', encoding='utf-8') as out:
            out.write(content)
        print(f"Fixed {f}")
    except json.JSONDecodeError as e:
        print(f"Still broken {f}: {e}")
