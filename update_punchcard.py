import json
import random

file_path = "site/posts/2026-03-27T000000Z.json"

with open(file_path, "r", encoding="utf-8") as f:
    data = json.load(f)

days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
hours = [f"{h}:00" for h in range(24)]

rows = []
for y in days: # Now y is days
    for x in hours: # Now x is hours
        val = random.randint(0, 5)
        h = int(x.split(':')[0])
        if 9 <= h <= 18 and y not in ['Sat', 'Sun']:
            val += random.randint(15, 40)
        elif y in ['Sat', 'Sun'] and 10 <= h <= 22:
            val += random.randint(10, 25)
        
        # Add some random spikes
        if random.random() < 0.05:
            val += random.randint(20, 50)
            
        rows.append({"x": x, "y": y, "val": val})

data["sample_data_json"] = {"rows": rows}

# Update transform_js
data["transform_js"] = "const yNames=['Mon','Tue','Wed','Thu','Fri','Sat','Sun']; const xNames=Array.from({length:24}, (_, i) => i+':00'); const data=[]; rawData.rows.forEach(r=>{ data.push([ xNames.indexOf(r.x), yNames.indexOf(r.y), r.val ]); }); transformedData={xNames, yNames, data};"

with open(file_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Updated 2026-03-27T000000Z.json with swapped X and Y")
