// ============================================================================
// BATTLE ARENA SERVER - Tactical Squad Warfare for RAGE MP
// Inspired by Squad and Arma Reforger
// ============================================================================

const mp = require('RAGE');
const fs = require('fs');

// Load configuration
const config = JSON.parse(fs.readFileSync('conf.json', 'utf8'));

// ============================================================================
// GAME STATE MANAGEMENT
// ============================================================================

class GameState {
  constructor() {
    this.teams = {};
    this.squads = new Map();
    this.players = new Map();
    this.objectives = [];
    this.fobs = new Map(); // Forward Operating Bases
    this.currentMap = config.maps[0];
    this.matchActive = false;
    this.matchStartTime = 0;
    this.teamScores = { 1: 0, 2: 0 };
    this.respawnQueues = { 1: [], 2: [] };
    
    // Initialize teams
    config.battle.max_teams = 2;
    for (let i = 1; i <= config.battle.max_teams; i++) {
      this.teams[i] = {
        id: i,
        name: config.factions[i - 1].name,
        faction: config.factions[i - 1],
        players: [],
        score: 0,
        kills: 0,
        deaths: 0,
        captures: 0,
        squads: []
      };
    }
  }

  getTeam(teamId) {
    return this.teams[teamId];
  }

  addPlayer(player, teamId) {
    const team = this.getTeam(teamId);
    team.players.push(player);
    this.players.set(player.id, { team: teamId, role: null, squad: null });
  }

  removePlayer(playerId) {
    const playerData = this.players.get(playerId);
    if (playerData) {
      const team = this.getTeam(playerData.team);
      team.players = team.players.filter(p => p.id !== playerId);
      this.players.delete(playerId);
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
    this.waypoints = [];
    this.objective = null;
    this.morale = 100;
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
    this.broadcastToSquad(`Rally point set at: X:${x.toFixed(0)}, Y:${y.toFixed(0)}, Z:${z.toFixed(0)}`);
  }

  broadcastToSquad(message) {
    this.members.forEach(member => {
      if (mp.players.has(member.id)) {
        const player = mp.players.get(member.id);
        player.outputChatBox(`[${this.squadNumber}] ${message}`);
      }
    });
  }
}

// ============================================================================
// PLAYER ROLE SYSTEM
// ============================================================================

class PlayerRole {
  constructor(player, roleName) {
    this.player = player;
    this.roleName = roleName;
    this.roleConfig = config.roles[roleName];
    this.ammunition = 1000;
    this.medkits = roleName === 'medic' ? 10 : 0;
    this.grenades = 3;
    this.abilities = this.roleConfig.abilities || [];
    this.killCount = 0;
  }

  giveEquipment() {
    // Equip player with role-specific items
    // In a full implementation, this would give actual weapons/items
    console.log(`${this.player.name} assigned as ${this.roleName}`);
  }

  useAbility(ability) {
    if (!this.abilities.includes(ability)) return false;
    
    switch(ability) {
      case 'heal':
        return this.heal();
      case 'revive':
        return this.revive();
      case 'ammo_bag':
        return this.dropAmmoBag();
      case 'rally_point':
        return this.createRallyPoint();
      default:
        return false;
    }
  }

  heal() {
    if (this.medkits > 0) {
      this.medkits--;
      return true;
    }
    return false;
  }

  revive() {
    if (this.medkits > 0) {
      this.medkits--;
      return true;
    }
    return false;
  }

  dropAmmoBag() {
    if (this.ammunition > 200) {
      this.ammunition -= 200;
      return true;
    }
    return false;
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
    this.lastCaptureTime = 0;
  }

  updateCapture(teamId) {
    if (this.capturedBy === teamId) {
      return; // Already captured
    }

    const playersNearby = this.playersInRadius[teamId] || 0;
    if (playersNearby > 0) {
      this.captureProgress += playersNearby;
      if (this.captureProgress >= config.battle.objective_capture_time * playersNearby) {
        this.capturedBy = teamId;
        this.lastCaptureTime = Date.now();
        return true; // Captured!
      }
    }
    return false;
  }
}

// ============================================================================
// MATCH MANAGEMENT
// ============================================================================

function startMatch() {
  gameState.matchActive = true;
  gameState.matchStartTime = Date.now();
  gameState.teamScores = { 1: 0, 2: 0 };

  // Initialize objectives
  gameState.objectives = [
    new Objective('OBJ_A', 'Alpha Objective', 100, 200, 0),
    new Objective('OBJ_B', 'Bravo Objective', 300, 400, 0),
    new Objective('OBJ_C', 'Charlie Objective', 500, 600, 0)
  ];

  // Broadcast match start
  mp.players.forEach((player) => {
    player.outputChatBox('!{00FF00}[BATTLE ARENA] Match Started! Proceed to objectives.');
  });

  console.log(`[BATTLE ARENA] Match started on map: ${gameState.currentMap}`);
}

function endMatch() {
  gameState.matchActive = false;
  const matchDuration = Math.floor((Date.now() - gameState.matchStartTime) / 1000);
  
  const winner = gameState.teamScores[1] > gameState.teamScores[2] ? 1 : 2;
  const team = gameState.getTeam(winner);
  
  mp.players.forEach((player) => {
    player.outputChatBox(`!{FF0000}[BATTLE ARENA] Match ended! Winner: ${team.name}`);
    player.outputChatBox(`!{FFFF00}Duration: ${matchDuration}s | Team 1: ${gameState.teamScores[1]} | Team 2: ${gameState.teamScores[2]}`);
  });

  console.log(`[BATTLE ARENA] Match ended. Winner: ${team.name}`);
}

function createSquadsForTeam(teamId) {
  const team = gameState.getTeam(teamId);
  if (team.players.length === 0) return;

  for (let i = 0; i < config.battle.squad_count_per_team; i++) {
    const leaderIndex = i;
    if (leaderIndex < team.players.length) {
      const squad = new Squad(i + 1, teamId, team.players[leaderIndex]);
      gameState.squads.set(squad.id, squad);
      team.squads.push(squad);
      team.players[leaderIndex].outputChatBox(`!{00FF00}You are Squad Leader of Squad ${i + 1}`);
    }
  }
}

// ============================================================================
// PLAYER COMMANDS
// ============================================================================

mp.events.addCommand('squad', (player, args) => {
  const subcommand = args[0];
  const playerData = gameState.players.get(player.id);
  
  if (!playerData) {
    player.outputChatBox('!{FF0000}You are not in a squad');
    return;
  }

  if (subcommand === 'info') {
    const squad = gameState.squads.get(playerData.squad);
    if (squad) {
      player.outputChatBox(`!{00FF00}Squad ${squad.squadNumber} | Leader: ${squad.leader.name} | Members: ${squad.members.length}/${squad.maxSize}`);
    }
  } else if (subcommand === 'rally' && player.id === squad?.leader?.id) {
    // Squad Leader sets rally point
    const pos = player.position;
    squad.setRallyPoint(pos.x, pos.y, pos.z);
  }
});

mp.events.addCommand('team', (player, args) => {
  const teamId = parseInt(args[0]);
  if (teamId < 1 || teamId > config.battle.max_teams) {
    player.outputChatBox(`!{FF0000}Invalid team. Choose 1-${config.battle.max_teams}`);
    return;
  }

  // Remove from old team
  if (gameState.players.has(player.id)) {
    gameState.removePlayer(player.id);
  }

  // Add to new team
  gameState.addPlayer(player, teamId);
  const team = gameState.getTeam(teamId);
  player.outputChatBox(`!{00FF00}Joined team: ${team.name}`);
});

mp.events.addCommand('role', (player, args) => {
  const roleName = args[0];
  if (!config.roles[roleName]) {
    player.outputChatBox('!{FF0000}Invalid role');
    return;
  }

  const playerRole = new PlayerRole(player, roleName);
  playerRole.giveEquipment();
  gameState.players.get(player.id).role = roleName;
  player.outputChatBox(`!{00FF00}Role set to: ${roleName}`);
});

mp.events.addCommand('start', (player, args) => {
  if (!player.admin) return;
  startMatch();
});

mp.events.addCommand('end', (player, args) => {
  if (!player.admin) return;
  endMatch();
});

// ============================================================================
// PLAYER EVENTS
// ============================================================================

mp.events.add('playerJoin', (player) => {
  console.log(`[PLAYER JOIN] ${player.name} (ID: ${player.id})`);
  player.outputChatBox('!{00FF00}Welcome to BATTLE ARENA!');
  player.outputChatBox('!{FFFF00}Use /team <1|2> to join a team');
  player.outputChatBox('!{FFFF00}Use /role <role_name> to select your role');
  player.outputChatBox('!{FFFF00}Use /squad info to see your squad status');
});

mp.events.add('playerQuit', (player, reason) => {
  console.log(`[PLAYER QUIT] ${player.name} (Reason: ${reason})`);
  gameState.removePlayer(player.id);
});

mp.events.add('playerDeath', (player, reason) => {
  const playerData = gameState.players.get(player.id);
  if (playerData) {
    const team = gameState.getTeam(playerData.team);
    team.deaths++;
    
    // Queue for respawn
    const respawnTime = config.battle.respawn_time * 1000;
    gameState.respawnQueues[playerData.team].push(player);
    
    player.outputChatBox(`!{FFFF00}You will respawn in ${config.battle.respawn_time} seconds`);
    
    setTimeout(() => {
      if (mp.players.has(player.id) && gameState.matchActive) {
        player.position = new mp.Vector3(100, 100, 50); // Base spawn
        player.health = 100;
      }
    }, respawnTime);
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
      if (!playerData) return;
      
      const dist = mp.math.distance(player.position, new mp.Vector3(obj.position.x, obj.position.y, obj.position.z));
      if (dist < obj.radius) {
        obj.playersInRadius[playerData.team]++;
      }
    });

    if (obj.updateCapture(1) || obj.updateCapture(2)) {
      const team = gameState.getTeam(obj.capturedBy);
      gameState.teamScores[obj.capturedBy] += 100;
      
      mp.players.forEach(player => {
        player.outputChatBox(`!{FF0000}[OBJECTIVE] ${obj.name} captured by ${team.name}!`);
      });
    }
  });

  // Check match end condition (time or score)
  const matchDuration = Date.now() - gameState.matchStartTime;
  if (matchDuration >= config.battle.match_duration * 1000) {
    endMatch();
  }
}, 1000);

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

console.log('\n========================================');
console.log('   BATTLE ARENA SERVER STARTING');
console.log('========================================');
console.log(`Server Name: ${config.name}`);
console.log(`Max Players: ${config.maxplayers}`);
console.log(`Game Mode: ${config.gamemode}`);
console.log(`Port: ${config.port}`);
console.log(`Language: ${config.language}`);
console.log(`========================================\n`);

module.exports = gameState;
