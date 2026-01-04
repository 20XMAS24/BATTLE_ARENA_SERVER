// ============================================================================
// TEAM SELECTION - JavaScript Controller
// ============================================================================

function selectTeam(teamId) {
    console.log(`[TEAM SELECT] Selected team ${teamId}`);
    
    // Visual feedback
    const card = document.querySelector(`.team-card.team-${teamId}`);
    card.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        card.style.transform = '';
        
        // Send to RAGE MP
        if (typeof mp !== 'undefined') {
            mp.trigger('cef:selectTeam', teamId);
        }
    }, 200);
}

function updateTeamStats(team1Data, team2Data) {
    // Team 1
    document.getElementById('team1-players').textContent = 
        `${team1Data.playerCount}/50`;
    document.getElementById('team1-winrate').textContent = 
        `${team1Data.winRate}%`;
    
    // Team 2
    document.getElementById('team2-players').textContent = 
        `${team2Data.playerCount}/50`;
    document.getElementById('team2-winrate').textContent = 
        `${team2Data.winRate}%`;
}

// ESC key handler
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        // Auto-assign to team with fewer players
        const team1Players = parseInt(document.getElementById('team1-players').textContent);
        const team2Players = parseInt(document.getElementById('team2-players').textContent);
        
        const autoTeam = team1Players <= team2Players ? 1 : 2;
        selectTeam(autoTeam);
    }
});

// Request team stats from server
if (typeof mp !== 'undefined') {
    mp.events.add('updateTeamStats', (data) => {
        const stats = JSON.parse(data);
        updateTeamStats(stats.team1, stats.team2);
    });
    
    // Request initial stats
    mp.trigger('cef:requestTeamStats');
}

console.log('[TEAM SELECT] Team selection UI loaded');
