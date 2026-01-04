// ============================================================================
// VISUAL SYSTEM - Server Side
// Manages 3D objects, markers, and visual elements
// ============================================================================

class VisualSystem {
    constructor(gameState) {
        this.gameState = gameState;
        this.objectiveVisuals = [];
        this.fobVisuals = [];
        this.rallyVisuals = [];
        this.combatZone = null;
        
        console.log('[VISUAL] Visual system initialized');
    }

    // ========================================================================
    // COMBAT ZONE
    // ========================================================================

    createCombatZone(x, y, z, radius) {
        this.combatZone = { x, y, z, radius };
        
        // Send to all clients
        mp.players.forEach(player => {
            player.call('createCombatZone', [{
                x, y, z, radius
            }]);
        });
        
        console.log(`[VISUAL] Combat zone created at (${x}, ${y}, ${z}) with radius ${radius}`);
    }

    // ========================================================================
    // OBJECTIVES
    // ========================================================================

    createObjectiveVisual(objective) {
        const visual = {
            id: objective.id,
            name: objective.name,
            x: objective.position.x,
            y: objective.position.y,
            z: objective.position.z,
            capturedBy: objective.capturedBy
        };
        
        this.objectiveVisuals.push(visual);
        
        // Send to all clients
        mp.players.forEach(player => {
            player.call('createObjective', [visual]);
        });
        
        console.log(`[VISUAL] Created visual for objective: ${objective.name}`);
    }

    updateObjectiveVisual(objectiveId, capturedBy) {
        const visual = this.objectiveVisuals.find(v => v.id === objectiveId);
        if (visual) {
            visual.capturedBy = capturedBy;
            
            // Send to all clients
            mp.players.forEach(player => {
                player.call('updateObjective', [objectiveId, capturedBy]);
            });
        }
    }

    // ========================================================================
    // FOB (Forward Operating Base)
    // ========================================================================

    createFOBVisual(fob) {
        const visual = {
            id: fob.id,
            x: fob.position.x,
            y: fob.position.y,
            z: fob.position.z,
            teamId: fob.teamId,
            buildProgress: fob.buildProgress
        };
        
        this.fobVisuals.push(visual);
        
        // Send to all clients
        mp.players.forEach(player => {
            player.call('createFOB', [visual]);
        });
        
        console.log(`[VISUAL] Created FOB visual for Team ${fob.teamId}`);
    }

    destroyFOBVisual(fobId) {
        this.fobVisuals = this.fobVisuals.filter(v => v.id !== fobId);
        
        // Send to all clients
        mp.players.forEach(player => {
            player.call('destroyFOB', [fobId]);
        });
    }

    // ========================================================================
    // RALLY POINTS
    // ========================================================================

    createRallyPointVisual(squadId, x, y, z) {
        const visual = {
            squadId,
            x, y, z
        };
        
        this.rallyVisuals.push(visual);
        
        // Send to squad members only
        const squad = this.gameState.squads.get(squadId);
        if (squad) {
            squad.members.forEach(member => {
                if (mp.players.exists(member)) {
                    member.call('createRallyPoint', [visual]);
                }
            });
        }
        
        console.log(`[VISUAL] Created rally point for Squad ${squadId}`);
    }

    // ========================================================================
    // PLAYER SPAWN
    // ========================================================================

    spawnPlayer(player, teamId) {
        // Get team spawn location
        const spawnPoints = {
            1: { x: -1041.0, y: -2746.0, z: 21.0, heading: 0 },
            2: { x: -1100.0, y: -2800.0, z: 21.0, heading: 180 }
        };
        
        const spawn = spawnPoints[teamId] || spawnPoints[1];
        
        // Add some randomness
        const randomX = spawn.x + (Math.random() * 20 - 10);
        const randomY = spawn.y + (Math.random() * 20 - 10);
        
        player.spawn(new mp.Vector3(randomX, randomY, spawn.z));
        player.heading = spawn.heading;
        player.dimension = 0;
        
        // Set player health and armor
        player.health = 100;
        player.armour = 100;
        
        console.log(`[VISUAL] Spawned ${player.name} for Team ${teamId}`);
    }

    // ========================================================================
    // HUD UPDATES
    // ========================================================================

    updatePlayerHUD(player) {
        if (!mp.players.exists(player)) return;
        
        const playerData = this.gameState.players.get(player.id);
        if (!playerData) return;
        
        const hudData = {
            health: player.health,
            armor: player.armour,
            team1Score: this.gameState.teamScores[1],
            team2Score: this.gameState.teamScores[2],
            objectives: this.getObjectivesData(),
            squadMembers: this.getSquadMembersData(playerData.squad)
        };
        
        player.call('updateHUD', [hudData]);
    }

    getObjectivesData() {
        return this.gameState.objectives.map(obj => ({
            id: obj.id,
            name: obj.name,
            capturedBy: obj.capturedBy
        }));
    }

    getSquadMembersData(squadId) {
        if (!squadId) return [];
        
        const squad = this.gameState.squads.get(squadId);
        if (!squad) return [];
        
        return squad.members.map(member => ({
            name: member.name,
            role: this.gameState.players.get(member.id)?.role || 'rifleman'
        }));
    }

    // ========================================================================
    // NOTIFICATIONS
    // ========================================================================

    showNotification(player, message, type = 'info') {
        if (mp.players.exists(player)) {
            player.call('showNotification', [message, type]);
        }
    }

    broadcastNotification(message, type = 'info') {
        mp.players.forEach(player => {
            this.showNotification(player, message, type);
        });
    }

    // ========================================================================
    // KILL FEED
    // ========================================================================

    addKillFeed(killer, victim, weapon = 'Unknown') {
        mp.players.forEach(player => {
            player.call('client:addKillFeed', [killer, victim, weapon]);
        });
    }

    // ========================================================================
    // MATCH EVENTS
    // ========================================================================

    onMatchStart() {
        const matchData = {
            objectives: this.getObjectivesData()
        };
        
        mp.players.forEach(player => {
            player.call('matchStarted', [matchData]);
        });
        
        this.broadcastNotification('Match Started! Capture objectives!', 'success');
    }

    onMatchEnd(winningTeam) {
        const matchData = {
            winner: winningTeam
        };
        
        mp.players.forEach(player => {
            player.call('matchEnded', [matchData]);
        });
        
        const team = this.gameState.getTeam(winningTeam);
        this.broadcastNotification(`Match Ended! Winner: ${team.name}`, 'info');
    }

    onObjectiveCaptured(objective, teamId) {
        const team = this.gameState.getTeam(teamId);
        
        mp.players.forEach(player => {
            player.call('objectiveCaptured', [{
                id: objective.id,
                objectiveName: objective.name,
                teamId: teamId,
                teamName: team.name
            }]);
        });
        
        this.updateObjectiveVisual(objective.id, teamId);
    }

    // ========================================================================
    // PLAYER JOIN
    // ========================================================================

    onPlayerJoin(player) {
        // Show team selection UI
        player.call('showTeamSelection');
        
        // Send existing visuals
        this.sendAllVisualsToPlayer(player);
    }

    sendAllVisualsToPlayer(player) {
        // Send combat zone
        if (this.combatZone) {
            player.call('createCombatZone', [this.combatZone]);
        }
        
        // Send objectives
        this.objectiveVisuals.forEach(visual => {
            player.call('createObjective', [visual]);
        });
        
        // Send FOBs
        this.fobVisuals.forEach(visual => {
            player.call('createFOB', [visual]);
        });
    }
}

module.exports = VisualSystem;
