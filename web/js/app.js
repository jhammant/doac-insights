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
            topInsights: [],
            guests: [],
            quotes: []
        };
        this.currentView = 'consensus';
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.renderQuoteOfTheDay();
        this.renderView('consensus');

        // Handle hash-based navigation
        if (window.location.hash) {
            const hash = window.location.hash.substring(1);
            if (hash.startsWith('guest/')) {
                const guestName = decodeURIComponent(hash.substring(6));
                this.showGuestProfile(guestName);
            } else {
                const validViews = ['consensus', 'guests', 'episodes', 'topics', 'contrarian', 'advice'];
                if (validViews.includes(hash)) {
                    this.switchView(hash);
                }
            }
        }
    }

    async loadData() {
        try {
            const [consensus, advice, contrarian, topics, topInsights, guests, quotes] = await Promise.all([
                fetch('data/consensus.json').then(r => r.json()),
                fetch('data/advice.json').then(r => r.json()),
                fetch('data/contrarian.json').then(r => r.json()),
                fetch('data/topics.json').then(r => r.json()),
                fetch('data/top_insights.json').then(r => r.json()),
                fetch('data/guests.json').then(r => r.json()).catch(() => []),
                fetch('data/quotes.json').then(r => r.json()).catch(() => [])
            ]);

            this.data.consensus = consensus;
            this.data.advice = advice;
            this.data.contrarian = contrarian;
            this.data.topics = topics;
            this.data.topInsights = topInsights;
            this.data.guests = guests;
            this.data.quotes = quotes;

            // Build guest insights index
            this.buildGuestIndex();
            this.buildEpisodesList();
            this.populateFilters();
            this.updateStats();
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load data. Please make sure data files are present.');
        }
    }

    buildGuestIndex() {
        // Index insights, advice, and contrarian views per guest
        this.guestInsights = {};
        this.guestAdvice = {};
        this.guestContrarian = {};

        this.data.topInsights.forEach(item => {
            const g = item.guest;
            if (!g) return;
            if (!this.guestInsights[g]) this.guestInsights[g] = [];
            this.guestInsights[g].push(item);
        });

        this.data.advice.forEach(item => {
            const g = item.guest;
            if (!g) return;
            if (!this.guestAdvice[g]) this.guestAdvice[g] = [];
            this.guestAdvice[g].push(item);
        });

        this.data.contrarian.forEach(item => {
            const g = item.guest;
            if (!g) return;
            if (!this.guestContrarian[g]) this.guestContrarian[g] = [];
            this.guestContrarian[g].push(item);
        });
    }

    buildEpisodesList() {
        const episodesMap = new Map();
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
        const topicSelect = document.getElementById('topicFilter');
        const adviceTopicSelect = document.getElementById('adviceTopicFilter');

        const allTopics = Object.keys(this.data.topics.topic_counts || {}).sort();
        allTopics.forEach(topic => {
            const label = topic.charAt(0).toUpperCase() + topic.slice(1);
            [topicSelect, adviceTopicSelect].forEach(sel => {
                if (sel) {
                    const opt = document.createElement('option');
                    opt.value = topic;
                    opt.textContent = label;
                    sel.appendChild(opt);
                }
            });
        });

        const guestExpertiseSelect = document.getElementById('guestExpertiseFilter');
        if (guestExpertiseSelect && this.data.guests.length > 0) {
            const areas = [...new Set(this.data.guests.map(g => g.expertise))].filter(e => e && e !== 'Unknown').sort();
            areas.forEach(expertise => {
                const opt = document.createElement('option');
                opt.value = expertise;
                opt.textContent = expertise;
                guestExpertiseSelect.appendChild(opt);
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

        // Quote of the Day refresh
        document.getElementById('qotdRefresh')?.addEventListener('click', () => this.renderQuoteOfTheDay());

        // Modal
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        window.addEventListener('click', (e) => {
            if (e.target.className === 'modal') this.closeModal();
        });

        // Hash navigation
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1);
            if (hash.startsWith('guest/')) {
                const guestName = decodeURIComponent(hash.substring(6));
                this.showGuestProfile(guestName);
            }
        });
    }

    // ── Quote of the Day ──
    renderQuoteOfTheDay() {
        const quotes = this.data.quotes;
        if (!quotes || quotes.length === 0) {
            document.getElementById('quoteOfTheDay').style.display = 'none';
            return;
        }

        const q = quotes[Math.floor(Math.random() * quotes.length)];
        const textEl = document.getElementById('qotdText');
        const attrEl = document.getElementById('qotdAttribution');

        // Truncate very long quotes
        let text = q.text;
        if (text.length > 300) text = text.substring(0, 297) + '...';

        textEl.textContent = `"${text}"`;
        attrEl.textContent = `— ${q.guest}`;

        document.getElementById('quoteOfTheDay').style.display = 'block';
    }

    switchView(viewName) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewName);
        });

        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        this.currentView = viewName;
        window.location.hash = viewName;
        this.renderView(viewName);
    }

    renderView(viewName) {
        const viewElement = document.getElementById(`${viewName}View`);
        if (viewElement) viewElement.classList.add('active');

        switch (viewName) {
            case 'consensus': this.renderConsensus(); break;
            case 'guests': this.renderGuests(); break;
            case 'episodes': this.renderEpisodes(); break;
            case 'topics': this.renderTopics(); break;
            case 'contrarian': this.renderContrarian(); break;
            case 'advice': this.renderAdvice(); break;
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
                    <div style="flex: 1; min-width: 0;">
                        <h3 class="card-title">${this.esc(item.claim || item.theme)}</h3>
                        <div class="card-meta" style="margin-top: 10px;">
                            <span class="badge badge-guests-agree">👥 ${item.guest_count} guest${item.guest_count !== 1 ? 's' : ''} agree</span>
                            <span class="badge badge-count">${item.episode_count} episode${item.episode_count !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    ${item.guests && item.guests.length > 0 ? `
                        <p style="margin-bottom: 15px;"><strong>Validated by:</strong> ${item.guests.slice(0, 10).map(g =>
                            `<a href="#guest/${encodeURIComponent(g)}" style="color: var(--accent-primary); text-decoration: none;">${this.esc(g)}</a>`
                        ).join(', ')}${item.guests.length > 10 ? ` +${item.guests.length - 10} more` : ''}</p>
                    ` : ''}
                    ${item.topics && item.topics.length > 0 ? `
                        <div style="margin-bottom: 15px;">
                            ${item.topics.map(topic => `<span class="badge badge-topic">${this.esc(topic)}</span>`).join('')}
                        </div>
                    ` : ''}
                    ${item.examples && item.examples.length > 0 ? `
                        <div class="insights-preview">
                            <strong style="color: var(--text-secondary); font-size: 0.9rem;">Examples:</strong>
                            ${item.examples.slice(0, 3).map(ex => `
                                <div style="margin-top: 15px; padding: 15px; background: var(--bg-dark); border-radius: 10px;">
                                    ${ex.quote ? `<div class="quote">"${this.esc(ex.quote)}"</div>` : ''}
                                    <small style="color: var(--text-secondary);">
                                        — <a href="#guest/${encodeURIComponent(ex.guest)}" style="color: var(--accent-primary); text-decoration: none;">${this.esc(ex.guest)}</a>
                                        ${ex.episode_url ? `
                                            (<a href="${ex.episode_url}" target="_blank" style="color: var(--accent-primary); text-decoration: none;">${this.esc(ex.episode_title)}</a>)
                                        ` : `(${this.esc(ex.episode_title)})`}
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

        const expertiseFilter = document.getElementById('guestExpertiseFilter')?.value || '';
        const searchQuery = document.getElementById('guestSearch')?.value.toLowerCase() || '';

        let filteredGuests = this.data.guests;
        if (expertiseFilter) {
            filteredGuests = filteredGuests.filter(g => g.expertise === expertiseFilter);
        }
        if (searchQuery) {
            filteredGuests = filteredGuests.filter(g => g.name.toLowerCase().includes(searchQuery));
        }

        // Sort by episode count descending
        filteredGuests.sort((a, b) => b.episode_count - a.episode_count);

        if (filteredGuests.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><p>No guests match your filters</p></div>';
            return;
        }

        container.innerHTML = filteredGuests.map(guest => {
            const initial = guest.name.charAt(0).toUpperCase();
            return `
                <div class="guest-card-mini" onclick="app.showGuestProfile('${this.escAttr(guest.name)}')">
                    <div class="guest-avatar">${initial}</div>
                    <div class="guest-name">${this.esc(guest.name)}</div>
                    <div class="guest-meta">${guest.episode_count} episode${guest.episode_count !== 1 ? 's' : ''}</div>
                    ${guest.expertise && guest.expertise !== 'Unknown' ? `<span class="badge badge-topic">${this.esc(guest.expertise)}</span>` : ''}
                </div>
            `;
        }).join('');
    }

    // ── Guest Profile Page ──
    showGuestProfile(guestName) {
        const guest = this.data.guests.find(g => g.name === guestName);
        if (!guest) {
            // Try fuzzy match
            const lower = guestName.toLowerCase();
            const found = this.data.guests.find(g => g.name.toLowerCase() === lower);
            if (found) return this.showGuestProfile(found.name);
            return;
        }

        // Hide all views, show profile
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

        const profileView = document.getElementById('guestProfileView');
        profileView.classList.add('active');
        window.location.hash = `guest/${encodeURIComponent(guestName)}`;

        const initial = guest.name.charAt(0).toUpperCase();
        const insights = this.guestInsights[guestName] || [];
        const advice = this.guestAdvice[guestName] || [];
        const contrarian = this.guestContrarian[guestName] || [];

        document.getElementById('guestProfileContent').innerHTML = `
            <div class="guest-profile">
                <a class="back-link" onclick="app.switchView('guests')">← Back to Guest Directory</a>

                <div class="guest-profile-header">
                    <div class="guest-profile-avatar">${initial}</div>
                    <div class="guest-profile-info">
                        <h2>${this.esc(guest.name)}</h2>
                        <div class="guest-meta">
                            ${guest.expertise && guest.expertise !== 'Unknown' ? `<span class="badge badge-topic">${this.esc(guest.expertise)}</span>` : ''}
                        </div>
                    </div>
                </div>

                <div class="profile-stats">
                    <div class="profile-stat">
                        <div class="profile-stat-number">${guest.episode_count}</div>
                        <div class="profile-stat-label">Episodes</div>
                    </div>
                    <div class="profile-stat">
                        <div class="profile-stat-number">${insights.length}</div>
                        <div class="profile-stat-label">Insights</div>
                    </div>
                    <div class="profile-stat">
                        <div class="profile-stat-number">${advice.length}</div>
                        <div class="profile-stat-label">Advice</div>
                    </div>
                    <div class="profile-stat">
                        <div class="profile-stat-number">${contrarian.length}</div>
                        <div class="profile-stat-label">Contrarian</div>
                    </div>
                </div>

                ${guest.topics && guest.topics.length > 0 ? `
                    <div class="profile-section">
                        <h3>Topics</h3>
                        <div>${guest.topics.map(t => `<span class="badge badge-topic">${this.esc(t)}</span>`).join(' ')}</div>
                    </div>
                ` : ''}

                <div class="profile-section">
                    <h3>Episodes (${guest.episode_count})</h3>
                    ${guest.episodes.map(ep => ep.url
                        ? `<a href="${ep.url}" target="_blank" class="profile-episode-link">${this.esc(ep.title)}</a>`
                        : `<div class="profile-episode-link" style="cursor: default; color: var(--text-primary);">${this.esc(ep.title)}</div>`
                    ).join('')}
                </div>

                ${insights.length > 0 ? `
                    <div class="profile-section">
                        <h3>Key Insights (${insights.length})</h3>
                        ${insights.slice(0, 20).map(ins => `
                            <div class="profile-insight">
                                <p>${this.esc(ins.insight)}</p>
                                ${ins.quote ? `<div class="quote">"${this.esc(ins.quote)}"</div>` : ''}
                                <small style="color: var(--text-secondary);">${this.esc(ins.episode_title || '')}</small>
                            </div>
                        `).join('')}
                        ${insights.length > 20 ? `<p style="color: var(--text-secondary); text-align: center; margin-top: 15px;">+${insights.length - 20} more insights</p>` : ''}
                    </div>
                ` : ''}

                ${advice.length > 0 ? `
                    <div class="profile-section">
                        <h3>Actionable Advice (${advice.length})</h3>
                        ${advice.slice(0, 15).map(adv => `
                            <div class="profile-insight">
                                <p><strong>${this.esc(adv.advice)}</strong></p>
                                ${adv.how_to ? `<p style="color: var(--text-secondary); font-size: 0.9rem;">${this.esc(adv.how_to)}</p>` : ''}
                            </div>
                        `).join('')}
                        ${advice.length > 15 ? `<p style="color: var(--text-secondary); text-align: center; margin-top: 15px;">+${advice.length - 15} more advice items</p>` : ''}
                    </div>
                ` : ''}

                ${contrarian.length > 0 ? `
                    <div class="profile-section">
                        <h3>Contrarian Views (${contrarian.length})</h3>
                        ${contrarian.slice(0, 10).map(c => `
                            <div class="profile-insight">
                                <p>${this.esc(c.claim)}</p>
                            </div>
                        `).join('')}
                        ${contrarian.length > 10 ? `<p style="color: var(--text-secondary); text-align: center; margin-top: 15px;">+${contrarian.length - 10} more</p>` : ''}
                    </div>
                ` : ''}
            </div>
        `;

        // Scroll to top
        window.scrollTo(0, 0);
    }

    renderEpisodes() {
        const container = document.getElementById('episodesList');
        if (this.data.episodes.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎙️</div><p>No episodes available</p></div>';
            return;
        }

        container.innerHTML = this.data.episodes.map(episode => `
            <div class="card">
                <h3 class="card-title">${this.esc(episode.title)}</h3>
                <div class="card-meta">
                    <p><strong>Guest:</strong> <a href="#guest/${encodeURIComponent(episode.guest)}" style="color: var(--accent-primary); text-decoration: none;">${this.esc(episode.guest)}</a></p>
                    ${episode.topics && episode.topics.length > 0 ? `
                        <div style="margin-top: 10px;">
                            ${episode.topics.map(topic => `<span class="badge badge-topic">${this.esc(topic)}</span>`).join('')}
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
                <div class="topic-card" onclick="app.showTopicDetails('${this.escAttr(topic)}')">
                    <div class="topic-card-title">${this.esc(topic.charAt(0).toUpperCase() + topic.slice(1))}</div>
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

        container.innerHTML = this.data.contrarian.slice(0, 100).map(item => `
            <div class="card">
                <div class="card-body">
                    <p style="font-size: 1.1rem; margin-bottom: 15px;">${this.esc(item.claim)}</p>
                    <div class="card-meta">
                        <p><strong><a href="#guest/${encodeURIComponent(item.guest)}" style="color: var(--accent-primary); text-decoration: none;">${this.esc(item.guest)}</a></strong></p>
                        ${item.episode_url ? `
                            <p style="font-size: 0.9rem;">
                                <a href="${item.episode_url}" target="_blank" style="color: var(--accent-primary); text-decoration: none;">
                                    ${this.esc(item.episode_title)}
                                </a>
                            </p>
                        ` : `<p style="color: var(--text-secondary); font-size: 0.9rem;">${this.esc(item.episode_title)}</p>`}
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
            filteredAdvice = filteredAdvice.filter(item => item.topics && item.topics.includes(topicFilter));
        }

        if (filteredAdvice.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">✅</div><p>No advice available</p></div>';
            return;
        }

        container.innerHTML = filteredAdvice.slice(0, 200).map(item => `
            <div class="card">
                <div class="card-body">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px; gap: 10px;">
                        <h3 class="card-title" style="font-size: 1.1rem; margin: 0; min-width: 0;">${this.esc(item.advice)}</h3>
                        ${item.endorsed_by && item.endorsed_by > 1 ? `
                            <span class="badge badge-guests-agree" style="flex-shrink: 0;">
                                👥 ${item.endorsed_by} guest${item.endorsed_by !== 1 ? 's' : ''}
                            </span>
                        ` : ''}
                    </div>
                    ${item.how_to ? `<p style="color: var(--text-secondary); margin-bottom: 15px;"><strong>How:</strong> ${this.esc(item.how_to)}</p>` : ''}
                    <div class="card-meta">
                        ${item.guests && item.guests.length > 0 ? `
                            <p><strong>Endorsed by:</strong> ${item.guests.slice(0, 5).map(g =>
                                `<a href="#guest/${encodeURIComponent(g)}" style="color: var(--accent-primary); text-decoration: none;">${this.esc(g)}</a>`
                            ).join(', ')}${item.guests.length > 5 ? ` +${item.guests.length - 5} more` : ''}</p>
                        ` : item.guest ? `
                            <p><strong><a href="#guest/${encodeURIComponent(item.guest)}" style="color: var(--accent-primary); text-decoration: none;">${this.esc(item.guest)}</a></strong></p>
                        ` : ''}
                        ${item.episode_urls && item.episode_urls.length > 0 && item.episode_urls[0] ? `
                            <p style="font-size: 0.85rem; margin-top: 5px;">
                                <a href="${item.episode_urls[0]}" target="_blank" style="color: var(--accent-primary); text-decoration: none;">View Episode →</a>
                            </p>
                        ` : item.episode_title ? `<p style="font-size: 0.85rem;">${this.esc(item.episode_title)}</p>` : ''}
                        ${item.topics && item.topics.length > 0 ? `
                            <div style="margin-top: 10px;">
                                ${item.topics.map(topic => `<span class="badge badge-topic">${this.esc(topic)}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    applyFilters() {
        if (this.currentView === 'episodes') this.renderEpisodes();
    }

    performSearch() {
        const query = document.getElementById('searchInput').value.toLowerCase().trim();
        if (!query) return;

        const results = [];

        // Search insights
        this.data.topInsights.forEach(item => {
            if (item.insight?.toLowerCase().includes(query) ||
                item.quote?.toLowerCase().includes(query) ||
                item.guest?.toLowerCase().includes(query)) {
                results.push({ type: 'insight', data: item });
            }
        });

        // Search advice
        this.data.advice.forEach(item => {
            if (item.advice?.toLowerCase().includes(query) ||
                item.how_to?.toLowerCase().includes(query) ||
                item.guest?.toLowerCase().includes(query)) {
                results.push({ type: 'advice', data: item });
            }
        });

        // Search guests
        this.data.guests.forEach(guest => {
            if (guest.name.toLowerCase().includes(query)) {
                results.push({ type: 'guest', data: guest });
            }
        });

        this.displaySearchResults(results, query);
    }

    displaySearchResults(results, query) {
        const container = document.getElementById('searchResults');
        const searchView = document.getElementById('searchView');

        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        searchView.classList.add('active');

        if (results.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔍</div><p>No results found for "${this.esc(query)}"</p></div>`;
            return;
        }

        // Show guests first
        const guests = results.filter(r => r.type === 'guest');
        const others = results.filter(r => r.type !== 'guest');

        let html = `<p style="color: var(--text-secondary); margin-bottom: 20px;">Found ${results.length} result(s) for "${this.esc(query)}"</p>`;

        if (guests.length > 0) {
            html += `<h3 style="margin-bottom: 15px;">Guests</h3>`;
            html += `<div class="guests-grid" style="margin-bottom: 30px;">`;
            html += guests.map(r => {
                const g = r.data;
                return `<div class="guest-card-mini" onclick="app.showGuestProfile('${this.escAttr(g.name)}')">
                    <div class="guest-avatar">${g.name.charAt(0)}</div>
                    <div class="guest-name">${this.esc(g.name)}</div>
                    <div class="guest-meta">${g.episode_count} episodes</div>
                </div>`;
            }).join('');
            html += `</div>`;
        }

        html += others.slice(0, 50).map(result => {
            if (result.type === 'insight') {
                return `<div class="card">
                    <p style="font-size: 1.1rem; margin-bottom: 10px;">${this.esc(result.data.insight)}</p>
                    ${result.data.quote ? `<div class="quote">"${this.esc(result.data.quote)}"</div>` : ''}
                    <div class="card-meta">
                        <p><strong><a href="#guest/${encodeURIComponent(result.data.guest)}" style="color: var(--accent-primary); text-decoration: none;">${this.esc(result.data.guest)}</a></strong></p>
                        ${result.data.episode_url ? `<p style="font-size: 0.85rem;"><a href="${result.data.episode_url}" target="_blank" style="color: var(--accent-primary);">${this.esc(result.data.episode_title)}</a></p>` : `<p style="font-size: 0.85rem;">${this.esc(result.data.episode_title)}</p>`}
                    </div>
                </div>`;
            } else if (result.type === 'advice') {
                return `<div class="card">
                    <h3 class="card-title" style="font-size: 1.1rem;">${this.esc(result.data.advice)}</h3>
                    ${result.data.how_to ? `<p style="color: var(--text-secondary);">${this.esc(result.data.how_to)}</p>` : ''}
                    <div class="card-meta">
                        <p><strong><a href="#guest/${encodeURIComponent(result.data.guest || '')}" style="color: var(--accent-primary); text-decoration: none;">${this.esc(result.data.guest || '')}</a></strong></p>
                    </div>
                </div>`;
            }
            return '';
        }).join('');

        container.innerHTML = html;
    }

    showTopicDetails(topic) {
        const episodes = this.data.topics.topic_episodes?.[topic] || [];
        const modal = document.getElementById('insightModal');
        const modalBody = document.getElementById('modalBody');

        modalBody.innerHTML = `
            <h2 style="margin-bottom: 20px;">${this.esc(topic.charAt(0).toUpperCase() + topic.slice(1))}</h2>
            <p style="color: var(--text-secondary); margin-bottom: 20px;">${episodes.length} episode(s) tagged with this topic</p>
            <div>
                ${episodes.map(ep => `
                    <div style="padding: 15px; background: var(--bg-dark); border-radius: 10px; margin-bottom: 15px;">
                        <p style="font-weight: 600; margin-bottom: 5px;">${this.esc(ep.title)}</p>
                        <p style="color: var(--text-secondary); font-size: 0.9rem;">Guest: <a href="#guest/${encodeURIComponent(ep.guest)}" style="color: var(--accent-primary); text-decoration: none;">${this.esc(ep.guest)}</a></p>
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
        document.querySelector('.main-content').innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div><p>${message}</p></div>`;
    }

    // Utility: escape HTML
    esc(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // Utility: escape for use in HTML attributes (single-quote safe)
    escAttr(str) {
        if (!str) return '';
        return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
    }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new DOACInsights();
});
