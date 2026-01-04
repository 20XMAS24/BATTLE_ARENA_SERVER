// ============================================================================
// BATTLE ARENA - Client-Side Main Script
// Handles UI, visuals, and client-side game logic
// ============================================================================

const player = mp.players.local;
let hudBrowser = null;
let teamSelectBrowser = null;
let roleSelectBrowser = null;
let scoreBrowser = null;
let gameState = {
    team: null,
    role: null,
    squad: null,
    objectives: [],
    kills: 0,
    deaths: 0
};

// ============================================================================
// UI INITIALIZATION
// ============================================================================

mp.events.add('playerReady', () => {
    console.log('[CLIENT] Initializing Battle Arena UI...');
    
    // Create HUD browser
    hudBrowser = mp.browsers.new('package://cef/hud.html');
    
    // Show team selection on spawn
    setTimeout(() => {
        showTeamSelection();
    }, 2000);
});

// ============================================================================
// TEAM SELECTION UI
// ============================================================================

function showTeamSelection() {
    if (teamSelectBrowser) return;
    
    teamSelectBrowser = mp.browsers.new('package://cef/team-select.html');
    mp.gui.cursor.show(true, true);
    mp.game.ui.displayRadar(false);
    
    console.log('[UI] Team selection opened');
}

function hideTeamSelection() {
    if (teamSelectBrowser) {
        teamSelectBrowser.destroy();
        teamSelectBrowser = null;
        mp.gui.cursor.show(false, false);
        mp.game.ui.displayRadar(true);
    }
}

// ============================================================================
// ROLE SELECTION UI
// ============================================================================

function showRoleSelection() {
    if (roleSelectBrowser) return;
    
    roleSelectBrowser = mp.browsers.new('package://cef/role-select.html');
    mp.gui.cursor.show(true, true);
    
    console.log('[UI] Role selection opened');
}

function hideRoleSelection() {
    if (roleSelectBrowser) {
        roleSelectBrowser.destroy();
        roleSelectBrowser = null;
        mp.gui.cursor.show(false, false);
    }
}

// ============================================================================
// EVENTS FROM SERVER
// ============================================================================

mp.events.add('showTeamSelect', () => {
    showTeamSelection();
});

mp.events.add('showRoleSelect', () => {
    hideTeamSelection();
    showRoleSelection();
});

mp.events.add('hideAllMenus', () => {
    hideTeamSelection();
    hideRoleSelection();
});

mp.events.add('updateGameState', (data) => {
    gameState = JSON.parse(data);
    if (hudBrowser) {
        hudBrowser.execute(`updateHUD(${data});`);
    }
});

mp.events.add('showNotification', (message, type) => {
    if (hudBrowser) {
        hudBrowser.execute(`showNotification('${message}', '${type}');`);
    }
});

mp.events.add('updateObjectives', (objectivesData) => {
    gameState.objectives = JSON.parse(objectivesData);
    if (hudBrowser) {
        hudBrowser.execute(`updateObjectives(${objectivesData});`);
    }
});

// ============================================================================
// EVENTS FROM CEF (Browser)
// ============================================================================

mp.events.add('cef:selectTeam', (teamId) => {
    mp.events.callRemote('selectTeam', parseInt(teamId));
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

mp.events.add('cef:openSquadMenu', () => {
    // TODO: Squad menu
});

// ============================================================================
// VISUAL MARKERS FOR OBJECTIVES
// ============================================================================

let objectiveBlips = [];
let currentObjectives = [];

function createObjectiveMarkers(objectives) {
    // Clear old blips
    objectiveBlips.forEach(blip => {
        if (blip && mp.blips.exists(blip)) {
            blip.destroy();
        }
    });
    objectiveBlips = [];
    
    // Store objectives for rendering
    currentObjectives = objectives;
    
    objectives.forEach((obj, index) => {
        // Create map blip
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

// Draw objective cylinder markers on ground
mp.events.add('render', () => {
    currentObjectives.forEach(obj => {
        const color = obj.capturedBy === 1 ? [0, 100, 255, 100] : 
                     (obj.capturedBy === 2 ? [255, 50, 50, 100] : [255, 200, 0, 100]);
        
        // Draw cylinder marker
        mp.game.graphics.drawMarker(
            1, // Cylinder
            obj.x, obj.y, obj.z - 1,
            0, 0, 0,
            0, 0, 0,
            obj.radius * 2, obj.radius * 2, 2.0,
            color[0], color[1], color[2], color[3],
            false, true, 2, false, null, null, false
        );
    });
});

// ============================================================================
// RALLY POINT MARKERS
// ============================================================================

let rallyBlip = null;

mp.events.add('showRallyPoint', (x, y, z) => {
    // Remove old rally point
    if (rallyBlip && mp.blips.exists(rallyBlip)) {
        rallyBlip.destroy();
    }
    
    // Create new rally point blip
    rallyBlip = mp.blips.new(398, new mp.Vector3(x, y, z), {
        name: 'Rally Point',
        color: 2, // green
        scale: 0.8,
        shortRange: true
    });
});

// ============================================================================
// FOB VISUALIZATION
// ============================================================================

let fobBlips = [];

mp.events.add('createFOB', (x, y, z, teamId) => {
    // Create blip
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

mp.keys.bind(0x4D, true, () => { // M key - Map/Objectives
    if (hudBrowser) {
        hudBrowser.execute('toggleObjectivesPanel();');
    }
});

mp.keys.bind(0x54, true, () => { // T key - Squad menu
    if (hudBrowser) {
        hudBrowser.execute('toggleSquadPanel();');
    }
});

mp.keys.bind(0x42, true, () => { // B key - Spawn menu
    if (hudBrowser) {
        hudBrowser.execute('toggleSpawnMenu();');
    }
});

console.log('[CLIENT] Battle Arena client-side loaded!');
