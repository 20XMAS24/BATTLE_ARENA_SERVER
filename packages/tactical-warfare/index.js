// ============================================================================
// BATTLE ARENA - Main Package Entry Point
// This file is loaded by RAGE MP server on startup
// ============================================================================

const fs = require('fs');
const path = require('path');

console.log('');
console.log('========================================');
console.log('   BATTLE ARENA SERVER LOADING');
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
// GAME STATE MANAGEMENT
// ============================================================================

class GameState {
    constructor() {
        this.teams = {};
        this.squads = new Map();
        this.players = new Map();
        this.objectives = [];
        this.fobs = new Map();
        this.currentMap = config.maps ? config.maps[0] : 'default';
        this.matchActive = false;
        this.matchStartTime = 0;
        this.teamScores = { 1: 0, 2: 0 };
        this.respawnQueues = { 1: [], 2: [] };
        
        // Initialize teams
        for (let i = 1; i <= 2; i++) {
            this.teams[i] = {
                id: i,
                name: config.factions ? config.factions[i - 1].name : `Team ${i}`,
                players: [],
                score: 0,
                kills: 0,
                deaths: 0,
                squads: []
            };
        }
        
        console.log('[GAME STATE] Initialized');
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
            joinTime: Date.now()
        });
    }

    removePlayer(player) {
        const playerData = this.players.get(player.id);
        if (playerData) {
            const team = this.getTeam(playerData.team);
            team.players = team.players.filter(p => p.id !== player.id);
            this.players.delete(player.id);
        }
    }
}

const gameState = new GameState();

// ============================================================================
// SQUAD SYSTEM
// ============================================================================

class Squad {
    constructor(squadNumber, teamId, leaderPlayer) {
        this.id = `SQUAD_${teamId}_${squadNumber}`;
        this.squadNumber = squadNumber;
        this.teamId = teamId;
        this.leader = leaderPlayer;
        this.members = [leaderPlayer];
        this.maxSize = config.battle.players_per_squad;
        this.rallyPoint = null;
    }

    addMember(player) {
        if (this.members.length < this.maxSize) {
            this.members.push(player);
            return true;
        }
        return false;
    }

    removeMember(playerId) {
        this.members = this.members.filter(m => m.id !== playerId);
        if (this.leader.id === playerId && this.members.length > 0) {
            this.leader = this.members[0];
        }
    }

    setRallyPoint(x, y, z) {
        this.rallyPoint = { x, y, z, timestamp: Date.now() };
        this.broadcastToSquad(`Rally point set at: X:${Math.floor(x)}, Y:${Math.floor(y)}, Z:${Math.floor(z)}`);
    }

    broadcastToSquad(message) {
        this.members.forEach(member => {
            try {
                if (mp.players.exists(member)) {
                    member.outputChatBox(`[Squad ${this.squadNumber}] ${message}`);
                }
            } catch (e) {
                // Player no longer exists
            }
        });
    }
}

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
        this.radius = 100;
        this.playersInRadius = { 1: 0, 2: 0 };
    }

    updateCapture(teamId) {
        if (this.capturedBy === teamId) return false;

        const playersNearby = this.playersInRadius[teamId] || 0;
        if (playersNearby > 0) {
            this.captureProgress += playersNearby;
            if (this.captureProgress >= 45 * playersNearby) {
                this.capturedBy = teamId;
                this.captureProgress = 0;
                return true;
            }
        }
        return false;
    }
}

// ============================================================================
// PLAYER COMMANDS
// ============================================================================

mp.events.addCommand('help', (player) => {
    player.outputChatBox('!{00FF00}=== BATTLE ARENA COMMANDS ===');
    player.outputChatBox('!{FFFF00}/team <1|2> - Join a team');
    player.outputChatBox('!{FFFF00}/role <name> - Select role');
    player.outputChatBox('!{FFFF00}/squad info - Squad information');
    player.outputChatBox('!{FFFF00}/objectives - View objectives');
    player.outputChatBox('!{FFFF00}/stats - Your statistics');
    player.outputChatBox('!{FFFF00}/status - Match status');
});

mp.events.addCommand('team', (player, fullText, teamId) => {
    const id = parseInt(teamId);
    if (isNaN(id) || id < 1 || id > 2) {
        player.outputChatBox('!{FF0000}Invalid team. Use: /team 1 or /team 2');
        return;
    }

    if (gameState.players.has(player.id)) {
        gameState.removePlayer(player);
    }

    gameState.addPlayer(player, id);
    const team = gameState.getTeam(id);
    player.outputChatBox(`!{00FF00}Joined: ${team.name}`);
    player.outputChatBox(`!{FFFF00}Team size: ${team.players.length}/${config.battle.team_size}`);
    
    console.log(`[TEAM] ${player.name} joined Team ${id}`);
});

mp.events.addCommand('role', (player, fullText, roleName) => {
    if (!roleName) {
        player.outputChatBox('!{FF0000}Usage: /role <role_name>');
        player.outputChatBox('!{FFFF00}Available: rifleman, medic, engineer, squad_leader, marksman, mg_gunner, at_gunner');
        return;
    }

    const roles = ['rifleman', 'medic', 'engineer', 'squad_leader', 'marksman', 'mg_gunner', 'at_gunner'];
    if (!roles.includes(roleName.toLowerCase())) {
        player.outputChatBox('!{FF0000}Invalid role name');
        return;
    }

    const playerData = gameState.players.get(player.id);
    if (!playerData) {
        player.outputChatBox('!{FF0000}Join a team first! Use /team <1|2>');
        return;
    }

    playerData.role = roleName.toLowerCase();
    player.outputChatBox(`!{00FF00}Role set to: ${roleName}`);
    
    console.log(`[ROLE] ${player.name} selected ${roleName}`);
});

mp.events.addCommand('squad', (player, fullText, action) => {
    const playerData = gameState.players.get(player.id);
    
    if (!playerData || !playerData.team) {
        player.outputChatBox('!{FF0000}Join a team first!');
        return;
    }

    if (action === 'info') {
        const squad = gameState.squads.get(playerData.squad);
        if (squad) {
            player.outputChatBox(`!{00FF00}Squad ${squad.squadNumber}`);
            player.outputChatBox(`!{FFFF00}Leader: ${squad.leader.name}`);
            player.outputChatBox(`!{FFFF00}Members: ${squad.members.length}/${squad.maxSize}`);
        } else {
            player.outputChatBox('!{FF0000}You are not in a squad');
        }
    } else if (action === 'rally') {
        const squad = gameState.squads.get(playerData.squad);
        if (squad && squad.leader.id === player.id) {
            const pos = player.position;
            squad.setRallyPoint(pos.x, pos.y, pos.z);
            player.outputChatBox('!{00FF00}Rally point set!');
        } else {
            player.outputChatBox('!{FF0000}Only squad leaders can set rally points');
        }
    } else {
        player.outputChatBox('!{FFFF00}Usage: /squad info or /squad rally');
    }
});

mp.events.addCommand('objectives', (player) => {
    if (gameState.objectives.length === 0) {
        player.outputChatBox('!{FF0000}No objectives active. Admin must start match with /start');
        return;
    }

    player.outputChatBox('!{FF0000}=== OBJECTIVES ===');
    gameState.objectives.forEach(obj => {
        const owner = obj.capturedBy ? `Team ${obj.capturedBy}` : 'Neutral';
        player.outputChatBox(`!{FFFF00}${obj.name} - ${owner}`);
    });
});

mp.events.addCommand('status', (player) => {
    const match = gameState.matchActive ? 'ACTIVE' : 'IDLE';
    const duration = gameState.matchActive ? 
        Math.floor((Date.now() - gameState.matchStartTime) / 1000) : 0;
    
    player.outputChatBox(`!{00FF00}Match Status: ${match}`);
    if (gameState.matchActive) {
        player.outputChatBox(`!{FFFF00}Duration: ${duration}s`);
        player.outputChatBox(`!{FFFF00}Team 1: ${gameState.teamScores[1]} | Team 2: ${gameState.teamScores[2]}`);
    }
});

mp.events.addCommand('stats', (player) => {
    const playerData = gameState.players.get(player.id);
    if (!playerData) {
        player.outputChatBox('!{FF0000}No stats available');
        return;
    }

    player.outputChatBox('!{00FF00}=== YOUR STATS ===');
    player.outputChatBox(`!{FFFF00}Team: ${playerData.team || 'None'}`);
    player.outputChatBox(`!{FFFF00}Role: ${playerData.role || 'None'}`);
    const playtime = Math.floor((Date.now() - playerData.joinTime) / 1000);
    player.outputChatBox(`!{FFFF00}Session time: ${playtime}s`);
});

// ============================================================================
// ADMIN COMMANDS
// ============================================================================

mp.events.addCommand('start', (player) => {
    if (!player.admin) {
        player.outputChatBox('!{FF0000}Admin only command');
        return;
    }

    gameState.matchActive = true;
    gameState.matchStartTime = Date.now();
    gameState.teamScores = { 1: 0, 2: 0 };

    // Create objectives
    gameState.objectives = [
        new Objective('OBJ_A', 'Alpha Objective', 100, 200, 0),
        new Objective('OBJ_B', 'Bravo Objective', 300, 400, 0),
        new Objective('OBJ_C', 'Charlie Objective', 500, 600, 0)
    ];

    mp.players.forEach((p) => {
        p.outputChatBox('!{00FF00}[BATTLE ARENA] Match Started!');
        p.outputChatBox('!{FFFF00}Proceed to objectives. Use /objectives to see them.');
    });

    console.log('[MATCH] Match started by', player.name);
});

mp.events.addCommand('end', (player) => {
    if (!player.admin) {
        player.outputChatBox('!{FF0000}Admin only command');
        return;
    }

    gameState.matchActive = false;
    const duration = Math.floor((Date.now() - gameState.matchStartTime) / 1000);
    const winner = gameState.teamScores[1] > gameState.teamScores[2] ? 1 : 2;
    const team = gameState.getTeam(winner);

    mp.players.forEach((p) => {
        p.outputChatBox(`!{FF0000}[BATTLE ARENA] Match ended!`);
        p.outputChatBox(`!{00FF00}Winner: ${team.name}`);
        p.outputChatBox(`!{FFFF00}Duration: ${duration}s | Team 1: ${gameState.teamScores[1]} | Team 2: ${gameState.teamScores[2]}`);
    });

    console.log('[MATCH] Match ended. Winner:', team.name);
});

// ============================================================================
// PLAYER EVENTS
// ============================================================================

mp.events.add('playerJoin', (player) => {
    console.log(`[JOIN] ${player.name} (${player.ip})`);
    
    player.outputChatBox('!{00FF00}═══════════════════════════════════');
    player.outputChatBox('!{FFFF00}    Welcome to BATTLE ARENA!');
    player.outputChatBox('!{00FF00}═══════════════════════════════════');
    player.outputChatBox('!{FFFF00}Type /help for commands');
    player.outputChatBox('!{FFFF00}Use /team <1|2> to join a team');
    player.outputChatBox('!{00FF00}═══════════════════════════════════');
    
    // Spawn player at default location
    player.position = new mp.Vector3(-1041.0, -2746.0, 21.0);
    player.heading = 0;
    player.dimension = 0;
});

mp.events.add('playerQuit', (player, exitType, reason) => {
    console.log(`[QUIT] ${player.name} - ${reason}`);
    gameState.removePlayer(player);
});

mp.events.add('playerDeath', (player, reason, killer) => {
    const playerData = gameState.players.get(player.id);
    if (playerData && playerData.team) {
        const team = gameState.getTeam(playerData.team);
        team.deaths++;
        
        player.outputChatBox(`!{FFFF00}You will respawn in ${config.battle.respawn_time} seconds`);
        
        setTimeout(() => {
            if (mp.players.exists(player) && gameState.matchActive) {
                player.spawn(new mp.Vector3(-1041.0, -2746.0, 21.0));
                player.health = 100;
            }
        }, config.battle.respawn_time * 1000);
    }
    
    if (killer && killer.id !== player.id) {
        const killerData = gameState.players.get(killer.id);
        if (killerData && killerData.team) {
            const killerTeam = gameState.getTeam(killerData.team);
            killerTeam.kills++;
            gameState.teamScores[killerData.team] += 10;
        }
    }
});

// ============================================================================
// GAME LOOP
// ============================================================================

setInterval(() => {
    if (!gameState.matchActive) return;

    // Update objective captures
    gameState.objectives.forEach(obj => {
        obj.playersInRadius = { 1: 0, 2: 0 };
        
        mp.players.forEach(player => {
            const playerData = gameState.players.get(player.id);
            if (!playerData || !playerData.team) return;
            
            const dist = player.position.subtract(new mp.Vector3(obj.position.x, obj.position.y, obj.position.z)).length();
            if (dist < obj.radius) {
                obj.playersInRadius[playerData.team]++;
            }
        });

        // Try to capture for both teams
        [1, 2].forEach(teamId => {
            if (obj.updateCapture(teamId)) {
                const team = gameState.getTeam(teamId);
                gameState.teamScores[teamId] += 100;
                
                mp.players.forEach(p => {
                    p.outputChatBox(`!{FF0000}[OBJECTIVE] ${obj.name} captured by ${team.name}!`);
                });
                
                console.log(`[OBJECTIVE] ${obj.name} captured by Team ${teamId}`);
            }
        });
    });

    // Check match end (time limit: 1 hour)
    const matchDuration = Date.now() - gameState.matchStartTime;
    if (matchDuration >= 3600000) {
        // Auto end match
        gameState.matchActive = false;
        const winner = gameState.teamScores[1] > gameState.teamScores[2] ? 1 : 2;
        const team = gameState.getTeam(winner);
        
        mp.players.forEach(p => {
            p.outputChatBox(`!{FF0000}[BATTLE ARENA] Match time limit reached!`);
            p.outputChatBox(`!{00FF00}Winner: ${team.name}`);
        });
    }
}, 1000);

// ============================================================================
// SERVER READY
// ============================================================================

console.log('[GAME MODE] Tactical Squad Warfare loaded');
console.log('[FEATURES] Teams, Squads, Objectives, FOB system');
console.log('[COMMANDS] Type /help in-game for commands');
console.log('========================================');
console.log('   BATTLE ARENA SERVER READY');
console.log('========================================');
console.log('');

// Export for other modules
module.exports = gameState;
