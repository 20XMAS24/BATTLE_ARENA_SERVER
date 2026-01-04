# ⚔️ BATTLE ARENA SERVER

**Squad & Arma Reforger Inspired Tactical Multiplayer Server for RAGE MP**

![Status](https://img.shields.io/badge/status-active-brightgreen)
![Language](https://img.shields.io/badge/language-JavaScript-yellow)
![Platform](https://img.shields.io/badge/platform-RAGE%20MP-red)
![Version](https://img.shields.io/badge/version-1.0.0-blue)

---

## 📋 Overview

BATTLE ARENA SERVER is a comprehensive tactical multiplayer game server built for RAGE MP that combines the best features from:

- **Squad**: 50v50 team warfare, squad-based gameplay, role systems, FOB mechanics
- **Arma Reforger**: Mission framework, Game Master tools, modular scenarios, dynamic zones

The server features **100-player support**, **structured team gameplay**, **persistence**, and **advanced game mechanics**.

---

## 🎮 Core Features

### Team-Based Warfare
- **50 vs 50 Team Structure**: Organized teams with balanced team sizes
- **Squad System**: 6 squads per team (9 players each)
- **Squad Leaders**: Command-level control with rally points and waypoints
- **Respawn Management**: Tactical respawn system with FOB/rally point dependencies

### Role-Based Gameplay
- **7 Specialized Roles**:
  - 🎖️ **Squad Leader** - Command, rally points, tactical calls
  - 🔫 **Rifleman** - Frontline combat, ammo support
  - 🏥 **Medic** - Healing, revives, squad sustainability
  - 🔧 **Engineer** - FOB building, repairs, assets
  - 🎯 **Marksman** - Long-range support, reconnaissance
  - 🔥 **MG Gunner** - Suppression fire, area denial
  - 💣 **AT Gunner** - Anti-armor, heavy firepower

### Objective System
- **Dynamic Objectives**: Capture and defend points
- **Objective Progression**: Real-time capture mechanics
- **Point Allocation**: Different objectives worth different points
- **Persistent State**: Objectives maintain state across matches

### Forward Operating Bases (FOBs)
- **Strategic Building**: Squads construct FOBs for respawn points
- **Supply Management**: Limited supplies for building/support
- **Suppression Mechanics**: Enemy pressure affects FOB functionality
- **Health & Destruction**: FOBs can be damaged and destroyed

### Game Modes
1. **Conflict Mode** - Classic 50v50 objective control
2. **Escape Mode** - One team defends, one team escapes
3. **Survival Mode** - Last team standing in shrinking zone
4. **Custom Scenarios** - Game Master tools for custom missions

### Statistics & Progression
- **Player Rankings**: Score-based leaderboards
- **Progression System**: 7-tier rank system (Recruit → Commando)
- **Performance Metrics**:
  - Kills, Deaths, Assists
  - Headshots, Accuracy
  - Revives, Heals, Supplies
  - Objective Captures
  - Vehicle Kills
- **Team Statistics**: Win rates, team scores, match history

---

## 🚀 Installation & Setup

### Prerequisites
- RAGE MP Server environment
- Node.js runtime (for JavaScript support)
- 2GB+ RAM recommended
- Stable internet connection

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/20XMAS24/BATTLE_ARENA_SERVER.git
cd BATTLE_ARENA_SERVER

# 2. Copy configuration
cp conf.json ragemp-server-directory/

# 3. Copy server files
cp server.js ragemp-server-directory/src_server/
cp -r src/ ragemp-server-directory/src_server/

# 4. Start RAGE MP server
cd ragemp-server-directory/
./ragemp-server.exe
```

### Configuration

Edit `conf.json` to customize:

```json
{
  "maxplayers": 100,
  "name": "🎮 BATTLE ARENA | Your Server Name",
  "port": 22005,
  "battle": {
    "max_teams": 2,
    "team_size": 50,
    "players_per_squad": 9,
    "respawn_time": 15,
    "match_duration": 3600
  }
}
```

---

## 📖 Usage Guide

### Player Commands

**Team Management**
```
/team <1|2>          - Join specified team
/squad info          - View squad information
/squad rally         - Set rally point (Squad Leader only)
```

**Role Selection**
```
/role <role_name>    - Select your role
```

Available roles:
- `squad_leader` - Leadership and command
- `rifleman` - General combat
- `medic` - Medical support
- `engineer` - Building and repairs
- `marksman` - Precision combat
- `mg_gunner` - Suppression
- `at_gunner` - Anti-armor

**Admin Commands**
```
/start               - Start match (Admin only)
/end                 - End match (Admin only)
```

### Game Loop

1. **Pre-Match**: Players join teams and select roles
2. **Squad Formation**: Automatic squad creation from joined players
3. **Match Start**: Objectives appear, respawn mechanics activate
4. **Mid-Match**: 
   - Objective captures award points
   - Squad leaders manage rally points
   - Engineers build FOBs
   - Medics revive fallen soldiers
5. **Match End**: Statistics calculated, winner announced

---

## 📂 Project Structure

```
BATTLE_ARENA_SERVER/
├── conf.json                 # Server configuration
├── server.js                 # Main server implementation
├── README.md                 # This file
├── src/
│   ├── fobs.js              # Forward Operating Base system
│   ├── missions.js          # Mission & game mode framework
│   ├── stats.js             # Statistics & ranking system
│   └── [additional modules] # Extended features
├── packages/                # Client resource packages
├── database/                # Persistent data storage
└── settings/                # Server settings & configs
```

---

## 🔧 Development

### Adding Custom Game Modes

```javascript
// In missions.js
const missionBuilder = new MissionBuilder();
const customMission = missionBuilder.createCustomMission({
  name: 'Custom Scenario',
  map: 'everon',
  description: 'Your custom mission',
  objectives: [
    { id: 'OBJ_1', name: 'Objective 1', type: 'capture', position: {...} }
  ],
  rules: {
    friendlyFire: false,
    respawnAvailable: true
  }
});
```

### Extending Player Roles

```javascript
// In conf.json - add to roles object
"sniper": {
  "slot_count": 1,
  "weapon": "bolt_rifle",
  "abilities": ["ghillie_suit", "long_range_call"]
}
```

### Custom Statistics

```javascript
const statsManager = new StatsManager();
const playerStats = statsManager.getOrCreatePlayerStats(playerId, playerName);
playerStats.recordKill(distance, isHeadshot);
playerStats.recordObjective();
```

---

## 🎯 Roadmap

- [ ] Vehicle system integration
- [ ] Commander mode with map control
- [ ] Dynamic zone contraction system
- [ ] Advanced AI support
- [ ] Web dashboard for server management
- [ ] Discord bot integration
- [ ] Advanced loadout system
- [ ] Persistent player progression
- [ ] Clan/Organization system
- [ ] Anti-cheat integration

---

## ⚙️ Server Performance

**Recommended Specs**
- CPU: Intel i5/i7 or equivalent
- RAM: 4GB+ (2GB minimum)
- Network: 100Mbps+ connection
- Storage: 5GB SSD

**Performance Tips**
- Monitor player count and adjust matches accordingly
- Use objective radius tuning for better performance
- Enable statistics export for periodic backups
- Regular server restarts recommended (24-48h interval)

---

## 📊 Configuration Reference

### Battle Settings
| Setting | Default | Description |
|---------|---------|-------------|
| `max_teams` | 2 | Number of competing teams |
| `team_size` | 50 | Players per team |
| `players_per_squad` | 9 | Squad member capacity |
| `squad_count_per_team` | 6 | Squads per team |
| `respawn_time` | 15 | Seconds before respawn |
| `match_duration` | 3600 | Match length in seconds |
| `objective_capture_time` | 45 | Seconds to capture objective |

### Role Configuration
Each role has:
- `slot_count` - Number of available slots
- `weapon` - Primary weapon type
- `abilities` - Special abilities list

---

## 🐛 Troubleshooting

**Issue**: Server won't start
- Check `conf.json` syntax
- Verify RAGE MP environment
- Check port availability (default 22005)

**Issue**: Players can't join
- Verify team slots available
- Check `maxplayers` setting
- Review server logs for connection errors

**Issue**: Match won't end
- Check match duration setting
- Verify admin commands working
- Review game loop logs

---

## 📝 License

MIT License - Free for personal and commercial use

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📞 Support & Contact

- **Issues**: Report bugs via GitHub Issues
- **Discord**: [Join our community](#)
- **Email**: Support contact

---

## 🙏 Credits

- Inspired by **Squad** (Offworld Industries)
- Inspired by **Arma Reforger** (Bohemia Interactive)
- Built for **RAGE MP** platform

---

**Last Updated**: January 4, 2026
**Version**: 1.0.0
**Status**: Production Ready ✅
