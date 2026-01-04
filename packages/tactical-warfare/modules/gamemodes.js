// ============================================================================
// GAME MODES MODULE
// Conquest, Rush, Insurgency, Training
// ============================================================================

class GameMode {
    constructor(id, name, description, gameState) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.gameState = gameState;
        this.active = false;
    }

    start() {
        this.active = true;
        console.log(`[GAMEMODE] ${this.name} started`);
    }

    stop() {
        this.active = false;
        console.log(`[GAMEMODE] ${this.name} stopped`);
    }

    update() {
        // Override in subclasses
    }

    onPlayerJoin(player) {
        // Override in subclasses
    }

    onPlayerDeath(player, killer) {
        // Override in subclasses
    }

    onObjectiveCaptured(objective, teamId) {
        // Override in subclasses
    }
}

// ============================================================================
// CONQUEST MODE (Classic Battlefield)
// ============================================================================

class ConquestMode extends GameMode {
    constructor(gameState) {
        super('conquest', 'Conquest', 'Capture and hold objectives', gameState);
        this.ticketBleed = 1; // Tickets lost per second when enemy has more objectives
    }

    start() {
        super.start();
        this.gameState.teamScores = { 1: 1000, 2: 1000 }; // Tickets
        
        mp.players.forEach(player => {
            player.outputChatBox('!{FFD700}═════════════════════════');
            player.outputChatBox('!{FFD700}  CONQUEST MODE');
            player.outputChatBox('!{FFFFFF}  Capture objectives!');
            player.outputChatBox('!{FFFFFF}  Hold majority to win!');
            player.outputChatBox('!{FFD700}═════════════════════════');
        });
    }

    update() {
        if (!this.active) return;

        // Count objectives per team
        const objCount = { 1: 0, 2: 0 };
        this.gameState.objectives.forEach(obj => {
            if (obj.capturedBy) {
                objCount[obj.capturedBy]++;
            }
        });

        // Ticket bleed
        if (objCount[1] > objCount[2]) {
            this.gameState.teamScores[2] -= this.ticketBleed;
        } else if (objCount[2] > objCount[1]) {
            this.gameState.teamScores[1] -= this.ticketBleed;
        }

        // Check win condition
        if (this.gameState.teamScores[1] <= 0 || this.gameState.teamScores[2] <= 0) {
            this.endMatch();
        }
    }

    onPlayerDeath(player, killer) {
        const playerData = this.gameState.players.get(player.id);
        if (playerData) {
            this.gameState.teamScores[playerData.team]--;
        }
    }

    endMatch() {
        const winner = this.gameState.teamScores[1] > this.gameState.teamScores[2] ? 1 : 2;
        const team = this.gameState.getTeam(winner);
        
        mp.players.forEach(p => {
            p.outputChatBox(`!{00FF00}[CONQUEST] ${team.name} WINS!`);
        });
        
        this.stop();
    }
}

// ============================================================================
// RUSH MODE (Progressive attack/defend)
// ============================================================================

class RushMode extends GameMode {
    constructor(gameState) {
        super('rush', 'Rush', 'Attack or defend objectives in sequence', gameState);
        this.attackingTeam = 1;
        this.defendingTeam = 2;
        this.currentStage = 0;
        this.maxStages = 3;
        this.attackerTickets = 75;
        this.objectivesPerStage = 2;
    }

    start() {
        super.start();
        this.currentStage = 0;
        this.attackerTickets = 75;
        
        this.activateStage(0);
        
        mp.players.forEach(player => {
            const playerData = this.gameState.players.get(player.id);
            if (!playerData) return;
            
            const role = playerData.team === this.attackingTeam ? 'ATTACKER' : 'DEFENDER';
            
            player.outputChatBox('!{FFD700}═════════════════════════');
            player.outputChatBox('!{FFD700}  RUSH MODE');
            player.outputChatBox(`!{FFFFFF}  You are: ${role}`);
            if (playerData.team === this.attackingTeam) {
                player.outputChatBox('!{FFFF00}  Destroy objectives!');
                player.outputChatBox(`!{FFFF00}  Tickets: ${this.attackerTickets}`);
            } else {
                player.outputChatBox('!{FF0000}  Defend objectives!');
            }
            player.outputChatBox('!{FFD700}═════════════════════════');
        });
    }

    activateStage(stageIndex) {
        this.currentStage = stageIndex;
        
        // Activate only objectives for this stage
        const startIdx = stageIndex * this.objectivesPerStage;
        const endIdx = startIdx + this.objectivesPerStage;
        
        this.gameState.objectives.forEach((obj, idx) => {
            obj.active = (idx >= startIdx && idx < endIdx);
            if (obj.active) {
                obj.capturedBy = this.defendingTeam;
                obj.captureProgress = 100;
            }
        });
        
        mp.players.forEach(p => {
            p.outputChatBox(`!{FFD700}[RUSH] Stage ${stageIndex + 1}/${this.maxStages} activated!`);
        });
    }

    update() {
        if (!this.active) return;

        // Check if all objectives in current stage are captured
        const activeObjectives = this.gameState.objectives.filter(obj => obj.active);
        const capturedByAttackers = activeObjectives.filter(obj => 
            obj.capturedBy === this.attackingTeam
        ).length;

        if (capturedByAttackers === activeObjectives.length && activeObjectives.length > 0) {
            // Stage complete!
            if (this.currentStage < this.maxStages - 1) {
                this.activateStage(this.currentStage + 1);
                this.attackerTickets += 25; // Bonus tickets
            } else {
                // Attackers win!
                this.endMatch(this.attackingTeam);
            }
        }

        // Check tickets
        if (this.attackerTickets <= 0) {
            this.endMatch(this.defendingTeam);
        }
    }

    onPlayerDeath(player, killer) {
        const playerData = this.gameState.players.get(player.id);
        if (playerData && playerData.team === this.attackingTeam) {
            this.attackerTickets--;
        }
    }

    endMatch(winnerTeam) {
        const team = this.gameState.getTeam(winnerTeam);
        
        mp.players.forEach(p => {
            p.outputChatBox(`!{00FF00}[RUSH] ${team.name} WINS!`);
        });
        
        this.stop();
    }
}

// ============================================================================
// INSURGENCY MODE (Asymmetric warfare)
// ============================================================================

class InsurgencyMode extends GameMode {
    constructor(gameState) {
        super('insurgency', 'Insurgency', 'Find and destroy weapon caches', gameState);
        this.attackers = 1; // Limited respawns
        this.defenders = 2; // Unlimited respawns
        this.attackerRespawns = 50;
        this.caches = [];
        this.cachesDestroyed = 0;
        this.totalCaches = 3;
    }

    start() {
        super.start();
        this.attackerRespawns = 50;
        this.cachesDestroyed = 0;
        
        // Convert objectives to weapon caches
        this.caches = this.gameState.objectives.slice(0, this.totalCaches).map(obj => ({
            ...obj,
            destroyed: false,
            hp: 100
        }));
        
        mp.players.forEach(player => {
            const playerData = this.gameState.players.get(player.id);
            if (!playerData) return;
            
            player.outputChatBox('!{FFD700}═════════════════════════');
            player.outputChatBox('!{FFD700}  INSURGENCY MODE');
            
            if (playerData.team === this.attackers) {
                player.outputChatBox('!{FFFF00}  ATTACKERS:');
                player.outputChatBox('!{FFFFFF}  - Find weapon caches');
                player.outputChatBox('!{FFFFFF}  - Destroy them (C4/RPG)');
                player.outputChatBox(`!{FFFFFF}  - Respawns: ${this.attackerRespawns}`);
            } else {
                player.outputChatBox('!{FF0000}  DEFENDERS:');
                player.outputChatBox('!{FFFFFF}  - Protect caches');
                player.outputChatBox('!{FFFFFF}  - Unlimited respawns');
                player.outputChatBox('!{FFFFFF}  - Find attackers!');
            }
            
            player.outputChatBox('!{FFD700}═════════════════════════');
        });
    }

    update() {
        if (!this.active) return;

        // Check win conditions
        if (this.cachesDestroyed >= this.totalCaches) {
            this.endMatch(this.attackers);
        } else if (this.attackerRespawns <= 0) {
            this.endMatch(this.defenders);
        }
    }

    onPlayerDeath(player, killer) {
        const playerData = this.gameState.players.get(player.id);
        
        if (playerData && playerData.team === this.attackers) {
            this.attackerRespawns--;
            
            if (this.attackerRespawns <= 10) {
                mp.players.forEach(p => {
                    const pData = this.gameState.players.get(p.id);
                    if (pData && pData.team === this.attackers) {
                        p.outputChatBox(`!{FF0000}[INSURGENCY] WARNING: ${this.attackerRespawns} respawns left!`);
                    }
                });
            }
        }
    }

    destroyCache(cacheId) {
        const cache = this.caches.find(c => c.id === cacheId);
        if (cache && !cache.destroyed) {
            cache.destroyed = true;
            this.cachesDestroyed++;
            
            mp.players.forEach(p => {
                p.outputChatBox(`!{FF0000}[INSURGENCY] Weapon cache destroyed! (${this.cachesDestroyed}/${this.totalCaches})`);
            });
        }
    }

    endMatch(winnerTeam) {
        const team = this.gameState.getTeam(winnerTeam);
        
        mp.players.forEach(p => {
            p.outputChatBox(`!{00FF00}[INSURGENCY] ${team.name} WINS!`);
        });
        
        this.stop();
    }
}

// ============================================================================
// TRAINING MODE (Practice range)
// ============================================================================

class TrainingMode extends GameMode {
    constructor(gameState) {
        super('training', 'Training', 'Practice weapons and vehicles', gameState);
        this.targets = [];
    }

    start() {
        super.start();
        
        mp.players.forEach(player => {
            player.outputChatBox('!{FFD700}═════════════════════════');
            player.outputChatBox('!{FFD700}  TRAINING MODE');
            player.outputChatBox('!{FFFFFF}  - No death penalties');
            player.outputChatBox('!{FFFFFF}  - Unlimited ammo');
            player.outputChatBox('!{FFFFFF}  - /weapons - All weapons');
            player.outputChatBox('!{FFFFFF}  - /spawnvehicle - Vehicles');
            player.outputChatBox('!{FFFFFF}  - /tp - Teleport');
            player.outputChatBox('!{FFD700}═════════════════════════');
            
            // Give god mode
            player.setVariable('trainingMode', true);
        });
    }

    stop() {
        super.stop();
        
        mp.players.forEach(player => {
            player.setVariable('trainingMode', false);
        });
    }

    update() {
        // Constant ammo refill in training
        if (!this.active) return;

        mp.players.forEach(player => {
            if (player.getVariable('trainingMode')) {
                // Could add auto-heal, auto-ammo refill, etc.
            }
        });
    }

    onPlayerDeath(player, killer) {
        // Instant respawn in training
        setTimeout(() => {
            if (mp.players.exists(player)) {
                player.spawn(player.position);
                player.health = 100;
                player.armour = 100;
            }
        }, 1000);
    }
}

// ============================================================================
// GAME MODE MANAGER
// ============================================================================

class GameModeManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.modes = new Map();
        this.currentMode = null;
        
        // Register modes
        this.registerMode(new ConquestMode(gameState));
        this.registerMode(new RushMode(gameState));
        this.registerMode(new InsurgencyMode(gameState));
        this.registerMode(new TrainingMode(gameState));
        
        console.log('[GAMEMODES] Manager initialized with 4 modes');
    }

    registerMode(mode) {
        this.modes.set(mode.id, mode);
        console.log(`[GAMEMODES] Registered: ${mode.name}`);
    }

    setMode(modeId) {
        const mode = this.modes.get(modeId);
        if (!mode) {
            console.error(`[GAMEMODES] Mode not found: ${modeId}`);
            return false;
        }

        if (this.currentMode) {
            this.currentMode.stop();
        }

        this.currentMode = mode;
        console.log(`[GAMEMODES] Switched to: ${mode.name}`);
        return true;
    }

    startCurrentMode() {
        if (this.currentMode) {
            this.currentMode.start();
            return true;
        }
        return false;
    }

    update() {
        if (this.currentMode && this.currentMode.active) {
            this.currentMode.update();
        }
    }

    onPlayerJoin(player) {
        if (this.currentMode) {
            this.currentMode.onPlayerJoin(player);
        }
    }

    onPlayerDeath(player, killer) {
        if (this.currentMode) {
            this.currentMode.onPlayerDeath(player, killer);
        }
    }

    onObjectiveCaptured(objective, teamId) {
        if (this.currentMode) {
            this.currentMode.onObjectiveCaptured(objective, teamId);
        }
    }

    getCurrentModeName() {
        return this.currentMode ? this.currentMode.name : 'None';
    }
}

module.exports = GameModeManager;
