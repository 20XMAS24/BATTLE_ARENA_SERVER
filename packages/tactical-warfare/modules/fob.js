// ============================================================================
// FOB (Forward Operating Base) System
// Allows Squad Leaders to deploy forward bases with multiple functions
// ============================================================================

class FOB {
    constructor(id, position, teamId, owner) {
        this.id = id;
        this.position = position;
        this.teamId = teamId;
        this.owner = owner; // Squad Leader who placed it
        this.health = 1000;
        this.maxHealth = 1000;
        this.radius = 30; // Effect radius
        this.active = true;
        this.createdAt = Date.now();
        
        // Colshape for interaction
        this.colshape = mp.colshapes.newSphere(position.x, position.y, position.z, this.radius);
        this.colshape.fobId = id;
        
        // Spawn visual objects
        this.spawnObjects();
        
        console.log(`[FOB] Created FOB ${id} for Team ${teamId} at (${position.x}, ${position.y}, ${position.z})`);
    }

    spawnObjects() {
        try {
            // Main container base
            this.objects = [];
            
            // Large shipping container
            const container = mp.objects.new(
                mp.joaat('prop_container_01a'),
                new mp.Vector3(this.position.x, this.position.y, this.position.z),
                {
                    rotation: new mp.Vector3(0, 0, 0),
                    dimension: 0
                }
            );
            this.objects.push(container);
            
            // Small tent nearby
            const tent = mp.objects.new(
                mp.joaat('prop_gazebo_02'),
                new mp.Vector3(this.position.x + 5, this.position.y + 5, this.position.z),
                {
                    rotation: new mp.Vector3(0, 0, 45),
                    dimension: 0
                }
            );
            this.objects.push(tent);
            
            // Ammo crates
            const crate1 = mp.objects.new(
                mp.joaat('prop_box_guncase_03a'),
                new mp.Vector3(this.position.x - 3, this.position.y, this.position.z),
                {
                    rotation: new mp.Vector3(0, 0, 0),
                    dimension: 0
                }
            );
            this.objects.push(crate1);
            
            console.log(`[FOB] Spawned ${this.objects.length} objects for FOB ${this.id}`);
        } catch (error) {
            console.error(`[FOB] Error spawning objects:`, error.message);
        }
    }

    takeDamage(amount, attacker) {
        if (!this.active) return false;
        
        this.health -= amount;
        
        if (this.health <= 0) {
            this.destroy(attacker);
            return true;
        }
        
        // Broadcast health update
        const healthPercent = Math.round((this.health / this.maxHealth) * 100);
        mp.players.forEach(player => {
            if (player.dimension === 0) {
                player.call('updateFOBHealth', [this.id, healthPercent]);
            }
        });
        
        return false;
    }

    repair(amount) {
        if (!this.active) return;
        
        this.health = Math.min(this.health + amount, this.maxHealth);
        
        const healthPercent = Math.round((this.health / this.maxHealth) * 100);
        mp.players.forEach(player => {
            if (player.dimension === 0) {
                player.call('updateFOBHealth', [this.id, healthPercent]);
            }
        });
    }

    isPlayerInRadius(player) {
        const dist = player.position.subtract(
            new mp.Vector3(this.position.x, this.position.y, this.position.z)
        ).length();
        return dist <= this.radius;
    }

    resupplyPlayer(player) {
        // Give ammo for all weapons
        // Note: In RAGE MP, we need to give weapons again with full ammo
        player.call('showNotification', ['Resupplied ammunition!', 'success']);
        return true;
    }

    healPlayer(player) {
        player.health = 100;
        player.armour = Math.min(player.armour + 50, 100);
        player.call('showNotification', ['Health restored!', 'success']);
        return true;
    }

    destroy(attacker) {
        this.active = false;
        
        // Remove colshape
        if (this.colshape) {
            this.colshape.destroy();
        }
        
        // Remove all objects
        this.objects.forEach(obj => {
            if (obj && mp.objects.exists(obj)) {
                obj.destroy();
            }
        });
        
        // Notify all players
        mp.players.forEach(player => {
            player.call('removeFOB', [this.id]);
            if (attacker) {
                player.outputChatBox(`!{FF0000}[FOB] Team ${this.teamId} FOB destroyed by ${attacker.name}!`);
            } else {
                player.outputChatBox(`!{FF0000}[FOB] Team ${this.teamId} FOB destroyed!`);
            }
        });
        
        console.log(`[FOB] FOB ${this.id} destroyed`);
    }
}

class FOBManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.fobs = new Map();
        this.nextFobId = 1;
        this.maxFobsPerTeam = 3;
        this.fobCooldown = 120000; // 2 minutes cooldown
        this.lastFobPlacement = new Map(); // player.id -> timestamp
        
        console.log('[FOB] FOB Manager initialized');
    }

    canPlaceFOB(player) {
        const playerData = this.gameState.players.get(player.id);
        
        if (!playerData) {
            return { canPlace: false, reason: 'Player not in game' };
        }
        
        // Only Squad Leaders can place FOBs
        if (playerData.role !== 'squad_leader') {
            return { canPlace: false, reason: 'Only Squad Leaders can place FOBs' };
        }
        
        // Check cooldown
        const lastPlacement = this.lastFobPlacement.get(player.id);
        if (lastPlacement) {
            const timeSince = Date.now() - lastPlacement;
            if (timeSince < this.fobCooldown) {
                const remaining = Math.ceil((this.fobCooldown - timeSince) / 1000);
                return { canPlace: false, reason: `Cooldown: ${remaining}s` };
            }
        }
        
        // Check team FOB limit
        const teamFobs = Array.from(this.fobs.values()).filter(
            fob => fob.teamId === playerData.team && fob.active
        );
        
        if (teamFobs.length >= this.maxFobsPerTeam) {
            return { canPlace: false, reason: `Team FOB limit reached (${this.maxFobsPerTeam})` };
        }
        
        // Check if too close to other FOBs
        const minDistance = 100; // meters
        for (const fob of this.fobs.values()) {
            if (!fob.active) continue;
            
            const dist = player.position.subtract(
                new mp.Vector3(fob.position.x, fob.position.y, fob.position.z)
            ).length();
            
            if (dist < minDistance) {
                return { canPlace: false, reason: 'Too close to another FOB' };
            }
        }
        
        // Check if in valid zone (not in main bases)
        // TODO: Add zone validation
        
        return { canPlace: true };
    }

    placeFOB(player) {
        const check = this.canPlaceFOB(player);
        
        if (!check.canPlace) {
            player.outputChatBox(`!{FF0000}[FOB] ${check.reason}`);
            player.call('showNotification', [check.reason, 'error']);
            return null;
        }
        
        const playerData = this.gameState.players.get(player.id);
        const fobId = `FOB_${this.nextFobId++}`;
        
        // Get position slightly in front of player
        const heading = player.heading;
        const radians = (heading * Math.PI) / 180;
        const distance = 5; // 5 meters in front
        
        const fobPos = new mp.Vector3(
            player.position.x + Math.sin(radians) * distance,
            player.position.y + Math.cos(radians) * distance,
            player.position.z
        );
        
        const fob = new FOB(fobId, fobPos, playerData.team, player);
        this.fobs.set(fobId, fob);
        
        // Set cooldown
        this.lastFobPlacement.set(player.id, Date.now());
        
        // Notify all players
        mp.players.forEach(p => {
            const pData = this.gameState.players.get(p.id);
            if (pData && pData.team === playerData.team) {
                p.outputChatBox(`!{00FF00}[FOB] ${player.name} deployed a FOB!`);
                p.call('showNotification', ['FOB deployed!', 'success']);
                p.call('createFOB', [fobPos.x, fobPos.y, fobPos.z, playerData.team]);
            } else if (pData) {
                p.outputChatBox(`!{FF0000}[FOB] Enemy FOB detected!`);
            }
        });
        
        console.log(`[FOB] ${player.name} placed FOB ${fobId} at (${fobPos.x}, ${fobPos.y}, ${fobPos.z})`);
        return fob;
    }

    getFOBsForTeam(teamId) {
        return Array.from(this.fobs.values()).filter(
            fob => fob.teamId === teamId && fob.active
        );
    }

    getNearestFOB(player, teamId = null) {
        let nearest = null;
        let minDist = Infinity;
        
        for (const fob of this.fobs.values()) {
            if (!fob.active) continue;
            if (teamId !== null && fob.teamId !== teamId) continue;
            
            const dist = player.position.subtract(
                new mp.Vector3(fob.position.x, fob.position.y, fob.position.z)
            ).length();
            
            if (dist < minDist) {
                minDist = dist;
                nearest = fob;
            }
        }
        
        return { fob: nearest, distance: minDist };
    }

    handlePlayerInFOB(player, fob) {
        const playerData = this.gameState.players.get(player.id);
        if (!playerData) return;
        
        // Enemy FOB - they shouldn't spawn here
        if (playerData.team !== fob.teamId) {
            return;
        }
        
        // Friendly FOB - show available actions
        // This will be called periodically for players in FOB radius
    }

    update() {
        // Update FOB states
        for (const fob of this.fobs.values()) {
            if (!fob.active) continue;
            
            // Auto-repair slowly over time
            if (fob.health < fob.maxHealth) {
                fob.repair(5); // 5 HP per tick
            }
        }
    }

    removeFOB(fobId) {
        const fob = this.fobs.get(fobId);
        if (fob) {
            fob.destroy(null);
            this.fobs.delete(fobId);
        }
    }

    getFOB(fobId) {
        return this.fobs.get(fobId);
    }

    getAllActiveFOBs() {
        return Array.from(this.fobs.values()).filter(fob => fob.active);
    }
}

module.exports = FOBManager;
