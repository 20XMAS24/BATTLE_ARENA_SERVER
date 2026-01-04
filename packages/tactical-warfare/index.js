// ============================================================================
// BATTLE ARENA - Enhanced Server with UI Integration
// Now with visual objects, web UI, and reduced command dependency
// ============================================================================

const fs = require('fs');
const path = require('path');

console.log('');
console.log('========================================');
console.log('   BATTLE ARENA SERVER LOADING');
console.log('   v2.0 - UI Enhanced Edition');
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
    },
    {
        name: 'Desert Outpost',
        center: { x: -1041.0, y: -2746.0, z: 21.0 },
        radius: 600,
        objectives: [
            { name: 'Alpha - Radar Station', x: -1000.0, y: -2700.0, z: 21.0 },
            { name: 'Bravo - Barracks', x: -1100.0, y: -2800.0, z: 21.0 },
            { name: 'Charlie - Helipad', x: -1050.0, y: -2750.0, z: 21.0 }
        ],
        spawns: {
            team1: { x: -950.0, y: -2650.0, z: 21.0 },
            team2: { x: -1150.0, y: -2850.0, z: 21.0 }
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
        this.currentMap = 'industrial';
        this.matchActive = false;
        this.matchStartTime = 0;
        this.teamScores = { 1: 0, 2: 0 };
        this.roleSlots = {};
        
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
        
        console.log('[GAME STATE] Initialized with UI support');
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
        
        // Broadcast team stats update
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
}

const gameState = new GameState();

// ============================================================================
// OBJECTIVE SYSTEM WITH VISUALS
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
        this.marker = null;
        this.colshape = null;
        
        // Create colshape for objective detection
        this.colshape = mp.colshapes.newSphere(x, y, z, this.radius);
        
        console.log(`[OBJECTIVE] Created: ${name} at (${Math.floor(x)}, ${Math.floor(y)}, ${Math.floor(z)})`);
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

// ============================================================================
// PLAYER EVENTS
// ============================================================================

mp.events.add('playerJoin', (player) => {
    console.log(`[JOIN] ${player.name} (${player.ip})`);
    
    // Spawn at spectator location
    player.position = new mp.Vector3(currentBattleZone.center.x, currentBattleZone.center.y, currentBattleZone.center.z + 50);
    player.heading = 0;
    player.dimension = 0;
    player.health = 100;
    player.armour = 0;
    
    // Initialize player UI
    setTimeout(() => {
        player.call('playerReady');
        player.call('showTeamSelect');
    }, 1000);
});

mp.events.add('playerQuit', (player, exitType, reason) => {
    console.log(`[QUIT] ${player.name} - ${reason}`);
    gameState.removePlayer(player);
});

mp.events.add('playerDeath', (player, reason, killer) => {
    const playerData = gameState.players.get(player.id);
    if (playerData) {
        playerData.deaths++;
        const team = gameState.getTeam(playerData.team);
        team.deaths++;
        
        player.call('showNotification', ['You will respawn soon', 'info']);
        
        // Respawn after delay
        setTimeout(() => {
            if (mp.players.exists(player)) {
                const spawnPos = currentBattleZone.spawns[`team${playerData.team}`];
                player.spawn(new mp.Vector3(spawnPos.x, spawnPos.y, spawnPos.z));
                player.health = 100;
                player.armour = playerData.role === 'engineer' ? 50 : 0;
            }
        }, config.battle.respawn_time * 1000);
    }
    
    if (killer && killer.id !== player.id) {
        const killerData = gameState.players.get(killer.id);
        if (killerData) {
            killerData.kills++;
            const killerTeam = gameState.getTeam(killerData.team);
            killerTeam.kills++;
            gameState.teamScores[killerData.team] += 10;
            
            killer.call('showNotification', [`+10 Kill: ${player.name}`, 'success']);
            broadcastHUDUpdate();
        }
    }
});

// ============================================================================
// UI EVENTS FROM CLIENT
// ============================================================================

mp.events.add('selectTeam', (player, teamId) => {
    gameState.addPlayer(player, teamId);
    const team = gameState.getTeam(teamId);
    
    console.log(`[TEAM] ${player.name} joined Team ${teamId}`);
    
    player.call('showRoleSelect');
    player.call('showNotification', [`Joined: ${team.name}`, 'success']);
});

mp.events.add('selectRole', (player, roleName) => {
    const playerData = gameState.players.get(player.id);
    if (!playerData) return;
    
    playerData.role = roleName;
    player.call('hideAllMenus');
    player.call('showNotification', [`Role: ${roleName.replace('_', ' ').toUpperCase()}`, 'success']);
    
    // Spawn player
    const spawnPos = currentBattleZone.spawns[`team${playerData.team}`];
    player.position = new mp.Vector3(
        spawnPos.x + (Math.random() * 20 - 10),
        spawnPos.y + (Math.random() * 20 - 10),
        spawnPos.z
    );
    
    // Give loadout based on role
    giveRoleLoadout(player, roleName);
    
    console.log(`[ROLE] ${player.name} selected ${roleName}`);
    broadcastHUDUpdate();
});

mp.events.add('cef:setRallyPoint', (player) => {
    const playerData = gameState.players.get(player.id);
    if (!playerData || playerData.role !== 'squad_leader') {
        player.call('showNotification', ['Only squad leaders can set rally points', 'error']);
        return;
    }
    
    const pos = player.position;
    // Broadcast rally point to squad
    mp.players.forEach(p => {
        const pData = gameState.players.get(p.id);
        if (pData && pData.team === playerData.team) {
            p.call('showRallyPoint', [pos.x, pos.y, pos.z]);
            p.call('showNotification', ['Rally point set!', 'success']);
        }
    });
});

// ============================================================================
// LOADOUT SYSTEM
// ============================================================================

function giveRoleLoadout(player, role) {
    // Clear existing weapons
    player.removeAllWeapons();
    
    switch(role) {
        case 'squad_leader':
            player.giveWeapon(mp.joaat('weapon_carbinerifle'), 200);
            player.giveWeapon(mp.joaat('weapon_pistol'), 50);
            player.armour = 50;
            break;
        case 'rifleman':
            player.giveWeapon(mp.joaat('weapon_assaultrifle'), 200);
            player.giveWeapon(mp.joaat('weapon_knife'), 1);
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
            player.giveWeapon(mp.joaat('weapon_pistol'), 50);
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
// HUD UPDATE BROADCASTING
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
            assists: playerData.assists,
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
        radius: obj.radius
    }));
    
    mp.players.forEach(player => {
        try {
            player.call('updateObjectives', [JSON.stringify(objectivesData)]);
            player.call('createObjectiveMarkers', [JSON.stringify(objectivesData)]);
        } catch (e) {}
    });
}

// ============================================================================
// ADMIN COMMANDS (Simplified)
// ============================================================================

mp.events.addCommand('start', (player) => {
    if (!player.admin) {
        player.outputChatBox('!{FF0000}Admin only');
        return;
    }

    startMatch();
});

mp.events.addCommand('end', (player) => {
    if (!player.admin) return;
    endMatch();
});

function startMatch() {
    gameState.matchActive = true;
    gameState.matchStartTime = Date.now();
    gameState.teamScores = { 1: 0, 2: 0 };

    // Create objectives from current battle zone
    gameState.objectives = currentBattleZone.objectives.map((obj, index) => 
        new Objective(`OBJ_${index}`, obj.name, obj.x, obj.y, obj.z)
    );

    mp.players.forEach(player => {
        player.call('showNotification', ['MATCH STARTED!', 'success']);
        player.call('startMatchTimer', [gameState.matchStartTime]);
    });

    broadcastObjectivesUpdate();
    console.log('[MATCH] Match started');
}

function endMatch() {
    gameState.matchActive = false;
    const winner = gameState.teamScores[1] > gameState.teamScores[2] ? 1 : 2;
    const team = gameState.getTeam(winner);
    team.wins++;
    
    const loser = winner === 1 ? 2 : 1;
    gameState.getTeam(loser).losses++;

    mp.players.forEach(player => {
        player.call('stopMatchTimer');
        player.call('showNotification', [`WINNER: ${team.name}`, 'success']);
    });

    console.log('[MATCH] Match ended. Winner:', team.name);
}

// ============================================================================
// GAME LOOP
// ============================================================================

setInterval(() => {
    if (!gameState.matchActive) return;

    // Reset player counts
    gameState.objectives.forEach(obj => {
        obj.playersInRadius = { 1: 0, 2: 0 };
    });

    // Count players in objectives
    mp.players.forEach(player => {
        const playerData = gameState.players.get(player.id);
        if (!playerData || !playerData.team) return;
        
        gameState.objectives.forEach(obj => {
            const dist = player.position.subtract(
                new mp.Vector3(obj.position.x, obj.position.y, obj.position.z)
            ).length();
            
            if (dist < obj.radius) {
                obj.playersInRadius[playerData.team]++;
            }
        });
    });

    // Update captures
    gameState.objectives.forEach(obj => {
        [1, 2].forEach(teamId => {
            if (obj.updateCapture(teamId)) {
                const team = gameState.getTeam(teamId);
                gameState.teamScores[teamId] += 100;
                
                mp.players.forEach(p => {
                    p.call('showNotification', [`${obj.name} captured by ${team.name}!`, 'warning']);
                });
                
                console.log(`[OBJECTIVE] ${obj.name} captured by Team ${teamId}`);
                broadcastHUDUpdate();
            }
        });
    });

    broadcastObjectivesUpdate();
}, 1000);

// Update HUD regularly
setInterval(() => {
    broadcastHUDUpdate();
}, 5000);

// ============================================================================
// SERVER READY
// ============================================================================

console.log('[UI] Web interface enabled');
console.log('[VISUAL] Combat objects system loaded');
console.log('[COMMANDS] Reduced to essentials only');
console.log('[BATTLE ZONE] Industrial Complex loaded');
console.log('========================================');
console.log('   BATTLE ARENA SERVER READY');
console.log('   Players join via UI - No commands needed!');
console.log('========================================');
console.log('');

module.exports = gameState;
