/**
 * KBBCO Games JavaScript functionality
 */
class KBBCOGames {
    constructor() {
        this.currentWeek = this.getCurrentWeek();
        this.displayWeek = this.currentWeek;
        this.gamesData = {};
        this.monthNames = [
            "januari", "februari", "maart", "april", "mei", "juni",
            "juli", "augustus", "september", "oktober", "november", "december"
        ];
        
        this.init();
    }
    
    init() {
        // Load games data when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.loadGames());
        } else {
            this.loadGames();
        }
    }
    
    getCurrentWeek() {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
        return Math.ceil((days + startOfYear.getDay() + 1) / 7);
    }
    
    loadGames() {
        const container = document.getElementById('games-content');
        const errorDiv = document.getElementById('error-message');
        
        if (!container) {
            console.error('KBBCO Games: Container element not found');
            return;
        }
        
        // Show loading state
        container.innerHTML = `
            <div class="loading-spinner">
                <div class="spinner"></div>
                <p>Wedstrijden laden...</p>
            </div>
        `;
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
        
        // Make AJAX request
        jQuery.ajax({
            url: kbbco_ajax.ajax_url,
            type: 'POST',
            data: {
                action: 'get_games_data',
                nonce: kbbco_ajax.nonce
            },
            timeout: 30000, // 30 second timeout
            success: (response) => {
                if (response.success && response.data) {
                    this.gamesData = response.data;
                    this.renderGames();
                    this.updateWeekTitle();
                } else {
                    console.error('KBBCO Games: Invalid response', response);
                    this.showError('Invalid data received from server');
                }
            },
            error: (xhr, status, error) => {
                console.error('KBBCO Games AJAX Error:', status, error);
                this.showError(`Failed to load games: ${error}`);
            }
        });
    }
    
    showError(message = 'Er is een fout opgetreden bij het laden van de wedstrijden.') {
        const container = document.getElementById('games-content');
        const errorDiv = document.getElementById('error-message');
        
        if (container) {
            container.innerHTML = '';
        }
        
        if (errorDiv) {
            errorDiv.querySelector('p').textContent = message;
            errorDiv.style.display = 'block';
        }
    }
    
    renderGames() {
        const container = document.getElementById('games-content');
        if (!container) return;
        
        container.innerHTML = '';
        
        // Check if we have any games data
        if (!this.gamesData || Object.keys(this.gamesData).length === 0) {
            container.innerHTML = `
                <div class="no-games-message">
                    <h3>Geen wedstrijden beschikbaar</h3>
                    <p>Er zijn momenteel geen wedstrijden beschikbaar.</p>
                </div>
            `;
            return;
        }
        
        // Create week containers
        Object.keys(this.gamesData).forEach(weekNum => {
            const weekDiv = document.createElement('div');
            weekDiv.id = `week-${weekNum}`;
            weekDiv.className = `week-games ${weekNum == this.displayWeek ? 'active' : ''}`;
            
            const games = this.gamesData[weekNum];
            
            if (!games || games.length === 0) {
                weekDiv.innerHTML = `
                    <div class="no-games-message">
                        <h3>Geen wedstrijden deze week</h3>
                        <p>Er zijn geen wedstrijden gepland voor deze week.</p>
                    </div>
                `;
            } else {
                // Group games by date
                const gamesByDate = this.groupGamesByDate(games);
                
                Object.keys(gamesByDate).forEach(date => {
                    const dayGames = gamesByDate[date];
                    const gameCard = this.createGameCard(date, dayGames);
                    weekDiv.appendChild(gameCard);
                });
            }
            
            container.appendChild(weekDiv);
        });
        
        // If current week has no games, show next week with games
        if (!this.gamesData[this.displayWeek] || this.gamesData[this.displayWeek].length === 0) {
            this.findNextWeekWithGames();
        }
    }
    
    groupGamesByDate(games) {
        const grouped = {};
        
        games.forEach(game => {
            const dateKey = `${game.date} om ${game.time}`;
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(game);
        });
        
        return grouped;
    }
    
    createGameCard(dateTime, games) {
        const card = document.createElement('div');
        card.className = 'game-card';
        
        // Extract competition info (check if any game is a cup game)
        const hasCupGame = games.some(game => game.is_cup);
        const competition = hasCupGame ? games.find(game => game.is_cup).competition : '';
        
        const dateHeader = document.createElement('div');
        dateHeader.className = 'game-date-header';
        dateHeader.innerHTML = `
            <span>${this.escapeHtml(dateTime)}</span>
            ${hasCupGame ? `<span class="competition-badge">${this.escapeHtml(competition)}</span>` : ''}
        `;
        card.appendChild(dateHeader);
        
        const cardContent = document.createElement('div');
        cardContent.className = 'game-content';
        
        games.forEach((game, index) => {
            if (index > 0) {
                const divider = document.createElement('hr');
                divider.className = 'game-divider';
                cardContent.appendChild(divider);
            }
            
            const matchup = this.createMatchup(game);
            cardContent.appendChild(matchup);
        });
        
        card.appendChild(cardContent);
        return card;
    }
    
    createMatchup(game) {
        const matchup = document.createElement('div');
        matchup.className = 'team-matchup';
        
        const homeTeam = game.is_home ? 'KBBC Oostkamp' : game.opponent;
        const awayTeam = game.is_home ? game.opponent : 'KBBC Oostkamp';
        const homeScore = game.has_result ? game.score_home : '';
        const awayScore = game.has_result ? game.score_away : '';
        
        // Team level class for styling
        const levelClass = this.getTeamLevelClass(game.team_info.display);
        
        // Create home team section
        const homeSection = document.createElement('div');
        homeSection.className = `team-section home ${game.is_home ? 'kbbc-team' : ''}`;
        
        let homeSectionHTML = `
            <div class="team-name">
                ${game.is_home ? 
                    `<a href="https://kbbco.be/${this.escapeHtml(game.team_info.link)}/">KBBC Oostkamp</a>` : 
                    `<a href="https://vblweb.wisseq.eu/Home/TeamDetail?teamguid=${this.escapeHtml(game.opponent_guid)}" target="_blank" rel="noopener">${this.escapeHtml(game.opponent)}</a>`
                }
                ${game.is_home && game.team_info ? 
                    `<span class="team-level-inline ${levelClass}">
                        <a href="https://kbbco.be/${this.escapeHtml(game.team_info.link)}/">${this.escapeHtml(game.team_info.display)}</a>
                    </span>` : ''
                }
            </div>
        `;
        
        if (homeScore) {
            homeSectionHTML += `<div class="team-score">${this.escapeHtml(homeScore)}</div>`;
        }
        
        homeSection.innerHTML = homeSectionHTML;
        
        // Create VS section
        const vsSection = document.createElement('div');
        vsSection.className = 'vs-section';
        vsSection.innerHTML = `
            <div class="vs-divider">VS</div>
            <div class="game-status">${game.has_result ? 'Gespeeld' : 'Te spelen'}</div>
        `;
        
        // Create away team section
        const awaySection = document.createElement('div');
        awaySection.className = `team-section away ${!game.is_home ? 'kbbc-team' : ''}`;
        
        let awaySectionHTML = `
            <div class="team-name">
                ${!game.is_home ? 
                    `<a href="https://kbbco.be/${this.escapeHtml(game.team_info.link)}/">KBBC Oostkamp</a>` : 
                    `<a href="https://vblweb.wisseq.eu/Home/TeamDetail?teamguid=${this.escapeHtml(game.opponent_guid)}" target="_blank" rel="noopener">${this.escapeHtml(game.opponent)}</a>`
                }
                ${!game.is_home && game.team_info ? 
                    `<span class="team-level-inline ${levelClass}">
                        <a href="https://kbbco.be/${this.escapeHtml(game.team_info.link)}/">${this.escapeHtml(game.team_info.display)}</a>
                    </span>` : ''
                }
            </div>
        `;
        
        if (awayScore) {
            awaySectionHTML += `<div class="team-score">${this.escapeHtml(awayScore)}</div>`;
        }
        
        awaySection.innerHTML = awaySectionHTML;
        
        // Append sections to matchup
        matchup.appendChild(homeSection);
        matchup.appendChild(vsSection);
        matchup.appendChild(awaySection);
        
        return matchup;
    }
    
    getTeamLevelClass(teamDisplay) {
        if (!teamDisplay) return 'seniors';
        
        const display = teamDisplay.toLowerCase();
        if (display.includes('one') || display.includes('two') || display.includes('three')) {
            return 'seniors';
        } else if (display.includes('21')) {
            return 'u21';
        } else if (display.includes('18')) {
            return 'u18';
        } else if (display.includes('16')) {
            return 'u16';
        } else if (display.includes('14')) {
            return 'u14';
        } else if (display.includes('12')) {
            return 'u12';
        } else if (display.includes('10')) {
            return 'u10';
        } else if (display.includes('8')) {
            return 'u8';
        }
        return 'seniors';
    }
    
    nextWeek() {
        this.hideCurrentWeek();
        
        this.displayWeek++;
        if (this.displayWeek > 52) {
            this.displayWeek = 1;
        }
        
        // Find next week with games if current week is empty
        if (!this.gamesData[this.displayWeek] || this.gamesData[this.displayWeek].length === 0) {
            this.findNextWeekWithGames();
        }
        
        this.showCurrentWeek();
        this.updateWeekTitle();
    }
    
    prevWeek() {
        this.hideCurrentWeek();
        
        this.displayWeek--;
        if (this.displayWeek < 1) {
            this.displayWeek = 52;
        }
        
        // Find previous week with games if current week is empty
        if (!this.gamesData[this.displayWeek] || this.gamesData[this.displayWeek].length === 0) {
            this.findPrevWeekWithGames();
        }
        
        this.showCurrentWeek();
        this.updateWeekTitle();
    }
    
    hideCurrentWeek() {
        const currentWeekDiv = document.getElementById(`week-${this.displayWeek}`);
        if (currentWeekDiv) {
            currentWeekDiv.classList.remove('active');
        }
    }
    
    showCurrentWeek() {
        const weekDiv = document.getElementById(`week-${this.displayWeek}`);
        if (weekDiv) {
            weekDiv.classList.add('active');
        }
    }
    
    findNextWeekWithGames() {
        const weeks = Object.keys(this.gamesData).map(w => parseInt(w)).sort((a, b) => a - b);
        const nextWeek = weeks.find(w => w > this.displayWeek);
        if (nextWeek) {
            this.displayWeek = nextWeek;
        } else if (weeks.length > 0) {
            this.displayWeek = weeks[0]; // Wrap to first week with games
        }
    }
    
    findPrevWeekWithGames() {
        const weeks = Object.keys(this.gamesData).map(w => parseInt(w)).sort((a, b) => b - a);
        const prevWeek = weeks.find(w => w < this.displayWeek);
        if (prevWeek) {
            this.displayWeek = prevWeek;
        } else if (weeks.length > 0) {
            this.displayWeek = weeks[0]; // Wrap to last week with games
        }
    }
    
    updateWeekTitle() {
        const titleElement = document.getElementById('week-title');
        if (!titleElement) return;
        
        try {
            // Check if we're showing the current week
            if (this.displayWeek === this.currentWeek) {
                titleElement.textContent = 'Wedstrijden voor deze week';
                return;
            }
            
            const startDate = this.getDateOfWeek(this.displayWeek, new Date().getFullYear());
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            
            let content = `Van maandag ${startDate.getDate()} `;
            if (startDate.getMonth() !== endDate.getMonth()) {
                content += this.monthNames[startDate.getMonth()];
            }
            content += ` tem zondag ${endDate.getDate()} ${this.monthNames[endDate.getMonth()]}`;
            
            titleElement.textContent = content;
        } catch (error) {
            console.error('Error updating week title:', error);
            titleElement.textContent = `Week ${this.displayWeek}`;
        }
    }
    
    getDateOfWeek(week, year) {
        const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
        const dow = simple.getUTCDay();
        const ISOweekStart = simple;
        if (dow <= 4) {
            ISOweekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
        } else {
            ISOweekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
        }
        return ISOweekStart;
    }
    
    // Utility function to escape HTML
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize when document is ready
let kbbcoGames;
jQuery(document).ready(function($) {
    if (typeof kbbco_ajax !== 'undefined') {
        kbbcoGames = new KBBCOGames();
    } else {
        console.error('KBBCO Games: AJAX configuration not found');
    }
});

// Global functions for backward compatibility and onclick handlers
window.kbbcoGames = {
    nextWeek: function() {
        if (kbbcoGames) {
            kbbcoGames.nextWeek();
        } else {
            console.warn('KBBCO Games: Not initialized');
        }
    },
    prevWeek: function() {
        if (kbbcoGames) {
            kbbcoGames.prevWeek();
        } else {
            console.warn('KBBCO Games: Not initialized');
        }
    },
    loadGames: function() {
        if (kbbcoGames) {
            kbbcoGames.loadGames();
        } else {
            console.warn('KBBCO Games: Not initialized');
        }
    }
};