// ============================================================================
// AI BOT SYSTEM
// Spawns and controls friendly/enemy AI soldiers
// ============================================================================

class AIBot {
    constructor(id, position, teamId, role = 'rifleman') {
        this.id = id;
        this.teamId = teamId;
        this.role = role;
        this.health = 100;
        this.state = 'idle'; // idle, patrol, defend, attack, follow
        this.target = null;
        this.leader = null;
        this.defendPosition = null;
        this.patrolPoints = [];
        this.currentPatrolIndex = 0;
        this.lastAttackTime = 0;
        this.attackCooldown = 1000; // 1 second between attacks
        
        // Spawn the ped
        this.ped = mp.peds.new(
            this.getPedModel(),
            position,
            0, // heading
            (streamPed) => {
                // Ped loaded callback
            },
            0 // dimension
        );
        
        this.ped.setInvincible(false);
        this.ped.health = 100;
        this.ped.armour = this.getArmourForRole();
        
        // Give weapon
        this.giveWeapon();
        
        console.log(`[AI] Created AI bot ${id} for Team ${teamId} as ${role}`);
    }

    getPedModel() {
        // Different models for different teams
        const models = {
            1: [ // Team 1 - Military
                mp.joaat('s_m_y_blackops_01'),
                mp.joaat('s_m_y_blackops_02'),
                mp.joaat('s_m_y_blackops_03'),
                mp.joaat('s_m_y_marine_01'),
                mp.joaat('s_m_y_marine_02')
            ],
            2: [ // Team 2 - Enemies
                mp.joaat('g_m_y_lost_01'),
                mp.joaat('g_m_y_lost_02'),
                mp.joaat('g_m_y_mexgang_01'),
                mp.joaat('g_m_y_mexgoon_01'),
                mp.joaat('g_m_y_mexgoon_02')
            ]
        };
        
        const teamModels = models[this.teamId] || models[1];
        return teamModels[Math.floor(Math.random() * teamModels.length)];
    }

    getArmourForRole() {
        const armour = {
            'squad_leader': 50,
            'rifleman': 25,
            'medic': 50,
            'engineer': 75,
            'marksman': 0,
            'mg_gunner': 25,
            'at_gunner': 25
        };
        return armour[this.role] || 25;
    }

    giveWeapon() {
        const weapons = {
            'squad_leader': mp.joaat('weapon_carbinerifle'),
            'rifleman': mp.joaat('weapon_assaultrifle'),
            'medic': mp.joaat('weapon_smg'),
            'engineer': mp.joaat('weapon_assaultsmg'),
            'marksman': mp.joaat('weapon_marksmanrifle'),
            'mg_gunner': mp.joaat('weapon_mg'),
            'at_gunner': mp.joaat('weapon_rpg')
        };
        
        const weapon = weapons[this.role] || weapons['rifleman'];
        this.ped.giveWeapon(weapon, 9999, true);
    }

    setState(newState) {
        console.log(`[AI] Bot ${this.id} state: ${this.state} -> ${newState}`);
        this.state = newState;
    }

    setDefendPosition(position) {
        this.defendPosition = position;
        this.setState('defend');
    }

    setFollowTarget(player) {
        this.leader = player;
        this.setState('follow');
    }

    setAttackMode() {
        this.setState('attack');
    }

    update(gameState) {
        if (!mp.peds.exists(this.ped)) {
            return false; // Bot is dead/removed
        }
        
        switch (this.state) {
            case 'idle':
                this.updateIdle();
                break;
            case 'defend':
                this.updateDefend(gameState);
                break;
            case 'follow':
                this.updateFollow();
                break;
            case 'attack':
                this.updateAttack(gameState);
                break;
            case 'patrol':
                this.updatePatrol();
                break;
        }
        
        return true;
    }

    updateIdle() {
        // Just stand around, look for enemies
        const nearbyEnemies = this.findNearbyEnemies(30);
        if (nearbyEnemies.length > 0) {
            this.target = nearbyEnemies[0];
            this.setState('attack');
        }
    }

    updateDefend(gameState) {
        if (!this.defendPosition) return;
        
        const dist = this.ped.position.subtract(this.defendPosition).length();
        
        // Return to defend position if too far
        if (dist > 15) {
            this.ped.taskGoToCoordAnyMeans(
                this.defendPosition.x,
                this.defendPosition.y,
                this.defendPosition.z,
                1.5, // speed
                0, 0, 786603
            );
        } else {
            // Look for enemies
            const nearbyEnemies = this.findNearbyEnemies(50);
            if (nearbyEnemies.length > 0) {
                this.target = nearbyEnemies[0];
                this.attackTarget();
            }
        }
    }

    updateFollow() {
        if (!this.leader || !mp.players.exists(this.leader)) {
            this.setState('idle');
            return;
        }
        
        const dist = this.ped.position.subtract(this.leader.position).length();
        
        // Follow leader if too far
        if (dist > 5) {
            this.ped.taskGoToEntity(
                this.leader.handle,
                -1, // duration
                3.0, // distance
                2.0, // speed
                0, 0
            );
        }
        
        // Attack enemies near leader
        const nearbyEnemies = this.findNearbyEnemies(40);
        if (nearbyEnemies.length > 0) {
            this.target = nearbyEnemies[0];
            this.attackTarget();
        }
    }

    updateAttack(gameState) {
        // Find enemies
        const nearbyEnemies = this.findNearbyEnemies(50);
        
        if (nearbyEnemies.length === 0) {
            this.setState('idle');
            return;
        }
        
        // Pick closest enemy
        this.target = nearbyEnemies[0];
        this.attackTarget();
    }

    updatePatrol() {
        if (this.patrolPoints.length === 0) {
            this.setState('idle');
            return;
        }
        
        const targetPoint = this.patrolPoints[this.currentPatrolIndex];
        const dist = this.ped.position.subtract(targetPoint).length();
        
        if (dist < 3) {
            // Reached patrol point, go to next
            this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
        } else {
            // Move to patrol point
            this.ped.taskGoToCoordAnyMeans(
                targetPoint.x,
                targetPoint.y,
                targetPoint.z,
                1.0, 0, 0, 786603
            );
        }
        
        // Check for enemies while patrolling
        const nearbyEnemies = this.findNearbyEnemies(30);
        if (nearbyEnemies.length > 0) {
            this.target = nearbyEnemies[0];
            this.setState('attack');
        }
    }

    findNearbyEnemies(radius) {
        const enemies = [];
        
        // Check players
        mp.players.forEach(player => {
            const playerData = global.gameState.players.get(player.id);
            if (!playerData) return;
            
            if (playerData.team !== this.teamId) {
                const dist = this.ped.position.subtract(player.position).length();
                if (dist < radius) {
                    enemies.push({ entity: player, distance: dist });
                }
            }
        });
        
        // Sort by distance
        enemies.sort((a, b) => a.distance - b.distance);
        
        return enemies;
    }

    attackTarget() {
        if (!this.target || !this.target.entity) return;
        
        const now = Date.now();
        if (now - this.lastAttackTime < this.attackCooldown) return;
        
        const targetEntity = this.target.entity;
        
        // Check if target is still valid
        if (mp.players.exists(targetEntity)) {
            const dist = this.ped.position.subtract(targetEntity.position).length();
            
            if (dist > 50) {
                this.target = null;
                return;
            }
            
            // Shoot at target
            this.ped.taskCombatPed(targetEntity.handle, 0, 16);
            this.lastAttackTime = now;
        } else {
            this.target = null;
        }
    }

    destroy() {
        if (mp.peds.exists(this.ped)) {
            this.ped.destroy();
        }
    }
}

class AIManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.bots = new Map();
        this.nextBotId = 1;
        this.maxBotsPerTeam = 20;
        
        console.log('[AI] AI Manager initialized');
    }

    spawnBot(position, teamId, role = 'rifleman') {
        const teamBots = this.getBotsForTeam(teamId);
        
        if (teamBots.length >= this.maxBotsPerTeam) {
            return null;
        }
        
        const botId = `AI_${this.nextBotId++}`;
        const bot = new AIBot(botId, position, teamId, role);
        
        this.bots.set(botId, bot);
        return bot;
    }

    spawnSquad(position, teamId, leader = null) {
        const squad = [];
        const roles = [
            'squad_leader',
            'rifleman', 'rifleman', 'rifleman',
            'medic',
            'engineer',
            'marksman',
            'mg_gunner',
            'at_gunner'
        ];
        
        roles.forEach((role, index) => {
            const offset = this.getSquadFormationOffset(index);
            const spawnPos = new mp.Vector3(
                position.x + offset.x,
                position.y + offset.y,
                position.z
            );
            
            const bot = this.spawnBot(spawnPos, teamId, role);
            if (bot) {
                if (leader) {
                    bot.setFollowTarget(leader);
                }
                squad.push(bot);
            }
        });
        
        return squad;
    }

    getSquadFormationOffset(index) {
        // Formation pattern
        const offsets = [
            { x: 0, y: 0 },      // Leader center
            { x: -2, y: 2 },
            { x: 2, y: 2 },
            { x: -2, y: -2 },
            { x: 2, y: -2 },
            { x: -4, y: 0 },
            { x: 4, y: 0 },
            { x: 0, y: 4 },
            { x: 0, y: -4 }
        ];
        return offsets[index] || { x: 0, y: 0 };
    }

    commandBots(teamId, command, target = null) {
        const teamBots = this.getBotsForTeam(teamId);
        
        switch (command) {
            case 'follow':
                if (target && mp.players.exists(target)) {
                    teamBots.forEach(bot => bot.setFollowTarget(target));
                }
                break;
            
            case 'defend':
                if (target) {
                    teamBots.forEach(bot => bot.setDefendPosition(target));
                }
                break;
            
            case 'attack':
                teamBots.forEach(bot => bot.setAttackMode());
                break;
            
            case 'idle':
                teamBots.forEach(bot => bot.setState('idle'));
                break;
        }
    }

    getBotsForTeam(teamId) {
        return Array.from(this.bots.values()).filter(bot => bot.teamId === teamId);
    }

    update() {
        // Update all bots
        const botsToRemove = [];
        
        this.bots.forEach((bot, botId) => {
            const alive = bot.update(this.gameState);
            if (!alive) {
                botsToRemove.push(botId);
            }
        });
        
        // Remove dead bots
        botsToRemove.forEach(botId => {
            const bot = this.bots.get(botId);
            if (bot) {
                bot.destroy();
                this.bots.delete(botId);
            }
        });
    }

    removeBot(botId) {
        const bot = this.bots.get(botId);
        if (bot) {
            bot.destroy();
            this.bots.delete(botId);
        }
    }

    removeAllBots() {
        this.bots.forEach(bot => bot.destroy());
        this.bots.clear();
    }

    getBotCount() {
        return this.bots.size;
    }
}

module.exports = AIManager;
