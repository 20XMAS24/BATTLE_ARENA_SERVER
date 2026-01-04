// ============================================================================
// CLIENT-SIDE VEHICLE SYSTEM
// Handles visual effects, HUD, and vehicle interactions
// ============================================================================

let vehicleHudBrowser = null;
let vehicleMarkers = new Map();
let currentVehicle = null;

// ============================================================================
// VEHICLE HUD MANAGEMENT
// ============================================================================

mp.events.add('showVehicleHUD', (dataString) => {
    const data = JSON.parse(dataString);
    
    if (!vehicleHudBrowser) {
        vehicleHudBrowser = mp.browsers.new('package://cef/vehicle-hud.html');
    }
    
    setTimeout(() => {
        vehicleHudBrowser.execute(`showVehicleHUD(${JSON.stringify(data)})`);
    }, 100);
});

mp.events.add('hideVehicleHUD', () => {
    if (vehicleHudBrowser) {
        vehicleHudBrowser.execute('hideVehicleHUD()');
    }
});

mp.events.add('updateVehicleHealth', (health, maxHealth) => {
    if (vehicleHudBrowser) {
        vehicleHudBrowser.execute(`updateVehicleHealth(${health}, ${maxHealth})`);
    }
});

mp.events.add('updateVehicleFuel', (fuel, maxFuel) => {
    if (vehicleHudBrowser) {
        vehicleHudBrowser.execute(`updateVehicleFuel(${fuel}, ${maxFuel})`);
    }
});

// ============================================================================
// VEHICLE SPAWN NOTIFICATION
// ============================================================================

mp.events.add('vehicleSpawned', (vehicleId, vehicleName, teamId, positionString) => {
    const position = JSON.parse(positionString);
    
    // Create map blip for vehicle spawn
    const blip = mp.blips.new(225, new mp.Vector3(position.x, position.y, position.z), {
        name: vehicleName,
        color: teamId === 1 ? 3 : 1, // Blue for team 1, red for team 2
        scale: 0.8,
        shortRange: true
    });
    
    vehicleMarkers.set(vehicleId, blip);
    
    mp.gui.chat.push(`Vehicle spawned: ${vehicleName}`);
});

// ============================================================================
// EXPLOSION EFFECTS
// ============================================================================

mp.events.add('createExplosion', (x, y, z, type, damageScale) => {
    mp.game.fire.addExplosion(x, y, z, type, damageScale, true, false, 1.0);
    
    // Screen shake for nearby players
    const playerPos = mp.players.local.position;
    const explosionPos = new mp.Vector3(x, y, z);
    const distance = playerPos.subtract(explosionPos).length();
    
    if (distance < 100) {
        // Shake intensity based on distance
        const intensity = Math.max(0, 1 - (distance / 100));
        mp.game.gameplay.setGameplayCamShakeAmplitude(intensity * 5);
        mp.game.gameplay.shakeGameplayCam('LARGE_EXPLOSION_SHAKE', intensity);
        
        // Stop shake after 1 second
        setTimeout(() => {
            mp.game.gameplay.stopGameplayCamShaking(true);
        }, 1000);
    }
});

// ============================================================================
// VEHICLE MARKER SYSTEM (3D above vehicle)
// ============================================================================

const VEHICLE_ICONS = {
    'JEEP': '🚙',
    'APC': '🚚',
    'TANK': '🛡️',
    'TRUCK': '🚛',
    'HELI': '🚁'
};

mp.events.add('render', () => {
    // Don't render if in menu or dead
    if (!mp.players.local || mp.players.local.getVariable('inMenu')) return;
    
    // Draw markers above all vehicles
    mp.vehicles.forEachInStreamRange(vehicle => {
        if (!vehicle || !vehicle.handle) return;
        
        const vPos = vehicle.position;
        const playerPos = mp.players.local.position;
        const distance = playerPos.subtract(vPos).length();
        
        // Only show markers within 200m
        if (distance > 200) return;
        
        // Get screen coordinates
        const screenPos = mp.game.graphics.world3dToScreen2d(vPos.x, vPos.y, vPos.z + 2.0);
        if (!screenPos) return;
        
        // Draw vehicle type icon
        const vehicleData = vehicle.getVariable('vehicleType');
        if (vehicleData) {
            const icon = VEHICLE_ICONS[vehicleData] || '🚗';
            
            mp.game.graphics.drawText(
                icon,
                [screenPos.x, screenPos.y],
                {
                    font: 0,
                    color: [255, 255, 255, 200],
                    scale: [0.5, 0.5],
                    outline: true
                }
            );
            
            // Draw distance below icon
            mp.game.graphics.drawText(
                `${Math.round(distance)}m`,
                [screenPos.x, screenPos.y + 0.02],
                {
                    font: 0,
                    color: [200, 200, 200, 150],
                    scale: [0.3, 0.3],
                    outline: true
                }
            );
        }
    });
});

// ============================================================================
// VEHICLE ENTRY PROMPT
// ============================================================================

let nearbyVehicle = null;
let entryPromptShown = false;

setInterval(() => {
    if (!mp.players.local || mp.players.local.vehicle) {
        if (entryPromptShown) {
            mp.game.ui.hideHudComponentThisFrame(6); // Hide help text
            entryPromptShown = false;
        }
        nearbyVehicle = null;
        return;
    }
    
    const playerPos = mp.players.local.position;
    let closestVehicle = null;
    let closestDistance = 5; // 5 meter range
    
    mp.vehicles.forEachInStreamRange(vehicle => {
        if (!vehicle || !vehicle.handle) return;
        
        const distance = playerPos.subtract(vehicle.position).length();
        if (distance < closestDistance) {
            closestDistance = distance;
            closestVehicle = vehicle;
        }
    });
    
    if (closestVehicle !== nearbyVehicle) {
        nearbyVehicle = closestVehicle;
        
        if (nearbyVehicle) {
            entryPromptShown = true;
            mp.game.controls.disableControlAction(0, 23, true); // Disable F
        } else {
            entryPromptShown = false;
        }
    }
    
    // Show prompt
    if (entryPromptShown && nearbyVehicle) {
        mp.game.graphics.drawText(
            'Press ~INPUT_ENTER~ to enter vehicle',
            [0.5, 0.9],
            {
                font: 4,
                color: [255, 255, 255, 255],
                scale: [0.4, 0.4],
                outline: true,
                centre: true
            }
        );
    }
}, 100);

// ============================================================================
// VEHICLE HEALTH VISUAL EFFECTS
// ============================================================================

mp.events.add('entityStreamIn', (entity) => {
    if (entity.type === 'vehicle') {
        // Set vehicle dirt level based on health
        checkVehicleVisuals(entity);
    }
});

function checkVehicleVisuals(vehicle) {
    if (!vehicle || !vehicle.handle) return;
    
    const health = vehicle.getHealth();
    const maxHealth = 1000;
    const healthPercent = (health / maxHealth) * 100;
    
    // Add visual damage based on health
    if (healthPercent < 30) {
        vehicle.setDirtLevel(15); // Very dirty/damaged
        
        // Create smoke effect if engine is damaged
        if (!vehicle.getVariable('smokeFX')) {
            vehicle.setVariable('smokeFX', true);
        }
    } else if (healthPercent < 60) {
        vehicle.setDirtLevel(8); // Moderately dirty
    } else {
        vehicle.setDirtLevel(0); // Clean
    }
}

// Update vehicle visuals every 2 seconds
setInterval(() => {
    mp.vehicles.forEachInStreamRange(vehicle => {
        checkVehicleVisuals(vehicle);
    });
}, 2000);

// ============================================================================
// VEHICLE SOUNDS
// ============================================================================

mp.events.add('playerEnterVehicle', (vehicle, seat) => {
    if (seat === 0) {
        // Driver seat - play engine start sound
        mp.game.audio.playSoundFrontend(-1, 'SELECT', 'HUD_FRONTEND_DEFAULT_SOUNDSET', false);
    }
});

mp.events.add('playerLeaveVehicle', (vehicle, seat) => {
    // Play door close sound
    mp.game.audio.playSoundFrontend(-1, 'CANCEL', 'HUD_FRONTEND_DEFAULT_SOUNDSET', false);
});

// ============================================================================
// LOW FUEL WARNING
// ============================================================================

let lowFuelWarning = false;
let fuelWarningInterval = null;

mp.events.add('updateVehicleFuel', (fuel, maxFuel) => {
    const fuelPercent = (fuel / maxFuel) * 100;
    
    if (fuelPercent < 20 && !lowFuelWarning) {
        lowFuelWarning = true;
        
        // Beep every 3 seconds
        fuelWarningInterval = setInterval(() => {
            mp.game.audio.playSoundFrontend(-1, 'CHECKPOINT_MISSED', 'HUD_MINI_GAME_SOUNDSET', false);
        }, 3000);
    } else if (fuelPercent >= 20 && lowFuelWarning) {
        lowFuelWarning = false;
        
        if (fuelWarningInterval) {
            clearInterval(fuelWarningInterval);
            fuelWarningInterval = null;
        }
    }
});

// ============================================================================
// VEHICLE COMMANDS
// ============================================================================

mp.keys.bind(0x52, true, () => { // R key - Repair (when near vehicle)
    const vehicle = mp.players.local.vehicle;
    if (!vehicle) {
        // Check if near a vehicle
        const playerPos = mp.players.local.position;
        let nearVehicle = null;
        
        mp.vehicles.forEachInStreamRange(veh => {
            const distance = playerPos.subtract(veh.position).length();
            if (distance < 5) {
                nearVehicle = veh;
            }
        });
        
        if (nearVehicle) {
            mp.events.callRemote('repair');
        }
    }
});

mp.keys.bind(0x48, false, () => { // H key - Toggle headlights
    const vehicle = mp.players.local.vehicle;
    if (vehicle && mp.players.local.vehicle.getPedInSeat(-1) === mp.players.local.handle) {
        const state = vehicle.getLightsState();
        vehicle.setLights(state === 0 ? 2 : 0);
    }
});

// ============================================================================
// CLEANUP
// ============================================================================

mp.events.add('playerQuit', () => {
    if (vehicleHudBrowser) {
        vehicleHudBrowser.destroy();
        vehicleHudBrowser = null;
    }
    
    vehicleMarkers.forEach(blip => {
        if (mp.blips.exists(blip)) {
            blip.destroy();
        }
    });
    vehicleMarkers.clear();
    
    if (fuelWarningInterval) {
        clearInterval(fuelWarningInterval);
    }
});

console.log('[VEHICLES] Client-side vehicle system loaded');
