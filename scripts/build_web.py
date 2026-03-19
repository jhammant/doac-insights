#!/usr/bin/env python3
"""
Build the web app by copying data files to the web directory.
"""

import json
import shutil
from pathlib import Path

# Paths
DATA_DIR = Path(__file__).parent.parent / "data"
WEB_DATA_DIR = Path(__file__).parent.parent / "web" / "data"

def build_web():
    """Copy analysis data to web directory."""
    WEB_DATA_DIR.mkdir(parents=True, exist_ok=True)

    print("Building web app...")

    # Copy analysis files
    analysis_files = [
        'consensus.json',
        'advice.json',
        'contrarian.json',
        'topics.json',
        'top_insights.json',
        'expertise.json',
        'guests.json'
    ]

    copied = 0
    for filename in analysis_files:
        src = DATA_DIR / "analysis" / filename
        dst = WEB_DATA_DIR / filename

        if src.exists():
            shutil.copy2(src, dst)
            print(f"  ✓ Copied {filename}")
            copied += 1
        else:
            print(f"  ✗ Missing {filename}")

    print(f"\n✓ Web build complete! Copied {copied} files")
    print(f"  Data directory: {WEB_DATA_DIR}")
    print(f"\nTo view the app:")
    print(f"  cd web && python3 -m http.server 8000")
    print(f"  Then open: http://localhost:8000")

if __name__ == "__main__":
    build_web()
