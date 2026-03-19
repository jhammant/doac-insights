#!/usr/bin/env python3
"""Fix missing guest names by extracting from episode titles."""
import json, re
from pathlib import Path

insights_dir = Path('data/insights')
transcripts_dir = Path('data/transcripts')

# Manual mappings for tricky titles
MANUAL_GUEST_MAP = {
    'moment-156-your-stress-is-making-you-fat-sick-heres-how-to-fix-it': 'Dr. Rangan Chatterjee',
    'moment-163-happiness-expert-reveals-the-one-type-of-person-you-should-never-date': 'Arthur Brooks',
    'moment-193-hard-work-doesnt-equal-successtry-this-instead-former-netflix-ceo': 'Marc Randolph',
    'moment-200-love-expert-reveals-why-80-of-modern-relationships-fail': 'Matthew Hussey',
    'moment-203-how-to-actually-become-disciplined-without-willpower-the-leading-behaviour-expert': 'Wendy Wood',
    'moment-94-doctor-julie-the-one-simplifying-thing-that-will-transform-your-life': 'Dr. Julie Smith',
    'moment-4-how-i-discovered-a-more-grateful-perspective': 'Steven Bartlett',
    'the-top-7-belly-fat-burning-hacks-for-2024-that-are-proven-to-work': 'Steven Bartlett',
    'moment-17-russell-kane-reveals-the-simple-path-to-success': 'Russell Kane',
    'moment-21-professor-green-on-the-source-of-your-success': 'Professor Green',
    'moment-7-joe-wicks-on-how-to-forgive-set-yourself-free': 'Joe Wicks',
    'moment-70-how-jonny-wilkinson-made-it-to-the-top': 'Jonny Wilkinson',
    'moment-83-jay-shettys-4-pillars-for-long-lasting-relationships': 'Jay Shetty',
}

fixed = 0

for f in sorted(insights_dir.glob('*.json')):
    if 'sample' in f.name: continue
    d = json.load(open(f))
    guest = d.get('guest_name', '')

    if guest and guest.lower() not in ['unknown', 'not specified', 'not specified in text', 'steven bartlett', '', 'none']:
        continue

    # Check manual mapping first
    file_key = f.stem
    if file_key in MANUAL_GUEST_MAP:
        d['guest_name'] = MANUAL_GUEST_MAP[file_key]
        json.dump(d, open(f, 'w'), indent=2, ensure_ascii=False)
        fixed += 1
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
    if re.match(r'^E\d+:', title) or title.startswith('Everything 2020') or title.startswith('How We Built') or title.startswith('I Tested Positive') or '6 BEST Pieces' in title or '7 Belly Fat' in title:
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
