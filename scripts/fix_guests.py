#!/usr/bin/env python3
"""Fix missing guest names by extracting from episode titles."""
import json, re
from pathlib import Path

insights_dir = Path('data/insights')
transcripts_dir = Path('data/transcripts')
fixed = 0

for f in sorted(insights_dir.glob('*.json')):
    if 'sample' in f.name: continue
    d = json.load(open(f))
    guest = d.get('guest_name', '')
    
    if guest and guest.lower() not in ['unknown', 'not specified', 'not specified in text', 'steven bartlett', '']:
        continue
    
    # Get title from transcript
    title = d.get('episode_title', '')
    tf = transcripts_dir / f.name
    if tf.exists():
        td = json.load(open(tf))
        title = td.get('title', title)
    
    # Remove prefix
    title = re.sub(r'^The Diary Of A CEO with Steven Bartlett\s*-\s*', '', title)
    
    # Solo Steven Bartlett episodes (E1:, E2:, etc.)
    if re.match(r'^E\d+:', title) or title.startswith('Everything 2020') or title.startswith('How We Built') or title.startswith('I Tested Positive') or '6 BEST Pieces' in title:
        d['guest_name'] = 'Steven Bartlett'
        json.dump(d, open(f, 'w'), indent=2, ensure_ascii=False)
        fixed += 1
        continue
    
    # "Moment" clips - guest usually after colon at end: "Moment 101 - Topic: Guest Name"
    m = re.search(r':\s*([A-Z][a-z]+ (?:[A-Z][a-z]+\s*)+)$', title)
    if m:
        d['guest_name'] = m.group(1).strip()
        json.dump(d, open(f, 'w'), indent=2, ensure_ascii=False)
        fixed += 1
        continue
    
    # "Guest Name:" at start
    m = re.match(r'^([A-Z][a-zA-Z\.\s]+?)(?:\s*:|\s*-)\s', title)
    if m and len(m.group(1).split()) <= 5:
        d['guest_name'] = m.group(1).strip()
        json.dump(d, open(f, 'w'), indent=2, ensure_ascii=False)
        fixed += 1
        continue
    
    # "Most Replayed Moment" - try to find guest
    m = re.search(r'-\s*([A-Z][a-z]+ [A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s*$', title)
    if m:
        d['guest_name'] = m.group(1).strip()
        json.dump(d, open(f, 'w'), indent=2, ensure_ascii=False)
        fixed += 1
        continue

print(f'Fixed {fixed} guest names')

# Recount remaining unknowns
remaining = 0
for f in sorted(insights_dir.glob('*.json')):
    if 'sample' in f.name: continue
    d = json.load(open(f))
    guest = d.get('guest_name', '')
    if not guest or guest.lower() in ['unknown', 'not specified', 'not specified in text']:
        remaining += 1
        
print(f'Remaining unknown: {remaining}')
