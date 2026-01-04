// ============================================================================
// BATTLE ARENA HUD - JavaScript Controller
// ============================================================================

let gameState = {
    team: null,
    role: null,
    squad: null,
    kills: 0,
    deaths: 0,
    assists: 0,
    objectives: [],
    squadMembers: []
};

let matchStartTime = 0;
let timerInterval = null;

// ============================================================================
// UPDATE FUNCTIONS
// ============================================================================

function updateHUD(data) {
    gameState = data;
    
    // Update scores
    document.getElementById('team1-score').textContent = data.team1Score || 0;
    document.getElementById('team2-score').textContent = data.team2Score || 0;
    
    // Update player stats
    document.getElementById('kills').textContent = data.kills || 0;
    document.getElementById('deaths').textContent = data.deaths || 0;
    document.getElementById('assists').textContent = data.assists || 0;
    
    // Update role
    const roleElement = document.getElementById('role-name');
    if (data.role) {
        roleElement.textContent = formatRoleName(data.role);
    }
}

function updateObjectives(objectivesData) {
    gameState.objectives = objectivesData;
    
    const objectivesList = document.getElementById('objectives-list');
    objectivesList.innerHTML = '';
    
    objectivesData.forEach(obj => {
        const item = document.createElement('div');
        item.className = 'objective-item';
        
        if (obj.capturedBy === 1) {
            item.classList.add('captured-team1');
        } else if (obj.capturedBy === 2) {
            item.classList.add('captured-team2');
        }
        
        item.innerHTML = `
            <div class="objective-name">${obj.name}</div>
            <div class="objective-status">${getObjectiveStatus(obj)}</div>
            <div class="objective-progress">
                <div class="progress-bar" style="width: ${obj.captureProgress}%"></div>
            </div>
        `;
        
        objectivesList.appendChild(item);
    });
}

function getObjectiveStatus(obj) {
    if (obj.capturedBy === 1) return 'Captured by Team 1';
    if (obj.capturedBy === 2) return 'Captured by Team 2';
    if (obj.captureProgress > 0) return `Capturing... ${Math.floor(obj.captureProgress)}%`;
    return 'Neutral';
}

function formatRoleName(role) {
    const roleNames = {
        'squad_leader': 'Squad Leader',
        'rifleman': 'Rifleman',
        'medic': 'Medic',
        'engineer': 'Engineer',
        'marksman': 'Marksman',
        'mg_gunner': 'MG Gunner',
        'at_gunner': 'AT Gunner'
    };
    return roleNames[role] || role;
}

// ============================================================================
// TIMER
// ============================================================================

function startMatchTimer(startTime) {
    matchStartTime = startTime;
    
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        const elapsed = Date.now() - matchStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        document.getElementById('match-timer').textContent = 
            `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

function stopMatchTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

function showNotification(message, type = 'info') {
    const notificationsContainer = document.getElementById('notifications');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notificationsContainer.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ============================================================================
// PANEL TOGGLES
// ============================================================================

function toggleObjectivesPanel() {
    const panel = document.getElementById('objectives-panel');
    panel.classList.toggle('active');
}

function toggleSquadPanel() {
    const panel = document.getElementById('squad-panel');
    panel.classList.toggle('active');
}

function toggleSpawnMenu() {
    mp.trigger('cef:openSpawnMenu');
}

// ============================================================================
// SQUAD FUNCTIONS
// ============================================================================

function setRallyPoint() {
    mp.trigger('cef:setRallyPoint');
    showNotification('Rally point requested', 'info');
}

function updateSquad(squadData) {
    const squadNumber = document.getElementById('squad-number');
    const squadMembers = document.getElementById('squad-members');
    
    squadNumber.textContent = squadData.number;
    squadMembers.innerHTML = '';
    
    squadData.members.forEach(member => {
        const memberItem = document.createElement('div');
        memberItem.className = 'member-item';
        if (member.isLeader) memberItem.classList.add('leader');
        
        memberItem.innerHTML = `
            <div class="member-name">${member.name}</div>
            <div class="member-role">${formatRoleName(member.role)}</div>
        `;
        
        squadMembers.appendChild(memberItem);
    });
}

// ============================================================================
// EVENTS FROM RAGE MP
// ============================================================================

if (typeof mp !== 'undefined') {
    mp.events.add('updateHUD', (data) => {
        updateHUD(JSON.parse(data));
    });
    
    mp.events.add('updateObjectives', (data) => {
        updateObjectives(JSON.parse(data));
    });
    
    mp.events.add('startMatchTimer', (startTime) => {
        startMatchTimer(startTime);
    });
    
    mp.events.add('stopMatchTimer', () => {
        stopMatchTimer();
    });
    
    mp.events.add('showNotification', (message, type) => {
        showNotification(message, type);
    });
    
    mp.events.add('updateSquad', (data) => {
        updateSquad(JSON.parse(data));
    });
}

console.log('[HUD] Battle Arena HUD initialized');
