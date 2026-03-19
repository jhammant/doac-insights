#!/usr/bin/env python3
"""
Scrape transcripts from The Diary of a CEO YouTube channel using yt-dlp.
Saves each transcript as JSON with metadata.
"""

import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

# Channel details
CHANNEL_ID = "UCGq-a57w-aPwyi3pIPAXnPA"
CHANNEL_HANDLE = "@TheDiaryOfACEO"
OUTPUT_DIR = Path(__file__).parent.parent / "data" / "transcripts"

def get_playlist_videos(limit=100):
    """Get video list from channel using yt-dlp."""
    print(f"Fetching video list from {CHANNEL_HANDLE}...")

    cmd = [
        "yt-dlp",
        "--flat-playlist",
        "--dump-json",
        "--playlist-end", str(limit),
        f"https://www.youtube.com/{CHANNEL_HANDLE}/videos"
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        videos = []
        for line in result.stdout.strip().split('\n'):
            if line:
                videos.append(json.loads(line))
        print(f"Found {len(videos)} videos")
        return videos
    except subprocess.CalledProcessError as e:
        print(f"Error fetching playlist: {e}")
        print(f"stderr: {e.stderr}")
        sys.exit(1)

def get_video_transcript(video_id):
    """Download transcript for a specific video."""
    print(f"Fetching transcript for {video_id}...")

    cmd = [
        "yt-dlp",
        "--skip-download",
        "--write-auto-subs",
        "--sub-lang", "en",
        "--sub-format", "json3",
        "--output", "%(id)s.%(ext)s",
        "--no-warnings",
        f"https://www.youtube.com/watch?v={video_id}"
    ]

    try:
        # Run yt-dlp to download subtitle file
        subprocess.run(cmd, capture_output=True, check=True, cwd="/tmp")

        # Read the downloaded subtitle file
        subtitle_file = f"/tmp/{video_id}.en.json3"
        if not os.path.exists(subtitle_file):
            print(f"  No English subtitles found for {video_id}")
            return None

        with open(subtitle_file, 'r', encoding='utf-8') as f:
            subtitle_data = json.load(f)

        # Extract text from subtitle events
        transcript_parts = []
        for event in subtitle_data.get('events', []):
            if 'segs' in event:
                for seg in event['segs']:
                    if 'utf8' in seg:
                        transcript_parts.append(seg['utf8'])

        transcript = ''.join(transcript_parts).strip()

        # Clean up subtitle file
        os.remove(subtitle_file)

        return transcript
    except subprocess.CalledProcessError as e:
        print(f"  Error downloading transcript: {e}")
        return None
    except Exception as e:
        print(f"  Error processing transcript: {e}")
        return None

def get_video_metadata(video_id):
    """Get full metadata for a video."""
    cmd = [
        "yt-dlp",
        "--dump-json",
        "--no-warnings",
        f"https://www.youtube.com/watch?v={video_id}"
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        return json.loads(result.stdout)
    except subprocess.CalledProcessError as e:
        print(f"  Error fetching metadata: {e}")
        return None

def extract_guest_name(title):
    """Extract guest name from video title (basic heuristic)."""
    # Common patterns: "E123: Guest Name: Topic" or "Guest Name | Topic"
    title = title.replace('|', ':')
    parts = title.split(':')

    if len(parts) >= 2:
        # Remove episode markers like "E123"
        potential_guest = parts[1].strip()
        if potential_guest and not potential_guest.startswith('E'):
            return potential_guest

    # Fallback: return first significant part
    for part in parts:
        part = part.strip()
        if part and not part.startswith('E') and len(part) > 3:
            return part

    return "Unknown"

def scrape_transcripts(limit=100, skip_existing=True):
    """Main scraping function."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Get video list
    videos = get_playlist_videos(limit)

    results = {
        'success': 0,
        'skipped': 0,
        'failed': 0,
        'no_subs': 0
    }

    for idx, video in enumerate(videos, 1):
        video_id = video.get('id')
        if not video_id:
            continue

        output_file = OUTPUT_DIR / f"{video_id}.json"

        # Skip if already processed
        if skip_existing and output_file.exists():
            print(f"[{idx}/{len(videos)}] Skipping {video_id} (already exists)")
            results['skipped'] += 1
            continue

        print(f"\n[{idx}/{len(videos)}] Processing {video_id}")
        print(f"  Title: {video.get('title', 'Unknown')}")

        # Get full metadata
        metadata = get_video_metadata(video_id)
        if not metadata:
            results['failed'] += 1
            continue

        # Get transcript
        transcript = get_video_transcript(video_id)
        if not transcript:
            results['no_subs'] += 1
            continue

        # Extract guest name from title
        title = metadata.get('title', '')
        guest = extract_guest_name(title)

        # Build output JSON
        output_data = {
            'id': video_id,
            'title': title,
            'date': metadata.get('upload_date', ''),
            'duration': metadata.get('duration', 0),
            'guest': guest,
            'transcript': transcript,
            'url': f"https://www.youtube.com/watch?v={video_id}",
            'thumbnail': metadata.get('thumbnail', ''),
            'view_count': metadata.get('view_count', 0),
            'scraped_at': datetime.now().isoformat()
        }

        # Save to file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)

        print(f"  ✓ Saved transcript ({len(transcript)} chars)")
        results['success'] += 1

    # Print summary
    print("\n" + "="*60)
    print("SCRAPING SUMMARY")
    print("="*60)
    print(f"Total videos processed: {len(videos)}")
    print(f"✓ Successfully scraped: {results['success']}")
    print(f"⊘ Skipped (already exist): {results['skipped']}")
    print(f"✗ No subtitles available: {results['no_subs']}")
    print(f"✗ Failed: {results['failed']}")
    print(f"\nTranscripts saved to: {OUTPUT_DIR}")

if __name__ == "__main__":
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    scrape_transcripts(limit=limit)
