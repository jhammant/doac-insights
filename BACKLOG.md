# DOAC Insights — Backlog

## Critical Fixes

### 1. ❌ Guest Name: "Unclear from provided transcript" appearing in consensus themes
- Gemini returned "Unclear from provided transcript" as guest names for some episodes
- These leak into consensus theme guest lists
- **Fix:** Post-process all insights to clean up known bad guest patterns, cross-reference with transcript titles

### 2. ❌ 14 episodes still have unknown/missing guest names
- Solo Steven Bartlett episodes are fine (correctly attributed)
- "Moment" clips have guest names in title but extraction missed some
- **Fix:** Better regex extraction from titles, or manual mapping

### 3. ❌ "Validated by: Not specified/Unknown" showing on insights
- Some insights lack proper attribution
- **Fix:** Remove "validated_by" field from display, or populate from episode guest data

## Data Quality

### 4. ⚠️ Consensus themes are too broad
- "Nutrition" has 914 insights across 486 episodes — nearly every episode
- Topics like "Relationships" (936 insights) are too generic
- **Fix:** Sub-cluster within themes, or increase specificity threshold (require 5+ guests agreeing on a SPECIFIC claim, not just mentioning a topic)

### 5. ⚠️ Contrarian claims need quality filter
- 2,160 contrarian claims is too many to be useful
- Some may be generic rather than truly surprising
- **Fix:** Score contrarian claims by specificity, filter to top 100

### 6. ⚠️ Advice items need deduplication
- 2,966 advice items likely has duplicates (e.g., "sleep 8 hours" from multiple guests)
- **Fix:** Semantic dedup using embeddings, group similar advice, show "endorsed by X guests"

## Web App Improvements

### 7. 🔧 Episode browser needs YouTube links
- Currently has podscripts URLs but no YouTube links
- **Fix:** Match episodes to YouTube video IDs (yt-dlp or YouTube API search)

### 8. 🔧 Guest profile pages
- No way to browse all insights from a specific guest
- **Fix:** Add guest directory with all their insights, episodes, topics

### 9. 🔧 Search doesn't work on real data
- Need to verify search works with 786 episodes worth of data
- **Fix:** Test and optimize search, maybe add fuzzy matching

### 10. 🔧 Episode count badge on insights
- "X guests agree" badge would make consensus insights more compelling
- **Fix:** Add guest count + list to each consensus insight

### 11. 🔧 Mobile responsiveness check
- Untested on mobile with real data volume
- **Fix:** Test on phone, fix any overflow issues

### 12. 🔧 GitHub Pages deployment
- Not yet deployed to jhammant.github.io/doac-insights
- **Fix:** Set up GitHub Pages from web/ directory

## Nice to Have

### 13. 💡 Guest network visualization
- Which guests share similar insights? D3.js network graph
- Connect guests who independently validate the same claims

### 14. 💡 "Quote of the Day" feature
- Random compelling quote on each visit

### 15. 💡 Episode timeline
- Visual timeline showing when topics peaked in popularity

### 16. 💡 Export / Share
- Share individual insights as images for social media
- Export personal learning list
