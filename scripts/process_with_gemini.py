#!/usr/bin/env python3
"""
Process transcripts using Gemini API to extract insights.
Extracts guest info, key insights, topics, advice, stories, and contrarian claims.
"""

import json
import sys
import os
from pathlib import Path
import time

# Install google-genai if not present
try:
    import google.genai as genai
except ImportError:
    import subprocess
    print("Installing google-genai...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "google-genai"])
    import google.genai as genai

# Paths
TRANSCRIPTS_DIR = Path(__file__).parent.parent / "data" / "transcripts"
INSIGHTS_DIR = Path(__file__).parent.parent / "data" / "insights"
API_KEY_FILE = Path.home() / ".config" / "gemini" / "api-key.json"

# Load API key
with open(API_KEY_FILE, 'r') as f:
    config = json.load(f)
    API_KEY = config['apiKey']

# System prompt for extraction
EXTRACTION_PROMPT_TEMPLATE = """
Analyze this podcast transcript and extract structured insights. Return ONLY valid JSON with no markdown formatting, no code blocks, just the raw JSON.

The JSON should have this exact structure:
{{
  "guest_name": "Full name of the guest",
  "expertise_area": "Primary expertise (e.g., 'Neuroscience', 'Business Strategy', 'Finance')",
  "key_insights": [
    {{
      "insight": "One sentence summary of the insight",
      "quote": "Most impactful direct quote that supports this",
      "importance": "high/medium/low"
    }}
  ],
  "topics": ["business", "health", "psychology", ...],
  "actionable_advice": [
    {{
      "advice": "Specific actionable recommendation",
      "how_to": "Concrete steps to implement it"
    }}
  ],
  "memorable_stories": [
    "Brief description of memorable anecdote or story"
  ],
  "contrarian_claims": [
    "Any surprising or contrarian viewpoint expressed"
  ]
}}

Topics should be tagged from: business, health, psychology, relationships, habits, money, creativity, leadership, science, technology, spirituality, fitness, productivity, communication, mindset

For key_insights, extract 5-10 of the most valuable insights. Prioritize practical wisdom over generic advice.

For actionable_advice, focus on specific, implementable recommendations (not vague platitudes).

For contrarian_claims, identify views that challenge conventional wisdom.

Transcript:
{transcript}
"""


def process_transcript(transcript_file):
    """Process a single transcript with Gemini."""
    # Load transcript
    with open(transcript_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    episode_id = data['id']
    title = data['title']
    transcript = data['transcript']

    print(f"\nProcessing: {title}")
    print(f"  Length: {len(transcript)} characters")

    # Check if already processed
    output_file = INSIGHTS_DIR / f"{episode_id}.json"
    if output_file.exists():
        print(f"  ⊘ Already processed, skipping")
        return False

    # Prepare prompt
    prompt = EXTRACTION_PROMPT_TEMPLATE.format(transcript=transcript)

    # Call Gemini
    try:
        client = genai.Client(api_key=API_KEY)
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt
        )

        # Parse response
        response_text = response.text.strip()

        # Remove markdown code blocks if present
        if '```json' in response_text:
            # Extract JSON from code block
            start = response_text.find('```json') + 7
            end = response_text.find('```', start)
            response_text = response_text[start:end].strip()
        elif response_text.startswith('```'):
            # Generic code block
            lines = response_text.split('\n')
            response_text = '\n'.join(lines[1:-1])

        response_text = response_text.strip()

        # Parse JSON
        insights = json.loads(response_text)

        # Add metadata
        insights['episode_id'] = episode_id
        insights['episode_title'] = title
        insights['episode_date'] = data.get('date', '')
        insights['episode_url'] = data['url']
        insights['processed_at'] = time.strftime('%Y-%m-%dT%H:%M:%S')

        # Save
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(insights, f, indent=2, ensure_ascii=False)

        print(f"  ✓ Extracted {len(insights['key_insights'])} insights")
        print(f"    Topics: {', '.join(insights['topics'])}")
        print(f"    Advice: {len(insights['actionable_advice'])} items")

        return True

    except json.JSONDecodeError as e:
        print(f"  ✗ JSON parse error: {e}")
        print(f"  Response preview: {response_text[:500]}...")
        print(f"  Full response saved to debug_{episode_id}.txt")
        with open(f"debug_{episode_id}.txt", 'w') as f:
            f.write(response_text)
        return False
    except Exception as e:
        print(f"  ✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def process_all_transcripts(limit=None):
    """Process all transcripts in the directory."""
    INSIGHTS_DIR.mkdir(parents=True, exist_ok=True)

    # Get all transcript files
    transcript_files = sorted(TRANSCRIPTS_DIR.glob("*.json"))

    if limit:
        transcript_files = transcript_files[:limit]

    print(f"Found {len(transcript_files)} transcript(s) to process")

    results = {
        'success': 0,
        'skipped': 0,
        'failed': 0
    }

    for idx, transcript_file in enumerate(transcript_files, 1):
        print(f"\n[{idx}/{len(transcript_files)}]", end=" ")

        try:
            success = process_transcript(transcript_file)
            if success:
                results['success'] += 1
            elif success is False:
                results['skipped'] += 1
        except Exception as e:
            print(f"  ✗ Fatal error: {e}")
            results['failed'] += 1

        # Rate limiting (Gemini free tier)
        if idx < len(transcript_files):
            time.sleep(2)  # 2 seconds between requests

    # Summary
    print("\n" + "="*60)
    print("PROCESSING SUMMARY")
    print("="*60)
    print(f"Total transcripts: {len(transcript_files)}")
    print(f"✓ Successfully processed: {results['success']}")
    print(f"⊘ Skipped (already done): {results['skipped']}")
    print(f"✗ Failed: {results['failed']}")
    print(f"\nInsights saved to: {INSIGHTS_DIR}")


if __name__ == "__main__":
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else None
    process_all_transcripts(limit=limit)
