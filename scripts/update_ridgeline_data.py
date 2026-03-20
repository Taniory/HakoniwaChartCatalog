import json
import math
import sys
from pathlib import Path

file_path = Path(__file__).resolve().parents[1] / "site" / "posts" / "2026-04-10T000000Z.json"

with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

rows = []
for i, month in enumerate(months):
    # Peak shifts from x=5 (Jan) to x=25 (Aug) and back
    if i <= 7: # Jan to Aug
        peak_x = 5 + (20 * (i / 7))
    else: # Sep to Dec
        peak_x = 25 - (15 * ((i - 7) / 4))
    
    peak_d = 12 + (i % 3) * 2 # Some variance in height
    spread = 6 + (i % 2) * 2  # Variance in width
    
    # Generate dense points
    for x_i in range(0, 31 * 2 + 1):
        x = x_i / 2.0  # 0.0, 0.5, 1.0, ..., 30.0
        # Gaussian curve
        d = peak_d * math.exp(-((x - peak_x)**2) / (spread**2))
        rows.append({"cat": month, "x": x, "d": round(d, 2)})

data["sample_data_json"]["rows"] = rows

# Replace hardcoded categories array with dynamic extraction from rows
transform_js = data["transform_js"]
transform_js = transform_js.replace("const categories=['Jan','Feb','Mar'];", "const categories=Array.from(new Set(rawData.rows.map(r=>r.cat)));")
data["transform_js"] = transform_js

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Successfully updated ridgeplot data.")
