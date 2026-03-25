#!/usr/bin/env python3
"""Fix guest names, add quote of the day data, add episode count badges to consensus."""

import json
import re
import os
import copy

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB_DATA = os.path.join(BASE, 'web', 'data')
DOCS_DATA = os.path.join(BASE, 'docs', 'data')

# ── Episode ID → correct guest name mapping (extracted from titles) ──
GUEST_MAP = {
    'moment-128-how-to-fix-your-sexless-relationship-tracey-cox': 'Tracey Cox',
    'most-replayed-moment-can-eye-movements-heal-trauma-bessel-van-der-kolk-explains-emdr-therapy': 'Bessel Van Der Kolk',
    'most-replayed-moment-calories-in-calories-out-is-a-myth-why-most-diets-fail-dr-jason-fung': 'Dr. Jason Fung',
    'most-replayed-moment-the-science-of-building-muscle-faster-with-smarter-training-dr-mike-israetel': 'Dr. Mike Israetel',
    'most-replayed-moment-why-youre-never-satisfied-the-4-pillars-of-lasting-happiness': 'Steven Bartlett',
    'moment-110-the-unknown-and-surprising-power-of-physical-touch-dacher-keltner': 'Dacher Keltner',
    'moment-131-why-you-need-to-start-embracing-all-your-emotions-dr-julie-smith': 'Dr. Julie Smith',
    'moment-132-triple-your-life-expectancy-with-these-3-health-hacks-verified-by-dana-white-gary-brecka': 'Gary Brecka',
    'moment-156-your-stress-is-making-you-fat-sick-heres-how-to-fix-it': 'Steven Bartlett',
    'moment-163-happiness-expert-reveals-the-one-type-of-person-you-should-never-date': 'Steven Bartlett',
    'moment-166-what-men-women-need-to-know-about-the-menstrual-cycle-dr-mindy-pelz': 'Dr. Mindy Pelz',
    'moment-17-russell-kane-reveals-the-simple-path-to-success': 'Russell Kane',
    'moment-187-the-pregnancy-doctor-reveals-3-ways-to-increase-your-chances-of-pregnancy-naturally': 'Steven Bartlett',
    'moment-190-everything-you-definitely-dont-know-about-marketing-but-should-from-4-world-leading-experts': 'Multiple Experts (Panel)',
    'moment-193-hard-work-doesnt-equal-successtry-this-instead-former-netflix-ceo': 'Marc Randolph',
    'moment-200-love-expert-reveals-why-80-of-modern-relationships-fail': 'Steven Bartlett',
    'moment-203-how-to-actually-become-disciplined-without-willpower-the-leading-behaviour-expert': 'Steven Bartlett',
    'moment-21-professor-green-on-the-source-of-your-success': 'Professor Green',
    'moment-212-the-dangerous-truth-behind-sugar-free': 'Steven Bartlett',
    'moment-4-how-i-discovered-a-more-grateful-perspective': 'Steven Bartlett',
    'moment-54-how-you-should-make-every-big-decision-rochelle-humes': 'Rochelle Humes',
    'moment-62-mens-mental-health-isnt-talked-about-enough-heres-why-roman-kemp': 'Roman Kemp',
    'moment-7-joe-wicks-on-how-to-forgive-set-yourself-free': 'Joe Wicks',
    'moment-70-how-jonny-wilkinson-made-it-to-the-top': 'Jonny Wilkinson',
    'moment-83-jay-shettys-4-pillars-for-long-lasting-relationships': 'Jay Shetty',
    'moment-94-doctor-julie-the-one-simplifying-thing-that-will-transform-your-life': 'Dr. Julie Smith',
    'moment-95-a-simple-hack-to-achieve-maximum-happiness-mo-gowdat': 'Mo Gawdat',
    'sample001': 'Mo Gawdat',
    'sample002': 'Steven Bartlett',
    'sample003': 'Simon Sinek',
    'sample004': 'Steven Bartlett',
    'sample005': 'Steven Bartlett',
    'the-top-7-money-making-hacks-for-2025-that-are-proven-to-work-do-not-buy-a-house-do-this-instead': 'Steven Bartlett',
}

BAD_PATTERNS = [
    'unclear', 'unspecified', 'not specified', 'unknown',
    'Rochelle (Unclear'
]

def is_bad_guest(name):
    if not name:
        return True
    lower = name.lower()
    return any(p.lower() in lower for p in BAD_PATTERNS)

def fix_guest_name(item):
    """Fix a single item's guest name using episode_id mapping or title parsing."""
    if not is_bad_guest(item.get('guest', '')):
        return False

    eid = item.get('episode_id', '')
    if eid in GUEST_MAP:
        item['guest'] = GUEST_MAP[eid]
        return True

    # Try to extract from title
    title = item.get('episode_title', '')
    # Pattern: "... : Guest Name" or "... - Guest Name" at end
    m = re.search(r'[-:]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*$', title)
    if m:
        item['guest'] = m.group(1)
        GUEST_MAP[eid] = m.group(1)
        return True

    # If it's a solo Steven Bartlett episode
    if 'steven bartlett' in title.lower() and 'with' not in title.lower().split('steven bartlett')[0][-20:]:
        item['guest'] = 'Steven Bartlett'
        return True

    return False

def fix_list_data(data):
    """Fix guest names in a list of items."""
    fixed = 0
    for item in data:
        if fix_guest_name(item):
            fixed += 1
        # Also fix in nested guests lists
        if 'guests' in item and isinstance(item['guests'], list):
            item['guests'] = [GUEST_MAP.get(g, g) if is_bad_guest(g) else g for g in item['guests']]
    return fixed

def fix_consensus_data(data):
    """Fix guest names in consensus data and ensure episode_count badges."""
    fixed = 0
    for theme in data:
        # Fix guests in examples
        if 'examples' in theme:
            for ex in theme['examples']:
                if fix_guest_name(ex):
                    fixed += 1
        # Fix guests list
        if 'guests' in theme:
            new_guests = []
            for g in theme['guests']:
                if is_bad_guest(g):
                    fixed += 1
                else:
                    new_guests.append(g)
            theme['guests'] = new_guests
            theme['guest_count'] = len(new_guests)

        # Ensure insight-level data for consensus badges
        if 'insights' in theme:
            for ins in theme['insights']:
                if fix_guest_name(ins):
                    fixed += 1
    return fixed

def fix_guests_json(data):
    """Fix the guests.json file - merge bad entries into correct ones."""
    good_guests = {}
    bad_entries = []

    for guest in data:
        if is_bad_guest(guest['name']):
            bad_entries.append(guest)
        else:
            good_guests[guest['name']] = guest

    # Reassign bad entries' episodes to correct guests
    for bad in bad_entries:
        for ep in bad.get('episodes', []):
            # Try to find correct guest from episode title
            title = ep.get('title', '')
            eid = ep.get('id', '')
            correct_name = GUEST_MAP.get(eid)

            if not correct_name:
                m = re.search(r'[-:]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s*$', title)
                if m:
                    correct_name = m.group(1)

            if correct_name and correct_name in good_guests:
                # Add episode to existing guest if not already there
                existing_ids = {e['id'] for e in good_guests[correct_name]['episodes']}
                if eid not in existing_ids:
                    good_guests[correct_name]['episodes'].append(ep)
                    good_guests[correct_name]['episode_count'] = len(good_guests[correct_name]['episodes'])
            elif correct_name:
                # Create new guest entry
                good_guests[correct_name] = {
                    'name': correct_name,
                    'episode_count': 1,
                    'episodes': [ep],
                    'expertise': bad.get('expertise', 'Various'),
                    'insights_count': bad.get('insights_count', 0),
                    'advice_count': bad.get('advice_count', 0),
                    'topics': bad.get('topics', [])
                }

    return list(good_guests.values())

def build_quotes_data(advice_data, insights_data, consensus_data):
    """Build a quotes.json file for Quote of the Day feature."""
    quotes = []

    # Pull compelling quotes from advice
    for item in advice_data:
        if item.get('quote') and len(item['quote']) > 30 and not is_bad_guest(item.get('guest', '')):
            quotes.append({
                'text': item['quote'],
                'guest': item['guest'],
                'episode': item.get('episode_title', ''),
                'context': item.get('advice', '')
            })

    # Pull from top insights
    for item in insights_data:
        if item.get('quote') and len(item['quote']) > 30 and not is_bad_guest(item.get('guest', '')):
            quotes.append({
                'text': item['quote'],
                'guest': item['guest'],
                'episode': item.get('episode_title', ''),
                'context': item.get('insight', '')
            })

    # Pull from consensus examples
    for theme in consensus_data:
        for ex in theme.get('examples', []):
            if ex.get('quote') and len(ex['quote']) > 30 and not is_bad_guest(ex.get('guest', '')):
                quotes.append({
                    'text': ex['quote'],
                    'guest': ex['guest'],
                    'episode': ex.get('episode_title', ''),
                    'context': theme.get('claim', theme.get('theme', ''))
                })

    # Deduplicate by quote text
    seen = set()
    unique = []
    for q in quotes:
        key = q['text'][:80]
        if key not in seen:
            seen.add(key)
            unique.append(q)

    # Sort by length (prefer medium-length quotes)
    unique.sort(key=lambda q: abs(len(q['text']) - 150))

    # Cap at 200 best quotes
    return unique[:200]

def main():
    # Load all data
    files = {}
    for fname in ['advice.json', 'contrarian.json', 'top_insights.json', 'consensus.json', 'guests.json']:
        with open(os.path.join(WEB_DATA, fname)) as f:
            files[fname] = json.load(f)

    # Fix guest names
    print("Fixing guest names...")
    fixed_advice = fix_list_data(files['advice.json'])
    print(f"  advice.json: {fixed_advice} fixes")

    fixed_contrarian = fix_list_data(files['contrarian.json'])
    print(f"  contrarian.json: {fixed_contrarian} fixes")

    fixed_insights = fix_list_data(files['top_insights.json'])
    print(f"  top_insights.json: {fixed_insights} fixes")

    fixed_consensus = fix_consensus_data(files['consensus.json'])
    print(f"  consensus.json: {fixed_consensus} fixes")

    # Fix guests.json
    print("Fixing guests.json...")
    files['guests.json'] = fix_guests_json(files['guests.json'])
    print(f"  {len(files['guests.json'])} clean guest entries")

    # Build quotes data
    print("Building quotes.json...")
    quotes = build_quotes_data(files['advice.json'], files['top_insights.json'], files['consensus.json'])
    print(f"  {len(quotes)} quotes collected")

    # Save everything to both web/ and docs/
    for output_dir in [WEB_DATA, DOCS_DATA]:
        os.makedirs(output_dir, exist_ok=True)
        for fname, data in files.items():
            with open(os.path.join(output_dir, fname), 'w') as f:
                json.dump(data, f, indent=2)
        with open(os.path.join(output_dir, 'quotes.json'), 'w') as f:
            json.dump(quotes, f, indent=2)

    print("Done! All files saved to web/data/ and docs/data/")

if __name__ == '__main__':
    main()
