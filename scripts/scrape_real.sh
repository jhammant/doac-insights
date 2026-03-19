#!/bin/bash
# Scrape real DOAC transcripts
cd "$(dirname "$0")/.."
OUTDIR="data/transcripts_real"
COUNT=0
TOTAL=$(yt-dlp --flat-playlist --print "%(id)s" "https://www.youtube.com/@TheDiaryOfACEO/videos" 2>/dev/null | wc -l)

echo "Scraping $TOTAL episodes..."

yt-dlp --flat-playlist --print "%(id)s|%(title)s|%(upload_date)s|%(duration)s" \
  "https://www.youtube.com/@TheDiaryOfACEO/videos" 2>/dev/null | while IFS='|' read -r id title date duration; do
  
  COUNT=$((COUNT + 1))
  OUTFILE="$OUTDIR/${id}.json"
  
  if [ -f "$OUTFILE" ]; then
    echo "[$COUNT/$TOTAL] SKIP (exists): $title"
    continue
  fi
  
  echo "[$COUNT/$TOTAL] Fetching: $title"
  
  # Get subtitles
  SUBFILE=$(mktemp)
  yt-dlp --write-auto-sub --sub-lang en --skip-download --sub-format vtt \
    -o "$SUBFILE" "https://www.youtube.com/watch?v=$id" 2>/dev/null
  
  VTTFILE="${SUBFILE}.en.vtt"
  if [ -f "$VTTFILE" ]; then
    # Convert VTT to plain text
    TRANSCRIPT=$(python3 -c "
import re, sys
with open('$VTTFILE') as f:
    text = f.read()
# Remove VTT headers and timestamps
lines = []
seen = set()
for line in text.split('\n'):
    line = line.strip()
    if not line or line.startswith('WEBVTT') or line.startswith('Kind:') or line.startswith('Language:') or re.match(r'^\d{2}:\d{2}', line) or '-->' in line:
        continue
    # Remove HTML tags
    line = re.sub(r'<[^>]+>', '', line)
    if line and line not in seen:
        seen.add(line)
        lines.append(line)
print(' '.join(lines))
" 2>/dev/null)
    
    if [ -n "$TRANSCRIPT" ]; then
      python3 -c "
import json, sys
data = {
    'id': '$id',
    'title': '''$(echo "$title" | sed "s/'/\\\\'/g")''',
    'date': '$date',
    'duration': '$duration',
    'url': 'https://www.youtube.com/watch?v=$id',
    'transcript': sys.stdin.read().strip()
}
with open('$OUTDIR/${id}.json', 'w') as f:
    json.dump(data, f, indent=2)
print(f'  ✅ Saved ({len(data[\"transcript\"])} chars)')
" <<< "$TRANSCRIPT"
    else
      echo "  ⚠️ No transcript text extracted"
    fi
    rm -f "$VTTFILE"
  else
    echo "  ⚠️ No subtitles available"
  fi
  rm -f "$SUBFILE"
  
  # Small delay to avoid rate limiting
  sleep 1
done

echo "Done! $(ls $OUTDIR/*.json 2>/dev/null | wc -l) transcripts saved."
