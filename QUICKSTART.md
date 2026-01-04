# 🚀 Quick Start Guide

Get your Battle Arena Server running in **5 minutes**!

---

## Prerequisites

- RAGE MP Server installed
- Node.js 14+ installed
- 2GB RAM available
- Port 22005 available

---

## Installation

### 1. Clone Repository

```bash
git clone https://github.com/20XMAS24/BATTLE_ARENA_SERVER.git
cd BATTLE_ARENA_SERVER
```

### 2. Copy to RAGE Server

**Windows:**
```batch
copy conf.json C:\RageMP\Server\
xcopy src C:\RageMP\Server\src /E /Y
xcopy server.js C:\RageMP\Server\src_server\
```

**Linux/Mac:**
```bash
cp conf.json /path/to/ragemp/server/
cp -r src /path/to/ragemp/server/
cp server.js /path/to/ragemp/server/src_server/
```

### 3. Start Server

**Windows:**
```batch
cd C:\RageMP\Server
ragemp-server.exe
```

**Linux/Mac:**
```bash
cd /path/to/ragemp/server
./ragemp-server
```

**Expected Output:**
```
========================================
   BATTLE ARENA SERVER STARTING
========================================
Server Name: 🎮 BATTLE ARENA | Tactical Squad Warfare
Max Players: 100
Game Mode: tactical-squad-warfare
Port: 22005
Language: ru
========================================
```

✅ **Server is running!**

---

## First Commands

### Connect as Admin

1. Connect to your server
2. Get admin level (configure in RAGE MP settings)
3. Try these commands:

```
/help                  - See all commands
/start                 - Start a match
/team 1                - Join team 1
/role squad_leader     - Become squad leader
/stats                 - Check your stats
/leaderboard           - See top players
```

---

## Basic Configuration

Edit `conf.json` to customize:

```json
{
  "maxplayers": 100,                    // Max players
  "name": "MY ARENA",                   // Server name
  "port": 22005,                        // Server port
  "gamemode": "tactical-squad-warfare"
}
```

**Common Settings:**

| Setting | Default | Purpose |
|---------|---------|----------|
| `maxplayers` | 100 | Maximum concurrent players |
| `name` | BATTLE ARENA | Server name in browser |
| `port` | 22005 | Connection port |
| `team_size` | 50 | Players per team (50v50) |
| `respawn_time` | 15 | Seconds to respawn |

---

## Player Commands

### Team & Role Setup
```
/team 1           - Join Team 1 (USA)
/team 2           - Join Team 2 (Russia)
/role rifleman    - Select Rifleman role
/role medic       - Select Medic role
/role engineer    - Select Engineer role
/role squad_leader - Select Squad Leader role
```

### Squad Coordination
```
/squad info       - Show squad info
/squad rally      - Set rally point (Squad Leader)
/objectives       - Show all objectives
/map              - Show current map
```

### Information
```
/help             - Show all commands
/stats            - Your statistics
/leaderboard      - Top 10 players
/status           - Match status
```

---

## Admin Commands

```
/start            - Start match
/end              - End match
/restart          - Restart server
/kick <id> <reason> - Remove player
/ban <id> <reason>  - Ban player
/mode <mode>      - Change game mode
/stats            - Export server stats
```

---

## Game Mode Quick Reference

### Conflict Mode
- **50 vs 50** team warfare
- **Objective-based**: Capture and hold points
- **Duration**: 1 hour
- **Best for**: Tactical battles

### Escape Mode
- **One team attacks**, one team defends
- **Goal**: Reach extraction point
- **Duration**: 45 minutes
- **Best for**: Asymmetric gameplay

### Survival Mode
- **Last team standing** wins
- **Shrinking zone** mechanics
- **No respawns** (permadeath)
- **Duration**: Until 1 team remains

---

## Troubleshooting

### Server won't start

✅ Check Node.js installed: `node --version`
✅ Verify port not in use: Check for port 22005
✅ Check file permissions: Can you read/write the directory?
✅ Review logs for errors

### Players can't connect

✅ Verify server is running
✅ Check firewall allows port 22005
✅ Confirm correct server IP/port
✅ Check max players not reached

### Commands not working

✅ Verify admin privileges
✅ Check command syntax: `/command args`
✅ Review server logs for errors

### Performance issues

✅ Reduce `stream-distance` in conf.json
✅ Check server RAM usage
✅ Reduce number of objectives
✅ Restart server periodically

---

## Common Configuration

### Casual Mode
```json
{
  "name": "Casual Arena",
  "battle": {
    "friendly_fire": false,
    "respawn_time": 10,
    "match_duration": 1800
  }
}
```

### Hardcore Mode
```json
{
  "name": "Hardcore Arena",
  "battle": {
    "friendly_fire": true,
    "respawn_time": 60,
    "match_duration": 900
  }
}
```

### Training Mode
```json
{
  "name": "Training Arena",
  "maxplayers": 50,
  "battle": {
    "friendly_fire": false,
    "respawn_time": 5
  }
}
```

---

## Next Steps

1. **Read Full Documentation**
   - [README.md](README.md) - Feature overview
   - [INSTALLATION.md](INSTALLATION.md) - Detailed setup
   - [DEVELOPMENT.md](DEVELOPMENT.md) - Extending server

2. **Customize Your Server**
   - Edit conf.json
   - Add custom commands
   - Create custom missions

3. **Promote Your Server**
   - List on RAGE MP
   - Create Discord community
   - Invite players

4. **Monitor & Optimize**
   - Check stats regularly
   - Monitor performance
   - Update regularly

---

## Key Roles Explained

### 🎯 Squad Leader
- **Ability**: Set rally points for squad
- **Benefit**: Lead team coordination
- **Slot**: 1 per squad

### 🔫 Rifleman
- **Ability**: Ammo bag for resupply
- **Benefit**: Frontline versatility
- **Slot**: 3 per squad

### 🏥 Medic
- **Ability**: Heal and revive allies
- **Benefit**: Keep team alive
- **Slot**: 1 per squad

### 🔧 Engineer
- **Ability**: Build and repair FOBs
- **Benefit**: Create respawn points
- **Slot**: 1 per squad

### 🎯 Marksman
- **Ability**: Long-range combat
- **Benefit**: Precision elimination
- **Slot**: 1 per squad

### 🔥 MG Gunner
- **Ability**: Suppression fire
- **Benefit**: Area denial
- **Slot**: 1 per squad

### 💣 AT Gunner
- **Ability**: Anti-armor weapons
- **Benefit**: Vehicle destruction
- **Slot**: 1 per squad

---

## Getting Help

📧 **GitHub Issues**: Report bugs
📚 **Documentation**: Check README.md
💫 **Examples**: See EXAMPLES.md
💡 **Tips**: Read DEVELOPMENT.md

---

## Tips for Success

1. **Coordination is Key**: Use squad rally points
2. **Role Diversity**: Balance your squad composition
3. **Objectives Win**: Focus on capturing points
4. **Support Teammates**: Medics and engineers are vital
5. **Communicate**: Use chat and squad coordination

---

## What's Next?

퉰d️ **Customize**: Edit conf.json for your preferences
🌟 **Promote**: Invite players to your server
🚀 **Extend**: Add custom missions and roles
📖 **Document**: Create your own guides

---

**Congratulations!** Your Battle Arena Server is ready! 🎉

For more information, visit the [GitHub repository](https://github.com/20XMAS24/BATTLE_ARENA_SERVER)

---

**Version**: 1.0.0
**Last Updated**: January 4, 2026
