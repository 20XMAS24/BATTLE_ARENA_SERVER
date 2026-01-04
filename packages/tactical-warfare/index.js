// ============================================================================
// BATTLE ARENA - Enhanced Server with Game Modes
// v2.4 - Main Menu + Rush + Insurgency + Training
// ============================================================================

const fs = require('fs');
const path = require('path');
const VehicleManager = require('./modules/vehicles');
const FOBManager = require('./modules/fob');
const GameModeManager = require('./modules/gamemodes');

console.log('');
console.log('========================================');
console.log('   BATTLE ARENA SERVER LOADING');
console.log('   v2.4 - New Game Modes Edition');
console.log('========================================');

// Load configuration
let config;
try {
    const configPath = path.join(__dirname, '../../conf.json');
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log(`[CONFIG] Loaded: ${config.name}`);
} catch (error) {
    console.error('[ERROR] Failed to load conf.json:', error.message);
    config = {
        maxplayers: 100,
        name: 'BATTLE ARENA',
        battle: {
            max_teams: 2,
            team_size: 50,
            players_per_squad: 9,
            respawn_time: 15
        }
    };
}

// ============================================================================
// COMBAT ZONE LOCATIONS
// ============================================================================

const BATTLE_ZONES = [
    {
        id: 'industrial',
        name: 'Industrial Complex',
        center: { x: 2747.3, y: 1531.2, z: 24.5 },
        radius: 500,
        objectives: [
            { name: 'Alpha - Factory', x: 2750.0, y: 1550.0, z: 24.5 },
            { name: 'Bravo - Warehouse', x: 2800.0, y: 1500.0, z: 24.5 },
            { name: 'Charlie - Office', x: 2700.0, y: 1580.0, z: 24.5 }
        ],
        spawns: {
            team1: { x: 2650.0, y: 1450.0, z: 24.5 },
            team2: { x: 2850.0, y: 1650.0, z: 24.5 }
        }
    }
];

let currentBattleZone = BATTLE_ZONES[0];

// ============================================================================
// GAME STATE MANAGEMENT
// ============================================================================

class GameState {
    constructor() {
        this.teams = {};
        this.squads = new Map();
        this.players = new Map();
        this.objectives = [];
        this.fobs = new Map();
        this.currentMap = 'Industrial Complex';
        this.currentGameMode = 'conquest';
        this.matchActive = true; // AUTO START!
        this.matchStartTime = Date.now();
        this.teamScores = { 1: 0, 2: 0 };
        this.roleSlots = {};
        this.admins = new Set();
        
        // Initialize teams
        for (let i = 1; i <= 2; i++) {
            this.teams[i] = {
                id: i,
                name: i === 1 ? 'Task Force Phantom' : 'Soviet Defenders',
                players: [],
                score: 0,
                kills: 0,
                deaths: 0,
                squads: [],
                wins: 0,
                losses: 0
            };
        }
        
        console.log('[GAME STATE] Initialized - Match AUTO-STARTED');
    }

    getTeam(teamId) {
        return this.teams[teamId];
    }

    addPlayer(player, teamId) {
        const team = this.getTeam(teamId);
        if (!team.players.find(p => p.id === player.id)) {
            team.players.push(player);
        }
        this.players.set(player.id, { 
            team: teamId, 
            role: null, 
            squad: null,
            kills: 0,
            deaths: 0,
            assists: 0,
            joinTime: Date.now()
        });
        
        this.broadcastTeamStats();
    }

    removePlayer(player) {
        const playerData = this.players.get(player.id);
        if (playerData) {
            const team = this.getTeam(playerData.team);
            team.players = team.players.filter(p => p.id !== player.id);
            this.players.delete(player.id);
            this.broadcastTeamStats();
        }
    }

    broadcastTeamStats() {
        const stats = {
            team1: {
                playerCount: this.teams[1].players.length,
                winRate: this.getWinRate(1)
            },
            team2: {
                playerCount: this.teams[2].players.length,
                winRate: this.getWinRate(2)
            }
        };
        
        mp.players.forEach(player => {
            try {
                player.call('updateTeamStats', [JSON.stringify(stats)]);
            } catch (e) {}
        });
    }

    getWinRate(teamId) {
        const team = this.teams[teamId];
        const total = team.wins + team.losses;
        return total > 0 ? Math.round((team.wins / total) * 100) : 50;
    }

    isAdmin(player) {
        return this.admins.has(player.name) || this.admins.has(player.socialClub);
    }

    addAdmin(identifier) {
        this.admins.add(identifier);
        console.log(`[ADMIN] Added admin: ${identifier}`);
    }
}

const gameState = new GameState();
const vehicleManager = new VehicleManager(gameState);
const fobManager = new FOBManager(gameState);
const gameModeManager = new GameModeManager(gameState);

// Set default mode to Conquest
gameModeManager.setMode('conquest');

// ============================================================================
// OBJECTIVE SYSTEM
// ============================================================================

class Objective {
    constructor(objId, name, x, y, z) {
        this.id = objId;
        this.name = name;
        this.position = { x, y, z };
        this.capturedBy = null;
        this.captureProgress = 0;
        this.radius = 50;
        this.playersInRadius = { 1: 0, 2: 0 };
        this.colshape = mp.colshapes.newSphere(x, y, z, this.radius);
        this.active = true;
        console.log(`[OBJECTIVE] Created: ${name}`);
    }

    updateCapture(teamId) {
        if (this.capturedBy === teamId) return false;
        const playersNearby = this.playersInRadius[teamId] || 0;
        const enemyPlayers = this.playersInRadius[teamId === 1 ? 2 : 1] || 0;
        
        if (playersNearby > enemyPlayers) {
            this.captureProgress += (playersNearby - enemyPlayers) * 2;
            if (this.captureProgress >= 100) {
                this.capturedBy = teamId;
                this.captureProgress = 100;
                return true;
            }
        } else if (this.captureProgress > 0 && enemyPlayers > 0) {
            this.captureProgress -= enemyPlayers;
            if (this.captureProgress < 0) this.captureProgress = 0;
        }
        return false;
    }
}

// Initialize objectives on server start
gameState.objectives = currentBattleZone.objectives.map((obj, index) => 
    new Objective(`OBJ_${index}`, obj.name, obj.x, obj.y, obj.z)
);

// Spawn vehicles on server start
vehicleManager.spawnVehiclesForZone(currentBattleZone.id);

console.log('[AUTO-START] Match started automatically');
console.log('[AUTO-START] Vehicles spawned');
console.log('[AUTO-START] Objectives active');

// ============================================================================
// PLAYER EVENTS
// ============================================================================

mp.events.add('playerJoin', (player) => {
    console.log(`[JOIN] ${player.name} (${player.ip})`);
    
    player.position = new mp.Vector3(currentBattleZone.center.x, currentBattleZone.center.y, currentBattleZone.center.z + 50);
    player.health = 100;
    player.armour = 0;
    
    if (mp.players.length === 1) {
        gameState.addAdmin(player.name);
        gameState.addAdmin(player.socialClub);
        player.outputChatBox('!{00FF00}You are now admin!');
    }
    
    setTimeout(() => {
        player.call('playerReady');
        player.call('showMainMenu'); // Show new main menu!
        
        // Send server stats to menu
        const stats = {
            playerCount: mp.players.length,
            maxPlayers: config.maxplayers,
            mode: gameModeManager.getCurrentModeName(),
            map: gameState.currentMap,
            matchTime: formatTime(Date.now() - gameState.matchStartTime)
        };
        player.call('updateMainMenuStats', [JSON.stringify(stats)]);
    }, 1000);
});

mp.events.add('playerQuit', (player) => {
    gameState.removePlayer(player);
});

mp.events.add('playerDeath', (player, reason, killer) => {
    const playerData = gameState.players.get(player.id);
    if (playerData) {
        playerData.deaths++;
        gameModeManager.onPlayerDeath(player, killer);
        
        setTimeout(() => {
            if (mp.players.exists(player)) {
                const { fob } = fobManager.getNearestFOB(player, playerData.team);
                const spawnPos = currentBattleZone.spawns[`team${playerData.team}`];
                
                player.spawn(new mp.Vector3(
                    spawnPos.x + (Math.random() * 10 - 5),
                    spawnPos.y + (Math.random() * 10 - 5),
                    spawnPos.z
                ));
                player.health = 100;
                giveRoleLoadout(player, playerData.role);
            }
        }, config.battle.respawn_time * 1000);
    }
    
    if (killer && killer.id !== player.id) {
        const killerData = gameState.players.get(killer.id);
        if (killerData) {
            killerData.kills++;
            gameState.teamScores[killerData.team] += 10;
            broadcastHUDUpdate();
        }
    }
});

// ============================================================================
// MAIN MENU EVENTS
// ============================================================================

mp.events.add('selectTeamAndMode', (player, teamId, gameMode) => {
    console.log(`[MENU] ${player.name} selected Team ${teamId}, Mode: ${gameMode}`);
    
    // Set game mode
    if (gameMode && gameMode !== gameState.currentGameMode) {
        gameModeManager.setMode(gameMode);
        gameState.currentGameMode = gameMode;
        
        mp.players.forEach(p => {
            p.outputChatBox(`!{FFD700}[MODE] Switched to ${gameModeManager.getCurrentModeName()}`);
        });
    }
    
    // Add player to team
    gameState.addPlayer(player, teamId);
    
    // Show role selection
    player.call('showRoleSelect');
});

mp.events.add('requestServerStats', (player) => {
    const stats = {
        playerCount: mp.players.length,
        maxPlayers: config.maxplayers,
        mode: gameModeManager.getCurrentModeName(),
        map: gameState.currentMap,
        matchTime: formatTime(Date.now() - gameState.matchStartTime)
    };
    player.call('updateMainMenuStats', [JSON.stringify(stats)]);
});

// ============================================================================
// ROLE SELECTION
// ============================================================================

mp.events.add('selectRole', (player, roleName) => {
    const playerData = gameState.players.get(player.id);
    if (!playerData) return;
    
    playerData.role = roleName;
    player.call('hideAllMenus');
    
    const spawnPos = currentBattleZone.spawns[`team${playerData.team}`];
    player.position = new mp.Vector3(
        spawnPos.x + (Math.random() * 10 - 5),
        spawnPos.y + (Math.random() * 10 - 5),
        spawnPos.z
    );
    
    giveRoleLoadout(player, roleName);
    broadcastHUDUpdate();
    
    player.outputChatBox('!{00FF00}═══════════════════════════════');
    player.outputChatBox(`!{00FF00}Role: ${roleName.toUpperCase()}`);
    player.outputChatBox(`!{FFFF00}Mode: ${gameModeManager.getCurrentModeName()}`);
    player.outputChatBox('!{00FF00}═══════════════════════════════');
    
    console.log(`[ROLE] ${player.name} is now ${roleName}`);
});

mp.events.add('cef:selectRole', (player, roleName) => {
    mp.events.call('selectRole', player, roleName);
});

// ============================================================================
// LOADOUT SYSTEM
// ============================================================================

function giveRoleLoadout(player, role) {
    player.removeAllWeapons();
    
    switch(role) {
        case 'squad_leader':
            player.giveWeapon(mp.joaat('weapon_carbinerifle'), 200);
            player.giveWeapon(mp.joaat('weapon_pistol'), 50);
            player.armour = 50;
            break;
        case 'rifleman':
            player.giveWeapon(mp.joaat('weapon_assaultrifle'), 200);
            player.armour = 25;
            break;
        case 'medic':
            player.giveWeapon(mp.joaat('weapon_smg'), 150);
            player.armour = 50;
            break;
        case 'engineer':
            player.giveWeapon(mp.joaat('weapon_assaultsmg'), 150);
            player.giveWeapon(mp.joaat('weapon_pipebomb'), 3);
            player.armour = 75;
            break;
        case 'marksman':
            player.giveWeapon(mp.joaat('weapon_marksmanrifle'), 100);
            player.armour = 0;
            break;
        case 'mg_gunner':
            player.giveWeapon(mp.joaat('weapon_mg'), 300);
            player.armour = 25;
            break;
        case 'at_gunner':
            player.giveWeapon(mp.joaat('weapon_rpg'), 5);
            player.giveWeapon(mp.joaat('weapon_carbinerifle'), 100);
            player.armour = 25;
            break;
    }
    
    player.health = 100;
}

// ============================================================================
// HUD UPDATE
// ============================================================================

function broadcastHUDUpdate() {
    mp.players.forEach(player => {
        const playerData = gameState.players.get(player.id);
        if (!playerData) return;
        
        const hudData = {
            team: playerData.team,
            role: playerData.role,
            kills: playerData.kills,
            deaths: playerData.deaths,
            team1Score: gameState.teamScores[1],
            team2Score: gameState.teamScores[2]
        };
        
        try {
            player.call('updateGameState', [JSON.stringify(hudData)]);
        } catch (e) {}
    });
}

function broadcastObjectivesUpdate() {
    const objectivesData = gameState.objectives.map(obj => ({
        name: obj.name,
        x: obj.position.x,
        y: obj.position.y,
        z: obj.position.z,
        capturedBy: obj.capturedBy,
        captureProgress: obj.captureProgress,
        playersInRadius: obj.playersInRadius
    }));
    
    mp.players.forEach(player => {
        try {
            player.call('updateObjectives', [JSON.stringify(objectivesData)]);
        } catch (e) {}
    });
}

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================================
// FOB COMMANDS
// ============================================================================

mp.events.addCommand('placefob', (player) => {
    fobManager.placeFOB(player);
});

mp.events.addCommand('resupply', (player) => {
    const playerData = gameState.players.get(player.id);
    if (!playerData) return;
    
    const { fob, distance } = fobManager.getNearestFOB(player, playerData.team);
    if (!fob || distance > 30) {
        player.outputChatBox('!{FF0000}You must be near a FOB!');
        return;
    }
    
    fob.resupplyPlayer(player);
    giveRoleLoadout(player, playerData.role);
    player.outputChatBox('!{00FF00}[FOB] Resupplied!');
});

mp.events.addCommand('heal', (player) => {
    const playerData = gameState.players.get(player.id);
    if (!playerData) return;
    
    const { fob, distance } = fobManager.getNearestFOB(player, playerData.team);
    if (!fob || distance > 30) {
        player.outputChatBox('!{FF0000}You must be near a FOB!');
        return;
    }
    
    fob.healPlayer(player);
    player.outputChatBox('!{00FF00}[FOB] Healed!');
});

// ============================================================================
// GAME MODE COMMANDS
// ============================================================================

mp.events.addCommand('mode', (player, fullText, modeName) => {
    if (!gameState.isAdmin(player)) {
        player.outputChatBox('!{FF0000}Admin only');
        return;
    }
    
    if (!modeName) {
        player.outputChatBox('!{FFAA00}Available modes: conquest, rush, insurgency, training');
        player.outputChatBox(`!{00FFFF}Current: ${gameModeManager.getCurrentModeName()}`);
        return;
    }
    
    if (gameModeManager.setMode(modeName)) {
        gameState.currentGameMode = modeName;
        gameModeManager.startCurrentMode();
        
        mp.players.forEach(p => {
            p.outputChatBox(`!{FFD700}[MODE] Changed to ${gameModeManager.getCurrentModeName()}`);
        });
    } else {
        player.outputChatBox('!{FF0000}Invalid mode!');
    }
});

// ============================================================================
// ADMIN COMMANDS
// ============================================================================

mp.events.addCommand('tp', (player, fullText, x, y, z) => {
    if (!gameState.isAdmin(player)) return;
    player.position = new mp.Vector3(parseFloat(x), parseFloat(y), parseFloat(z));
});

mp.events.addCommand('pos', (player) => {
    const pos = player.position;
    player.outputChatBox(`!{00FFFF}${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`);
});

// ============================================================================
// GAME LOOP
// ============================================================================

setInterval(() => {
    if (!gameState.matchActive) return;
    
    // Update objectives
    gameState.objectives.forEach(obj => {
        obj.playersInRadius = { 1: 0, 2: 0 };
    });

    mp.players.forEach(player => {
        const playerData = gameState.players.get(player.id);
        if (!playerData) return;
        
        gameState.objectives.forEach(obj => {
            const dist = player.position.subtract(
                new mp.Vector3(obj.position.x, obj.position.y, obj.position.z)
            ).length();
            
            if (dist < obj.radius) {
                obj.playersInRadius[playerData.team]++;
            }
        });
    });

    gameState.objectives.forEach(obj => {
        [1, 2].forEach(teamId => {
            if (obj.updateCapture(teamId)) {
                const team = gameState.getTeam(teamId);
                gameState.teamScores[teamId] += 100;
                
                mp.players.forEach(p => {
                    p.outputChatBox(`!{00FF00}[CAPTURED] ${obj.name} by ${team.name}!`);
                });
                
                gameModeManager.onObjectiveCaptured(obj, teamId);
            }
        });
    });

    gameModeManager.update();
    vehicleManager.update();
    fobManager.update();
    broadcastObjectivesUpdate();
}, 1000);

setInterval(() => {
    broadcastHUDUpdate();
}, 5000);

// ============================================================================
// SERVER READY
// ============================================================================

console.log('[GAMEMODES] 4 modes loaded: Conquest, Rush, Insurgency, Training');
console.log('[MENU] Main menu with mode selection enabled');
console.log('[AUTO-START] Match running automatically');
console.log('[FOB] FOB system ready');
console.log('[VEHICLES] Vehicle system ready');
console.log('[COMMANDS] /mode [name] - Change game mode (admin)');
console.log('========================================');
console.log('   BATTLE ARENA SERVER READY');
console.log('   🎮 4 Game Modes + Main Menu!');
console.log('========================================');

module.exports = gameState;
