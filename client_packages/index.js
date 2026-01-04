// ============================================================================
// BATTLE ARENA - Client-Side Main Script
// v2.4 - Main Menu Edition
// ============================================================================

const player = mp.players.local;
let hudBrowser = null;
let mainMenuBrowser = null;
let teamSelectBrowser = null;
let roleSelectBrowser = null;
let captureBarBrowser = null;
let gameState = {
    team: null,
    role: null,
    squad: null,
    objectives: [],
    kills: 0,
    deaths: 0
};

console.log('[CLIENT] Battle Arena client loading...');

// ============================================================================
// UI INITIALIZATION
// ============================================================================

mp.events.add('playerReady', () => {
    console.log('[CLIENT] Player ready! Initializing...');
    
    // Create HUD browser (hidden initially)
    hudBrowser = mp.browsers.new('package://cef/hud.html');
    
    // Create capture bar browser (hidden initially)
    captureBarBrowser = mp.browsers.new('package://cef/capture-bar.html');
    
    console.log('[CLIENT] HUD and capture bar loaded');
});

// ============================================================================
// MAIN MENU
// ============================================================================

function showMainMenu() {
    console.log('[CLIENT] Opening main menu...');
    
    if (mainMenuBrowser) {
        mainMenuBrowser.destroy();
    }
    
    mainMenuBrowser = mp.browsers.new('package://cef/main-menu.html');
    mp.gui.cursor.show(true, true);
    mp.game.ui.displayRadar(false);
    mp.gui.chat.show(false);
    
    console.log('[CLIENT] Main menu opened!');
}

function hideMainMenu() {
    console.log('[CLIENT] Hiding main menu...');
    
    if (mainMenuBrowser) {
        mainMenuBrowser.destroy();
        mainMenuBrowser = null;
    }
    
    mp.gui.cursor.show(false, false);
    mp.game.ui.displayRadar(true);
    mp.gui.chat.show(true);
}

mp.events.add('showMainMenu', () => {
    showMainMenu();
});

mp.events.add('hideMainMenu', () => {
    hideMainMenu();
});

// Update main menu stats
mp.events.add('updateMainMenuStats', (statsJson) => {
    console.log('[CLIENT] Updating main menu stats:', statsJson);
    
    if (mainMenuBrowser) {
        mainMenuBrowser.execute(`updateServerStats('${statsJson}')`);
    }
});

// Player selected team and mode from main menu
mp.events.add('selectTeamAndMode', (teamId, gameMode) => {
    console.log(`[CLIENT] Selected team ${teamId}, mode ${gameMode}`);
    
    gameState.team = teamId;
    
    // Tell server
    mp.events.callRemote('selectTeamAndMode', teamId, gameMode);
    
    // Close main menu
    hideMainMenu();
});

mp.events.add('closeMainMenu', () => {
    hideMainMenu();
});

mp.events.add('requestServerStats', () => {
    mp.events.callRemote('requestServerStats');
});

// ============================================================================
// TEAM SELECTION UI (Old system - kept for compatibility)
// ============================================================================

function showTeamSelection() {
    console.log('[CLIENT] Opening team select...');
    
    if (teamSelectBrowser) return;
    
    teamSelectBrowser = mp.browsers.new('package://cef/team-select.html');
    mp.gui.cursor.show(true, true);
    mp.game.ui.displayRadar(false);
    
    console.log('[CLIENT] Team selection opened');
}

function hideTeamSelection() {
    if (teamSelectBrowser) {
        teamSelectBrowser.destroy();
        teamSelectBrowser = null;
        mp.gui.cursor.show(false, false);
        mp.game.ui.displayRadar(true);
    }
}

mp.events.add('showTeamSelect', () => {
    showTeamSelection();
});

// ============================================================================
// ROLE SELECTION UI
// ============================================================================

function showRoleSelection() {
    console.log('[CLIENT] Opening role select...');
    
    if (roleSelectBrowser) {
        roleSelectBrowser.destroy();
    }
    
    roleSelectBrowser = mp.browsers.new('package://cef/role-select.html');
    mp.gui.cursor.show(true, true);
    mp.game.ui.displayRadar(false);
    
    console.log('[CLIENT] Role selection opened');
}

function hideRoleSelection() {
    console.log('[CLIENT] Hiding role select...');
    
    if (roleSelectBrowser) {
        roleSelectBrowser.destroy();
        roleSelectBrowser = null;
    }
    
    mp.gui.cursor.show(false, false);
    mp.game.ui.displayRadar(true);
    mp.gui.chat.show(true);
}

mp.events.add('showRoleSelect', () => {
    hideTeamSelection();
    hideMainMenu();
    showRoleSelection();
});

mp.events.add('hideAllMenus', () => {
    hideMainMenu();
    hideTeamSelection();
    hideRoleSelection();
});

// ============================================================================
// EVENTS FROM CEF (Browser)
// ============================================================================

// From team-select.html
mp.events.add('cef:selectTeam', (teamId) => {
    console.log('[CEF] Team selected:', teamId);
    
    mp.events.callRemote('selectTeam', parseInt(teamId));
    gameState.team = parseInt(teamId);
    hideTeamSelection();
    showRoleSelection();
});

// From role-select.html
mp.events.add('cef:selectRole', (roleName) => {
    console.log('[CEF] Role selected:', roleName);
    
    mp.events.callRemote('selectRole', roleName);
    gameState.role = roleName;
    hideRoleSelection();
});

mp.events.add('cef:requestRespawn', () => {
    mp.events.callRemote('requestRespawn');
});

// ============================================================================
// GAME STATE UPDATES
// ============================================================================

mp.events.add('updateGameState', (data) => {
    try {
        gameState = JSON.parse(data);
        if (hudBrowser) {
            hudBrowser.execute(`updateHUD(${data});`);
        }
    } catch (e) {
        console.error('[CLIENT] Error updating game state:', e);
    }
});

mp.events.add('showNotification', (message, type) => {
    if (hudBrowser) {
        hudBrowser.execute(`showNotification('${message}', '${type}');`);
    }
    console.log(`[NOTIFICATION] ${message}`);
});

mp.events.add('updateObjectives', (objectivesData) => {
    try {
        gameState.objectives = JSON.parse(objectivesData);
        if (hudBrowser) {
            hudBrowser.execute(`updateObjectives(${objectivesData});`);
        }
    } catch (e) {
        console.error('[CLIENT] Error updating objectives:', e);
    }
});

// ============================================================================
// CAPTURE BAR UI
// ============================================================================

mp.events.add('updateCaptureProgress', (data) => {
    if (captureBarBrowser) {
        captureBarBrowser.execute(`updateCaptureProgress(${data});`);
    }
});

// ============================================================================
// VISUAL MARKERS FOR OBJECTIVES
// ============================================================================

let objectiveBlips = [];
let currentObjectives = [];
let lastCaptureUpdate = 0;

function createObjectiveMarkers(objectives) {
    // Clear old blips
    objectiveBlips.forEach(blip => {
        if (blip && mp.blips.exists(blip)) {
            blip.destroy();
        }
    });
    objectiveBlips = [];
    
    currentObjectives = objectives;
    
    objectives.forEach((obj, index) => {
        const blip = mp.blips.new(84, new mp.Vector3(obj.x, obj.y, obj.z), {
            name: obj.name,
            color: obj.capturedBy === 1 ? 3 : (obj.capturedBy === 2 ? 1 : 5),
            scale: 1.2,
            shortRange: false
        });
        objectiveBlips.push(blip);
    });
}

mp.events.add('createObjectiveMarkers', (data) => {
    const objectives = JSON.parse(data);
    createObjectiveMarkers(objectives);
});

// Draw objective markers
mp.events.add('render', () => {
    const playerPos = mp.players.local.position;
    
    currentObjectives.forEach(obj => {
        const color = obj.capturedBy === 1 ? [0, 100, 255, 100] : 
                     (obj.capturedBy === 2 ? [255, 50, 50, 100] : [255, 200, 0, 100]);
        
        mp.game.graphics.drawMarker(
            1, // Cylinder
            obj.x, obj.y, obj.z - 1,
            0, 0, 0,
            0, 0, 0,
            obj.radius * 2, obj.radius * 2, 2.0,
            color[0], color[1], color[2], color[3],
            false, true, 2, false, null, null, false
        );
        
        const objPos = new mp.Vector3(obj.x, obj.y, obj.z);
        const dist = playerPos.subtract(objPos).length();
        
        if (dist < obj.radius) {
            const now = Date.now();
            if (now - lastCaptureUpdate > 200) {
                lastCaptureUpdate = now;
                
                const captureData = {
                    name: obj.name,
                    progress: obj.captureProgress || 0,
                    capturedBy: obj.capturedBy || 0,
                    team1Players: obj.playersInRadius ? obj.playersInRadius[1] : 0,
                    team2Players: obj.playersInRadius ? obj.playersInRadius[2] : 0,
                    isCapturing: true
                };
                
                if (captureBarBrowser) {
                    captureBarBrowser.execute(`updateCaptureProgress(${JSON.stringify(captureData)});`);
                }
            }
        }
    });
});

// ============================================================================
// RALLY POINT MARKERS
// ============================================================================

let rallyBlip = null;

mp.events.add('showRallyPoint', (x, y, z) => {
    if (rallyBlip && mp.blips.exists(rallyBlip)) {
        rallyBlip.destroy();
    }
    
    rallyBlip = mp.blips.new(398, new mp.Vector3(x, y, z), {
        name: 'Rally Point',
        color: 2,
        scale: 0.8,
        shortRange: true
    });
});

// ============================================================================
// FOB VISUALIZATION
// ============================================================================

let fobBlips = [];

mp.events.add('createFOB', (x, y, z, teamId) => {
    const blip = mp.blips.new(473, new mp.Vector3(x, y, z), {
        name: 'FOB',
        color: teamId === 1 ? 3 : 1,
        scale: 1.0,
        shortRange: false
    });
    
    fobBlips.push(blip);
});

// ============================================================================
// KEYBINDS
// ============================================================================

mp.keys.bind(0x4D, true, () => { // M key
    if (hudBrowser) {
        hudBrowser.execute('toggleObjectivesPanel();');
    }
});

mp.keys.bind(0x54, true, () => { // T key
    if (hudBrowser) {
        hudBrowser.execute('toggleSquadPanel();');
    }
});

mp.keys.bind(0x42, true, () => { // B key
    if (hudBrowser) {
        hudBrowser.execute('toggleSpawnMenu();');
    }
});

// ESC to close menus
mp.keys.bind(0x1B, true, () => { // ESC
    if (mainMenuBrowser) {
        hideMainMenu();
    } else if (roleSelectBrowser) {
        hideRoleSelection();
    } else if (teamSelectBrowser) {
        hideTeamSelection();
    }
});

console.log('[CLIENT] Battle Arena client loaded!');
console.log('[CLIENT] Main menu system ready');
console.log('[CLIENT] Press ESC to close menus');
