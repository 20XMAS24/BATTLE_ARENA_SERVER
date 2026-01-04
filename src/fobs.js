// ============================================================================
// FOB SYSTEM - Forward Operating Bases
// Inspired by Squad's FOB mechanics
// ============================================================================

class FOB {
  constructor(fobId, teamId, position, squadLeader) {
    this.id = fobId;
    this.teamId = teamId;
    this.position = position;
    this.creator = squadLeader;
    this.createdAt = Date.now();
    this.buildProgress = 0;
    this.maxBuildProgress = 100;
    this.supplies = 1000;
    this.maxSupplies = 5000;
    this.radius = 150;
    this.health = 100;
    this.maxHealth = 100;
    this.respawnEnabled = false;
    this.storageActive = false;
    this.defendersNearby = 0;
    this.suppressed = false;
    this.suppressionLevel = 0; // 0-100
  }

  build(workers = 1) {
    if (this.buildProgress >= this.maxBuildProgress) return;
    
    const buildRate = 10 * workers;
    this.buildProgress = Math.min(this.buildProgress + buildRate, this.maxBuildProgress);
    
    if (this.buildProgress >= this.maxBuildProgress) {
      this.respawnEnabled = true;
      this.storageActive = true;
      return true; // Fully built
    }
    return false;
  }

  takeDamage(damage) {
    this.health -= damage;
    if (this.health <= 0) {
      this.destroy();
      return true;
    }
    return false;
  }

  destroy() {
    this.respawnEnabled = false;
    this.storageActive = false;
    this.health = 0;
  }

  suppressFOB() {
    this.suppressed = true;
    this.suppressionLevel = 100;
    this.respawnEnabled = false;
  }

  reduceSuppression() {
    if (this.suppressionLevel > 0) {
      this.suppressionLevel -= 5;
      if (this.suppressionLevel <= 0) {
        this.suppressed = false;
        this.respawnEnabled = true;
      }
    }
  }

  resupply(amount = 100) {
    const before = this.supplies;
    this.supplies = Math.min(this.supplies + amount, this.maxSupplies);
    return this.supplies - before;
  }
}

class FOBManager {
  constructor() {
    this.fobs = new Map();
    this.fobCounter = 0;
  }

  createFOB(teamId, position, squadLeader, config) {
    const fobId = `FOB_${teamId}_${this.fobCounter++}`;
    const fob = new FOB(fobId, teamId, position, squadLeader);
    this.fobs.set(fobId, fob);
    
    console.log(`[FOB SYSTEM] FOB ${fobId} created by ${squadLeader.name}`);
    return fob;
  }

  destroyFOB(fobId) {
    const fob = this.fobs.get(fobId);
    if (fob) {
      fob.destroy();
      this.fobs.delete(fobId);
      return true;
    }
    return false;
  }

  getFOB(fobId) {
    return this.fobs.get(fobId);
  }

  getFOBsByTeam(teamId) {
    return Array.from(this.fobs.values()).filter(f => f.teamId === teamId);
  }

  updateAllFOBs() {
    this.fobs.forEach(fob => {
      if (fob.suppressed) {
        fob.reduceSuppression();
      }
    });
  }
}

module.exports = { FOB, FOBManager };
