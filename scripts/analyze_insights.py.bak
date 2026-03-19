#!/usr/bin/env python3
"""
Cross-episode analysis: Find consensus patterns, contradictions, and common themes.
"""

import json
from pathlib import Path
from collections import defaultdict, Counter
import re

INSIGHTS_DIR = Path(__file__).parent.parent / "data" / "insights"
ANALYSIS_DIR = Path(__file__).parent.parent / "data" / "analysis"


def load_all_insights():
    """Load all insight files."""
    insights = []
    for file in INSIGHTS_DIR.glob("*.json"):
        with open(file, 'r') as f:
            insights.append(json.load(f))
    return insights


def analyze_topics(all_insights):
    """Analyze topic distribution across episodes."""
    topic_counts = Counter()
    topic_episodes = defaultdict(list)

    for insight in all_insights:
        episode_id = insight['episode_id']
        for topic in insight.get('topics', []):
            topic_counts[topic] += 1
            topic_episodes[topic].append({
                'id': episode_id,
                'title': insight['episode_title'],
                'guest': insight['guest_name']
            })

    return {
        'topic_counts': dict(topic_counts.most_common()),
        'topic_episodes': {k: v for k, v in topic_episodes.items()}
    }


def find_consensus_patterns(all_insights, min_occurrences=2):
    """
    Find insights that appear across multiple episodes.
    Uses simple keyword matching to identify similar concepts.
    """
    # Extract all insights with their sources
    insight_db = []
    for data in all_insights:
        for insight in data.get('key_insights', []):
            insight_db.append({
                'text': insight['insight'].lower(),
                'quote': insight.get('quote', ''),
                'importance': insight.get('importance', 'medium'),
                'episode_id': data['episode_id'],
                'episode_title': data['episode_title'],
                'guest': data['guest_name']
            })

    # Group similar insights by keyword overlap
    consensus_groups = []

    # Define key themes to look for
    themes = {
        'stress_management': ['stress', 'anxiety', 'calm', 'relax', 'worry'],
        'exercise_benefits': ['exercise', 'movement', 'physical activity', 'workout'],
        'sleep_importance': ['sleep', 'rest', 'insomnia'],
        'nutrition': ['eat', 'food', 'nutrition', 'diet'],
        'mindset': ['mindset', 'think', 'belief', 'perspective'],
        'habits': ['habit', 'routine', 'consistency', 'daily'],
        'relationships': ['relationship', 'connection', 'social', 'people'],
        'learning': ['learn', 'skill', 'knowledge', 'growth'],
        'wealth_building': ['money', 'invest', 'wealth', 'rich', 'financial'],
        'productivity': ['productive', 'efficiency', 'time', 'focus'],
        'brain_health': ['brain', 'cognitive', 'mental', 'memory', 'dementia'],
        'happiness': ['happy', 'joy', 'satisfied', 'contentment'],
        'purpose': ['purpose', 'meaning', 'why', 'mission'],
    }

    for theme_name, keywords in themes.items():
        matching_insights = []
        for item in insight_db:
            if any(kw in item['text'] for kw in keywords):
                matching_insights.append(item)

        if len(matching_insights) >= min_occurrences:
            # Count unique episodes
            unique_episodes = len(set(i['episode_id'] for i in matching_insights))

            if unique_episodes >= min_occurrences:
                consensus_groups.append({
                    'theme': theme_name.replace('_', ' ').title(),
                    'count': len(matching_insights),
                    'episode_count': unique_episodes,
                    'insights': matching_insights[:10],  # Top 10
                    'guests': list(set(i['guest'] for i in matching_insights))
                })

    # Sort by episode count (more consensus = more episodes)
    consensus_groups.sort(key=lambda x: x['episode_count'], reverse=True)

    return consensus_groups


def extract_actionable_advice(all_insights):
    """Collect all actionable advice across episodes."""
    all_advice = []

    for data in all_insights:
        for advice in data.get('actionable_advice', []):
            all_advice.append({
                'advice': advice.get('advice', ''),
                'how_to': advice.get('how_to', ''),
                'episode_id': data['episode_id'],
                'episode_title': data['episode_title'],
                'guest': data['guest_name'],
                'topics': data.get('topics', [])
            })

    return all_advice


def find_contrarian_views(all_insights):
    """Collect all contrarian or surprising claims."""
    contrarian = []

    for data in all_insights:
        for claim in data.get('contrarian_claims', []):
            contrarian.append({
                'claim': claim,
                'episode_id': data['episode_id'],
                'episode_title': data['episode_title'],
                'guest': data['guest_name']
            })

    return contrarian


def analyze_guest_expertise(all_insights):
    """Categorize guests by expertise area."""
    expertise_map = defaultdict(list)

    for data in all_insights:
        expertise_map[data.get('expertise_area', 'Unknown')].append({
            'guest': data['guest_name'],
            'episode_id': data['episode_id'],
            'episode_title': data['episode_title']
        })

    return dict(expertise_map)


def generate_top_insights(all_insights, top_n=50):
    """Generate a ranked list of top insights across all episodes."""
    all_insights_list = []

    for data in all_insights:
        for insight in data.get('key_insights', []):
            all_insights_list.append({
                'insight': insight['insight'],
                'quote': insight.get('quote', ''),
                'importance': insight.get('importance', 'medium'),
                'episode_id': data['episode_id'],
                'episode_title': data['episode_title'],
                'guest': data['guest_name'],
                'topics': data.get('topics', [])
            })

    # Sort by importance (high > medium > low)
    importance_rank = {'high': 3, 'medium': 2, 'low': 1}
    all_insights_list.sort(
        key=lambda x: importance_rank.get(x['importance'], 0),
        reverse=True
    )

    return all_insights_list[:top_n]


def run_analysis():
    """Run all analyses and save results."""
    ANALYSIS_DIR.mkdir(parents=True, exist_ok=True)

    print("Loading insights...")
    all_insights = load_all_insights()
    print(f"Loaded {len(all_insights)} episodes")

    # Topic analysis
    print("\nAnalyzing topics...")
    topic_analysis = analyze_topics(all_insights)
    with open(ANALYSIS_DIR / "topics.json", 'w') as f:
        json.dump(topic_analysis, f, indent=2)
    print(f"  Found {len(topic_analysis['topic_counts'])} unique topics")

    # Consensus patterns
    print("\nFinding consensus patterns...")
    consensus = find_consensus_patterns(all_insights, min_occurrences=2)
    with open(ANALYSIS_DIR / "consensus.json", 'w') as f:
        json.dump(consensus, f, indent=2)
    print(f"  Found {len(consensus)} consensus themes")

    # Actionable advice
    print("\nCollecting actionable advice...")
    advice = extract_actionable_advice(all_insights)
    with open(ANALYSIS_DIR / "advice.json", 'w') as f:
        json.dump(advice, f, indent=2)
    print(f"  Collected {len(advice)} actionable items")

    # Contrarian views
    print("\nCollecting contrarian views...")
    contrarian = find_contrarian_views(all_insights)
    with open(ANALYSIS_DIR / "contrarian.json", 'w') as f:
        json.dump(contrarian, f, indent=2)
    print(f"  Found {len(contrarian)} contrarian claims")

    # Guest expertise
    print("\nAnalyzing guest expertise...")
    expertise = analyze_guest_expertise(all_insights)
    with open(ANALYSIS_DIR / "expertise.json", 'w') as f:
        json.dump(expertise, f, indent=2)
    print(f"  Categorized {len(expertise)} expertise areas")

    # Top insights
    print("\nGenerating top insights...")
    top_insights = generate_top_insights(all_insights, top_n=50)
    with open(ANALYSIS_DIR / "top_insights.json", 'w') as f:
        json.dump(top_insights, f, indent=2)
    print(f"  Selected top {len(top_insights)} insights")

    # Summary
    print("\n" + "="*60)
    print("ANALYSIS COMPLETE")
    print("="*60)
    print(f"Results saved to: {ANALYSIS_DIR}")
    print(f"\nFiles generated:")
    print(f"  - topics.json: Topic distribution and episodes")
    print(f"  - consensus.json: Cross-episode consensus patterns")
    print(f"  - advice.json: All actionable advice")
    print(f"  - contrarian.json: Surprising/contrarian claims")
    print(f"  - expertise.json: Guest expertise categories")
    print(f"  - top_insights.json: Top 50 ranked insights")


if __name__ == "__main__":
    run_analysis()
