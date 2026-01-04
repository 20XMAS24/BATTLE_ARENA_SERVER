# Examples & Use Cases

This document provides practical examples of how to use and extend the Battle Arena Server.

## Player Scenarios

### Scenario 1: New Player Joining and Getting Started

```javascript
// Player joins server
// Output: "Welcome to BATTLE ARENA!"
// Output: "Use /team <1|2> to join a team"

// Player inputs: /team 1
// Output: "Joined: Task Force Phantom"

// Player inputs: /role rifleman
// Output: "Role set to: rifleman"

// Player inputs: /squad info
// Output: "Squad 1 | Leader: CommanderName | Members: 3/9 | Morale: 100%"

// Player inputs: /objectives
// Output: "Alpha Objective - Team 1"
// Output: "Bravo Objective - Neutral"
// Output: "Charlie Objective - Team 2"
```

### Scenario 2: Squad Leader Coordinating Attack

```javascript
// Squad Leader inputs: /squad rally
// Output: "Rally point set!"
// Squad members in chat: "[1] Rally point set at: X:150, Y:250, Z:10"

// Squad leader communicates strategy via /squad radio
// All squad members see: "[1] [SquadLeaderName]: Moving to Objective B"

// After 5 minutes of combat:
// System output: "Team 1 captured Bravo Objective!"
// Server broadcast: "[OBJECTIVE] Bravo Objective captured by Task Force Phantom!"
// Points awarded: Team 1 +100 points
```

### Scenario 3: Medic Saving Wounded Soldier

```javascript
// Player health drops below 50
// Nearby medic sees player marker
// Medic uses ability: /heal teammate
// Output: "Healed 2 soldiers" (if in team)
// Medic stats updated: heals +1, experience +10
// Wounded player: health restored
```

### Scenario 4: Checking Personal Stats

```javascript
// After 30 minutes of gameplay
// Player inputs: /stats
// Output:
// "=== YOUR STATS ==="
// "Rank: Specialist"
// "Experience: 2850"
// "Kills: 12 | Deaths: 5 | KD Ratio: 2.4"
// "Assists: 8 | Headshots: 3"
// "Objectives: 4 | Score: 1650"
```

---

## Admin Scenarios

### Scenario 1: Starting a Match

```javascript
// Admin inputs: /start
// System initializes match
// Match duration timer starts: 3600 seconds (1 hour)
// All players see: "[BATTLE ARENA] Match Started! Proceed to objectives."

// Objectives become active
// Player respawns enabled
// FOB building becomes available
// Statistics tracking begins
```

### Scenario 2: Managing Problematic Player

```javascript
// Admin observes player griefing
// Admin inputs: /kick 12345 Griefing
// Player 12345 (playername) is disconnected
// Server log: "[ADMIN] Player removed: Player Name (reason: Griefing)"
// Remaining players see: "Player Name has been kicked"

// For repeated offenders:
// Admin inputs: /ban 12345 Repeated griefing
// Player account banned from server
// IP added to ban list
```

### Scenario 3: Changing Game Mode Mid-Match

```javascript
// Current match ending
// Admin inputs: /mode escape
// System loads Escape game mode
// New mission initializes
// Teams assigned: Team 1 = Attackers, Team 2 = Defenders
// All players: "[ADMIN] Game mode changed to escape"

// Match starts with new objectives
// Team 1 must reach extraction point
// Team 2 must defend and prevent escape
```

### Scenario 4: Server Statistics Export

```javascript
// Admin inputs: /stats
// System exports current statistics
// Console output:
// {
//   "totalMatches": 45,
//   "totalPlayers": 2100,
//   "topPlayers": [
//     { "name": "ProPlayer1", "score": 50000, "kills": 1200 },
//     { "name": "ProPlayer2", "score": 48500, "kills": 1150 }
//   ],
//   "serverUptime": "7d 12h 30m"
// }
```

---

## Developer Examples

### Example 1: Creating a Custom Role

```javascript
// In conf.json
{
  "roles": {
    "drone_operator": {
      "slot_count": 2,
      "weapon": "pistol",
      "abilities": ["deploy_drone", "thermal_vision"]
    }
  }
}

// In server.js - extend PlayerRole class
class PlayerRole {
  // ... existing code ...
  
  useAbility(ability) {
    switch(ability) {
      case 'deploy_drone':
        return this.deployDrone();
      case 'thermal_vision':
        return this.activateThermalVision();
      // ... existing cases ...
    }
  }
  
  deployDrone() {
    if (this.ammunition > 100) {
      this.ammunition -= 100;
      console.log(`${this.player.name} deployed drone`);
      return true;
    }
    return false;
  }
}
```

### Example 2: Custom Mission Creation

```javascript
// In src/missions.js
function createCustomMission() {
  const mission = new Mission(
    'M_CUSTOM_SCENARIO',
    'Special Forces Extraction',
    'everon',
    'Team 1 must extract documents, Team 2 must stop them'
  );
  
  // Add objectives
  mission.addObjective({
    id: 'COMPOUND',
    name: 'Enemy Compound',
    type: 'capture',
    position: { x: 0, y: 0, z: 0 },
    points: 200
  });
  
  mission.addObjective({
    id: 'EXTRACT',
    name: 'Extraction LZ',
    type: 'reach',
    position: { x: 1000, y: 1000, z: 0 },
    points: 500
  });
  
  // Set custom rules
  mission.rules = {
    friendlyFire: false,
    respawnAvailable: false,
    timeLimit: 2400, // 40 minutes
    allowVehicles: true
  };
  
  return mission;
}
```

### Example 3: Extending the Stats System

```javascript
// In src/stats.js - add new stat type
class PlayerStats {
  constructor(playerId, playerName) {
    // ... existing properties ...
    this.vehicleKills = 0;
    this.fobsDestroyed = 0;
    this.flagCaptures = 0;
    this.ralliesMade = 0;
  }
  
  recordVehicleKill() {
    this.vehicleKills++;
    this.experience += 100;
  }
  
  recordFobDestroyed() {
    this.fobsDestroyed++;
    this.experience += 150;
  }
}

// In server.js - use new stats
if (killedObjectIsVehicle) {
  playerStats.recordVehicleKill();
  gameState.teamScores[teamId] += 50;
}
```

### Example 4: Custom Command Handler

```javascript
// In src/commands.js
class CommandHandler {
  // ... existing code ...
  
  register('request_airstrike', (player, args) => {
    const playerData = gameState.players.get(player.id);
    
    // Check if squad leader
    const squad = gameState.squads.get(playerData.squad);
    if (squad.leader.id !== player.id) {
      player.outputChatBox('!{FF0000}Only squad leaders can call airstrikes');
      return;
    }
    
    // Check cooldown
    if (squad.lastAirstrike && Date.now() - squad.lastAirstrike < 300000) {
      player.outputChatBox('!{FF0000}Airstrike on cooldown (5 minutes)');
      return;
    }
    
    // Call airstrike
    const position = player.position;
    squad.broadcastToSquad('Airstrike incoming in 30 seconds!');
    squad.lastAirstrike = Date.now();
    
    // Simulate airstrike
    setTimeout(() => {
      mp.players.forEach(p => {
        const dist = mp.math.distance(p.position, position);
        if (dist < 500) {
          p.health -= Math.random() * 100;
        }
      });
    }, 30000);
  });
}
```

### Example 5: FOB Management

```javascript
// In src/fobs.js
const fobManager = new FOBManager();

// Create FOB
const fob = fobManager.createFOB(
  teamId,
  { x: 100, y: 100, z: 50 },
  squadLeader,
  configOptions
);

// Manage FOB lifecycle
setInterval(() => {
  fobManager.fobs.forEach(fob => {
    // Track nearby defenders
    let defenders = 0;
    mp.players.forEach(p => {
      const data = gameState.players.get(p.id);
      if (data?.team === fob.teamId) {
        const dist = mp.math.distance(p.position, fob.position);
        if (dist < fob.radius) defenders++;
      }
    });
    fob.defendersNearby = defenders;
    
    // Reduce suppression if defenders present
    if (defenders > 2) {
      fob.reduceSuppression();
    }
    
    // Grant supplies to nearby team members
    if (fob.storageActive && defenders > 0) {
      mp.players.forEach(p => {
        const data = gameState.players.get(p.id);
        if (data?.team === fob.teamId) {
          const dist = mp.math.distance(p.position, fob.position);
          if (dist < 100) {
            // Restore ammo, heal, etc.
            data.supplies = Math.min(data.supplies + 5, 300);
          }
        }
      });
    }
  });
}, 5000); // Check every 5 seconds
```

---

## Configuration Examples

### Example 1: Hardcore Settings

```json
{
  "name": "🎯 HARDCORE ARENA | No Respawn",
  "battle": {
    "respawn_time": 60,
    "friendly_fire": true,
    "match_duration": 1800,
    "objective_capture_time": 30
  },
  "roles": {
    "squad_leader": { "slot_count": 1, "weapon": "ar", "abilities": [] }
  }
}
```

### Example 2: Training Mode

```json
{
  "name": "💫 TRAINING ARENA | Practice Mode",
  "maxplayers": 50,
  "battle": {
    "respawn_time": 5,
    "friendly_fire": false,
    "match_duration": 7200,
    "objective_capture_time": 15
  },
  "voice-chat": true
}
```

### Example 3: Competitive Settings

```json
{
  "name": "🎆 COMPETITIVE | 50v50",
  "battle": {
    "respawn_time": 20,
    "friendly_fire": true,
    "match_duration": 2400,
    "objective_capture_time": 60
  },
  "maps": ["everon", "skorpo"],
  "announce": true,
  "language": "ru"
}
```

---

## Advanced Scenarios

### Scenario: Dynamic Difficulty System

```javascript
// Automatically adjust difficulty based on team balance
setInterval(() => {
  const team1Size = gameState.teams[1].players.length;
  const team2Size = gameState.teams[2].players.length;
  const diff = Math.abs(team1Size - team2Size);
  
  if (diff > 5) {
    // Teams unbalanced
    const smallerTeam = team1Size < team2Size ? 1 : 2;
    const largerTeam = smallerTeam === 1 ? 2 : 1;
    
    // Boost smaller team
    gameState.teamScores[smallerTeam] += 10;
    
    mp.players.forEach(p => {
      p.outputChatBox('!{FFFF00}[SYSTEM] Teams unbalanced - smaller team boosted');
    });
  }
}, 30000); // Every 30 seconds
```

### Scenario: Match Auto-Balancing

```javascript
// Auto balance teams if one becomes too strong
setInterval(() => {
  const scoreDiff = Math.abs(gameState.teamScores[1] - gameState.teamScores[2]);
  const maxDiff = 500; // Max score difference allowed
  
  if (scoreDiff > maxDiff) {
    // Calculate handicap
    const winningTeam = gameState.teamScores[1] > gameState.teamScores[2] ? 1 : 2;
    const handicap = Math.floor(scoreDiff / 100);
    
    // Apply handicap to winning team
    // (reduce capture points, increase objective requirements, etc)
    
    mp.players.forEach(p => {
      p.outputChatBox(`!{FFFF00}[SYSTEM] Handicap applied to Team ${winningTeam}`);
    });
  }
}, 60000); // Every minute
```

---

## Testing Examples

### Unit Test: Squad Addition

```javascript
const Squad = require('./server').Squad;
const assert = require('assert');

describe('Squad System', () => {
  it('should add member to squad', () => {
    const leader = { id: 1, name: 'Leader' };
    const squad = new Squad(1, 1, leader);
    
    const newMember = { id: 2, name: 'Member' };
    const result = squad.addMember(newMember);
    
    assert.strictEqual(result, true);
    assert.strictEqual(squad.members.length, 2);
  });
  
  it('should not add member beyond max size', () => {
    const leader = { id: 1, name: 'Leader' };
    const squad = new Squad(1, 1, leader);
    
    // Add 8 more members (max 9)
    for (let i = 2; i <= 9; i++) {
      squad.addMember({ id: i, name: `Member${i}` });
    }
    
    // Try to add 10th member
    const result = squad.addMember({ id: 10, name: 'Member10' });
    assert.strictEqual(result, false);
    assert.strictEqual(squad.members.length, 9);
  });
});
```

---

**Last Updated**: January 4, 2026
**Version**: 1.0.0
