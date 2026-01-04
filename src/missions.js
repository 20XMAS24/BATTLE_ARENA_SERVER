// ============================================================================
// MISSION SYSTEM - Game Mode Framework
// Inspired by Arma Reforger's modular mission system
// ============================================================================

class Mission {
  constructor(missionId, name, map, description) {
    this.id = missionId;
    this.name = name;
    this.map = map;
    this.description = description;
    this.objectives = [];
    this.teams = {};
    this.startTime = null;
    this.endTime = null;
    this.status = 'idle'; // idle, running, completed
    this.rules = {};
  }

  addObjective(objective) {
    this.objectives.push(objective);
  }

  setTeamObjective(teamId, objective) {
    if (!this.teams[teamId]) this.teams[teamId] = {};
    this.teams[teamId].objective = objective;
  }

  start() {
    this.status = 'running';
    this.startTime = Date.now();
    console.log(`[MISSION] Started: ${this.name}`);
  }

  end() {
    this.status = 'completed';
    this.endTime = Date.now();
    console.log(`[MISSION] Completed: ${this.name}`);
  }

  getDuration() {
    if (!this.startTime) return 0;
    const endTime = this.endTime || Date.now();
    return Math.floor((endTime - this.startTime) / 1000);
  }
}

class GameMode {
  constructor(modeName, description) {
    this.modeName = modeName;
    this.description = description;
    this.missions = [];
    this.activeMission = null;
    this.rotation = [];
  }

  addMission(mission) {
    this.missions.push(mission);
    this.rotation.push(mission);
  }

  startNextMission() {
    if (this.rotation.length === 0) {
      console.log('[GAMEMODE] No more missions in rotation');
      return false;
    }
    
    this.activeMission = this.rotation.shift();
    this.activeMission.start();
    return true;
  }

  endActiveMission() {
    if (this.activeMission) {
      this.activeMission.end();
      this.activeMission = null;
    }
  }
}

// ============================================================================
// PREDEFINED GAME MODES
// ============================================================================

function createConflictMode() {
  const mode = new GameMode('Conflict', 'Team vs Team objective-based warfare');
  
  // Mission 1: Everon Conflict
  const mission1 = new Mission('M_EVERON_CONFLICT', 'Battle for Everon', 'everon', 
    'Two opposing forces fight for control of strategic objectives on Everon island');
  
  mission1.addObjective({
    id: 'OBJ_NORTH',
    name: 'Northern Airfield',
    type: 'capture',
    position: { x: 500, y: 1000, z: 0 },
    points: 100
  });
  
  mission1.addObjective({
    id: 'OBJ_SOUTH',
    name: 'Southern Base',
    type: 'capture',
    position: { x: 500, y: -1000, z: 0 },
    points: 100
  });
  
  mission1.addObjective({
    id: 'OBJ_CENTER',
    name: 'Central Outpost',
    type: 'capture',
    position: { x: 0, y: 0, z: 0 },
    points: 200
  });

  mode.addMission(mission1);
  return mode;
}

function createEscapeMode() {
  const mode = new GameMode('Escape', 'One team must defend, the other must escape');
  
  const mission = new Mission('M_ESCAPE', 'Operation Escape', 'skorpo',
    'Defenders must hold positions while attackers try to reach extraction point');
  
  mission.addObjective({
    id: 'DEFENSE_POS_1',
    name: 'Main Defense Line',
    type: 'defend',
    position: { x: 0, y: -500, z: 0 },
    radius: 200
  });
  
  mission.addObjective({
    id: 'EXTRACTION',
    name: 'Extraction Zone',
    type: 'reach',
    position: { x: 0, y: 1000, z: 0 },
    radius: 150
  });

  mode.addMission(mission);
  return mode;
}

function createSurvivalMode() {
  const mode = new GameMode('Survival', 'Teams must survive and eliminate each other');
  
  const mission = new Mission('M_SURVIVAL', 'Last Team Standing', 'malden',
    'Teams compete in a shrinking zone - last team alive wins');
  
  mission.rules = {
    friendlyFire: true,
    respawnAvailable: false,
    zoneContraction: true,
    zoneContractionInterval: 300 // 5 minutes
  };

  mode.addMission(mission);
  return mode;
}

// ============================================================================
// MISSION BUILDER - Game Master Feature
// ============================================================================

class MissionBuilder {
  constructor() {
    this.customMissions = [];
  }

  createCustomMission(config) {
    const mission = new Mission(
      `CUSTOM_${Date.now()}`,
      config.name,
      config.map,
      config.description
    );

    if (config.objectives) {
      config.objectives.forEach(obj => mission.addObjective(obj));
    }

    if (config.rules) {
      mission.rules = config.rules;
    }

    this.customMissions.push(mission);
    return mission;
  }

  deleteMission(missionId) {
    this.customMissions = this.customMissions.filter(m => m.id !== missionId);
  }

  getCustomMissions() {
    return this.customMissions;
  }
}

module.exports = {
  Mission,
  GameMode,
  MissionBuilder,
  createConflictMode,
  createEscapeMode,
  createSurvivalMode
};
