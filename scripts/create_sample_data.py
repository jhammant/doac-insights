#!/usr/bin/env python3
"""
Create sample transcript data for development/testing when scraping is blocked.
"""

import json
from pathlib import Path
from datetime import datetime, timedelta

OUTPUT_DIR = Path(__file__).parent.parent / "data" / "transcripts"

# Sample episodes with realistic data
SAMPLE_EPISODES = [
    {
        "id": "sample001",
        "title": "E203: Mo Gawdat: A WARNING about Stress, Anxiety & Depression! This Is Causing 70% Of Heart Attacks!",
        "guest": "Mo Gawdat",
        "transcript": """
I spent 25 years at Google and I can tell you that stress is probably the single biggest killer in the modern world.
When I look at the data, 70% of heart attacks are stress-related. We're living in a world where we're constantly
connected, constantly worried about the future, constantly regretting the past. The human brain wasn't designed for this.

The problem is that we treat stress as normal. We glorify busy-ness. We wear exhaustion as a badge of honor.
But here's the truth: chronic stress literally rewires your brain. It shrinks your hippocampus, it enlarges your
amygdala, it makes you more anxious and less capable of making good decisions.

What I learned after my son's death was that happiness is not about achieving more, it's about wanting less.
It's about being present. I developed a simple equation: your happiness is equal to or greater than your perception
of the events of your life minus your expectations of how life should be.

The practical advice I give people is this: First, control what you can control. You can't control the traffic,
but you can control when you leave. You can't control other people, but you can control your reactions.
Second, practice gratitude daily. Not just thinking about it, but writing it down. Three things every morning.
Third, understand that your thoughts are not you. You are the observer of your thoughts. When anxiety comes,
don't identify with it, just observe it passing like a cloud.
        """,
        "duration": 7847,
        "date": "20240115"
    },
    {
        "id": "sample002",
        "title": "E195: The Exercise Neuroscientist: NEW RESEARCH, The Shocking Link Between Exercise And Dementia!",
        "guest": "Dr. Wendy Suzuki",
        "transcript": """
I'm a neuroscientist who studies the brain, and what I can tell you is that exercise is the most transformative
thing you can do for your brain today. We have new research showing that a single workout can immediately improve
your mood, your focus, and your ability to shift and focus attention. That's immediate effects from one workout.

But the long-term effects are even more remarkable. Exercise is the single best thing you can do to protect yourself
against Alzheimer's disease and dementia. We're seeing data that shows regular exercise can reduce your risk of
dementia by up to 30%. Think about that - just moving your body regularly can protect your brain for decades.

Here's what happens: when you exercise, you increase blood flow to your brain. You release growth factors like BDNF
- brain-derived neurotrophic factor - which is like fertilizer for your brain cells. You grow new brain cells in the
hippocampus, which is critical for long-term memory. You strengthen the prefrontal cortex, which helps with decision
making and focus.

The minimum effective dose is about 30 minutes of aerobic exercise, three to four times a week. But here's the good
news: you don't have to run marathons. Walking counts. Dancing counts. Swimming counts. The key is to get your heart
rate up and sustain it.

I also want to talk about the connection between exercise and mental health. We're seeing that exercise can be as
effective as antidepressants for mild to moderate depression. The problem is that when you're depressed, exercise
is the last thing you want to do. My advice is to start tiny - just five minutes. Because once you start moving,
you'll want to continue.
        """,
        "duration": 6234,
        "date": "20231208"
    },
    {
        "id": "sample003",
        "title": "E187: Simon Sinek: The Number One Reason Why You're Not Succeeding | E187",
        "guest": "Simon Sinek",
        "transcript": """
The infinite game versus the finite game - this is the framework that changed everything for me. Most people are
playing finite games in infinite contexts. Business is an infinite game. There's no winning in business. There's no
finish line. But we treat it like a finite game - we try to be number one, we try to beat the competition, we focus
on quarterly earnings.

When you play with an infinite mindset, everything changes. You're not trying to beat the competition, you're trying
to outlast them. You're not trying to be the best, you're trying to be better. You're not focused on short-term wins,
you're focused on building something that lasts.

The problem is our entire business culture is built on finite thinking. We celebrate being number one. We give
bonuses based on quarterly performance. We fire CEOs who don't deliver short-term results. But the companies that
last - Apple, Amazon, Patagonia - they all play infinite games.

Here's what changed for me personally: I used to measure my success by book sales, by speaking fees, by social media
followers. All finite metrics. Now I measure it differently. Am I helping people? Am I building something that will
outlast me? Am I making decisions today that my future self will be proud of?

The practical advice is this: Stop comparing yourself to others. Stop trying to win. Start asking different questions.
Instead of "How can I be the best?" ask "How can I be better than I was yesterday?" Instead of "How do I beat the
competition?" ask "How do I build something worth building?"

Leadership is the same. A finite leader wants to be the smartest person in the room. An infinite leader wants to build
the smartest room. A finite leader takes credit. An infinite leader gives credit. The best leaders I know don't care
about their legacy. They care about the team they leave behind.
        """,
        "duration": 5892,
        "date": "20231025"
    },
    {
        "id": "sample004",
        "title": "E178: The Fertility Doctor: Top 5 Things Harming Your Fertility & How To Fix Them!",
        "guest": "Dr. Natalie Crawford",
        "transcript": """
As a fertility doctor, I see the same five mistakes over and over again. And the frustrating part is that most of
them are completely preventable. Let's start with the biggest one: waiting too long.

The biological reality is that female fertility declines significantly after 35. I know this is uncomfortable to hear,
especially in our culture where we're told we can have it all on our own timeline. But your ovaries didn't get the memo
about modern gender equality. If you want biological children, you need to factor this into your life planning.

The second issue is extremes of weight. Both being significantly underweight and significantly overweight can impact
fertility. For women, being overweight can cause hormonal imbalances and affect ovulation. For men, obesity can
reduce sperm quality. The good news is that even modest weight loss - 5-10% of body weight - can significantly
improve fertility.

Third: stress. Chronic stress affects your hormones. It affects ovulation. It affects sperm production. I see so many
couples trying to conceive who are in high-stress jobs, not sleeping enough, not taking care of themselves. Your body
doesn't want to reproduce when it thinks you're running from a lion.

Fourth: environmental toxins. Plastics, pesticides, endocrine disruptors - they're everywhere. Use glass instead of
plastic. Buy organic when possible, especially for the dirty dozen. Filter your water. These small changes add up.

Fifth: not seeking help early enough. If you're under 35 and haven't conceived after a year of trying, get evaluated.
If you're over 35, don't wait more than six months. Time is the one thing we can't get back in fertility. The earlier
we identify issues, the more options you have.
        """,
        "duration": 4567,
        "date": "20230912"
    },
    {
        "id": "sample005",
        "title": "E156: The Financial Expert: How To Get So Rich You Never Have To Work Again!",
        "guest": "Ramit Sethi",
        "transcript": """
I'm going to tell you something controversial: most financial advice is designed to keep you poor and scared.
The advice is always about cutting back, about sacrifice, about denying yourself. But here's what actually makes
you rich: earning more and investing consistently.

Let me break down the real path to wealth. First, you need to automate everything. Your investments should happen
automatically every month before you even see the money. Most people fail at investing not because they don't know
what to invest in, but because they don't actually invest. Automation solves this.

Second, focus on the big wins. Everyone obsesses about cutting out lattes, but they're paying thousands in unnecessary
fees, they're not negotiating their salary, they're in the wrong career. A $5 latte is not the problem. Not asking for
a $10,000 raise is the problem.

Third, invest in index funds and forget about them. The data is crystal clear: over long periods, index funds beat
actively managed funds 90% of the time after fees. Stop trying to pick winning stocks. Stop trying to time the market.
Just buy diversified index funds and hold them for decades.

Fourth, understand that building wealth is about the long game. If you invest $500 a month from age 25 to 65 in the
stock market averaging 8% returns, you'll have over $1.5 million. That's not magic, that's math. The problem is most
people don't start at 25. They start at 35 or 45 and then wonder why they're behind.

My advice: earn more aggressively in your 20s and 30s. Job hop if you need to - it's the fastest way to increase
your income. Negotiate every offer. Build skills that pay. Then automate your investments and live your life. The rich
life isn't about sacrifice, it's about intentional spending on what you love and cutting ruthlessly on what you don't.
        """,
        "duration": 6103,
        "date": "20230628"
    }
]

def create_sample_data():
    """Create sample transcript files."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    for episode in SAMPLE_EPISODES:
        # Add standard fields
        episode['url'] = f"https://www.youtube.com/watch?v={episode['id']}"
        episode['thumbnail'] = f"https://i.ytimg.com/vi/{episode['id']}/maxresdefault.jpg"
        episode['view_count'] = 2_500_000 + hash(episode['id']) % 1_000_000
        episode['scraped_at'] = datetime.now().isoformat()

        # Save
        output_file = OUTPUT_DIR / f"{episode['id']}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(episode, f, indent=2, ensure_ascii=False)

        print(f"Created {episode['id']}: {episode['title']}")

    print(f"\nCreated {len(SAMPLE_EPISODES)} sample transcripts in {OUTPUT_DIR}")
    print("You can now test the AI processing pipeline with this data.")

if __name__ == "__main__":
    create_sample_data()
