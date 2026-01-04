// ============================================================================
// BATTLE ARENA - Enhanced Server with UI, Vehicles and FOB System
// v2.2 - Now with FOB support!
// ============================================================================

const fs = require('fs');
const path = require('path');
const VehicleManager = require('./modules/vehicles');
const FOBManager = require('./modules/fob');

console.log('');
console.log('========================================');
console.log('   BATTLE ARENA SERVER LOADING');
console.log('   v2.2 - FOB System Edition');
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
        this.lastProgressBroadcast = 0;
        
        this.colshape = mp.colshapes.newSphere(x, y, z, this.radius);
        
        console.log(`[OBJECTIVE] Created: ${name} at (${x}, ${y}, ${z}) radius ${this.radius}m`);
    }

    updateCapture(teamId) {
        if (this.capturedBy === teamId) return false;

        const playersNearby = this.playersInRadius[teamId] || 0;
        const enemyPlayers = this.playersInRadius[teamId === 1 ? 2 : 1] || 0;
        
        if (playersNearby > enemyPlayers) {
            const oldProgress = this.captureProgress;
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
    
    player.position = new mp.Vector3(currentBattleZone.center.x, currentBattleZone.center.y, currentBattleZone.center.z + 50);
    player.heading = 0;
    player.dimension = 0;
    player.health = 100;
    player.armour = 0;
    
    // Auto-grant admin to first player
    if (mp.players.length === 1) {
        gameState.addAdmin(player.name);
        gameState.addAdmin(player.socialClub);
        player.outputChatBox('!{00FF00}You have been granted admin rights!');
        player.outputChatBox('!{FFFF00}Use /start to begin the match');
    }
    
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
        
        setTimeout(() => {
            if (mp.players.exists(player)) {
                // Try to spawn at nearest friendly FOB
                const { fob, distance } = fobManager.getNearestFOB(player, playerData.team);
                
                let spawnPos;
                if (fob && distance < 500) {
                    // Spawn at FOB
                    spawnPos = new mp.Vector3(
                        fob.position.x + (Math.random() * 10 - 5),
                        fob.position.y + (Math.random() * 10 - 5),
                        fob.position.z
                    );
                    player.outputChatBox('!{00FF00}Spawned at FOB');
                } else {
                    // Spawn at base
                    const baseSpawn = currentBattleZone.spawns[`team${playerData.team}`];
                    spawnPos = new mp.Vector3(baseSpawn.x, baseSpawn.y, baseSpawn.z);
                }
                
                player.spawn(spawnPos);
                player.health = 100;
                player.armour = playerData.role === 'engineer' ? 50 : 0;
                giveRoleLoadout(player, playerData.role);
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
// VEHICLE EVENTS
// ============================================================================

mp.events.add('playerEnterVehicle', (player, vehicle, seat) => {
    vehicleManager.onPlayerEnterVehicle(player, vehicle, seat);
});

mp.events.add('playerExitVehicle', (player, vehicle) => {
    vehicleManager.onPlayerExitVehicle(player, vehicle);
});

mp.events.add('vehicleDamage', (vehicle, bodyHealthLoss, engineHealthLoss) => {
    const damage = bodyHealthLoss + engineHealthLoss;
    vehicleManager.damageVehicle(vehicle, damage * 10, null);
});

mp.events.addCommand('repair', (player) => {
    const vehicle = player.vehicle;
    if (!vehicle) {
        player.call('showNotification', ['You must be near a vehicle!', 'error']);
        return;
    }
    
    vehicleManager.repairVehicle(player, vehicle);
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
    
    const spawnPos = currentBattleZone.spawns[`team${playerData.team}`];
    player.position = new mp.Vector3(
        spawnPos.x + (Math.random() * 20 - 10),
        spawnPos.y + (Math.random() * 20 - 10),
        spawnPos.z
    );
    
    giveRoleLoadout(player, roleName);
    
    if (!gameState.matchActive) {
        player.outputChatBox('!{FFAA00}═══════════════════════════════');
        player.outputChatBox('!{FFAA00}  Type /start to begin match!');
        player.outputChatBox('!{FFAA00}═══════════════════════════════');
    }
    
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
        radius: obj.radius,
        playersInRadius: obj.playersInRadius
    }));
    
    mp.players.forEach(player => {
        try {
            player.call('updateObjectives', [JSON.stringify(objectivesData)]);
            player.call('createObjectiveMarkers', [JSON.stringify(objectivesData)]);
        } catch (e) {}
    });
}

// ============================================================================
// FOB COMMANDS
// ============================================================================

mp.events.addCommand('placefob', (player) => {
    if (!gameState.matchActive) {
        player.outputChatBox('!{FF0000}Match must be active to place FOBs!');
        return;
    }
    
    fobManager.placeFOB(player);
});

mp.events.addCommand('fobs', (player) => {
    const playerData = gameState.players.get(player.id);
    if (!playerData) return;
    
    const teamFobs = fobManager.getFOBsForTeam(playerData.team);
    
    player.outputChatBox('!{00FFFF}═══ TEAM FOBs ═══');
    if (teamFobs.length === 0) {
        player.outputChatBox('!{FFAA00}No FOBs deployed');
    } else {
        teamFobs.forEach(fob => {
            const dist = player.position.subtract(
                new mp.Vector3(fob.position.x, fob.position.y, fob.position.z)
            ).length();
            const healthPercent = Math.round((fob.health / fob.maxHealth) * 100);
            player.outputChatBox(`!{00FF00}${fob.id}:`);
            player.outputChatBox(`  Health: ${healthPercent}% (${fob.health}/${fob.maxHealth})`);
            player.outputChatBox(`  Distance: ${Math.round(dist)}m`);
            player.outputChatBox(`  Owner: ${fob.owner.name}`);
        });
    }
    player.outputChatBox(`!{00FFFF}Total: ${teamFobs.length}/${fobManager.maxFobsPerTeam}`);
});

mp.events.addCommand('resupply', (player) => {
    const playerData = gameState.players.get(player.id);
    if (!playerData) return;
    
    const { fob, distance } = fobManager.getNearestFOB(player, playerData.team);
    
    if (!fob || distance > 30) {
        player.outputChatBox('!{FF0000}You must be near a friendly FOB!');
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
        player.outputChatBox('!{FF0000}You must be near a friendly FOB!');
        return;
    }
    
    fob.healPlayer(player);
    player.outputChatBox('!{00FF00}[FOB] Healed!');
});

// ============================================================================
// ADMIN COMMANDS
// ============================================================================

mp.events.addCommand('makeadmin', (player, fullText, targetName) => {
    if (!gameState.isAdmin(player)) {
        player.outputChatBox('!{FF0000}You are not an admin!');
        return;
    }

    if (!targetName) {
        player.outputChatBox('!{FFAA00}Usage: /makeadmin <player name>');
        return;
    }

    const target = mp.players.toArray().find(p => 
        p.name.toLowerCase().includes(targetName.toLowerCase())
    );

    if (!target) {
        player.outputChatBox('!{FF0000}Player not found!');
        return;
    }

    gameState.addAdmin(target.name);
    gameState.addAdmin(target.socialClub);
    
    player.outputChatBox(`!{00FF00}${target.name} is now an admin!`);
    target.outputChatBox('!{00FF00}You have been granted admin rights!');
});

mp.events.addCommand('start', (player) => {
    if (gameState.matchActive) {
        player.outputChatBox('!{FF0000}Match is already active!');
        return;
    }
    
    player.outputChatBox('!{00FF00}Starting match...');
    startMatch();
});

mp.events.addCommand('end', (player) => {
    if (!gameState.isAdmin(player)) {
        player.outputChatBox('!{FF0000}Admin only');
        return;
    }
    endMatch();
});

mp.events.addCommand('tp', (player, fullText, x, y, z) => {
    if (!gameState.isAdmin(player)) {
        player.outputChatBox('!{FF0000}Admin only');
        return;
    }

    if (!x || !y || !z) {
        player.outputChatBox('!{FFAA00}Usage: /tp <x> <y> <z>');
        return;
    }

    player.position = new mp.Vector3(parseFloat(x), parseFloat(y), parseFloat(z));
    player.outputChatBox(`!{00FF00}Teleported to: ${x}, ${y}, ${z}`);
});

mp.events.addCommand('pos', (player) => {
    const pos = player.position;
    player.outputChatBox(`!{00FFFF}Position: ${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}`);
    console.log(`[POS] ${player.name}: x: ${pos.x}, y: ${pos.y}, z: ${pos.z}`);
});

mp.events.addCommand('objectives', (player) => {
    if (!gameState.matchActive) {
        player.outputChatBox('!{FF0000}Match is not active! Use /start first');
        return;
    }
    
    player.outputChatBox('!{00FFFF}═══ OBJECTIVES ═══');
    gameState.objectives.forEach(obj => {
        const dist = player.position.subtract(new mp.Vector3(obj.position.x, obj.position.y, obj.position.z)).length();
        player.outputChatBox(`!{FFFF00}${obj.name}:`);
        player.outputChatBox(`  Distance: ${Math.round(dist)}m (radius: ${obj.radius}m)`);
        player.outputChatBox(`  Captured by: Team ${obj.capturedBy || 'None'}`);
        player.outputChatBox(`  Progress: ${Math.round(obj.captureProgress)}%`);
        player.outputChatBox(`  Players: T1=${obj.playersInRadius[1]} T2=${obj.playersInRadius[2]}`);
    });
});

function startMatch() {
    gameState.matchActive = true;
    gameState.matchStartTime = Date.now();
    gameState.teamScores = { 1: 0, 2: 0 };

    gameState.objectives = currentBattleZone.objectives.map((obj, index) => 
        new Objective(`OBJ_${index}`, obj.name, obj.x, obj.y, obj.z)
    );

    vehicleManager.spawnVehiclesForZone(currentBattleZone.id);

    mp.players.forEach(player => {
        player.call('showNotification', ['MATCH STARTED!', 'success']);
        player.call('startMatchTimer', [gameState.matchStartTime]);
        player.outputChatBox('!{00FF00}═══════════════════════════════');
        player.outputChatBox('!{00FF00}     MATCH STARTED!');
        player.outputChatBox('!{FFFF00}     Vehicles spawned!');
        player.outputChatBox('!{FFFF00}     Capture objectives!');
        player.outputChatBox('!{00FFFF}     /placefob - Deploy FOB (Squad Leaders)');
        player.outputChatBox('!{00FFFF}     /objectives - Check objectives');
        player.outputChatBox('!{00FF00}═══════════════════════════════');
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
                    p.outputChatBox(`!{00FF00}[CAPTURED] ${obj.name} by ${team.name}! +100 points`);
                });
                
                console.log(`[OBJECTIVE] ${obj.name} captured by Team ${teamId}`);
                broadcastHUDUpdate();
            }
        });
    });

    broadcastObjectivesUpdate();
    vehicleManager.update();
    fobManager.update();
}, 1000);

setInterval(() => {
    broadcastHUDUpdate();
}, 5000);

// ============================================================================
// SERVER READY
// ============================================================================

console.log('[UI] Web interface enabled');
console.log('[VISUAL] Combat objects system loaded');
console.log('[VEHICLES] 5 vehicle types ready');
console.log('[FOB] Forward Operating Base system ready');
console.log('[COMMANDS] /start - Begin match');
console.log('[COMMANDS] /placefob - Deploy FOB (Squad Leaders)');
console.log('[COMMANDS] /fobs - List team FOBs');
console.log('[COMMANDS] /resupply - Resupply at FOB');
console.log('[COMMANDS] /heal - Heal at FOB');
console.log('[BATTLE ZONE] Industrial Complex loaded');
console.log('========================================');
console.log('   BATTLE ARENA SERVER READY');
console.log('   🏗️ Vehicles, UI, FOB - All systems GO!');
console.log('========================================');
console.log('');

module.exports = gameState;
