// ============================================================================
// BATTLE ARENA - UI JavaScript
// Handles all UI interactions and updates
// ============================================================================

let currentTeam = null;
let currentRole = null;
let matchTimer = null;

// ============================================================================
// TEAM SELECTION
// ============================================================================

function showTeamSelection() {
    document.getElementById('teamSelection').classList.remove('hidden');
    updateTeamStats();
}

function selectTeam(teamId) {
    currentTeam = teamId;
    
    // Call RAGE MP event
    if (typeof mp !== 'undefined') {
        mp.trigger('selectTeam', teamId);
    }
    
    // Hide team selection
    document.getElementById('teamSelection').classList.add('hidden');
    
    // Show role selection
    showRoleSelection(teamId);
}

function updateTeamStats() {
    // Will be updated from server
    // Example: document.getElementById('team1-count').textContent = count;
}

// ============================================================================
// ROLE SELECTION
// ============================================================================

function showRoleSelection(teamId) {
    document.getElementById('roleSelection').classList.remove('hidden');
}

function selectRole(roleName) {
    currentRole = roleName;
    
    // Call RAGE MP event
    if (typeof mp !== 'undefined') {
        mp.trigger('selectRole', roleName);
    }
    
    // Hide role selection
    document.getElementById('roleSelection').classList.add('hidden');
    
    // Update HUD
    updateRoleDisplay(roleName);
}

// ============================================================================
// HUD MANAGEMENT
// ============================================================================

function showHUD() {
    document.getElementById('hud').classList.remove('hidden');
    startMatchTimer();
}

function hideHUD() {
    document.getElementById('hud').classList.add('hidden');
    stopMatchTimer();
}

function updateHUD(data) {
    // Update health
    if (data.health !== undefined) {
        const healthPercent = Math.max(0, Math.min(100, data.health));
        document.getElementById('health-fill').style.width = healthPercent + '%';
        document.getElementById('health-text').textContent = Math.floor(healthPercent);
    }
    
    // Update armor
    if (data.armor !== undefined) {
        const armorPercent = Math.max(0, Math.min(100, data.armor));
        document.getElementById('armor-fill').style.width = armorPercent + '%';
        document.getElementById('armor-text').textContent = Math.floor(armorPercent);
    }
    
    // Update team scores
    if (data.team1Score !== undefined) {
        document.getElementById('team1-score').textContent = data.team1Score;
    }
    if (data.team2Score !== undefined) {
        document.getElementById('team2-score').textContent = data.team2Score;
    }
    
    // Update objectives
    if (data.objectives) {
        updateObjectives(data.objectives);
    }
    
    // Update squad members
    if (data.squadMembers) {
        updateSquadMembers(data.squadMembers);
    }
}

function updateRoleDisplay(roleName) {
    const roleIcons = {
        'rifleman': '🎯',
        'medic': '🏥',
        'engineer': '🔧',
        'squad_leader': '⭐',
        'marksman': '🎯',
        'mg_gunner': '🔥',
        'at_gunner': '💣'
    };
    
    document.getElementById('role-icon').textContent = roleIcons[roleName] || '🎯';
    document.getElementById('role-name').textContent = roleName.replace('_', ' ');
}

// ============================================================================
// OBJECTIVES
// ============================================================================

function updateObjectives(objectives) {
    const list = document.getElementById('objectives-list');
    list.innerHTML = '';
    
    objectives.forEach(obj => {
        const item = document.createElement('div');
        item.className = 'objective-item';
        
        if (obj.capturedBy === null) {
            item.classList.add('neutral');
        } else if (obj.capturedBy === 1) {
            item.classList.add('team1');
        } else if (obj.capturedBy === 2) {
            item.classList.add('team2');
        }
        
        item.innerHTML = `
            <span class="objective-name">${obj.name}</span>
            <span class="objective-status">${getObjectiveStatus(obj.capturedBy)}</span>
        `;
        
        list.appendChild(item);
    });
}

function getObjectiveStatus(capturedBy) {
    if (capturedBy === null) return 'NEUTRAL';
    return `TEAM ${capturedBy}`;
}

// ============================================================================
// SQUAD MEMBERS
// ============================================================================

function updateSquadMembers(members) {
    const container = document.getElementById('squad-members');
    container.innerHTML = '';
    
    members.forEach(member => {
        const memberDiv = document.createElement('div');
        memberDiv.className = 'squad-member';
        
        const roleIcon = getRoleIcon(member.role);
        
        memberDiv.innerHTML = `
            <div class="member-avatar">${roleIcon}</div>
            <span class="member-name">${member.name}</span>
        `;
        
        container.appendChild(memberDiv);
    });
}

function getRoleIcon(role) {
    const icons = {
        'rifleman': '🎯',
        'medic': '🏥',
        'engineer': '🔧',
        'squad_leader': '⭐',
        'marksman': '🎯',
        'mg_gunner': '🔥',
        'at_gunner': '💣'
    };
    return icons[role] || '👤';
}

// ============================================================================
// MATCH TIMER
// ============================================================================

let matchStartTime = null;

function startMatchTimer() {
    matchStartTime = Date.now();
    
    if (matchTimer) {
        clearInterval(matchTimer);
    }
    
    matchTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - matchStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        document.getElementById('match-timer').textContent = timeString;
    }, 1000);
}

function stopMatchTimer() {
    if (matchTimer) {
        clearInterval(matchTimer);
        matchTimer = null;
    }
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications');
    
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    
    container.appendChild(notif);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            notif.remove();
        }, 300);
    }, 5000);
}

// ============================================================================
// KILL FEED
// ============================================================================

function addKillFeed(killer, victim, weapon) {
    const container = document.getElementById('killfeed');
    
    const item = document.createElement('div');
    item.className = 'kill-item';
    item.innerHTML = `
        <span class="killer">${killer}</span>
        <span class="weapon">${weapon}</span>
        <span class="victim">${victim}</span>
    `;
    
    container.appendChild(item);
    
    // Auto remove after 8 seconds
    setTimeout(() => {
        item.style.opacity = '0';
        setTimeout(() => {
            item.remove();
        }, 300);
    }, 8000);
    
    // Keep only last 5 kills
    while (container.children.length > 5) {
        container.removeChild(container.firstChild);
    }
}

// ============================================================================
// UI TOGGLE FUNCTIONS
// ============================================================================

function toggleMenu() {
    const teamSelection = document.getElementById('teamSelection');
    const roleSelection = document.getElementById('roleSelection');
    
    if (teamSelection.classList.contains('hidden') && roleSelection.classList.contains('hidden')) {
        showTeamSelection();
    } else {
        teamSelection.classList.add('hidden');
        roleSelection.classList.add('hidden');
    }
}

function toggleSquadMenu() {
    // TODO: Implement squad management menu
    showNotification('Squad menu coming soon!', 'info');
}

function toggleObjectivesMap() {
    // TODO: Implement full-screen objectives map
    showNotification('Map view coming soon!', 'info');
}

function closeAllUI() {
    document.getElementById('teamSelection').classList.add('hidden');
    document.getElementById('roleSelection').classList.add('hidden');
}

function hideUI() {
    closeAllUI();
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Auto-show team selection on load (for testing)
if (typeof mp === 'undefined') {
    // Browser testing mode
    setTimeout(() => {
        showTeamSelection();
        
        // Mock data for testing
        setTimeout(() => {
            showHUD();
            updateHUD({
                health: 85,
                armor: 60,
                team1Score: 250,
                team2Score: 180,
                objectives: [
                    { name: 'ALPHA', capturedBy: 1 },
                    { name: 'BRAVO', capturedBy: null },
                    { name: 'CHARLIE', capturedBy: 2 }
                ],
                squadMembers: [
                    { name: 'Player1', role: 'squad_leader' },
                    { name: 'Player2', role: 'rifleman' },
                    { name: 'Player3', role: 'medic' }
                ]
            });
            
            updateRoleDisplay('rifleman');
            document.getElementById('squad-number').textContent = '1';
            
            // Test notifications
            setTimeout(() => showNotification('Objective captured!', 'success'), 2000);
            setTimeout(() => addKillFeed('Player1', 'Enemy1', 'AK-47'), 3000);
        }, 1000);
    }, 500);
}

console.log('[UI] Battle Arena UI loaded');
