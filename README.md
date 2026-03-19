# DOAC Insights

**What 400+ world-class performers agree on** — AI-powered analysis of every Diary of a CEO episode.

Interactive knowledge base with cross-episode pattern analysis and distilled key learnings from one of the world's biggest podcasts.

## Features

- 🎙️ Full transcript extraction from YouTube
- 🧠 AI-extracted insights, quotes, and actionable advice per episode
- 🔗 Cross-episode consensus pattern detection
- 📊 Interactive web app with searchable knowledge base
- 🏷️ Topic clustering (business, health, relationships, psychology, habits, money, etc.)
- ⚡ Consensus insights: "What do 3+ guests independently agree on?"
- 🤔 Contrarian corner: surprising takes & guest disagreements
- ✅ Actionable advice library with implementation steps

## Live Demo

Open the web app locally:
```bash
cd web && python3 -m http.server 8000
# Then open: http://localhost:8000
```

## Project Structure

```
doac-insights/
├── data/
│   ├── transcripts/     # Raw episode transcripts (JSON)
│   ├── insights/        # AI-extracted insights per episode
│   └── analysis/        # Cross-episode analysis results
├── scripts/
│   ├── scrape_transcripts_final.py  # YouTube transcript scraper
│   ├── process_with_gemini.py       # AI insight extraction
│   ├── analyze_insights.py          # Cross-episode analysis
│   ├── build_web.py                 # Web app builder
│   └── create_sample_data.py        # Sample data generator
├── web/
│   ├── index.html       # Main web app
│   ├── css/styles.css   # Styling
│   ├── js/app.js        # Application logic
│   └── data/            # JSON data files for web app
└── pipeline.sh          # Full pipeline runner

```

## Quick Start

### Option 1: Run Full Pipeline

```bash
# Run entire pipeline (scrape → process → analyze → build)
./pipeline.sh 100  # Process 100 most recent episodes
```

### Option 2: Step-by-Step

```bash
# 1. Scrape transcripts (may fail due to YouTube IP blocking)
python3 scripts/scrape_transcripts_final.py 100

# 2. Process with AI (requires Gemini API key)
python3 scripts/process_with_gemini.py

# 3. Run cross-episode analysis
python3 scripts/analyze_insights.py

# 4. Build web app
python3 scripts/build_web.py

# 5. View the app
cd web && python3 -m http.server 8000
```

### Option 3: Use Sample Data

```bash
# Generate sample transcripts for testing
python3 scripts/create_sample_data.py

# Then run steps 2-5 above
```

## YouTube Scraping Note

Due to YouTube's bot detection, transcript scraping may be blocked on cloud IPs. See `SCRAPING_GUIDE.md` for solutions:
- Use browser cookies for authentication
- Run from a local machine or VPN
- Use the sample data for development

## Tech Stack

- **Scraping**: yt-dlp, youtube-transcript-api
- **AI Processing**: Google Gemini 2.0 Flash (via google-genai)
- **Analysis**: Python, JSON
- **Web App**: Vanilla JavaScript, CSS (no build step required)
- **Deployment**: Static HTML (works on GitHub Pages, Netlify, etc.)

## API Keys

The Gemini API key is expected at: `~/.config/gemini/api-key.json`

Format:
```json
{
  "provider": "google-gemini",
  "apiKey": "YOUR_API_KEY_HERE"
}
```

Get a free API key at: https://ai.google.dev/

## Data Output

### Per-Episode Insights (`data/insights/`)
Each episode generates:
- Guest name and expertise area
- 5-10 key insights with quotes and importance ratings
- Topic tags
- Actionable advice with implementation steps
- Memorable stories
- Contrarian claims

### Cross-Episode Analysis (`data/analysis/`)
- `consensus.json`: Themes validated across multiple episodes
- `top_insights.json`: Top 50 ranked insights
- `advice.json`: All actionable advice items
- `contrarian.json`: Surprising/contrarian viewpoints
- `topics.json`: Topic distribution and episode mapping
- `expertise.json`: Guest categorization by expertise

## Web App Features

- **Top Insights**: Consensus learnings validated by multiple guests
- **Episodes Browser**: Searchable episode list with guest info
- **Topics Explorer**: Browse insights by category
- **Contrarian Corner**: Surprising and unconventional takes
- **Actionable Advice**: Filterable library of practical recommendations
- **Search**: Full-text search across all insights and quotes
- **Dark Mode**: Modern, mobile-responsive design

## Development Status

✅ Phase 1: Transcript scraping (with IP blocking workarounds)
✅ Phase 2: AI-powered insight extraction
✅ Phase 3: Cross-episode analysis and pattern detection
✅ Phase 4: Interactive web application

Future enhancements:
- [ ] Semantic embeddings for better similarity detection
- [ ] Guest network graph visualization
- [ ] Export insights to markdown/PDF
- [ ] Weekly digest generator
- [ ] Integration with more podcast platforms

## Contributing

This is a private repository. To extend the project:

1. Add more episodes: Run `./pipeline.sh <limit>`
2. Improve AI extraction: Modify `scripts/process_with_gemini.py`
3. Add new analysis: Extend `scripts/analyze_insights.py`
4. Enhance web UI: Edit `web/` files

## License

For educational and personal use. Content belongs to The Diary of a CEO (Steven Bartlett).

## Credits

- Podcast: [The Diary of a CEO](https://www.youtube.com/@TheDiaryOfACEO) by Steven Bartlett
- AI: Google Gemini 2.0 Flash
- Tools: yt-dlp, Python, vanilla JavaScript

---

Built with ❤️ for learning and knowledge aggregation
