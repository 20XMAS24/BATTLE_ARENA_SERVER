// ============================================================================
// BATTLE ARENA - Client-Side Main Script
// v2.6 - Disabled GTA UI Elements
// ============================================================================

const player = mp.players.local;
let hudBrowser = null;
let mainMenuBrowser = null;
let teamSelectBrowser = null;
let roleSelectBrowser = null;
let captureBarBrowser = null;
let killfeedBrowser = null;
let minimapBrowser = null;
let modeSelected = false;
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
// DISABLE GTA DEFAULT UI
// ============================================================================

// Disable GTA radar/minimap
mp.game.ui.displayRadar(false);

// Disable HUD components
const hudComponentsToHide = [
    1,  // WANTED_STARS
    2,  // WEAPON_ICON
    3,  // CASH
    4,  // MP_CASH
    6,  // VEHICLE_NAME
    7,  // AREA_NAME
    8,  // VEHICLE_CLASS
    9,  // STREET_NAME
    13, // CASH_CHANGE
    17, // SAVING_GAME
    20  // WEAPON_WHEEL
];

// Hide on every frame to ensure they stay hidden
mp.events.add('render', () => {
    // Disable GTA radar every frame
    mp.game.ui.displayRadar(false);
    
    // Hide HUD components
    hudComponentsToHide.forEach(component => {
        mp.game.ui.hideHudComponentThisFrame(component);
    });
    
    // Disable pause menu (ESC menu)
    mp.game.ui.setPauseMenuActive(false);
    
    // Disable help text
    mp.game.ui.hideHudAndRadarThisFrame();
});

console.log('[CLIENT] GTA default UI disabled');

// ============================================================================
// UI INITIALIZATION
// ============================================================================

mp.events.add('playerReady', () => {
    console.log('[CLIENT] Player ready! Initializing...');
    
    // Create HUD browser (hidden initially)
    hudBrowser = mp.browsers.new('package://cef/hud.html');
    
    // Create capture bar browser (hidden initially)
    captureBarBrowser = mp.browsers.new('package://cef/capture-bar.html');
    
    // Create killfeed browser
    killfeedBrowser = mp.browsers.new('package://cef/killfeed.html');
    
    // Create minimap browser
    minimapBrowser = mp.browsers.new('package://cef/minimap.html');
    
    // Hide HUD initially
    if (hudBrowser) {
        hudBrowser.execute('document.body.style.display = "none";');
    }
    
    console.log('[CLIENT] All UI loaded: HUD, Capture Bar, Killfeed, Minimap');
    
    // FORCE SHOW MAIN MENU WITH CURSOR AFTER 500ms
    setTimeout(() => {
        showMainMenu();
    }, 500);
});

// ============================================================================
// MAIN MENU
// ============================================================================

function showMainMenu() {
    console.log('[CLIENT] Opening main menu...');
    
    if (mainMenuBrowser) {
        mainMenuBrowser.destroy();
    }
    
    modeSelected = false;
    
    // Hide all game UI
    if (hudBrowser) hudBrowser.execute('document.body.style.display = "none";');
    if (captureBarBrowser) captureBarBrowser.execute('document.body.style.display = "none";');
    if (killfeedBrowser) killfeedBrowser.execute('document.body.style.display = "none";');
    if (minimapBrowser) minimapBrowser.execute('document.body.style.display = "none";');
    
    mainMenuBrowser = mp.browsers.new('package://cef/main-menu.html');
    
    // FORCE CURSOR - Multiple attempts
    setTimeout(() => mp.gui.cursor.show(true, true), 50);
    setTimeout(() => mp.gui.cursor.show(true, true), 200);
    setTimeout(() => mp.gui.cursor.show(true, true), 500);
    
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
    
    // Show all game UI
    if (hudBrowser) hudBrowser.execute('document.body.style.display = "block";');
    if (captureBarBrowser) captureBarBrowser.execute('document.body.style.display = "block";');
    if (killfeedBrowser) killfeedBrowser.execute('document.body.style.display = "block";');
    if (minimapBrowser) minimapBrowser.execute('document.body.style.display = "block";');
    
    mp.gui.cursor.show(false, false);
    mp.game.ui.displayRadar(false); // Keep disabled!
    mp.gui.chat.show(true);
}

mp.events.add('showMainMenu', showMainMenu);

mp.events.add('hideMainMenu', () => {
    if (modeSelected) {
        hideMainMenu();
    } else {
        console.log('[CLIENT] Cannot close - select mode first');
        mp.gui.chat.push('!{FF0000}Select a game mode first!');
    }
});

mp.events.add('updateMainMenuStats', (statsJson) => {
    if (mainMenuBrowser) {
        mainMenuBrowser.execute(`updateServerStats('${statsJson}')`);
    }
});

mp.events.add('selectTeamAndMode', (teamId, gameMode) => {
    console.log(`[CLIENT] Team ${teamId}, Mode ${gameMode}`);
    gameState.team = teamId;
    modeSelected = true;
    mp.events.callRemote('selectTeamAndMode', teamId, gameMode);
    hideMainMenu();
});

mp.events.add('closeMainMenu', () => {
    if (modeSelected) hideMainMenu();
});

mp.events.add('requestServerStats', () => {
    mp.events.callRemote('requestServerStats');
});

// ============================================================================
// KILLFEED
// ============================================================================

mp.events.add('addKill', (killData) => {
    console.log('[KILLFEED] New kill:', killData);
    if (killfeedBrowser) {
        killfeedBrowser.execute(`addKill(${killData})`);
    }
});

mp.events.add('playerDeath', (killerName, victimName, weapon, headshot, distance, killerTeam, victimTeam) => {
    const killData = {
        killerName: killerName,
        killerTeam: killerTeam,
        victimName: victimName,
        victimTeam: victimTeam,
        weapon: weapon,
        headshot: headshot,
        distance: distance
    };
    
    if (killfeedBrowser) {
        killfeedBrowser.execute(`addKill(${JSON.stringify(killData)})`);
    }
});

mp.events.add('playerSuicide', (victimName, victimTeam) => {
    const killData = {
        victimName: victimName,
        victimTeam: victimTeam,
        type: 'suicide'
    };
    
    if (killfeedBrowser) {
        killfeedBrowser.execute(`addKill(${JSON.stringify(killData)})`);
    }
});

mp.events.add('playerTeamkill', (killerName, victimName, weapon, team) => {
    const killData = {
        killerName: killerName,
        killerTeam: team,
        victimName: victimName,
        victimTeam: team,
        weapon: weapon,
        type: 'teamkill'
    };
    
    if (killfeedBrowser) {
        killfeedBrowser.execute(`addKill(${JSON.stringify(killData)})`);
    }
});

// ============================================================================
// MINIMAP
// ============================================================================

let minimapUpdateInterval = null;

function startMinimapUpdates() {
    if (minimapUpdateInterval) return;
    
    console.log('[MINIMAP] Starting updates');
    
    minimapUpdateInterval = setInterval(() => {
        if (!minimapBrowser || !mp.players.local) return;
        
        const pos = mp.players.local.position;
        const heading = mp.players.local.getHeading();
        
        const playerData = {
            position: { x: pos.x, y: pos.y, z: pos.z },
            heading: heading
        };
        
        minimapBrowser.execute(`updatePlayer(${JSON.stringify(playerData)})`);
        
        // Update objectives on minimap
        if (currentObjectives.length > 0) {
            minimapBrowser.execute(`updateObjectives(${JSON.stringify(currentObjectives)})`);
        }
        
        // Get nearby players
        const nearbyPlayers = [];
        mp.players.forEachInRange(pos, 300, (otherPlayer) => {
            if (otherPlayer.handle === mp.players.local.handle) return;
            
            const otherPos = otherPlayer.position;
            const otherHeading = otherPlayer.getHeading();
            const otherTeam = otherPlayer.getVariable('team') || 0;
            
            nearbyPlayers.push({
                x: otherPos.x,
                y: otherPos.y,
                team: otherTeam,
                heading: otherHeading
            });
        });
        
        if (nearbyPlayers.length > 0) {
            minimapBrowser.execute(`updateNearbyPlayers(${JSON.stringify(nearbyPlayers)})`);
        }
    }, 100); // Update every 100ms
}

function stopMinimapUpdates() {
    if (minimapUpdateInterval) {
        clearInterval(minimapUpdateInterval);
        minimapUpdateInterval = null;
        console.log('[MINIMAP] Stopped updates');
    }
}

// Start minimap when game starts
mp.events.add('startGame', () => {
    startMinimapUpdates();
});

// ============================================================================
// TEAM SELECTION UI
// ============================================================================

function showTeamSelection() {
    if (teamSelectBrowser) return;
    if (hudBrowser) hudBrowser.execute('document.body.style.display = "none";');
    teamSelectBrowser = mp.browsers.new('package://cef/team-select.html');
    mp.gui.cursor.show(true, true);
    mp.game.ui.displayRadar(false);
}

function hideTeamSelection() {
    if (teamSelectBrowser) {
        teamSelectBrowser.destroy();
        teamSelectBrowser = null;
        mp.gui.cursor.show(false, false);
        mp.game.ui.displayRadar(false); // Keep disabled!
        if (hudBrowser) hudBrowser.execute('document.body.style.display = "block";');
    }
}

mp.events.add('showTeamSelect', showTeamSelection);

// ============================================================================
// ROLE SELECTION UI
// ============================================================================

function showRoleSelection() {
    if (roleSelectBrowser) roleSelectBrowser.destroy();
    if (hudBrowser) hudBrowser.execute('document.body.style.display = "none";');
    roleSelectBrowser = mp.browsers.new('package://cef/role-select.html');
    mp.gui.cursor.show(true, true);
    mp.game.ui.displayRadar(false);
}

function hideRoleSelection() {
    if (roleSelectBrowser) {
        roleSelectBrowser.destroy();
        roleSelectBrowser = null;
    }
    mp.gui.cursor.show(false, false);
    mp.game.ui.displayRadar(false); // Keep disabled!
    mp.gui.chat.show(true);
    if (hudBrowser) hudBrowser.execute('document.body.style.display = "block";');
    if (captureBarBrowser) captureBarBrowser.execute('document.body.style.display = "block";');
    
    // Start minimap updates after role selection
    startMinimapUpdates();
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
// EVENTS FROM CEF
// ============================================================================

mp.events.add('cef:selectTeam', (teamId) => {
    mp.events.callRemote('selectTeam', parseInt(teamId));
    gameState.team = parseInt(teamId);
    hideTeamSelection();
    showRoleSelection();
});

mp.events.add('cef:selectRole', (roleName) => {
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
        if (hudBrowser) hudBrowser.execute(`updateHUD(${data});`);
    } catch (e) {
        console.error('[CLIENT] Error updating game state:', e);
    }
});

mp.events.add('showNotification', (message, type) => {
    if (hudBrowser) hudBrowser.execute(`showNotification('${message}', '${type}');`);
    console.log(`[NOTIFICATION] ${message}`);
});

mp.events.add('updateObjectives', (objectivesData) => {
    try {
        gameState.objectives = JSON.parse(objectivesData);
        if (hudBrowser) hudBrowser.execute(`updateObjectives(${objectivesData});`);
    } catch (e) {
        console.error('[CLIENT] Error updating objectives:', e);
    }
});

mp.events.add('updateCaptureProgress', (data) => {
    if (captureBarBrowser) captureBarBrowser.execute(`updateCaptureProgress(${data});`);
});

// ============================================================================
// VISUAL MARKERS FOR OBJECTIVES
// ============================================================================

let objectiveBlips = [];
let currentObjectives = [];
let lastCaptureUpdate = 0;

function createObjectiveMarkers(objectives) {
    objectiveBlips.forEach(blip => {
        if (blip && mp.blips.exists(blip)) blip.destroy();
    });
    objectiveBlips = [];
    currentObjectives = objectives;
    
    objectives.forEach((obj) => {
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
    createObjectiveMarkers(JSON.parse(data));
});

mp.events.add('render', () => {
    const playerPos = mp.players.local.position;
    
    currentObjectives.forEach(obj => {
        const color = obj.capturedBy === 1 ? [0, 100, 255, 100] : 
                     (obj.capturedBy === 2 ? [255, 50, 50, 100] : [255, 200, 0, 100]);
        
        mp.game.graphics.drawMarker(
            1, obj.x, obj.y, obj.z - 1, 0, 0, 0, 0, 0, 0,
            obj.radius * 2, obj.radius * 2, 2.0,
            color[0], color[1], color[2], color[3],
            false, true, 2, false, null, null, false
        );
        
        const dist = playerPos.subtract(new mp.Vector3(obj.x, obj.y, obj.z)).length();
        
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
                    captureBarBrowser.execute(`updateCaptureProgress(${JSON.stringify(captureData)})`);
                }
            }
        }
    });
});

// ============================================================================
// KEYBINDS
// ============================================================================

mp.keys.bind(0x4D, true, () => { // M key
    if (hudBrowser && !mainMenuBrowser && !roleSelectBrowser) {
        hudBrowser.execute('toggleObjectivesPanel();');
    }
});

mp.keys.bind(0x54, true, () => { // T key
    if (hudBrowser && !mainMenuBrowser && !roleSelectBrowser) {
        hudBrowser.execute('toggleSquadPanel();');
    }
});

mp.keys.bind(0x42, true, () => { // B key
    if (hudBrowser && !mainMenuBrowser && !roleSelectBrowser) {
        hudBrowser.execute('toggleSpawnMenu();');
    }
});

mp.keys.bind(0x1B, true, () => { // ESC - Blocked for GTA pause menu
    if (mainMenuBrowser) {
        if (modeSelected) {
            hideMainMenu();
        } else {
            mp.gui.chat.push('!{FF0000}Select a game mode first!');
        }
    } else if (roleSelectBrowser) {
        hideRoleSelection();
    } else if (teamSelectBrowser) {
        hideTeamSelection();
    }
    // ESC does NOT open GTA pause menu anymore
});

mp.keys.bind(0x46, true, () => { // F key - Debug cursor
    mp.gui.cursor.show(true, true);
    mp.gui.chat.push('Cursor shown!');
});

console.log('[CLIENT] Battle Arena v2.6 loaded!');
console.log('[CLIENT] ✅ Killfeed & Minimap active');
console.log('[CLIENT] 🚫 GTA UI disabled (radar, pause menu)');
