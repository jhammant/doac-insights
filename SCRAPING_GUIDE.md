# Transcript Scraping Guide

## Issue: YouTube IP Blocking

YouTube is blocking automated scraping requests from cloud provider IPs. This affects both `yt-dlp` and `youtube-transcript-api`.

## Solutions

### Option 1: Use Browser Cookies (Recommended)

1. Log into YouTube in your browser (Chrome or Firefox)
2. Run the scraper with cookie support:

```bash
python3 scripts/scrape_transcripts_final.py 100
```

The script will automatically detect and use your browser cookies.

### Option 2: Manual Cookie Export

If automatic cookie detection fails:

1. Install a cookie export extension (e.g., "Get cookies.txt LOCALLY" for Chrome)
2. Export YouTube cookies to `cookies.txt`
3. Modify the script to use `--cookies cookies.txt` instead of `--cookies-from-browser`

### Option 3: Run from Non-Cloud IP

Run the scraper from a local machine or VPN with a residential IP address.

### Option 4: Use YouTube Data API (Alternative Approach)

For a more reliable but API-limited approach:

1. Get a YouTube Data API key from Google Cloud Console
2. Use the API to fetch video metadata
3. Use yt-dlp with cookies for subtitle download only

### Option 5: Manual Transcript Download

For a small number of episodes:

1. Visit each video on YouTube
2. Click "..." → "Show transcript"
3. Copy transcript text
4. Save as JSON in `data/transcripts/`

## Current Status

The IP we're running from is blocked by YouTube. We need to either:
- Run from a different IP (local machine, VPN)
- Use browser authentication via cookies
- Use a proxy service
- Switch to YouTube Data API for metadata (requires API key)

## Testing

Test with a small number of videos first:

```bash
python3 scripts/scrape_transcripts_final.py 5
```
