# Development Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    BATTLE ARENA SERVER                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Game     │  │ Squad    │  │ Objective│  │ FOB      │   │
│  │ State    │  │ System   │  │ System   │  │ System   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│       ▲             ▲              ▲             ▲           │
│       └─────────────┴──────────────┴─────────────┘           │
│                        │                                      │
│                   ┌────┴────┐                                │
│                   │ Game     │                                │
│                   │ Loop     │                                │
│                   └────┬────┘                                │
│                        │                                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Statistics & Ranking System                   │   │
│  │  ┌─────────────────────────────────────────────────┐ │   │
│  │  │ Player Stats │ Team Stats │ Server Stats │ Export │ │   │
│  │  └─────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Command System                           │   │
│  │  ┌──────────────┬──────────────┬──────────────────┐  │   │
│  │  │ Player Cmds  │ Admin Cmds   │ Command Dispatch │  │   │
│  │  └──────────────┴──────────────┴──────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Mission & Game Modes                         │   │
│  │  ┌─────────────┬────────────┬──────────────────────┐ │   │
│  │  │ Mission     │ Game Mode  │ Mission Builder      │ │   │
│  │  │ Framework   │ System     │ (Game Master Tools) │ │   │
│  │  └─────────────┴────────────┴──────────────────────┘ │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
BATTLE_ARENA_SERVER/
├── conf.json                 # Server configuration
├── server.js                 # Main server (core game state)
├── README.md                 # Feature documentation
├── INSTALLATION.md           # Setup guide
├── DEVELOPMENT.md            # This file
└── src/
    ├── commands.js          # Command handler & dispatcher
    ├── fobs.js              # FOB system (building, health)
    ├── missions.js          # Mission framework & game modes
    ├── stats.js             # Statistics & ranking system
    ├── vehicles.js          # (TODO) Vehicle system
    ├── ai.js                # (TODO) AI bot system
    └── database.js          # (TODO) Persistence layer
```

## Core Modules Explained

### 1. **server.js** - Main Game Loop

The main server file handles:
- Game state management
- Player lifecycle (join/quit/death)
- Match management (start/end)
- Real-time objective updates
- Respawn queue processing

```javascript
// Example: Extending server.js
class CustomGameMode {
  constructor() {
    this.name = 'Custom Mode';
    this.enabled = false;
  }
  
  initialize(gameState) {
    // Set up custom game mode
    gameState.matchActive = true;
  }
}
```

### 2. **src/commands.js** - Command System

Handles all player and admin commands:
- User input parsing
- Permission checking
- Command execution
- Response formatting

```javascript
// Example: Adding custom command
commandHandler.register('custom', (player, args) => {
  player.outputChatBox('Custom command executed!');
});
```

### 3. **src/stats.js** - Statistics System

Tracks and manages:
- Individual player performance
- Team statistics
- Server-wide metrics
- Progression ranking

```javascript
// Example: Recording custom stat
const playerStats = statsManager.getOrCreatePlayerStats(playerId, name);
playerStats.experience += 500;
playerStats.updateRank();
```

### 4. **src/missions.js** - Mission Framework

Provides:
- Mission templates
- Game mode definitions
- Game Master mission builder
- Objective management

```javascript
// Example: Creating custom mission
const mission = new Mission('M_CUSTOM', 'My Mission', 'mymap', 
  'Custom mission description');
mission.addObjective({
  id: 'OBJ_1',
  name: 'First Objective',
  type: 'capture',
  position: { x: 100, y: 200, z: 50 }
});
```

### 5. **src/fobs.js** - FOB System

Manages:
- FOB construction
- Health/damage
- Supply management
- Suppression mechanics

```javascript
// Example: Creating FOB
const fob = fobManager.createFOB(teamId, position, squadLeader, config);
fob.build(numWorkers);
if (fob.buildProgress >= 100) {
  console.log('FOB fully constructed!');
}
```

## Extending the Server

### Adding New Roles

**1. Update conf.json:**
```json
"roles": {
  "new_role": {
    "slot_count": 2,
    "weapon": "custom_weapon",
    "abilities": ["ability1", "ability2"]
  }
}
```

**2. Update PlayerRole class in server.js:**
```javascript
useAbility(ability) {
  switch(ability) {
    case 'new_ability':
      return this.newAbility();
  }
}

newAbility() {
  // Implementation
  return true;
}
```

### Adding New Objectives

**In missions.js:**
```javascript
const objectiveConfig = {
  id: 'OBJ_CUSTOM',
  name: 'Custom Objective',
  type: 'special', // capture, defend, special, etc
  position: { x: 100, y: 200, z: 50 },
  radius: 150,
  requirements: {
    minPlayers: 3,
    teamOnly: true
  }
};

mission.addObjective(objectiveConfig);
```

### Creating Custom Game Modes

```javascript
// In missions.js
function createCustomGameMode() {
  const mode = new GameMode('Custom', 'Custom game mode description');
  
  const mission = new Mission(
    'M_CUSTOM_1',
    'Custom Scenario 1',
    'everon',
    'Description'
  );
  
  mission.rules = {
    friendlyFire: true,
    respawnAvailable: true,
    timeLimit: 1800 // 30 minutes
  };
  
  mode.addMission(mission);
  return mode;
}
```

### Custom Command Implementation

```javascript
// In src/commands.js
this.register('custom', (player, args) => {
  // Validate arguments
  if (!args[0]) {
    player.outputChatBox('!{FF0000}Missing argument');
    return;
  }
  
  // Get player data
  const playerData = this.gameState.players.get(player.id);
  if (!playerData) {
    player.outputChatBox('!{FF0000}You must join a team first');
    return;
  }
  
  // Execute command logic
  const result = doSomething(args[0]);
  
  // Provide feedback
  player.outputChatBox(`!{00FF00}${result}`);
});
```

## Event System

RAGE MP events handled:

```javascript
mp.events.add('playerJoin', (player) => {
  console.log(`${player.name} joined`);
  // Your code
});

mp.events.add('playerQuit', (player, reason) => {
  console.log(`${player.name} quit: ${reason}`);
  // Your code
});

mp.events.add('playerDeath', (player, reason) => {
  console.log(`${player.name} died to ${reason}`);
  // Your code
});

mp.events.addCommand('custom', (player, args) => {
  // Handle /custom command
});
```

## Database Integration (TODO)

Planned persistence layer:

```javascript
// Future implementation structure
class Database {
  constructor() {
    this.playerProfiles = new Map();
    this.matchHistory = [];
    this.teamRecords = new Map();
  }
  
  savePlayerProfile(playerId, profile) {
    // Save to persistent storage
  }
  
  loadPlayerProfile(playerId) {
    // Load from persistent storage
  }
  
  recordMatch(matchData) {
    // Store match result
  }
}
```

## Performance Optimization Tips

### 1. Optimize Game Loop

```javascript
// Bad: Heavy operations every tick
setInterval(() => {
  mp.players.forEach(player => {
    // Expensive calculation
  });
}, 100);

// Good: Batch operations, reduce frequency
setInterval(() => {
  const activePlayers = Array.from(mp.players.values())
    .filter(p => p.inMatch);
  
  // Process only active players
  processPlayers(activePlayers);
}, 1000);
```

### 2. Memory Management

```javascript
// Clean up old data
setInterval(() => {
  // Remove completed matches from memory
  gameState.matchHistory = gameState.matchHistory
    .filter(m => m.timestamp > Date.now() - 86400000); // 24h
}, 3600000); // Every hour
```

### 3. Network Bandwidth

```javascript
// Reduce frequency of updates
// Use delta encoding instead of full state
// Only send changes to nearby players
```

## Testing

### Unit Test Example

```javascript
const assert = require('assert');
const { Squad } = require('./server');

describe('Squad System', () => {
  it('should create squad with leader', () => {
    const leader = { id: 1, name: 'Leader' };
    const squad = new Squad(1, 1, leader);
    
    assert.equal(squad.leader.id, 1);
    assert.equal(squad.members.length, 1);
  });
  
  it('should add members up to max size', () => {
    // Test implementation
  });
});
```

## Debugging

### Enable Debug Logging

```javascript
// In server.js
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) {
  console.log('[DEBUG]', message);
}
```

### Use Node Debugger

```bash
node --inspect server.js
# Then open chrome://inspect in Chrome
```

## Best Practices

1. **Modular Design**: Keep systems independent and loosely coupled
2. **Configuration**: Use conf.json for all tuneable parameters
3. **Error Handling**: Always validate input and handle edge cases
4. **Performance**: Profile before optimizing; avoid premature optimization
5. **Documentation**: Comment complex logic; document public APIs
6. **Testing**: Write tests for critical systems
7. **Security**: Validate all player input; sanitize data
8. **Maintainability**: Use consistent naming; keep functions small

## Contributing

To contribute:

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes with clear commit messages
4. Test thoroughly
5. Push to branch: `git push origin feature/amazing-feature`
6. Open Pull Request

## Resources

- [RAGE MP Documentation](https://rage.mp)
- [Node.js Official Docs](https://nodejs.org/docs/)
- [JavaScript Best Practices](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)

---

**Last Updated**: January 4, 2026
**Version**: 1.0.0
