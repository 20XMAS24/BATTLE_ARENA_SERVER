// ============================================================================
// VEHICLE SYSTEM - Transport, Damage, Repair, Fuel
// Inspired by Squad and Arma Reforger
// ============================================================================

const VEHICLE_TYPES = {
    // Light Vehicles - Fast, 4 seats
    JEEP: {
        model: 'insurgent',
        name: 'Tactical Jeep',
        maxHealth: 1000,
        maxFuel: 100,
        fuelConsumption: 0.1, // per second
        speed: 'fast',
        armor: 'light',
        seats: 4,
        weapons: false,
        spawnTime: 60, // seconds
        requiredRole: null
    },
    
    // APC - Armored, 8 seats, mounted gun
    APC: {
        model: 'insurgent2',
        name: 'Armored Personnel Carrier',
        maxHealth: 3000,
        maxFuel: 150,
        fuelConsumption: 0.2,
        speed: 'medium',
        armor: 'heavy',
        seats: 8,
        weapons: true,
        weaponType: 'mg',
        spawnTime: 180,
        requiredRole: null
    },
    
    // Tank - Slow, powerful, 3 seats
    TANK: {
        model: 'rhino',
        name: 'Main Battle Tank',
        maxHealth: 5000,
        maxFuel: 200,
        fuelConsumption: 0.3,
        speed: 'slow',
        armor: 'tank',
        seats: 3,
        weapons: true,
        weaponType: 'cannon',
        spawnTime: 300,
        requiredRole: 'at_gunner' // Only AT can request
    },
    
    // Transport Truck - 12 seats, supply carrier
    TRUCK: {
        model: 'mule4',
        name: 'Supply Truck',
        maxHealth: 1500,
        maxFuel: 120,
        fuelConsumption: 0.15,
        speed: 'medium',
        armor: 'light',
        seats: 12,
        weapons: false,
        cargoCapacity: 2000, // For FOB supplies
        spawnTime: 120,
        requiredRole: 'engineer'
    },
    
    // Helicopter - Air support, 6 seats
    HELI: {
        model: 'buzzard',
        name: 'Transport Helicopter',
        maxHealth: 2000,
        maxFuel: 180,
        fuelConsumption: 0.25,
        speed: 'very_fast',
        armor: 'light',
        seats: 6,
        weapons: true,
        weaponType: 'rockets',
        spawnTime: 240,
        requiredRole: 'squad_leader' // Only SL can request
    }
};

// Vehicle spawn locations per battle zone
const VEHICLE_SPAWNS = {
    industrial: {
        team1: [
            { x: 2650.0, y: 1450.0, z: 24.5, heading: 90, type: 'JEEP' },
            { x: 2655.0, y: 1455.0, z: 24.5, heading: 90, type: 'JEEP' },
            { x: 2640.0, y: 1460.0, z: 24.5, heading: 90, type: 'APC' },
            { x: 2630.0, y: 1470.0, z: 24.5, heading: 90, type: 'TRUCK' },
            { x: 2670.0, y: 1440.0, z: 50.0, heading: 90, type: 'HELI' }
        ],
        team2: [
            { x: 2850.0, y: 1650.0, z: 24.5, heading: 270, type: 'JEEP' },
            { x: 2855.0, y: 1655.0, z: 24.5, heading: 270, type: 'JEEP' },
            { x: 2860.0, y: 1660.0, z: 24.5, heading: 270, type: 'APC' },
            { x: 2870.0, y: 1670.0, z: 24.5, heading: 270, type: 'TRUCK' },
            { x: 2830.0, y: 1640.0, z: 50.0, heading: 270, type: 'HELI' }
        ]
    },
    desert: {
        team1: [
            { x: -950.0, y: -2650.0, z: 21.0, heading: 90, type: 'JEEP' },
            { x: -955.0, y: -2655.0, z: 21.0, heading: 90, type: 'JEEP' },
            { x: -960.0, y: -2660.0, z: 21.0, heading: 90, type: 'APC' },
            { x: -970.0, y: -2670.0, z: 21.0, heading: 90, type: 'TRUCK' },
            { x: -930.0, y: -2640.0, z: 40.0, heading: 90, type: 'HELI' }
        ],
        team2: [
            { x: -1150.0, y: -2850.0, z: 21.0, heading: 270, type: 'JEEP' },
            { x: -1155.0, y: -2855.0, z: 21.0, heading: 270, type: 'JEEP' },
            { x: -1160.0, y: -2860.0, z: 21.0, heading: 270, type: 'APC' },
            { x: -1170.0, y: -2870.0, z: 21.0, heading: 270, type: 'TRUCK' },
            { x: -1130.0, y: -2840.0, z: 40.0, heading: 270, type: 'HELI' }
        ]
    }
};

class VehicleManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.vehicles = new Map(); // vehicleId -> vehicleData
        this.spawnQueues = { 1: [], 2: [] };
        this.activeVehicles = { 1: [], 2: [] };
        
        console.log('[VEHICLES] Vehicle system initialized');
    }

    // Spawn vehicles for battle zone
    spawnVehiclesForZone(zoneName) {
        const spawns = VEHICLE_SPAWNS[zoneName];
        if (!spawns) return;

        // Clear existing vehicles
        this.vehicles.forEach((veh, id) => {
            if (mp.vehicles.exists(veh.vehicle)) {
                veh.vehicle.destroy();
            }
        });
        this.vehicles.clear();

        // Spawn for both teams
        [1, 2].forEach(teamId => {
            spawns[`team${teamId}`].forEach((spawn, index) => {
                this.spawnVehicle(spawn, teamId, index);
            });
        });

        console.log(`[VEHICLES] Spawned vehicles for zone: ${zoneName}`);
    }

    spawnVehicle(spawnData, teamId, index) {
        const vType = VEHICLE_TYPES[spawnData.type];
        if (!vType) return;

        try {
            const vehicle = mp.vehicles.new(
                mp.joaat(vType.model),
                new mp.Vector3(spawnData.x, spawnData.y, spawnData.z),
                {
                    heading: spawnData.heading,
                    numberPlate: `${teamId}-${spawnData.type}-${index}`,
                    color: [[teamId === 1 ? 0 : 100, teamId === 1 ? 100 : 0, teamId === 1 ? 255 : 0], [0, 0, 0]],
                    locked: false,
                    engine: false,
                    dimension: 0
                }
            );

            const vehicleData = {
                vehicle: vehicle,
                type: spawnData.type,
                typeData: vType,
                team: teamId,
                health: vType.maxHealth,
                maxHealth: vType.maxHealth,
                fuel: vType.maxFuel,
                maxFuel: vType.maxFuel,
                spawnPos: { x: spawnData.x, y: spawnData.y, z: spawnData.z },
                heading: spawnData.heading,
                destroyed: false,
                occupants: [],
                lastDriver: null,
                spawnTime: Date.now()
            };

            this.vehicles.set(vehicle.id, vehicleData);
            this.activeVehicles[teamId].push(vehicle.id);

            // Broadcast to clients
            mp.players.forEach(player => {
                player.call('vehicleSpawned', [
                    vehicle.id,
                    vType.name,
                    teamId,
                    JSON.stringify({ x: spawnData.x, y: spawnData.y, z: spawnData.z })
                ]);
            });

        } catch (error) {
            console.error(`[VEHICLES] Error spawning vehicle:`, error);
        }
    }

    // Player enters vehicle
    onPlayerEnterVehicle(player, vehicle, seat) {
        const vData = this.vehicles.get(vehicle.id);
        if (!vData) return;

        const playerData = this.gameState.players.get(player.id);
        if (!playerData) return;

        // Check team
        if (vData.team !== playerData.team) {
            player.call('showNotification', ['This vehicle belongs to enemy team!', 'error']);
            player.removeFromVehicle();
            return;
        }

        // Check if destroyed
        if (vData.destroyed) {
            player.call('showNotification', ['Vehicle is destroyed!', 'error']);
            player.removeFromVehicle();
            return;
        }

        // Add to occupants
        if (!vData.occupants.find(p => p.id === player.id)) {
            vData.occupants.push(player);
        }

        // Driver
        if (seat === 0) {
            vData.lastDriver = player;
            player.call('showNotification', [`Driving ${vData.typeData.name}`, 'info']);
            player.call('showVehicleHUD', [
                JSON.stringify({
                    name: vData.typeData.name,
                    health: vData.health,
                    maxHealth: vData.maxHealth,
                    fuel: vData.fuel,
                    maxFuel: vData.maxFuel
                })
            ]);
        }

        console.log(`[VEHICLES] ${player.name} entered ${vData.typeData.name} (seat ${seat})`);
    }

    // Player exits vehicle
    onPlayerExitVehicle(player, vehicle) {
        const vData = this.vehicles.get(vehicle.id);
        if (!vData) return;

        vData.occupants = vData.occupants.filter(p => p.id !== player.id);
        player.call('hideVehicleHUD');

        console.log(`[VEHICLES] ${player.name} exited ${vData.typeData.name}`);
    }

    // Damage vehicle
    damageVehicle(vehicle, damage, attacker) {
        const vData = this.vehicles.get(vehicle.id);
        if (!vData || vData.destroyed) return;

        vData.health -= damage;

        // Update HUD for occupants
        vData.occupants.forEach(occupant => {
            if (mp.players.exists(occupant)) {
                occupant.call('updateVehicleHealth', [vData.health, vData.maxHealth]);
            }
        });

        // Check if destroyed
        if (vData.health <= 0) {
            this.destroyVehicle(vehicle, attacker);
        }
    }

    // Destroy vehicle
    destroyVehicle(vehicle, attacker) {
        const vData = this.vehicles.get(vehicle.id);
        if (!vData || vData.destroyed) return;

        vData.destroyed = true;
        vData.health = 0;

        // Explosion effect (client-side)
        mp.players.forEach(player => {
            const pos = vehicle.position;
            player.call('createExplosion', [pos.x, pos.y, pos.z, 5, 10.0]);
        });

        // Eject and damage occupants
        vData.occupants.forEach(occupant => {
            if (mp.players.exists(occupant)) {
                occupant.removeFromVehicle();
                occupant.health -= 50; // Explosion damage
                occupant.call('showNotification', ['Vehicle destroyed!', 'error']);
            }
        });

        // Award kill to attacker
        if (attacker && mp.players.exists(attacker)) {
            const attackerData = this.gameState.players.get(attacker.id);
            if (attackerData) {
                attackerData.kills += vData.occupants.length;
                this.gameState.teamScores[attackerData.team] += 50;
                attacker.call('showNotification', [`+50 Vehicle Destroyed!`, 'success']);
            }
        }

        // Schedule respawn
        setTimeout(() => {
            this.respawnVehicle(vehicle.id);
        }, vData.typeData.spawnTime * 1000);

        console.log(`[VEHICLES] ${vData.typeData.name} destroyed`);
    }

    // Repair vehicle (Engineer only)
    repairVehicle(player, vehicle) {
        const playerData = this.gameState.players.get(player.id);
        if (!playerData || playerData.role !== 'engineer') {
            player.call('showNotification', ['Only Engineers can repair vehicles!', 'error']);
            return;
        }

        const vData = this.vehicles.get(vehicle.id);
        if (!vData) return;

        if (vData.destroyed) {
            player.call('showNotification', ['Vehicle is destroyed! Cannot repair.', 'error']);
            return;
        }

        if (vData.health >= vData.maxHealth) {
            player.call('showNotification', ['Vehicle is already at full health!', 'info']);
            return;
        }

        // Repair over time (5 seconds)
        player.call('showNotification', ['Repairing vehicle...', 'info']);
        
        let repairProgress = 0;
        const repairInterval = setInterval(() => {
            if (!mp.players.exists(player) || !mp.vehicles.exists(vehicle)) {
                clearInterval(repairInterval);
                return;
            }

            const dist = player.position.subtract(vehicle.position).length();
            if (dist > 5) {
                clearInterval(repairInterval);
                player.call('showNotification', ['Repair cancelled - too far!', 'error']);
                return;
            }

            repairProgress++;
            vData.health = Math.min(vData.maxHealth, vData.health + (vData.maxHealth * 0.2));

            if (repairProgress >= 5 || vData.health >= vData.maxHealth) {
                clearInterval(repairInterval);
                player.call('showNotification', ['Vehicle repaired!', 'success']);
                console.log(`[VEHICLES] ${player.name} repaired ${vData.typeData.name}`);
            }
        }, 1000);
    }

    // Refuel vehicle
    refuelVehicle(vehicle, amount) {
        const vData = this.vehicles.get(vehicle.id);
        if (!vData) return;

        vData.fuel = Math.min(vData.maxFuel, vData.fuel + amount);
    }

    // Respawn destroyed vehicle
    respawnVehicle(vehicleId) {
        const vData = this.vehicles.get(vehicleId);
        if (!vData) return;

        // Remove old vehicle
        if (mp.vehicles.exists(vData.vehicle)) {
            vData.vehicle.destroy();
        }

        // Create new vehicle at spawn
        const vehicle = mp.vehicles.new(
            mp.joaat(vData.typeData.model),
            new mp.Vector3(vData.spawnPos.x, vData.spawnPos.y, vData.spawnPos.z),
            {
                heading: vData.heading,
                numberPlate: vData.vehicle.numberPlate,
                locked: false,
                engine: false
            }
        );

        // Reset data
        vData.vehicle = vehicle;
        vData.health = vData.maxHealth;
        vData.fuel = vData.maxFuel;
        vData.destroyed = false;
        vData.occupants = [];

        this.vehicles.set(vehicle.id, vData);

        mp.players.forEach(player => {
            player.call('showNotification', [`${vData.typeData.name} respawned at base`, 'info']);
        });

        console.log(`[VEHICLES] ${vData.typeData.name} respawned`);
    }

    // Update loop (fuel consumption)
    update() {
        this.vehicles.forEach((vData, vehicleId) => {
            if (vData.destroyed || !mp.vehicles.exists(vData.vehicle)) return;

            const vehicle = vData.vehicle;

            // Fuel consumption when engine is on
            if (vehicle.engine) {
                vData.fuel -= vData.typeData.fuelConsumption;

                if (vData.fuel <= 0) {
                    vData.fuel = 0;
                    vehicle.engine = false;

                    // Notify driver
                    vData.occupants.forEach(occupant => {
                        if (mp.players.exists(occupant)) {
                            occupant.call('showNotification', ['Out of fuel!', 'error']);
                        }
                    });
                }

                // Update HUD
                if (vData.occupants.length > 0) {
                    const driver = vData.occupants.find(p => vehicle.getOccupant(0) === p);
                    if (driver && mp.players.exists(driver)) {
                        driver.call('updateVehicleFuel', [vData.fuel, vData.maxFuel]);
                    }
                }
            }
        });
    }
}

module.exports = VehicleManager;
