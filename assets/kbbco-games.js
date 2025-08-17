/**
 * KBBCO Games JavaScript functionality
 */
class KBBCOGames {
    constructor() {
        this.currentWeek = this.getCurrentWeek();
        this.displayWeek = this.currentWeek;
        this.gamesData = {};
        this.filteredTeams = new Set();
        this.availableTeams = new Set();
        this.filterExpanded = false;
        this.monthNames = [
            "januari", "februari", "maart", "april", "mei", "juni",
            "juli", "augustus", "september", "oktober", "november", "december"
        ];
        
        this.loadFilterPreferences();
        this.init();
    }
    
    init() {
        // Load games data when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.loadGames();
                this.setupCalendarDropdownHandlers();
            });
        } else {
            this.loadGames();
            this.setupCalendarDropdownHandlers();
        }
    }
    
    setupCalendarDropdownHandlers() {
        // No longer needed since we use hover instead of click
    }
    
    getCurrentWeek() {
        const now = new Date();
        
        // Get ISO week number (Monday-based weeks)
        // This algorithm follows ISO 8601 standard
        const thursday = new Date(now.getTime());
        thursday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + 3);
        
        const firstThursday = new Date(thursday.getFullYear(), 0, 4);
        firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);
        
        const weekNumber = Math.floor((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
        
        return weekNumber;
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
        
        // Initialize team filter if not done yet
        if (this.availableTeams.size === 0) {
            this.initializeTeamFilter();
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
                // Filter games based on selected teams
                const filteredGames = games.filter(game => this.shouldShowGame(game));
                
                if (filteredGames.length === 0) {
                    weekDiv.innerHTML = `
                        <div class="no-games-message">
                            <h3>Geen wedstrijden voor geselecteerde teams</h3>
                            <p>Er zijn geen wedstrijden voor de geselecteerde teams deze week.</p>
                        </div>
                    `;
                } else {
                    // Group filtered games by date
                    const gamesByDate = this.groupGamesByDate(filteredGames);
                    
                    Object.keys(gamesByDate).forEach(date => {
                        const dayGames = gamesByDate[date];
                        const gameCard = this.createGameCard(date, dayGames);
                        weekDiv.appendChild(gameCard);
                    });
                }
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
        
        // Check if any game in this group can be added to calendar
        const hasUpcomingGame = games.some(game => !game.has_result);
        
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
        
        // Determine if KBBC won
        const kbbcWon = game.has_result && (
            (game.is_home && parseInt(homeScore) > parseInt(awayScore)) ||
            (!game.is_home && parseInt(awayScore) > parseInt(homeScore))
        );
        
        // Create home team section
        const homeSection = document.createElement('div');
        homeSection.className = `team-section home ${game.is_home ? 'kbbc-team' : ''} ${game.is_home && kbbcWon ? 'kbbc-winner' : ''}`;
        
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
        
        // Generate calendar URLs for upcoming games
        const calendarUrls = this.generateCalendarUrls(game);
        const isClickable = calendarUrls !== null;
        
        // Create VS divider with optional calendar functionality
        const vsDividerContent = calendarUrls ? `
            <div class="vs-divider ${isClickable ? 'clickable' : ''}" title="Voeg toe aan kalender">
                VS
            </div>
        ` : `
            <div class="vs-divider">VS</div>
        `;
        
        const calendarDropdown = calendarUrls ? `
            <div class="calendar-dropdown">
                <a href="${calendarUrls.google}" target="_blank" rel="noopener">Google Calendar</a>
                <a href="${calendarUrls.outlook}" target="_blank" rel="noopener">Outlook</a>
                <a href="${calendarUrls.ical}" download="kbbco-game.ics">Apple Calendar</a>
            </div>
        ` : '';
        
        vsSection.innerHTML = `
            ${vsDividerContent}
            <div class="game-status">${game.has_result ? 'Gespeeld' : 'Te spelen'}</div>
            ${calendarDropdown}
        `;
        
        // Create away team section
        const awaySection = document.createElement('div');
        awaySection.className = `team-section away ${!game.is_home ? 'kbbc-team' : ''} ${!game.is_home && kbbcWon ? 'kbbc-winner' : ''}`;
        
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
            
            // Get the Monday of the selected week
            const currentYear = new Date().getFullYear();
            const startDate = this.getDateOfWeek(this.displayWeek, currentYear);
            
            // Calculate Sunday (6 days after Monday)
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            
            // Format the title
            let content = `Van maandag ${startDate.getDate()} `;
            if (startDate.getMonth() !== endDate.getMonth()) {
                content += this.monthNames[startDate.getMonth()];
            }
            content += ` tem zondag ${endDate.getDate()} ${this.monthNames[endDate.getMonth()]}`;
            
            // Handle year changes (if week spans into next year)
            if (startDate.getFullYear() !== endDate.getFullYear()) {
                content = `Van maandag ${startDate.getDate()} ${this.monthNames[startDate.getMonth()]} ${startDate.getFullYear()} tem zondag ${endDate.getDate()} ${this.monthNames[endDate.getMonth()]} ${endDate.getFullYear()}`;
            }
            
            titleElement.textContent = content;
        } catch (error) {
            console.error('Error updating week title:', error);
            titleElement.textContent = `Week ${this.displayWeek}`;
        }
    }
    
    getDateOfWeek(week, year) {
        // Calculate the Monday of the given ISO week number
        // ISO weeks start on Monday and week 1 contains the first Thursday of the year
        
        // Find the first Thursday of the year
        const firstThursday = new Date(year, 0, 4);
        firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7) + 3);
        
        // Calculate the Monday of week 1 (3 days before the first Thursday)
        const mondayOfWeek1 = new Date(firstThursday.getTime());
        mondayOfWeek1.setDate(firstThursday.getDate() - 3);
        
        // Add (week - 1) * 7 days to get the Monday of the requested week
        const mondayOfRequestedWeek = new Date(mondayOfWeek1.getTime());
        mondayOfRequestedWeek.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);
        
        return mondayOfRequestedWeek;
    }
    
    // Utility function to escape HTML
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Generate calendar URLs for individual games
    generateCalendarUrls(game) {
        if (!game.date || !game.time || game.has_result) {
            return null; // Don't show calendar for completed games or games without date/time
        }
        
        // Parse date and time
        const dateParts = game.date.match(/(\d{1,2}) (\w+)/);
        if (!dateParts) return null;
        
        const day = parseInt(dateParts[1]);
        const monthName = dateParts[2].toLowerCase();
        const monthIndex = this.monthNames.indexOf(monthName);
        if (monthIndex === -1) return null;
        
        // Create date object (assume current year)
        const gameDate = new Date(new Date().getFullYear(), monthIndex, day);
        
        // Parse time (format: "20.00")
        const timeParts = game.time.match(/(\d{1,2})\.(\d{2})/);
        if (!timeParts) return null;
        
        const hours = parseInt(timeParts[1]);
        const minutes = parseInt(timeParts[2]);
        
        gameDate.setHours(hours, minutes, 0, 0);
        
        // End time (assume 2 hour duration for basketball)
        const endDate = new Date(gameDate.getTime() + (2 * 60 * 60 * 1000));
        
        // Format for calendar URLs
        const formatDateForCalendar = (date) => {
            return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };
        
        const startTime = formatDateForCalendar(gameDate);
        const endTime = formatDateForCalendar(endDate);
        
        // Event details
        const homeTeam = game.is_home ? 'KBBCO Oostkamp' : game.opponent;
        const awayTeam = game.is_home ? game.opponent : 'KBBCO Oostkamp';
        const title = `${homeTeam} vs ${awayTeam}`;
        const details = game.team_info ? `KBBCO ${game.team_info.display} team` : 'KBBCO Oostkamp basketball game';
        const location = game.is_home ? 'Sporthal KBBCO, Oostkamp' : '';
        
        // Generate URLs
        const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
        
        const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${startTime}&enddt=${endTime}&body=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
        
        // iCal format for Apple Calendar and other apps
        const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:KBBCO Games
BEGIN:VEVENT
UID:kbbco-${game.date.replace(/\s/g, '')}-${game.time.replace('.', '')}-${Date.now()}
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:${title}
DESCRIPTION:${details}
LOCATION:${location}
END:VEVENT
END:VCALENDAR`;
        
        const icalUrl = `data:text/calendar;charset=utf8,${encodeURIComponent(icalContent)}`;
        
        return {
            google: googleUrl,
            outlook: outlookUrl,
            ical: icalUrl
        };
    }
    
    // Team filter functionality
    loadFilterPreferences() {
        const saved = localStorage.getItem('kbbco_team_filter');
        if (saved) {
            try {
                const teams = JSON.parse(saved);
                this.filteredTeams = new Set(teams);
            } catch (e) {
                console.warn('Failed to load filter preferences');
            }
        }
    }
    
    saveFilterPreferences() {
        localStorage.setItem('kbbco_team_filter', JSON.stringify([...this.filteredTeams]));
    }
    
    toggleFilter() {
        this.filterExpanded = !this.filterExpanded;
        const content = document.getElementById('team-filter-content');
        const arrow = document.querySelector('.filter-arrow');
        
        if (this.filterExpanded) {
            content.style.display = 'block';
            arrow.style.transform = 'rotate(180deg)';
        } else {
            content.style.display = 'none';
            arrow.style.transform = 'rotate(0deg)';
        }
    }
    
    initializeTeamFilter() {
        // Collect all unique teams from games data
        this.availableTeams.clear();
        Object.values(this.gamesData).forEach(weekGames => {
            weekGames.forEach(game => {
                if (game.team_info && game.team_info.display) {
                    this.availableTeams.add(game.team_info.display);
                }
            });
        });
        
        // If no teams are filtered, show all teams
        if (this.filteredTeams.size === 0) {
            this.filteredTeams = new Set(this.availableTeams);
        }
        
        this.renderTeamCheckboxes();
        this.updateFilterCount();
    }
    
    renderTeamCheckboxes() {
        const container = document.getElementById('team-checkboxes');
        if (!container) return;
        
        // Sort teams: seniors first, then youth by age descending
        const teams = [...this.availableTeams].sort((a, b) => {
            const aIsSenior = a.includes('ONE') || a.includes('TWO') || a.includes('THREE');
            const bIsSenior = b.includes('ONE') || b.includes('TWO') || b.includes('THREE');
            
            if (aIsSenior && !bIsSenior) return -1;
            if (!aIsSenior && bIsSenior) return 1;
            
            // Both senior or both youth, sort alphabetically
            return a.localeCompare(b);
        });
        
        container.innerHTML = teams.map(team => {
            const levelClass = this.getTeamLevelClass(team);
            const isChecked = this.filteredTeams.has(team);
            
            return `
                <label class="team-checkbox ${levelClass}">
                    <input type="checkbox" ${isChecked ? 'checked' : ''} 
                           onchange="kbbcoGames.toggleTeam('${team}')">
                    <span class="checkbox-custom"></span>
                    <span class="team-label">${team}</span>
                </label>
            `;
        }).join('');
    }
    
    toggleTeam(team) {
        if (this.filteredTeams.has(team)) {
            this.filteredTeams.delete(team);
        } else {
            this.filteredTeams.add(team);
        }
        
        this.saveFilterPreferences();
        this.updateFilterCount();
        this.renderGames();
    }
    
    selectAllTeams() {
        this.filteredTeams = new Set(this.availableTeams);
        this.renderTeamCheckboxes();
        this.updateFilterCount();
        this.saveFilterPreferences();
        this.renderGames();
    }
    
    selectSeniorTeams() {
        this.filteredTeams.clear();
        this.availableTeams.forEach(team => {
            if (team.includes('ONE') || team.includes('TWO') || team.includes('THREE')) {
                this.filteredTeams.add(team);
            }
        });
        this.renderTeamCheckboxes();
        this.updateFilterCount();
        this.saveFilterPreferences();
        this.renderGames();
    }
    
    selectYouthTeams() {
        this.filteredTeams.clear();
        this.availableTeams.forEach(team => {
            if (!team.includes('ONE') && !team.includes('TWO') && !team.includes('THREE')) {
                this.filteredTeams.add(team);
            }
        });
        this.renderTeamCheckboxes();
        this.updateFilterCount();
        this.saveFilterPreferences();
        this.renderGames();
    }
    
    clearAllTeams() {
        this.filteredTeams.clear();
        this.renderTeamCheckboxes();
        this.updateFilterCount();
        this.saveFilterPreferences();
        this.renderGames();
    }
    
    updateFilterCount() {
        const countElement = document.querySelector('.filter-count');
        if (!countElement) return;
        
        const total = this.availableTeams.size;
        const selected = this.filteredTeams.size;
        
        if (selected === 0) {
            countElement.textContent = 'Geen teams';
        } else if (selected === total) {
            countElement.textContent = 'Alle teams';
        } else {
            countElement.textContent = `${selected}/${total} teams`;
        }
    }
    
    shouldShowGame(game) {
        if (this.filteredTeams.size === 0) return false;
        if (!game.team_info || !game.team_info.display) return true;
        return this.filteredTeams.has(game.team_info.display);
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
    },
    toggleFilter: function() {
        if (kbbcoGames) {
            kbbcoGames.toggleFilter();
        } else {
            console.warn('KBBCO Games: Not initialized');
        }
    },
    toggleTeam: function(team) {
        if (kbbcoGames) {
            kbbcoGames.toggleTeam(team);
        } else {
            console.warn('KBBCO Games: Not initialized');
        }
    },
    selectAllTeams: function() {
        if (kbbcoGames) {
            kbbcoGames.selectAllTeams();
        } else {
            console.warn('KBBCO Games: Not initialized');
        }
    },
    selectSeniorTeams: function() {
        if (kbbcoGames) {
            kbbcoGames.selectSeniorTeams();
        } else {
            console.warn('KBBCO Games: Not initialized');
        }
    },
    selectYouthTeams: function() {
        if (kbbcoGames) {
            kbbcoGames.selectYouthTeams();
        } else {
            console.warn('KBBCO Games: Not initialized');
        }
    },
    clearAllTeams: function() {
        if (kbbcoGames) {
            kbbcoGames.clearAllTeams();
        } else {
            console.warn('KBBCO Games: Not initialized');
        }
    }
};