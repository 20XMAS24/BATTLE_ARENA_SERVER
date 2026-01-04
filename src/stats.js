// ============================================================================
// STATISTICS & RANKING SYSTEM
// Track player performance and server statistics
// ============================================================================

class PlayerStats {
  constructor(playerId, playerName) {
    this.playerId = playerId;
    this.playerName = playerName;
    this.kills = 0;
    this.deaths = 0;
    this.assists = 0;
    this.headshots = 0;
    this.objectives = 0; // Objective captures/defends
    this.revives = 0;
    this.heals = 0;
    this.supplies = 0;
    this.totalDamage = 0;
    this.shotsfired = 0;
    this.shotsFired = 0;
    this.accuracy = 0;
    this.playtime = 0; // in seconds
    this.joinTime = Date.now();
    this.squadLeaderScore = 0;
    this.foBuilds = 0;
    this.vehicleKills = 0;
    this.rank = 'Recruit'
    this.experience = 0;
  }

  recordKill(distance = 0, isHeadshot = false) {
    this.kills++;
    this.experience += 50;
    if (isHeadshot) {
      this.headshots++;
      this.experience += 25;
    }
    if (distance > 300) {
      this.experience += 50; // Long distance bonus
    }
  }

  recordDeath() {
    this.deaths++;
  }

  recordAssist() {
    this.assists++;
    this.experience += 15;
  }

  recordRevive() {
    this.revives++;
    this.experience += 40;
  }

  recordHeal(allies = 1) {
    this.heals += allies;
    this.experience += 10 * allies;
  }

  recordObjective() {
    this.objectives++;
    this.experience += 100;
  }

  updateAccuracy() {
    if (this.shotsFired > 0) {
      this.accuracy = Math.round((this.kills / this.shotsFired) * 100);
    }
  }

  getKillDeathRatio() {
    if (this.deaths === 0) return this.kills;
    return (this.kills / this.deaths).toFixed(2);
  }

  getScore() {
    return (this.kills * 100) + 
           (this.assists * 25) + 
           (this.objectives * 150) + 
           (this.revives * 100) + 
           (this.heals * 5) + 
           (this.headshots * 50);
  }

  getPlaytime() {
    return Math.floor((Date.now() - this.joinTime) / 1000);
  }

  updateRank() {
    const ranks = [
      { name: 'Recruit', minExp: 0 },
      { name: 'Soldier', minExp: 500 },
      { name: 'Specialist', minExp: 2000 },
      { name: 'Expert', minExp: 5000 },
      { name: 'Elite', minExp: 10000 },
      { name: 'Master', minExp: 25000 },
      { name: 'Commando', minExp: 50000 }
    ];

    for (let i = ranks.length - 1; i >= 0; i--) {
      if (this.experience >= ranks[i].minExp) {
        this.rank = ranks[i].name;
        break;
      }
    }
  }
}

class TeamStats {
  constructor(teamId, teamName) {
    this.teamId = teamId;
    this.teamName = teamName;
    this.totalKills = 0;
    this.totalDeaths = 0;
    this.captures = 0;
    this.defends = 0;
    this.foCount = 0;
    this.matchesWon = 0;
    this.matchesLost = 0;
    this.totalScore = 0;
  }

  getWinRate() {
    const total = this.matchesWon + this.matchesLost;
    if (total === 0) return 0;
    return ((this.matchesWon / total) * 100).toFixed(1);
  }
}

class ServerStats {
  constructor() {
    this.totalMatchesPlayed = 0;
    this.totalPlayersServed = 0;
    this.uptime = Date.now();
    this.totalKills = 0;
    this.totalDeaths = 0;
    this.totalObjectiveCaptures = 0;
    this.matchHistory = [];
  }

  recordMatch(matchData) {
    this.totalMatchesPlayed++;
    this.totalKills += matchData.totalKills;
    this.totalDeaths += matchData.totalDeaths;
    this.totalObjectiveCaptures += matchData.captures;
    this.matchHistory.push(matchData);
  }

  getUptime() {
    return Math.floor((Date.now() - this.uptime) / 1000);
  }

  getUptimeFormatted() {
    const seconds = this.getUptime();
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }

  getAverageMatch() {
    if (this.matchHistory.length === 0) return {};
    const avg = {
      duration: 0,
      players: 0,
      kills: 0
    };
    this.matchHistory.forEach(match => {
      avg.duration += match.duration || 0;
      avg.players += match.playerCount || 0;
      avg.kills += match.totalKills || 0;
    });
    const count = this.matchHistory.length;
    return {
      duration: Math.round(avg.duration / count),
      players: Math.round(avg.players / count),
      kills: Math.round(avg.kills / count)
    };
  }
}

class StatsManager {
  constructor() {
    this.playerStats = new Map();
    this.teamStats = new Map();
    this.serverStats = new ServerStats();
  }

  getOrCreatePlayerStats(playerId, playerName) {
    if (!this.playerStats.has(playerId)) {
      this.playerStats.set(playerId, new PlayerStats(playerId, playerName));
    }
    return this.playerStats.get(playerId);
  }

  getOrCreateTeamStats(teamId, teamName) {
    if (!this.teamStats.has(teamId)) {
      this.teamStats.set(teamId, new TeamStats(teamId, teamName));
    }
    return this.teamStats.get(teamId);
  }

  getTopPlayers(limit = 10) {
    const players = Array.from(this.playerStats.values())
      .sort((a, b) => b.getScore() - a.getScore())
      .slice(0, limit);
    return players;
  }

  getPlayerRanking(playerId) {
    const allPlayers = Array.from(this.playerStats.values())
      .sort((a, b) => b.getScore() - a.getScore());
    
    const ranking = allPlayers.findIndex(p => p.playerId === playerId);
    return ranking !== -1 ? ranking + 1 : -1;
  }

  exportStats() {
    return {
      timestamp: Date.now(),
      serverStats: this.serverStats,
      topPlayers: this.getTopPlayers(),
      teamStats: Array.from(this.teamStats.values())
    };
  }
}

module.exports = {
  PlayerStats,
  TeamStats,
  ServerStats,
  StatsManager
};
