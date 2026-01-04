// ============================================================================
// BATTLE ARENA - Client Side
// Visual battle zone, UI, 3D objects
// ============================================================================

let playerTeam = null;
let playerRole = null;
let isInMatch = false;
let uiBrowser = null;

// ============================================================================
// UI BROWSER INITIALIZATION
// ============================================================================

mp.events.add('playerReady', () => {
    // Create UI browser
    uiBrowser = mp.browsers.new('package://ui/index.html');
    
    // Show cursor for UI
    mp.gui.cursor.show(true, true);
    
    setTimeout(() => {
        mp.gui.cursor.show(false, false);
    }, 5000);
});

// ============================================================================
// TEAM SELECTION UI
// ============================================================================

mp.events.add('showTeamSelection', () => {
    if (uiBrowser) {
        uiBrowser.execute(`showTeamSelection();`);
        mp.gui.cursor.show(true, true);
    }
});

mp.events.addProc('selectTeam', (teamId) => {
    playerTeam = teamId;
    mp.events.callRemote('client:selectTeam', teamId);
    
    // Hide team selection, show role selection
    if (uiBrowser) {
        uiBrowser.execute(`showRoleSelection(${teamId});`);
    }
});

// ============================================================================
// ROLE SELECTION UI
// ============================================================================

mp.events.addProc('selectRole', (roleName) => {
    playerRole = roleName;
    mp.events.callRemote('client:selectRole', roleName);
    
    // Hide UI
    if (uiBrowser) {
        uiBrowser.execute(`hideUI();`);
        mp.gui.cursor.show(false, false);
    }
    
    // Show notification
    showNotification(`Role: ${roleName}`, 'success');
});

// ============================================================================
// HUD SYSTEM
// ============================================================================

mp.events.add('updateHUD', (data) => {
    if (uiBrowser) {
        uiBrowser.execute(`updateHUD(${JSON.stringify(data)});`);
    }
});

// Update HUD every second
setInterval(() => {
    if (isInMatch && uiBrowser) {
        const hudData = {
            team: playerTeam,
            role: playerRole,
            health: mp.players.local.getHealth(),
            armor: mp.players.local.getArmour(),
            ammo: getPlayerAmmo(),
            squadMembers: getSquadMembers(),
            objectives: getObjectivesStatus()
        };
        
        uiBrowser.execute(`updateHUD(${JSON.stringify(hudData)});`);
    }
}, 1000);

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

function showNotification(message, type = 'info') {
    if (uiBrowser) {
        uiBrowser.execute(`showNotification('${message}', '${type}');`);
    }
}

mp.events.add('showNotification', showNotification);

// ============================================================================
// OBJECTIVE MARKERS (3D)
// ============================================================================

let objectiveMarkers = [];
let objectiveBlips = [];

mp.events.add('createObjective', (objData) => {
    const { id, name, x, y, z, capturedBy } = objData;
    
    // Create 3D marker
    const marker = mp.markers.new(
        1, // Cylinder marker
        new mp.Vector3(x, y, z - 1),
        100, // radius
        {
            color: getTeamColor(capturedBy),
            visible: true,
            dimension: 0
        }
    );
    
    objectiveMarkers.push({ id, marker });
    
    // Create blip on map
    const blip = mp.blips.new(1, new mp.Vector3(x, y, z), {
        name: name,
        color: getBlipColor(capturedBy),
        scale: 1.5,
        shortRange: false
    });
    
    objectiveBlips.push({ id, blip });
});

mp.events.add('updateObjective', (id, capturedBy) => {
    const marker = objectiveMarkers.find(m => m.id === id);
    if (marker) {
        marker.marker.setColor(getTeamColor(capturedBy));
    }
    
    const blip = objectiveBlips.find(b => b.id === id);
    if (blip) {
        blip.blip.setColor(getBlipColor(capturedBy));
    }
});

function getTeamColor(teamId) {
    if (!teamId) return [255, 255, 255, 100]; // Neutral - white
    return teamId === 1 ? [0, 100, 255, 100] : [255, 50, 50, 100]; // Blue : Red
}

function getBlipColor(teamId) {
    if (!teamId) return 0; // White
    return teamId === 1 ? 3 : 1; // Blue : Red
}

// ============================================================================
// FOB SYSTEM (3D Objects)
// ============================================================================

let fobObjects = [];

mp.events.add('createFOB', (fobData) => {
    const { id, x, y, z, teamId, buildProgress } = fobData;
    
    // Create FOB tent object
    const tent = mp.objects.new(
        mp.game.joaat('prop_gazebo_02'), // Tent model
        new mp.Vector3(x, y, z),
        {
            rotation: new mp.Vector3(0, 0, 0),
            alpha: 255,
            dimension: 0
        }
    );
    
    // Create sandbag barriers
    const barriers = [];
    for (let i = 0; i < 4; i++) {
        const angle = (Math.PI / 2) * i;
        const barrierX = x + Math.cos(angle) * 5;
        const barrierY = y + Math.sin(angle) * 5;
        
        const barrier = mp.objects.new(
            mp.game.joaat('prop_barrier_work05'),
            new mp.Vector3(barrierX, barrierY, z),
            {
                rotation: new mp.Vector3(0, 0, angle * (180 / Math.PI)),
                alpha: 255,
                dimension: 0
            }
        );
        barriers.push(barrier);
    }
    
    // Create flag
    const flagModel = teamId === 1 ? 'prop_flag_us' : 'prop_flag_russia';
    const flag = mp.objects.new(
        mp.game.joaat(flagModel),
        new mp.Vector3(x, y, z + 2),
        {
            rotation: new mp.Vector3(0, 0, 0),
            alpha: 255,
            dimension: 0
        }
    );
    
    // Create marker
    const marker = mp.markers.new(
        1,
        new mp.Vector3(x, y, z - 1),
        20,
        {
            color: getTeamColor(teamId),
            visible: true,
            dimension: 0
        }
    );
    
    fobObjects.push({ id, tent, barriers, flag, marker });
    
    showNotification(`FOB created by Team ${teamId}`, 'info');
});

mp.events.add('destroyFOB', (id) => {
    const fob = fobObjects.find(f => f.id === id);
    if (fob) {
        fob.tent.destroy();
        fob.barriers.forEach(b => b.destroy());
        fob.flag.destroy();
        fob.marker.destroy();
        
        fobObjects = fobObjects.filter(f => f.id !== id);
        showNotification('FOB destroyed!', 'warning');
    }
});

// ============================================================================
// RALLY POINT SYSTEM
// ============================================================================

let rallyPoints = [];

mp.events.add('createRallyPoint', (data) => {
    const { squadId, x, y, z } = data;
    
    // Create smoke effect
    mp.game.graphics.startParticleFxNonLoopedAtCoord(
        'scr_rcbarry1',
        'scr_alien_teleport',
        x, y, z,
        0, 0, 0,
        1.0,
        false, false, false
    );
    
    // Create marker
    const marker = mp.markers.new(
        0, // Arrow down
        new mp.Vector3(x, y, z + 5),
        2,
        {
            color: [0, 255, 0, 200],
            visible: true,
            dimension: 0
        }
    );
    
    // Create blip
    const blip = mp.blips.new(1, new mp.Vector3(x, y, z), {
        name: `Rally Point - Squad ${squadId}`,
        color: 2, // Green
        scale: 0.8,
        shortRange: true
    });
    
    rallyPoints.push({ squadId, marker, blip });
    
    showNotification('Rally Point set!', 'success');
});

// ============================================================================
// COMBAT ZONE VISUALIZATION
// ============================================================================

// Create combat zone boundaries
mp.events.add('createCombatZone', (zoneData) => {
    const { x, y, z, radius } = zoneData;
    
    // Create boundary marker (red circle)
    const boundary = mp.markers.new(
        28, // Race tube
        new mp.Vector3(x, y, z - 1),
        radius,
        {
            color: [255, 0, 0, 50],
            visible: true,
            dimension: 0
        }
    );
    
    // Warning for players outside zone
    setInterval(() => {
        const playerPos = mp.players.local.position;
        const distance = Math.sqrt(
            Math.pow(playerPos.x - x, 2) + 
            Math.pow(playerPos.y - y, 2)
        );
        
        if (distance > radius) {
            showNotification('You are outside combat zone!', 'danger');
            
            // Damage player
            const health = mp.players.local.getHealth();
            mp.players.local.setHealth(health - 5);
        }
    }, 2000);
});

// ============================================================================
// SQUAD MEMBER INDICATORS
// ============================================================================

let squadMarkers = new Map();

mp.events.add('render', () => {
    if (!isInMatch) return;
    
    // Draw squad member names above heads
    mp.players.forEach((player) => {
        if (player === mp.players.local) return;
        
        const playerPos = player.position;
        const screenPos = mp.game.graphics.world3dToScreen2d(playerPos.x, playerPos.y, playerPos.z + 1);
        
        if (screenPos && player.squad === mp.players.local.squad) {
            // Draw green name tag for squad members
            mp.game.graphics.drawText(
                player.name,
                [screenPos.x, screenPos.y],
                {
                    font: 4,
                    color: [0, 255, 0, 255],
                    scale: [0.4, 0.4],
                    outline: true
                }
            );
            
            // Draw health bar
            const health = player.getHealth() / 100;
            drawHealthBar(screenPos.x, screenPos.y + 0.02, health);
        }
    });
});

function drawHealthBar(x, y, healthPercent) {
    const width = 0.05;
    const height = 0.005;
    
    // Background (red)
    mp.game.graphics.drawRect(x, y, width, height, 255, 0, 0, 150, 0);
    
    // Foreground (green)
    mp.game.graphics.drawRect(
        x - (width / 2) + (width * healthPercent / 2),
        y,
        width * healthPercent,
        height,
        0, 255, 0, 200,
        0
    );
}

// ============================================================================
// MATCH EVENTS
// ============================================================================

mp.events.add('matchStarted', (data) => {
    isInMatch = true;
    showNotification('Match Started! Capture objectives!', 'success');
    
    // Play sound
    mp.game.audio.playSoundFrontend(-1, 'RACE_PLACED', 'HUD_AWARDS', true);
    
    // Create objectives
    data.objectives.forEach(obj => {
        mp.events.call('createObjective', obj);
    });
    
    // Show HUD
    if (uiBrowser) {
        uiBrowser.execute(`showHUD();`);
    }
});

mp.events.add('matchEnded', (data) => {
    isInMatch = false;
    showNotification(`Match Ended! Winner: Team ${data.winner}`, 'info');
    
    // Play sound
    mp.game.audio.playSoundFrontend(-1, 'CHECKPOINT_PERFECT', 'HUD_MINI_GAME_SOUNDSET', true);
    
    // Hide HUD
    if (uiBrowser) {
        uiBrowser.execute(`hideHUD();`);
    }
    
    // Clear objects
    clearAllObjects();
});

mp.events.add('objectiveCaptured', (data) => {
    const { objectiveName, teamId } = data;
    
    showNotification(`${objectiveName} captured by Team ${teamId}!`, 'warning');
    mp.game.audio.playSoundFrontend(-1, 'MEDAL_BRONZE', 'HUD_AWARDS', true);
    
    // Update objective
    mp.events.call('updateObjective', data.id, teamId);
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getPlayerAmmo() {
    const weapon = mp.players.local.weapon;
    return mp.game.invoke('0x015A522136D7F951', mp.players.local.handle, weapon);
}

function getSquadMembers() {
    // Will be populated from server
    return [];
}

function getObjectivesStatus() {
    // Will be populated from server
    return [];
}

function clearAllObjects() {
    objectiveMarkers.forEach(m => m.marker.destroy());
    objectiveBlips.forEach(b => b.blip.destroy());
    fobObjects.forEach(f => {
        f.tent.destroy();
        f.barriers.forEach(b => b.destroy());
        f.flag.destroy();
        f.marker.destroy();
    });
    rallyPoints.forEach(r => {
        r.marker.destroy();
        r.blip.destroy();
    });
    
    objectiveMarkers = [];
    objectiveBlips = [];
    fobObjects = [];
    rallyPoints = [];
}

// ============================================================================
// KEY BINDINGS
// ============================================================================

// F1 - Toggle team/role menu
mp.keys.bind(0x70, true, () => {
    if (!isInMatch && uiBrowser) {
        uiBrowser.execute(`toggleMenu();`);
        mp.gui.cursor.show(true, true);
    }
});

// F2 - Squad menu
mp.keys.bind(0x71, true, () => {
    if (isInMatch && uiBrowser) {
        uiBrowser.execute(`toggleSquadMenu();`);
        mp.gui.cursor.show(true, true);
    }
});

// F3 - Objectives map
mp.keys.bind(0x72, true, () => {
    if (isInMatch && uiBrowser) {
        uiBrowser.execute(`toggleObjectivesMap();`);
        mp.gui.cursor.show(true, true);
    }
});

// ESC - Close UI
mp.keys.bind(0x1B, true, () => {
    if (uiBrowser) {
        uiBrowser.execute(`closeAllUI();`);
        mp.gui.cursor.show(false, false);
    }
});

console.log('[CLIENT] Battle Arena client loaded');
