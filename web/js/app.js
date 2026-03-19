// DOAC Insights Web App
// Main application logic

class DOACInsights {
    constructor() {
        this.data = {
            consensus: [],
            episodes: [],
            topics: {},
            contrarian: [],
            advice: [],
            topInsights: []
        };
        this.currentView = 'consensus';
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.renderView('consensus');
    }

    async loadData() {
        try {
            // Load all data files
            const [consensus, advice, contrarian, topics, topInsights] = await Promise.all([
                fetch('data/consensus.json').then(r => r.json()),
                fetch('data/advice.json').then(r => r.json()),
                fetch('data/contrarian.json').then(r => r.json()),
                fetch('data/topics.json').then(r => r.json()),
                fetch('data/top_insights.json').then(r => r.json())
            ]);

            this.data.consensus = consensus;
            this.data.advice = advice;
            this.data.contrarian = contrarian;
            this.data.topics = topics;
            this.data.topInsights = topInsights;

            // Build episodes list from insights
            this.buildEpisodesList();

            // Populate filter dropdowns
            this.populateFilters();
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load data. Please make sure data files are present.');
        }
    }

    buildEpisodesList() {
        const episodesMap = new Map();

        // Collect unique episodes from all data sources
        [...this.data.topInsights, ...this.data.advice, ...this.data.contrarian].forEach(item => {
            if (item.episode_id && !episodesMap.has(item.episode_id)) {
                episodesMap.set(item.episode_id, {
                    id: item.episode_id,
                    title: item.episode_title,
                    guest: item.guest,
                    topics: item.topics || []
                });
            }
        });

        this.data.episodes = Array.from(episodesMap.values());
    }

    populateFilters() {
        // Populate topic filters
        const topicSelect = document.getElementById('topicFilter');
        const adviceTopicSelect = document.getElementById('adviceTopicFilter');

        const allTopics = Object.keys(this.data.topics.topic_counts || {}).sort();

        allTopics.forEach(topic => {
            const option1 = document.createElement('option');
            option1.value = topic;
            option1.textContent = topic.charAt(0).toUpperCase() + topic.slice(1);
            topicSelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = topic;
            option2.textContent = topic.charAt(0).toUpperCase() + topic.slice(1);
            adviceTopicSelect.appendChild(option2);
        });
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        // Search
        document.getElementById('searchBtn').addEventListener('click', () => this.performSearch());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });

        // Filters
        document.getElementById('topicFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('adviceTopicFilter')?.addEventListener('change', () => this.renderAdvice());

        // Modal
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        window.addEventListener('click', (e) => {
            if (e.target.className === 'modal') this.closeModal();
        });
    }

    switchView(viewName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewName);
        });

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        this.currentView = viewName;
        this.renderView(viewName);
    }

    renderView(viewName) {
        const viewElement = document.getElementById(`${viewName}View`);
        if (viewElement) {
            viewElement.classList.add('active');
        }

        switch (viewName) {
            case 'consensus':
                this.renderConsensus();
                break;
            case 'episodes':
                this.renderEpisodes();
                break;
            case 'topics':
                this.renderTopics();
                break;
            case 'contrarian':
                this.renderContrarian();
                break;
            case 'advice':
                this.renderAdvice();
                break;
        }
    }

    renderConsensus() {
        const container = document.getElementById('consensusList');
        if (this.data.consensus.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📊</div><p>No consensus data available</p></div>';
            return;
        }

        container.innerHTML = this.data.consensus.map(theme => `
            <div class="card">
                <div class="card-header">
                    <div>
                        <h3 class="card-title">${theme.theme}</h3>
                        <div class="card-meta">
                            <span class="badge badge-count">${theme.episode_count} episodes</span>
                            <span class="badge badge-count">${theme.count} mentions</span>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <p><strong>Validated by:</strong> ${theme.guests.join(', ')}</p>
                    <div class="insights-preview">
                        ${theme.insights.slice(0, 3).map(insight => `
                            <div style="margin-top: 15px;">
                                <p>${insight.text}</p>
                                ${insight.quote ? `<div class="quote">"${insight.quote}"</div>` : ''}
                                <small style="color: var(--text-secondary);">— ${insight.guest} (${insight.episode_title})</small>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderEpisodes() {
        const container = document.getElementById('episodesList');
        if (this.data.episodes.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎙️</div><p>No episodes available</p></div>';
            return;
        }

        container.innerHTML = this.data.episodes.map(episode => `
            <div class="card">
                <h3 class="card-title">${episode.title}</h3>
                <div class="card-meta">
                    <p><strong>Guest:</strong> ${episode.guest}</p>
                    ${episode.topics && episode.topics.length > 0 ? `
                        <div style="margin-top: 10px;">
                            ${episode.topics.map(topic => `<span class="badge badge-topic">${topic}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    renderTopics() {
        const container = document.getElementById('topicsList');
        const topics = this.data.topics.topic_counts || {};

        if (Object.keys(topics).length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏷️</div><p>No topics available</p></div>';
            return;
        }

        container.innerHTML = Object.entries(topics)
            .sort((a, b) => b[1] - a[1])
            .map(([topic, count]) => `
                <div class="topic-card" onclick="app.showTopicDetails('${topic}')">
                    <div class="topic-card-title">${topic.charAt(0).toUpperCase() + topic.slice(1)}</div>
                    <div class="topic-card-count">${count} episodes</div>
                </div>
            `).join('');
    }

    renderContrarian() {
        const container = document.getElementById('contrarianList');
        if (this.data.contrarian.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💡</div><p>No contrarian views available</p></div>';
            return;
        }

        container.innerHTML = this.data.contrarian.map(item => `
            <div class="card">
                <div class="card-body">
                    <p style="font-size: 1.1rem; margin-bottom: 15px;">${item.claim}</p>
                    <div class="card-meta">
                        <p><strong>${item.guest}</strong></p>
                        <p style="color: var(--text-secondary); font-size: 0.9rem;">${item.episode_title}</p>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderAdvice() {
        const container = document.getElementById('adviceList');
        const topicFilter = document.getElementById('adviceTopicFilter').value;

        let filteredAdvice = this.data.advice;
        if (topicFilter) {
            filteredAdvice = filteredAdvice.filter(item =>
                item.topics && item.topics.includes(topicFilter)
            );
        }

        if (filteredAdvice.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✅</div><p>No advice available</p></div>';
            return;
        }

        container.innerHTML = filteredAdvice.map(item => `
            <div class="card">
                <div class="card-body">
                    <h3 class="card-title" style="font-size: 1.1rem; margin-bottom: 10px;">${item.advice}</h3>
                    ${item.how_to ? `<p style="color: var(--text-secondary); margin-bottom: 15px;"><strong>How:</strong> ${item.how_to}</p>` : ''}
                    <div class="card-meta">
                        <p><strong>${item.guest}</strong></p>
                        <p style="font-size: 0.85rem;">${item.episode_title}</p>
                        ${item.topics && item.topics.length > 0 ? `
                            <div style="margin-top: 10px;">
                                ${item.topics.map(topic => `<span class="badge badge-topic">${topic}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    applyFilters() {
        // For episodes view
        if (this.currentView === 'episodes') {
            this.renderEpisodes();
        }
    }

    performSearch() {
        const query = document.getElementById('searchInput').value.toLowerCase().trim();
        if (!query) return;

        // Search across all data
        const results = [];

        // Search in top insights
        this.data.topInsights.forEach(item => {
            if (item.insight.toLowerCase().includes(query) ||
                (item.quote && item.quote.toLowerCase().includes(query)) ||
                item.guest.toLowerCase().includes(query)) {
                results.push({
                    type: 'insight',
                    data: item
                });
            }
        });

        // Search in advice
        this.data.advice.forEach(item => {
            if (item.advice.toLowerCase().includes(query) ||
                (item.how_to && item.how_to.toLowerCase().includes(query))) {
                results.push({
                    type: 'advice',
                    data: item
                });
            }
        });

        // Display results
        this.displaySearchResults(results, query);
    }

    displaySearchResults(results, query) {
        const container = document.getElementById('searchResults');
        const searchView = document.getElementById('searchView');

        // Switch to search view
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        searchView.classList.add('active');

        if (results.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <p>No results found for "${query}"</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <p style="color: var(--text-secondary); margin-bottom: 20px;">
                Found ${results.length} result(s) for "${query}"
            </p>
            ${results.map(result => {
                if (result.type === 'insight') {
                    return `
                        <div class="card">
                            <p style="font-size: 1.1rem; margin-bottom: 10px;">${result.data.insight}</p>
                            ${result.data.quote ? `<div class="quote">"${result.data.quote}"</div>` : ''}
                            <div class="card-meta">
                                <p><strong>${result.data.guest}</strong></p>
                                <p style="font-size: 0.85rem;">${result.data.episode_title}</p>
                            </div>
                        </div>
                    `;
                } else if (result.type === 'advice') {
                    return `
                        <div class="card">
                            <h3 class="card-title" style="font-size: 1.1rem;">${result.data.advice}</h3>
                            ${result.data.how_to ? `<p style="color: var(--text-secondary);">${result.data.how_to}</p>` : ''}
                            <div class="card-meta">
                                <p><strong>${result.data.guest}</strong></p>
                            </div>
                        </div>
                    `;
                }
                return '';
            }).join('')}
        `;
    }

    showTopicDetails(topic) {
        const episodes = this.data.topics.topic_episodes[topic] || [];
        const modal = document.getElementById('insightModal');
        const modalBody = document.getElementById('modalBody');

        modalBody.innerHTML = `
            <h2 style="margin-bottom: 20px;">${topic.charAt(0).toUpperCase() + topic.slice(1)}</h2>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">
                ${episodes.length} episode(s) tagged with this topic
            </p>
            <div>
                ${episodes.map(ep => `
                    <div style="padding: 15px; background: var(--bg-dark); border-radius: 10px; margin-bottom: 15px;">
                        <p style="font-weight: 600; margin-bottom: 5px;">${ep.title}</p>
                        <p style="color: var(--text-secondary); font-size: 0.9rem;">Guest: ${ep.guest}</p>
                    </div>
                `).join('')}
            </div>
        `;

        modal.style.display = 'block';
    }

    closeModal() {
        document.getElementById('insightModal').style.display = 'none';
    }

    showError(message) {
        console.error(message);
        document.querySelector('.main-content').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <p>${message}</p>
            </div>
        `;
    }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new DOACInsights();
});
