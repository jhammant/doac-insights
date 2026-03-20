// DOAC Insights Web App
// Main application logic

// Episode URL map (loaded from data)
let _episodeUrls = {};

async function loadEpisodeUrls() {
    try {
        _episodeUrls = await fetch('data/episode_urls.json').then(r => r.json());
    } catch(e) { console.warn('Could not load episode URLs'); }
}

function episodeLinks(title, guest, episodeId) {
    const urls = _episodeUrls[episodeId];
    if (urls) {
        const ytIcon = urls.youtube.includes('watch') ? '▶️' : '🔍';
        const ytTitle = urls.youtube.includes('watch') ? 'Watch on YouTube' : 'Search on YouTube';
        return `<a href="${urls.youtube}" target="_blank" title="${ytTitle}" style="text-decoration:none;">${ytIcon}</a> <a href="${urls.spotify}" target="_blank" title="Listen on Spotify" style="text-decoration:none;">🎧</a>`;
    }
    // Fallback: search by guest name
    const q = encodeURIComponent((guest || '') + ' diary of a ceo');
    return `<a href="https://www.youtube.com/@TheDiaryOfACEO/search?query=${q}" target="_blank" title="Search on YouTube" style="text-decoration:none;">🔍</a> <a href="https://open.spotify.com/show/7iQXmUT7XGuZSzAMjoNWlX" target="_blank" title="Spotify" style="text-decoration:none;">🎧</a>`;
}

class DOACInsights {
    constructor() {
        this.data = {
            consensus: [],
            episodes: [],
            topics: {},
            contrarian: [],
            advice: [],
            topInsights: [],
            guests: []
        };
        this.currentView = 'consensus';
        this.init();
    }

    async init() {
        await loadEpisodeUrls();
        await this.loadData();
        this.setupEventListeners();
        this.renderView('consensus');
    }

    async loadData() {
        try {
            // Load all data files
            const [consensus, advice, contrarian, topics, topInsights, guests] = await Promise.all([
                fetch('data/consensus.json').then(r => r.json()),
                fetch('data/advice.json').then(r => r.json()),
                fetch('data/contrarian.json').then(r => r.json()),
                fetch('data/topics.json').then(r => r.json()),
                fetch('data/top_insights.json').then(r => r.json()),
                fetch('data/guests.json').then(r => r.json()).catch(() => [])
            ]);

            this.data.consensus = consensus;
            this.data.advice = advice;
            this.data.contrarian = contrarian;
            this.data.topics = topics;
            this.data.topInsights = topInsights;
            this.data.guests = guests;

            // Build episodes list from insights
            this.buildEpisodesList();

            // Populate filter dropdowns
            this.populateFilters();

            // Update stats
            this.updateStats();
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

    updateStats() {
        // Count total episodes (unique)
        const uniqueEpisodes = new Set();
        [...this.data.topInsights, ...this.data.advice, ...this.data.contrarian].forEach(item => {
            if (item.episode_id) uniqueEpisodes.add(item.episode_id);
        });

        document.getElementById('statEpisodes').textContent = uniqueEpisodes.size || this.data.episodes.length;
        document.getElementById('statGuests').textContent = this.data.guests.length;
        document.getElementById('statInsights').textContent = this.data.topInsights.length;
        document.getElementById('statAdvice').textContent = this.data.advice.length;
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

        // Populate guest expertise filter
        const guestExpertiseSelect = document.getElementById('guestExpertiseFilter');
        if (guestExpertiseSelect && this.data.guests.length > 0) {
            const expertiseAreas = [...new Set(this.data.guests.map(g => g.expertise))].filter(e => e && e !== 'Unknown').sort();
            expertiseAreas.forEach(expertise => {
                const option = document.createElement('option');
                option.value = expertise;
                option.textContent = expertise;
                guestExpertiseSelect.appendChild(option);
            });
        }
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
        document.getElementById('guestExpertiseFilter')?.addEventListener('change', () => this.renderGuests());
        document.getElementById('guestSearch')?.addEventListener('input', () => this.renderGuests());

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
            case 'guests':
                this.renderGuests();
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

        container.innerHTML = this.data.consensus.map(item => `
            <div class="card">
                <div class="card-header">
                    <div style="flex: 1;">
                        <h3 class="card-title">${item.claim || item.theme || 'Untitled'}</h3>
                        <div class="card-meta" style="margin-top: 10px;">
                            <span class="badge badge-count">${item.guest_count || (item.guests && item.guests.length) || item.count || 0} guest${(item.guest_count || (item.guests && item.guests.length) || item.count || 0) !== 1 ? 's' : ''} agree</span>
                            <span class="badge badge-count">${item.episode_count} episode${item.episode_count !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    ${item.guests && item.guests.length > 0 ? `
                        <p style="margin-bottom: 15px;"><strong>Validated by:</strong> ${item.guests.slice(0, 10).join(', ')}${item.guests.length > 10 ? ` +${item.guests.length - 10} more` : ''}</p>
                    ` : ''}
                    ${item.topics && item.topics.length > 0 ? `
                        <div style="margin-bottom: 15px;">
                            ${item.topics.map(topic => `<span class="badge badge-topic">${topic}</span>`).join('')}
                        </div>
                    ` : ''}
                    ${(item.examples || item.insights || []).length > 0 ? `
                        <div class="insights-preview">
                            <strong style="color: var(--text-secondary); font-size: 0.9rem;">Key Insights:</strong>
                            ${(item.examples || item.insights || []).slice(0, 3).map(ex => `
                                <div style="margin-top: 15px; padding: 15px; background: var(--bg-hover); border-radius: 10px;">
                                    ${ex.text ? `<p style="margin-bottom: 8px;">${ex.text}</p>` : ''}
                                    ${ex.quote ? `<div class="quote">"${ex.quote}"</div>` : ''}
                                    <small style="color: var(--text-secondary);">
                                        — ${ex.guest} ${episodeLinks(ex.episode_title, ex.guest, ex.episode_id)}
                                    </small>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    renderGuests() {
        const container = document.getElementById('guestsList');
        if (this.data.guests.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><p>No guests available</p></div>';
            return;
        }

        // Apply filters
        const expertiseFilter = document.getElementById('guestExpertiseFilter')?.value || '';
        const searchQuery = document.getElementById('guestSearch')?.value.toLowerCase() || '';

        let filteredGuests = this.data.guests;

        if (expertiseFilter) {
            filteredGuests = filteredGuests.filter(g => g.expertise === expertiseFilter);
        }

        if (searchQuery) {
            filteredGuests = filteredGuests.filter(g =>
                g.name.toLowerCase().includes(searchQuery)
            );
        }

        if (filteredGuests.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><p>No guests match your filters</p></div>';
            return;
        }

        container.innerHTML = filteredGuests.map(guest => `
            <div class="guest-card">
                <h3 class="guest-name">${guest.name}</h3>
                <div class="guest-stats">
                    <span class="badge badge-count">${guest.episode_count} episode${guest.episode_count !== 1 ? 's' : ''}</span>
                    <span class="guest-stat">${guest.insights_count} insights</span>
                    <span class="guest-stat">${guest.advice_count} advice</span>
                    ${guest.expertise && guest.expertise !== 'Unknown' ? `<span class="badge badge-topic">${guest.expertise}</span>` : ''}
                </div>
                ${guest.topics && guest.topics.length > 0 ? `
                    <div style="margin-top: 15px;">
                        <strong style="color: var(--text-secondary); font-size: 0.9rem;">Topics:</strong>
                        ${guest.topics.slice(0, 5).map(topic => `<span class="badge badge-topic">${topic}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="guest-episodes">
                    <details>
                        <summary style="cursor: pointer; color: var(--accent-primary); margin-top: 15px;">
                            View Episodes (${guest.episode_count})
                        </summary>
                        <div style="margin-top: 10px;">
                            ${guest.episodes.map(ep => `
                                <div class="guest-episode-link" style="display:flex; align-items:center; gap:8px;">
                                    <span style="flex:1;">${ep.title}</span>
                                    ${episodeLinks(ep.title, guest.name, ep.id)}
                                </div>
                            `).join('')}
                        </div>
                    </details>
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
                <h3 class="card-title">${episode.title} ${episodeLinks(episode.title, episode.guest, episode.id)}</h3>
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
                                                <p style="color: var(--text-secondary); font-size: 0.9rem;">
                            ${item.episode_title} ${episodeLinks(item.episode_title, item.guest, item.episode_id)}
                        </p>
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
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                        <h3 class="card-title" style="font-size: 1.1rem; margin: 0;">${item.advice}</h3>
                        ${item.endorsed_by && item.endorsed_by > 1 ? `
                            <span class="badge badge-count" style="white-space: nowrap;">
                                ${item.endorsed_by} guest${item.endorsed_by !== 1 ? 's' : ''}
                            </span>
                        ` : ''}
                    </div>
                    ${item.how_to ? `<p style="color: var(--text-secondary); margin-bottom: 15px;"><strong>How:</strong> ${item.how_to}</p>` : ''}
                    <div class="card-meta">
                        ${item.guests && item.guests.length > 0 ? `
                            <p><strong>Endorsed by:</strong> ${item.guests.slice(0, 5).join(', ')}${item.guests.length > 5 ? ` +${item.guests.length - 5} more` : ''}</p>
                        ` : item.guest ? `
                            <p><strong>${item.guest}</strong></p>
                        ` : ''}
                        ${item.episode_title ? `
                            <p style="font-size: 0.85rem; margin-top: 5px;">
                                ${item.episode_title} ${episodeLinks(item.episode_title, item.guest, item.episode_id)}
                            </p>
                        ` : ''}
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
                                                                <p style="font-size: 0.85rem;">
                                        ${result.data.episode_title} ${episodeLinks(result.data.episode_title, result.data.guest, result.data.episode_id)}
                                    </p>
                            </div>
                        </div>
                    `;
                } else if (result.type === 'advice') {
                    return `
                        <div class="card">
                            <h3 class="card-title" style="font-size: 1.1rem;">${result.data.advice}</h3>
                            ${result.data.how_to ? `<p style="color: var(--text-secondary);">${result.data.how_to}</p>` : ''}
                            <div class="card-meta">
                                ${result.data.guests && result.data.guests.length > 0 ? `
                                    <p><strong>Endorsed by:</strong> ${result.data.guests.slice(0, 3).join(', ')}</p>
                                ` : result.data.guest ? `
                                    <p><strong>${result.data.guest}</strong></p>
                                ` : ''}
                                ${result.data.episode_title ? `
                                    <p style="font-size: 0.85rem; margin-top: 5px;">
                                        ${result.data.episode_title} ${episodeLinks(result.data.episode_title, result.data.guest, result.data.episode_id)}
                                    </p>
                                ` : ''}
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
                    <div style="padding: 15px; background: var(--bg-hover); border-radius: 10px; margin-bottom: 15px;">
                        <p style="font-weight: 600; margin-bottom: 5px;">${ep.title} ${episodeLinks(ep.title, ep.guest, ep.id)}</p>
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
