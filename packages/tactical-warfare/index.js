// ============================================================================
// BATTLE ARENA - Enhanced Server with AI Bots
// v2.3 - Now with AI soldiers!
// ============================================================================

const fs = require('fs');
const path = require('path');
const VehicleManager = require('./modules/vehicles');
const FOBManager = require('./modules/fob');
const AIManager = require('./modules/ai');

console.log('');
console.log('========================================');
console.log('   BATTLE ARENA SERVER LOADING');
console.log('   v2.3 - AI Bot System Edition');
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
    },
    {
        id: 'desert',
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
global.gameState = gameState; // Make available to AI module
const vehicleManager = new VehicleManager(gameState);
const fobManager = new FOBManager(gameState);
const aiManager = new AIManager(gameState);

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

// Rest of the file remains the same until AI commands section...
// [Previous event handlers and functions continue here]

// ============================================================================
// AI BOT COMMANDS
// ============================================================================

mp.events.addCommand('spawnai', (player, fullText, count) => {
    const playerData = gameState.players.get(player.id);
    if (!playerData) return;
    
    // Only Squad Leaders can spawn AI
    if (playerData.role !== 'squad_leader' && !gameState.isAdmin(player)) {
        player.outputChatBox('!{FF0000}Only Squad Leaders can spawn AI!');
        return;
    }
    
    const numBots = parseInt(count) || 1;
    if (numBots < 1 || numBots > 10) {
        player.outputChatBox('!{FFAA00}Usage: /spawnai [1-10]');
        return;
    }
    
    for (let i = 0; i < numBots; i++) {
        const offset = {
            x: (Math.random() - 0.5) * 5,
            y: (Math.random() - 0.5) * 5
        };
        
        const spawnPos = new mp.Vector3(
            player.position.x + offset.x,
            player.position.y + offset.y,
            player.position.z
        );
        
        aiManager.spawnBot(spawnPos, playerData.team);
    }
    
    player.outputChatBox(`!{00FF00}[AI] Spawned ${numBots} AI soldier(s)`);
});

mp.events.addCommand('spawnaisquad', (player) => {
    const playerData = gameState.players.get(player.id);
    if (!playerData) return;
    
    if (playerData.role !== 'squad_leader' && !gameState.isAdmin(player)) {
        player.outputChatBox('!{FF0000}Only Squad Leaders can spawn AI squads!');
        return;
    }
    
    const squad = aiManager.spawnSquad(player.position, playerData.team, player);
    player.outputChatBox(`!{00FF00}[AI] Spawned AI squad (${squad.length} soldiers)`);
    player.outputChatBox('!{00FFFF}AI will follow you!');
});

mp.events.addCommand('aifollow', (player) => {
    const playerData = gameState.players.get(player.id);
    if (!playerData) return;
    
    aiManager.commandBots(playerData.team, 'follow', player);
    player.outputChatBox('!{00FF00}[AI] All AI soldiers will follow you');
});

mp.events.addCommand('aidefend', (player) => {
    const playerData = gameState.players.get(player.id);
    if (!playerData) return;
    
    aiManager.commandBots(playerData.team, 'defend', player.position);
    player.outputChatBox('!{00FF00}[AI] AI soldiers will defend this position');
});

mp.events.addCommand('aiattack', (player) => {
    const playerData = gameState.players.get(player.id);
    if (!playerData) return;
    
    aiManager.commandBots(playerData.team, 'attack');
    player.outputChatBox('!{00FF00}[AI] AI soldiers will attack enemies!');
});

mp.events.addCommand('aicount', (player) => {
    const playerData = gameState.players.get(player.id);
    if (!playerData) return;
    
    const teamBots = aiManager.getBotsForTeam(playerData.team);
    const totalBots = aiManager.getBotCount();
    
    player.outputChatBox('!{00FFFF}═══ AI STATUS ═══');
    player.outputChatBox(`!{00FF00}Your team: ${teamBots.length} AI`);
    player.outputChatBox(`!{FFAA00}Total: ${totalBots} AI`);
    player.outputChatBox(`!{FFAA00}Max per team: ${aiManager.maxBotsPerTeam}`);
});

mp.events.addCommand('clearai', (player) => {
    if (!gameState.isAdmin(player)) {
        player.outputChatBox('!{FF0000}Admin only');
        return;
    }
    
    aiManager.removeAllBots();
    player.outputChatBox('!{00FF00}[AI] All AI removed');
});

// [Previous commands continue...]
// I'll add AI commands section and update the game loop

// ============================================================================
// GAME LOOP WITH AI
// ============================================================================

setInterval(() => {
    if (!gameState.matchActive) return;

    gameState.objectives.forEach(obj => {
        obj.playersInRadius = { 1: 0, 2: 0 };
    });

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

    gameState.objectives.forEach(obj => {
        [1, 2].forEach(teamId => {
            if (obj.updateCapture(teamId)) {
                const team = gameState.getTeam(teamId);
                gameState.teamScores[teamId] += 100;
                
                mp.players.forEach(p => {
                    p.call('showNotification', [`${obj.name} captured by ${team.name}!`, 'warning']);
                    p.outputChatBox(`!{00FF00}[CAPTURED] ${obj.name} by ${team.name}!`);
                });
                
                console.log(`[OBJECTIVE] ${obj.name} captured by Team ${teamId}`);
            }
        });
    });

    // Update AI bots
    aiManager.update();
    
    vehicleManager.update();
    fobManager.update();
}, 1000);

// ============================================================================
// SERVER READY
// ============================================================================

console.log('[AI] AI Bot system ready');
console.log('[VEHICLES] Vehicle system ready');
console.log('[FOB] FOB system ready');
console.log('[COMMANDS] /spawnai [count] - Spawn AI (Squad Leader)');
console.log('[COMMANDS] /spawnaisquad - Spawn full AI squad (9 soldiers)');
console.log('[COMMANDS] /aifollow - AI follow you');
console.log('[COMMANDS] /aidefend - AI defend position');
console.log('[COMMANDS] /aiattack - AI attack mode');
console.log('[COMMANDS] /aicount - Check AI count');
console.log('========================================');
console.log('   BATTLE ARENA SERVER READY');
console.log('   🤖 AI Bots, FOB, Vehicles - GO!');
console.log('========================================');

module.exports = gameState;
