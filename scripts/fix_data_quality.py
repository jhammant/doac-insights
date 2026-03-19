#!/usr/bin/env python3
"""Fix data quality issues in insights."""
import json, re
from pathlib import Path

insights_dir = Path('data/insights')
fixed_guests = 0
fixed_unclear = 0

BAD_GUESTS = [
    'unclear from provided transcript',
    'unclear from the provided transcript', 
    'not specified', 'not specified in text',
    'unknown', 'n/a', 'none', ''
]

for f in sorted(insights_dir.glob('*.json')):
    if 'sample' in f.name: continue
    d = json.load(open(f))
    changed = False
    
    guest = d.get('guest_name', '') or ''
    
    # Fix bad guest names from title
    if guest.lower().strip() in BAD_GUESTS:
        title = d.get('episode_title', '')
        # Remove prefix
        title = re.sub(r'^The Diary Of A CEO with Steven Bartlett\s*-\s*', '', title)
        
        # Try "Name Name:" at start
        m = re.match(r'^(?:Dr\.?\s+)?([A-Z][a-z]+ (?:[A-Z]\.?\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*[:\-]', title)
        if m:
            d['guest_name'] = m.group(1).strip()
            changed = True
            fixed_guests += 1
        # Try name at end after colon/dash  
        elif not changed:
            m = re.search(r'[:\-]\s*(?:Dr\.?\s+)?([A-Z][a-z]+ (?:[A-Z]\.?\s+)?[A-Z][a-z]+(?:\s+(?:MBE|CBE|OBE|PhD|MD))?)\s*$', title)
            if m:
                d['guest_name'] = m.group(1).strip()
                changed = True
                fixed_guests += 1
    
    # Clean up "Unclear from provided transcript" in all text fields
    for key_insight in d.get('key_insights', []):
        for field in ['validated_by', 'quote', 'insight']:
            val = str(key_insight.get(field, ''))
            if 'unclear from' in val.lower() or 'not specified' in val.lower():
                if field == 'validated_by':
                    key_insight[field] = d.get('guest_name', 'Unknown')
                    changed = True
                    fixed_unclear += 1
    
    # Fix contrarian claims with bad attribution
    for claim in d.get('contrarian_claims', []):
        if isinstance(claim, dict):
            who = str(claim.get('who_said_it', ''))
            if who.lower().strip() in BAD_GUESTS or 'unclear' in who.lower():
                claim['who_said_it'] = d.get('guest_name', 'Unknown')
                changed = True
    
    if changed:
        json.dump(d, open(f, 'w'), indent=2, ensure_ascii=False)

print(f'Fixed {fixed_guests} more guest names')
print(f'Fixed {fixed_unclear} "unclear" attributions')

# Final count of remaining issues
remaining_bad = 0
for f in sorted(insights_dir.glob('*.json')):
    if 'sample' in f.name: continue
    d = json.load(open(f))
    g = (d.get('guest_name', '') or '').lower().strip()
    if g in BAD_GUESTS:
        remaining_bad += 1
print(f'Remaining bad guests: {remaining_bad}')
