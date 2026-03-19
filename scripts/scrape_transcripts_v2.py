#!/usr/bin/env python3
"""
Scrape transcripts from The Diary of a CEO YouTube channel.
Uses YouTube Transcript API (youtube-transcript-api package) which doesn't require authentication.
"""

import json
import sys
from datetime import datetime
from pathlib import Path
import subprocess

# First, let's try to import the required package
try:
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound
except ImportError:
    print("Installing youtube-transcript-api...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "youtube-transcript-api"])
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound

# Channel details
CHANNEL_ID = "UCGq-a57w-aPwyi3pIPAXnPA"
CHANNEL_HANDLE = "@TheDiaryOfACEO"
OUTPUT_DIR = Path(__file__).parent.parent / "data" / "transcripts"


def get_playlist_videos(limit=100):
    """Get video list from channel using yt-dlp flat extraction."""
    print(f"Fetching video list from {CHANNEL_HANDLE}...")

    # Use extractor args to bypass bot detection
    cmd = [
        "yt-dlp",
        "--flat-playlist",
        "--dump-json",
        "--playlist-end", str(limit),
        "--extractor-args", "youtube:player_client=android",
        "--no-warnings",
        f"https://www.youtube.com/{CHANNEL_HANDLE}/videos"
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        videos = []
        for line in result.stdout.strip().split('\n'):
            if line:
                try:
                    videos.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        print(f"Found {len(videos)} videos")
        return videos
    except subprocess.CalledProcessError as e:
        print(f"Error fetching playlist: {e}")
        print(f"stderr: {e.stderr}")

        # Fallback: try without player_client arg
        print("\nTrying alternative method...")
        cmd_fallback = [
            "yt-dlp",
            "--flat-playlist",
            "--dump-json",
            "--playlist-end", str(limit),
            "--no-warnings",
            f"https://www.youtube.com/channel/{CHANNEL_ID}/videos"
        ]

        try:
            result = subprocess.run(cmd_fallback, capture_output=True, text=True, check=True)
            videos = []
            for line in result.stdout.strip().split('\n'):
                if line:
                    try:
                        videos.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue
            print(f"Found {len(videos)} videos")
            return videos
        except subprocess.CalledProcessError as e2:
            print(f"Fallback also failed: {e2}")
            return []


def get_video_transcript(video_id):
    """Download transcript using youtube-transcript-api."""
    try:
        api = YouTubeTranscriptApi()
        transcript_data = api.fetch(video_id, languages=['en'])

        # Combine all transcript segments
        transcript = ' '.join([entry['text'] for entry in transcript_data])
        return transcript.strip()

    except (TranscriptsDisabled, NoTranscriptFound) as e:
        return None
    except Exception as e:
        print(f"  Error fetching transcript: {e}")
        return None


def get_basic_metadata(video_id):
    """Get basic metadata for a video using yt-dlp with android client."""
    cmd = [
        "yt-dlp",
        "--dump-json",
        "--skip-download",
        "--extractor-args", "youtube:player_client=android",
        "--no-warnings",
        f"https://www.youtube.com/watch?v={video_id}"
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=30)
        return json.loads(result.stdout)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, json.JSONDecodeError) as e:
        print(f"  Could not fetch full metadata, using basic info only")
        return None


def extract_guest_name(title):
    """Extract guest name from video title."""
    # Remove common prefixes
    title = title.strip()

    # Pattern: "E123: Guest Name: Topic" or "Guest Name: Topic"
    if ':' in title:
        parts = title.split(':')
        # Skip episode numbers (E123, etc.)
        for part in parts:
            part = part.strip()
            # Skip empty, episode markers, or very short strings
            if part and not part.startswith('E') and not part.isdigit() and len(part) > 3:
                # This is likely the guest name
                # Clean up common suffixes
                guest = part.split('|')[0].strip()
                guest = part.split('(')[0].strip()
                return guest

    # Pattern: "Guest Name | Topic"
    if '|' in title:
        parts = title.split('|')
        if len(parts) >= 2:
            guest = parts[0].strip()
            # Remove episode markers
            if ':' in guest:
                guest = guest.split(':')[-1].strip()
            return guest

    return "Unknown"


def scrape_transcripts(limit=100, skip_existing=True):
    """Main scraping function."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Get video list
    videos = get_playlist_videos(limit)

    if not videos:
        print("No videos found. YouTube may be blocking access.")
        print("Please try running this script with browser cookies or VPN.")
        return

    results = {
        'success': 0,
        'skipped': 0,
        'failed': 0,
        'no_subs': 0
    }

    for idx, video in enumerate(videos, 1):
        video_id = video.get('id')
        title = video.get('title', 'Unknown')

        if not video_id:
            continue

        output_file = OUTPUT_DIR / f"{video_id}.json"

        # Skip if already processed
        if skip_existing and output_file.exists():
            print(f"[{idx}/{len(videos)}] Skipping {video_id} (already exists)")
            results['skipped'] += 1
            continue

        print(f"\n[{idx}/{len(videos)}] Processing {video_id}")
        print(f"  Title: {title}")

        # Get transcript using youtube-transcript-api
        transcript = get_video_transcript(video_id)
        if not transcript:
            print(f"  ✗ No transcript available")
            results['no_subs'] += 1
            continue

        # Try to get full metadata
        metadata = get_basic_metadata(video_id)

        # Extract guest name from title
        guest = extract_guest_name(title)

        # Build output JSON
        output_data = {
            'id': video_id,
            'title': title,
            'date': metadata.get('upload_date', '') if metadata else '',
            'duration': metadata.get('duration', 0) if metadata else video.get('duration', 0),
            'guest': guest,
            'transcript': transcript,
            'url': f"https://www.youtube.com/watch?v={video_id}",
            'thumbnail': metadata.get('thumbnail', '') if metadata else video.get('thumbnails', [{}])[-1].get('url', ''),
            'view_count': metadata.get('view_count', 0) if metadata else 0,
            'scraped_at': datetime.now().isoformat()
        }

        # Save to file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)

        print(f"  ✓ Saved transcript ({len(transcript)} chars, guest: {guest})")
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
