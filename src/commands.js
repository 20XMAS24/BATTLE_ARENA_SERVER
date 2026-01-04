// ============================================================================
// EXTENDED COMMANDS MODULE
// Comprehensive command system for players and administrators
// ============================================================================

const mp = require('RAGE');

class CommandHandler {
  constructor(gameState, statsManager) {
    this.gameState = gameState;
    this.statsManager = statsManager;
    this.commands = new Map();
    this.adminCommands = new Map();
    this.registerCommands();
  }

  registerCommands() {
    // Player Commands
    this.register('help', this.helpCommand);
    this.register('status', this.statusCommand);
    this.register('stats', this.statsCommand);
    this.register('leaderboard', this.leaderboardCommand);
    this.register('squad', this.squadCommand);
    this.register('team', this.teamCommand);
    this.register('role', this.roleCommand);
    this.register('objectives', this.objectivesCommand);
    this.register('fob', this.fobCommand);
    this.register('map', this.mapCommand);
    
    // Admin Commands
    this.registerAdmin('start', this.adminStartCommand);
    this.registerAdmin('end', this.adminEndCommand);
    this.registerAdmin('restart', this.adminRestartCommand);
    this.registerAdmin('kick', this.adminKickCommand);
    this.registerAdmin('ban', this.adminBanCommand);
    this.registerAdmin('mode', this.adminModeCommand);
    this.registerAdmin('fobspawn', this.adminFobSpawnCommand);
    this.registerAdmin('stats', this.adminStatsCommand);
  }

  register(name, handler) {
    this.commands.set(name, handler.bind(this));
  }

  registerAdmin(name, handler) {
    this.adminCommands.set(name, handler.bind(this));
  }

  // ========== PLAYER COMMANDS ==========

  helpCommand(player, args) {
    player.outputChatBox('!{00FF00}=== BATTLE ARENA COMMANDS ===');
    player.outputChatBox('!{FFFF00}/team <1|2> - Join a team');
    player.outputChatBox('!{FFFF00}/role <name> - Select role');
    player.outputChatBox('!{FFFF00}/squad info - Squad info');
    player.outputChatBox('!{FFFF00}/objectives - View objectives');
    player.outputChatBox('!{FFFF00}/stats - Your statistics');
    player.outputChatBox('!{FFFF00}/leaderboard - Top players');
    player.outputChatBox('!{FFFF00}/map - Current map info');
  }

  statusCommand(player, args) {
    const match = this.gameState.matchActive ? 'ACTIVE' : 'IDLE';
    const duration = this.gameState.matchActive ? 
      Math.floor((Date.now() - this.gameState.matchStartTime) / 1000) : 0;
    
    player.outputChatBox(`!{00FF00}Match Status: ${match}`);
    player.outputChatBox(`!{FFFF00}Duration: ${duration}s`);
    player.outputChatBox(`!{FFFF00}Team 1: ${this.gameState.teamScores[1]} | Team 2: ${this.gameState.teamScores[2]}`);
  }

  statsCommand(player, args) {
    const stats = this.statsManager.getOrCreatePlayerStats(player.id, player.name);
    
    player.outputChatBox('!{00FF00}=== YOUR STATS ===');
    player.outputChatBox(`!{FFFF00}Rank: ${stats.rank}`);
    player.outputChatBox(`!{FFFF00}Experience: ${stats.experience}`);
    player.outputChatBox(`!{FFFF00}Kills: ${stats.kills} | Deaths: ${stats.deaths} | KD Ratio: ${stats.getKillDeathRatio()}`);
    player.outputChatBox(`!{FFFF00}Assists: ${stats.assists} | Headshots: ${stats.headshots}`);
    player.outputChatBox(`!{FFFF00}Objectives: ${stats.objectives} | Score: ${stats.getScore()}`);
  }

  leaderboardCommand(player, args) {
    const topPlayers = this.statsManager.getTopPlayers(10);
    
    player.outputChatBox('!{FF0000}=== TOP 10 PLAYERS ===');
    topPlayers.forEach((p, index) => {
      player.outputChatBox(`!{00FF00}#${index + 1} ${p.playerName} - ${p.getScore()} pts (${p.kills}K)`);
    });
  }

  squadCommand(player, args) {
    const playerData = this.gameState.players.get(player.id);
    if (!playerData) {
      player.outputChatBox('!{FF0000}You are not in a squad');
      return;
    }

    if (args[0] === 'info') {
      const squad = this.gameState.squads.get(playerData.squad);
      if (squad) {
        player.outputChatBox(`!{00FF00}Squad ${squad.squadNumber}`);
        player.outputChatBox(`!{FFFF00}Leader: ${squad.leader.name}`);
        player.outputChatBox(`!{FFFF00}Members: ${squad.members.length}/${squad.maxSize}`);
        player.outputChatBox(`!{FFFF00}Morale: ${squad.morale}%`);
      }
    } else if (args[0] === 'rally') {
      if (playerData.squad) {
        const squad = this.gameState.squads.get(playerData.squad);
        if (squad && squad.leader.id === player.id) {
          const pos = player.position;
          squad.setRallyPoint(pos.x, pos.y, pos.z);
          player.outputChatBox('!{00FF00}Rally point set!');
        } else {
          player.outputChatBox('!{FF0000}Only squad leader can set rally points');
        }
      }
    }
  }

  teamCommand(player, args) {
    const teamId = parseInt(args[0]);
    if (isNaN(teamId) || teamId < 1 || teamId > 2) {
      player.outputChatBox('!{FF0000}Invalid team. Choose 1 or 2');
      return;
    }

    if (this.gameState.players.has(player.id)) {
      this.gameState.removePlayer(player.id);
    }

    this.gameState.addPlayer(player, teamId);
    const team = this.gameState.getTeam(teamId);
    player.outputChatBox(`!{00FF00}Joined: ${team.name}`);
  }

  roleCommand(player, args) {
    const roleName = args[0]?.toLowerCase();
    if (!roleName || !this.gameState.players.has(player.id)) {
      player.outputChatBox('!{FF0000}Invalid role');
      return;
    }

    const playerData = this.gameState.players.get(player.id);
    playerData.role = roleName;
    player.outputChatBox(`!{00FF00}Role set to: ${roleName}`);
  }

  objectivesCommand(player, args) {
    if (this.gameState.objectives.length === 0) {
      player.outputChatBox('!{FF0000}No objectives active');
      return;
    }

    player.outputChatBox('!{FF0000}=== OBJECTIVES ===');
    this.gameState.objectives.forEach(obj => {
      const owner = obj.capturedBy ? `Team ${obj.capturedBy}` : 'Neutral';
      player.outputChatBox(`!{FFFF00}${obj.name} - ${owner}`);
    });
  }

  fobCommand(player, args) {
    player.outputChatBox('!{00FF00}FOB System:');
    player.outputChatBox('!{FFFF00}Build supplies near squad members to construct FOB');
    player.outputChatBox('!{FFFF00}FOBs provide respawn points for your squad');
  }

  mapCommand(player, args) {
    player.outputChatBox(`!{00FF00}Current Map: ${this.gameState.currentMap}`);
    player.outputChatBox('!{FFFF00}50v50 Tactical Squad Warfare');
  }

  // ========== ADMIN COMMANDS ==========

  adminStartCommand(player, args) {
    if (!player.admin) return;
    
    this.gameState.matchActive = true;
    this.gameState.matchStartTime = Date.now();
    
    mp.players.forEach(p => {
      p.outputChatBox('!{FF0000}[ADMIN] Match started!');
    });
  }

  adminEndCommand(player, args) {
    if (!player.admin) return;
    
    this.gameState.matchActive = false;
    const winner = this.gameState.teamScores[1] > this.gameState.teamScores[2] ? 1 : 2;
    
    mp.players.forEach(p => {
      p.outputChatBox(`!{FF0000}[ADMIN] Match ended! Winner: Team ${winner}`);
    });
  }

  adminRestartCommand(player, args) {
    if (!player.admin) return;
    
    mp.players.forEach(p => {
      p.outputChatBox('!{FF0000}[ADMIN] Server restarting...');
    });
    
    setTimeout(() => {
      process.exit(0);
    }, 5000);
  }

  adminKickCommand(player, args) {
    if (!player.admin) return;
    
    const targetId = parseInt(args[0]);
    const reason = args.slice(1).join(' ');
    
    if (mp.players.has(targetId)) {
      const target = mp.players.get(targetId);
      target.kick(reason || 'Kicked by admin');
      player.outputChatBox(`!{00FF00}Kicked ${target.name}`);
    }
  }

  adminBanCommand(player, args) {
    if (!player.admin) return;
    
    const targetId = parseInt(args[0]);
    const reason = args.slice(1).join(' ');
    
    if (mp.players.has(targetId)) {
      const target = mp.players.get(targetId);
      target.ban(reason || 'Banned by admin');
      player.outputChatBox(`!{00FF00}Banned ${target.name}`);
    }
  }

  adminModeCommand(player, args) {
    if (!player.admin) return;
    
    const mode = args[0];
    player.outputChatBox(`!{00FF00}Game mode set to: ${mode}`);
    
    mp.players.forEach(p => {
      p.outputChatBox(`!{FF0000}[ADMIN] Game mode changed to ${mode}`);
    });
  }

  adminFobSpawnCommand(player, args) {
    if (!player.admin) return;
    
    const pos = player.position;
    player.outputChatBox(`!{00FF00}FOB spawned at ${pos.x.toFixed(0)}, ${pos.y.toFixed(0)}, ${pos.z.toFixed(0)}`);
  }

  adminStatsCommand(player, args) {
    if (!player.admin) return;
    
    const stats = this.statsManager.exportStats();
    console.log('[ADMIN STATS]', stats);
    player.outputChatBox(`!{00FF00}Server stats exported`);
  }

  // ========== COMMAND DISPATCHER ==========

  execute(player, commandName, args) {
    if (this.adminCommands.has(commandName) && player.admin) {
      return this.adminCommands.get(commandName)(player, args);
    }
    
    if (this.commands.has(commandName)) {
      return this.commands.get(commandName)(player, args);
    }
    
    player.outputChatBox(`!{FF0000}Unknown command: ${commandName}. Type /help`);
  }
}

module.exports = CommandHandler;
