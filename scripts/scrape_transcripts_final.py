#!/usr/bin/env python3
"""
Scrape transcripts from The Diary of a CEO YouTube channel.
Works around YouTube IP blocking using multiple fallback methods.
"""

import json
import sys
import os
from datetime import datetime
from pathlib import Path
import subprocess
import time

# Channel details
CHANNEL_ID = "UCGq-a57w-aPwyi3pIPAXnPA"
CHANNEL_HANDLE = "@TheDiaryOfACEO"
OUTPUT_DIR = Path(__file__).parent.parent / "data" / "transcripts"

# Check for browser with cookies
BROWSERS = ["chrome", "firefox", "chromium", "brave", "edge"]

def find_browser_with_cookies():
    """Try to find a browser with saved cookies."""
    for browser in BROWSERS:
        # Test if yt-dlp can access cookies from this browser
        test_cmd = [
            "yt-dlp",
            "--cookies-from-browser", browser,
            "--simulate",
            "--quiet",
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Test video
        ]
        try:
            result = subprocess.run(test_cmd, capture_output=True, timeout=10)
            if result.returncode == 0:
                print(f"Found usable browser: {browser}")
                return browser
        except:
            continue
    return None

def get_playlist_videos_with_cookies(limit=100, browser=None):
    """Get video list using browser cookies if available."""
    print(f"Fetching video list from {CHANNEL_HANDLE}...")

    cmd = [
        "yt-dlp",
        "--flat-playlist",
        "--dump-json",
        "--playlist-end", str(limit),
        "--no-warnings"
    ]

    if browser:
        cmd.extend(["--cookies-from-browser", browser])

    cmd.append(f"https://www.youtube.com/{CHANNEL_HANDLE}/videos")

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=60)
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
        print(f"Error: {e.stderr}")
        return []
    except subprocess.TimeoutExpired:
        print("Timeout while fetching playlist")
        return []

def get_video_transcript_ytdlp(video_id, browser=None):
    """Download transcript using yt-dlp with subtitles."""
    temp_dir = "/tmp/doac_transcripts"
    os.makedirs(temp_dir, exist_ok=True)

    cmd = [
        "yt-dlp",
        "--skip-download",
        "--write-auto-subs",
        "--sub-lang", "en",
        "--sub-format", "vtt",
        "--output", f"{temp_dir}/%(id)s.%(ext)s",
        "--no-warnings"
    ]

    if browser:
        cmd.extend(["--cookies-from-browser", browser])

    cmd.append(f"https://www.youtube.com/watch?v={video_id}")

    try:
        subprocess.run(cmd, capture_output=True, check=True, timeout=30)

        # Read subtitle file
        vtt_file = f"{temp_dir}/{video_id}.en.vtt"
        if not os.path.exists(vtt_file):
            return None

        # Parse VTT file
        with open(vtt_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Extract text from VTT (remove timestamps and formatting)
        lines = content.split('\n')
        transcript_parts = []
        for line in lines:
            line = line.strip()
            # Skip empty lines, timestamps, and VTT headers
            if line and not line.startswith('WEBVTT') and not '-->' in line and not line.isdigit():
                # Remove VTT tags
                clean_line = line.replace('<c>', '').replace('</c>', '')
                if clean_line:
                    transcript_parts.append(clean_line)

        # Clean up
        try:
            os.remove(vtt_file)
        except:
            pass

        transcript = ' '.join(transcript_parts).strip()
        return transcript if transcript else None

    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return None

def get_video_metadata(video_id, browser=None):
    """Get metadata for a video."""
    cmd = [
        "yt-dlp",
        "--dump-json",
        "--skip-download",
        "--no-warnings"
    ]

    if browser:
        cmd.extend(["--cookies-from-browser", browser])

    cmd.append(f"https://www.youtube.com/watch?v={video_id}")

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True, timeout=30)
        return json.loads(result.stdout)
    except:
        return None

def extract_guest_name(title):
    """Extract guest name from video title."""
    title = title.strip()

    # Remove episode numbers like E123
    if title.startswith('E'):
        parts = title.split(':', 1)
        if len(parts) > 1:
            title = parts[1].strip()

    # Split by common separators
    for sep in [':', '|', '-']:
        if sep in title:
            parts = title.split(sep)
            if len(parts) >= 2:
                guest = parts[0].strip()
                # Clean up
                guest = guest.split('(')[0].strip()
                if len(guest) > 3 and not guest.isdigit():
                    return guest

    return "Unknown"

def scrape_transcripts(limit=100, skip_existing=True):
    """Main scraping function."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # Try to find browser with cookies
    browser = find_browser_with_cookies()
    if browser:
        print(f"Using cookies from {browser}")
    else:
        print("Warning: No browser cookies found. May encounter IP blocking.")
        print("For best results, log into YouTube in Chrome/Firefox first.")
        browser = None

    # Get video list
    videos = get_playlist_videos_with_cookies(limit, browser)

    if not videos:
        print("\n" + "="*60)
        print("UNABLE TO FETCH VIDEO LIST")
        print("="*60)
        print("\nYouTube is blocking access. To fix this:")
        print("1. Log into YouTube in your browser (Chrome or Firefox)")
        print("2. Make sure you're signed in")
        print("3. Run this script again")
        print("\nAlternatively, you can:")
        print("- Use a VPN to change your IP")
        print("- Run from a non-cloud IP address")
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

        # Get transcript
        transcript = get_video_transcript_ytdlp(video_id, browser)
        if not transcript:
            print(f"  ✗ No transcript available")
            results['no_subs'] += 1
            continue

        # Get metadata
        metadata = get_video_metadata(video_id, browser)

        # Extract guest
        guest = extract_guest_name(title)

        # Build output
        output_data = {
            'id': video_id,
            'title': title,
            'date': metadata.get('upload_date', '') if metadata else '',
            'duration': metadata.get('duration', 0) if metadata else video.get('duration', 0),
            'guest': guest,
            'transcript': transcript,
            'url': f"https://www.youtube.com/watch?v={video_id}",
            'thumbnail': metadata.get('thumbnail', '') if metadata else '',
            'view_count': metadata.get('view_count', 0) if metadata else 0,
            'scraped_at': datetime.now().isoformat()
        }

        # Save
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)

        print(f"  ✓ Saved ({len(transcript)} chars, guest: {guest})")
        results['success'] += 1

        # Rate limiting
        time.sleep(1)

    # Summary
    print("\n" + "="*60)
    print("SCRAPING SUMMARY")
    print("="*60)
    print(f"Total videos: {len(videos)}")
    print(f"✓ Success: {results['success']}")
    print(f"⊘ Skipped: {results['skipped']}")
    print(f"✗ No subs: {results['no_subs']}")
    print(f"✗ Failed: {results['failed']}")
    print(f"\nSaved to: {OUTPUT_DIR}")

if __name__ == "__main__":
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    scrape_transcripts(limit=limit)
