import json
import random
from pathlib import Path

filepath = Path(__file__).resolve().parents[1] / "site" / "posts" / "2026-02-22T133548Z.json"

with open(filepath, "r", encoding="utf-8") as f:
    data = json.load(f)

data["data_requirements"] = [
    {
        "name": "day",
        "type": "categorical",
        "description": "曜日 (月〜日)"
    },
    {
        "name": "hour",
        "type": "categorical",
        "description": "時間 (0〜23)"
    },
    {
        "name": "value",
        "type": "numerical",
        "description": "活動量などの数値"
    }
]

days = ["月", "火", "水", "木", "金", "土", "日"]
rows = []
for day in days:
    for hour in range(24):
        # generate meaningful sample data: 
        # Peaks: 8-10h, 12-13h (lunch), 18-21h (evening)
        # Lows: 1-5h (deep sleep)
        if 8 <= hour <= 10:
            base = 60 + random.randint(0, 20)
        elif 12 <= hour <= 13:
            base = 50 + random.randint(0, 15)
        elif 18 <= hour <= 21:
            base = 70 + random.randint(0, 25)
        elif 1 <= hour <= 5:
            base = 5 + random.randint(0, 5)
        else:
            base = 25 + random.randint(0, 15)
            
        weekend_mult = 1.3 if day in ["土", "日"] else 1.0
        val = int(base * weekend_mult)
        rows.append({
            "day": day,
            "hour": hour,
            "value": val
        })

data["sample_data_json"]["rows"] = rows
data["optimal_conditions"] = {
    "max_items": 1000,
    "requires_negative": False
}

with open(filepath, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Updated 2026-02-22T133548Z.json with valid sample data.")
