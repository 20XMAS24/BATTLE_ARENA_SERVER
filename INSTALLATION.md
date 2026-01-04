# Installation & Deployment Guide

## Quick Start

### System Requirements
- Windows Server 2019+, Linux, or macOS
- Node.js 14.0+
- 2GB RAM minimum (4GB recommended)
- 5GB storage space
- Stable internet (100Mbps+)

### Step 1: Download RAGE MP Server

1. Visit [RAGE MP Official Site](https://rage.mp)
2. Download the RAGE MP Server package
3. Extract to your server directory (e.g., `C:\RageMP\Server`)

### Step 2: Clone Battle Arena Repository

```bash
# Using Git
git clone https://github.com/20XMAS24/BATTLE_ARENA_SERVER.git
cd BATTLE_ARENA_SERVER

# OR download as ZIP and extract
```

### Step 3: Copy Files to RAGE MP Directory

```bash
# Windows
copy conf.json C:\RageMP\Server\
xcopy src C:\RageMP\Server\src /E /Y

# Linux/macOS
cp conf.json /path/to/ragemp/server/
cp -r src /path/to/ragemp/server/
```

### Step 4: Configure Server

Edit `conf.json`:

```json
{
  "maxplayers": 100,
  "name": "🎮 BATTLE ARENA | Your Server Name",
  "port": 22005,
  "announce": true,
  "language": "ru"
}
```

### Step 5: Start Server

**Windows:**
```batch
cd C:\RageMP\Server
ragemp-server.exe
```

**Linux/macOS:**
```bash
cd /path/to/ragemp/server
./ragemp-server
```

### Step 6: Verify Installation

You should see:
```
========================================
   BATTLE ARENA SERVER STARTING
========================================
Server Name: 🎮 BATTLE ARENA | Your Server Name
Max Players: 100
Game Mode: tactical-squad-warfare
Port: 22005
Language: ru
========================================
```

## Configuration Options

### Battle Settings

```json
"battle": {
  "max_teams": 2,                    // Number of teams
  "team_size": 50,                   // Players per team
  "players_per_squad": 9,            // Squad member cap
  "squad_count_per_team": 6,         // Squads per team
  "friendly_fire": false,            // FF enabled?
  "respawn_time": 15,                // Respawn delay (seconds)
  "match_duration": 3600,            // Match length (seconds)
  "objective_capture_time": 45       // Capture duration
}
```

### Role Configuration

Customize roles in `conf.json`:

```json
"roles": {
  "squad_leader": {
    "slot_count": 1,
    "weapon": "ar",
    "abilities": ["rally_point", "commander_call"]
  }
}
```

### Map Rotation

```json
"maps": [
  "everon",
  "skorpo",
  "malden",
  "sahrani"
]
```

### Faction Configuration

```json
"factions": [
  {
    "name": "Task Force Phantom",
    "team": 1,
    "country": "USA",
    "color": "#0066CC",
    "uniforms": ["army_digital", "ranger", "delta"]
  }
]
```

## Production Deployment

### Using Systemd (Linux)

Create `/etc/systemd/system/battlearena.service`:

```ini
[Unit]
Description=Battle Arena Server
After=network.target

[Service]
Type=simple
User=battlearena
WorkingDirectory=/opt/battlearena
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Start service:
```bash
sudo systemctl start battlearena
sudo systemctl enable battlearena
sudo systemctl status battlearena
```

### Using PM2 Process Manager

```bash
# Install PM2
npm install -g pm2

# Create ecosystem config
pm2 init

# Start server
pm2 start server.js --name "battle-arena"
pm2 save
pm2 startup
```

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
COPY conf.json .

EXPOSE 22005

CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t battle-arena .
docker run -d -p 22005:22005 --name arena battle-arena
```

## Performance Optimization

### Memory Management

```bash
# Linux - increase file descriptors
ulimit -n 65536

# Set Node heap size
NODE_OPTIONS="--max-old-space-size=3072" node server.js
```

### Network Optimization

Edit `conf.json`:
```json
"stream-distance": 600.0,    // Reduce for better performance
"api-threading-debugging": false  // Disable for production
```

### Database Optimization

If using persistent storage:
```javascript
// Regular database optimization
setInterval(() => {
  db.optimize();
  statsManager.exportStats();
}, 3600000); // Every hour
```

## Monitoring & Logging

### Enable Logging

```javascript
// In server.js
const fs = require('fs');
const logStream = fs.createWriteStream('server.log', { flags: 'a' });

console.log = function(msg) {
  logStream.write(new Date().toISOString() + ' - ' + msg + '\n');
};
```

### Monitor Server Health

```bash
# Check memory usage
free -h

# Check network connections
netstat -an | grep 22005

# Check logs
tail -f server.log
```

## Troubleshooting

### Server won't start

✓ Check Node.js installed: `node --version`
✓ Verify conf.json syntax (use JSON validator)
✓ Check port not in use: `netstat -an | grep 22005`
✓ Review error logs

### Players can't connect

✓ Verify server is running
✓ Check firewall allows port 22005
✓ Confirm server announced correctly
✓ Check max players not exceeded

### Performance issues

✓ Reduce stream distance
✓ Monitor RAM usage
✓ Check CPU utilization
✓ Optimize objective radius
✓ Clear old match logs

### Match won't start

✓ Verify admin level
✓ Check /start command syntax
✓ Review match duration setting
✓ Check game loop logs

## Backup & Recovery

### Backup Configuration

```bash
# Backup current config
cp conf.json conf.json.backup.$(date +%s)

# Backup database
cp -r database/ database.backup.$(date +%s)
```

### Recovery Procedure

```bash
# Restore from backup
cp conf.json.backup.1234567890 conf.json
cp -r database.backup.1234567890/* database/

# Restart server
kill $(pgrep -f 'node server.js')
node server.js
```

## Advanced Configuration

### Custom Game Modes

```javascript
// Load custom missions
const { createConflictMode } = require('./src/missions');
const gameMode = createConflictMode();
```

### Integration with Discord

```javascript
const Discord = require('discord.js');
const client = new Discord.Client();

mp.events.add('playerJoin', (player) => {
  client.channels.cache.get('channel-id')
    .send(`${player.name} joined the server`);
});
```

### Custom Statistics Export

```javascript
// Export to file
setInterval(() => {
  const stats = statsManager.exportStats();
  fs.writeFileSync(
    `stats_${Date.now()}.json`,
    JSON.stringify(stats, null, 2)
  );
}, 86400000); // Daily export
```

## Security Hardening

1. **Enable Authentication**
   - Implement player login system
   - Use token-based access

2. **DDoS Protection**
   - Use CDN or proxy
   - Implement rate limiting

3. **Anti-Cheat**
   - Monitor suspicious statistics
   - Implement admin review system

4. **Data Protection**
   - Encrypt sensitive data
   - Regular backups

## Support

For issues:
1. Check logs: `tail -f server.log`
2. Review configuration: Verify all settings in `conf.json`
3. Test locally: Ensure server starts without players
4. Report on GitHub: Create issue with error logs

---

**Last Updated**: January 4, 2026
**Version**: 1.0.0
