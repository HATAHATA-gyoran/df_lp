
import json
import os

try:
    with open('src/data/fish.json', 'r', encoding='utf-8-sig') as f:
        data = json.load(f)

    fish_list = data.get('fish', [])
    ranks = sorted([f['rank'] for f in fish_list if isinstance(f.get('rank'), int)])
    
    with open('scripts/rank_report.txt', 'w', encoding='utf-8') as f_out:
        f_out.write(f"Total fish defined: {len(fish_list)}\n")
        if ranks:
            max_rank = max(ranks)
            f_out.write(f"Rank range: 1 to {max_rank}\n")
            
            missing = []
            for r in range(1, max_rank + 1):
                if r not in ranks:
                    missing.append(r)
            
            if missing:
                f_out.write(f"Found {len(missing)} missing ranks:\n")
                f_out.write(str(missing) + "\n")
            else:
                f_out.write("No missing ranks found.\n")
                
            seen = set()
            duplicates = [x for x in ranks if x in seen or seen.add(x)]
            if duplicates:
                f_out.write(f"Found duplicate ranks: {duplicates}\n")
            
except Exception as e:
    print(f"Error: {e}")
