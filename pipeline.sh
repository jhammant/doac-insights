#!/bin/bash
# DOAC Insights - Full Pipeline
# Runs scraping → processing → analysis → web build

set -e  # Exit on error

echo "=========================================="
echo "DOAC Insights - Full Pipeline"
echo "=========================================="
echo ""

# Configuration
LIMIT=${1:-100}  # Default to 100 episodes

echo "Step 1/5: Scraping Transcripts"
echo "  Target: $LIMIT episodes"
echo "  Note: This may fail due to YouTube IP blocking"
echo "  Fallback: Use sample data or run from different IP"
echo ""
python3 scripts/scrape_transcripts_final.py "$LIMIT" || {
    echo "⚠️  Scraping failed (expected due to IP blocking)"
    echo "  Using existing transcripts in data/transcripts/"
}

echo ""
echo "Step 2/5: Processing with Gemini AI"
echo "  Extracting insights, topics, and advice..."
echo ""
python3 scripts/process_with_gemini.py

echo ""
echo "Step 3/5: Cross-Episode Analysis"
echo "  Finding consensus patterns and contradictions..."
echo ""
python3 scripts/analyze_insights.py

echo ""
echo "Step 4/5: Building Web App"
echo "  Copying data files..."
echo ""
python3 scripts/build_web.py

echo ""
echo "Step 5/5: Complete!"
echo "=========================================="
echo "✓ Pipeline finished successfully"
echo "=========================================="
echo ""
echo "To view the web app:"
echo "  cd web && python3 -m http.server 8000"
echo "  Then open: http://localhost:8000"
echo ""
