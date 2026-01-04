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

let objectiveMarkers = [];
let objectiveBlips = [];

function createObjectiveMarkers(objectives) {
    // Clear old markers
    objectiveMarkers.forEach(marker => {
        if (marker) mp.markers.remove(marker);
    });
    objectiveBlips.forEach(blip => {
        if (blip) mp.game.ui.removeBlip(blip);
    });
    
    objectiveMarkers = [];
    objectiveBlips = [];
    
    objectives.forEach((obj, index) => {
        // Create 3D marker
        const marker = mp.markers.new(
            1, // Type: cylinder
            new mp.Vector3(obj.x, obj.y, obj.z - 1),
            obj.radius,
            {
                direction: new mp.Vector3(0, 0, 0),
                rotation: new mp.Vector3(0, 0, 0),
                color: obj.team === 1 ? [0, 100, 255, 100] : 
                       obj.team === 2 ? [255, 0, 0, 100] : [255, 255, 0, 100],
                visible: true,
                dimension: 0
            }
        );
        objectiveMarkers.push(marker);
        
        // Create map blip
        const blip = mp.game.ui.addBlipForCoord(obj.x, obj.y, obj.z);
        mp.game.ui.setBlipSprite(blip, 84); // objective icon
        mp.game.ui.setBlipColour(blip, obj.team === 1 ? 38 : obj.team === 2 ? 1 : 5);
        mp.game.ui.setBlipScale(blip, 1.2);
        mp.game.invoke('0x9CB1A1623062F402', blip, obj.name); // SET_BLIP_NAME
        objectiveBlips.push(blip);
    });
}

mp.events.add('createObjectiveMarkers', (data) => {
    const objectives = JSON.parse(data);
    createObjectiveMarkers(objectives);
});

// ============================================================================
// RALLY POINT MARKERS
// ============================================================================

let rallyMarker = null;
let rallyBlip = null;

mp.events.add('showRallyPoint', (x, y, z) => {
    // Remove old rally point
    if (rallyMarker) mp.markers.remove(rallyMarker);
    if (rallyBlip) mp.game.ui.removeBlip(rallyBlip);
    
    // Create new rally point marker
    rallyMarker = mp.markers.new(
        20, // Type: flag
        new mp.Vector3(x, y, z),
        2,
        {
            color: [0, 255, 0, 200],
            visible: true
        }
    );
    
    // Create blip
    rallyBlip = mp.game.ui.addBlipForCoord(x, y, z);
    mp.game.ui.setBlipSprite(rallyBlip, 398); // rally icon
    mp.game.ui.setBlipColour(rallyBlip, 2); // green
    mp.game.invoke('0x9CB1A1623062F402', rallyBlip, 'Rally Point');
});

// ============================================================================
// FOB VISUALIZATION
// ============================================================================

let fobObjects = [];

mp.events.add('createFOB', (x, y, z, teamId) => {
    // Create FOB visual objects
    const fobBase = mp.objects.new(
        mp.game.joaat('prop_container_01a'),
        new mp.Vector3(x, y, z),
        {
            rotation: new mp.Vector3(0, 0, 0),
            alpha: 255,
            dimension: 0
        }
    );
    
    fobObjects.push(fobBase);
    
    // Create blip
    const blip = mp.game.ui.addBlipForCoord(x, y, z);
    mp.game.ui.setBlipSprite(blip, 473); // FOB icon
    mp.game.ui.setBlipColour(blip, teamId === 1 ? 38 : 1);
    mp.game.invoke('0x9CB1A1623062F402', blip, 'FOB');
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

// ============================================================================
// NAMETAGS
// ============================================================================

mp.events.add('render', () => {
    mp.players.forEachInStreamRange((player) => {
        if (player === mp.players.local || !player.vehicle) {
            const pos = player.position;
            const screenPos = mp.game.graphics.world3dToScreen2d(pos.x, pos.y, pos.z + 1);
            
            if (screenPos) {
                // Draw nametag with team color
                // Will be handled in CEF for better performance
            }
        }
    });
});

console.log('[CLIENT] Battle Arena client-side loaded!');
