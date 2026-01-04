// ============================================================================
// MAP OBJECTS SYSTEM
// Система создания объектов на карте: баррикады, вышки, здания
// ============================================================================

class MapObjectsManager {
    constructor() {
        this.objects = [];
        this.objectTypes = this.getObjectTypes();
        console.log('[MAP OBJECTS] Manager initialized');
    }

    // Типы объектов с моделями GTA V
    getObjectTypes() {
        return {
            // БАРРИКАДЫ И ЗАГРАЖДЕНИЯ
            barrier_concrete: {
                model: 'prop_barrier_work05',
                name: 'Бетонный барьер',
                category: 'defense'
            },
            barrier_metal: {
                model: 'prop_barrier_work06a',
                name: 'Металлический барьер',
                category: 'defense'
            },
            sandbags: {
                model: 'prop_barrier_wat_03b',
                name: 'Мешки с песком',
                category: 'defense'
            },
            roadblock: {
                model: 'prop_roadcone02a',
                name: 'Дорожный блок',
                category: 'defense'
            },
            
            // ВОЕННЫЕ УКРЕПЛЕНИЯ
            watchtower: {
                model: 'prop_air_bigradar',
                name: 'Сторожевая вышка',
                category: 'structure'
            },
            bunker_small: {
                model: 'prop_container_01a',
                name: 'Малый бункер',
                category: 'structure'
            },
            bunker_large: {
                model: 'prop_container_04a',
                name: 'Большой бункер',
                category: 'structure'
            },
            military_tent: {
                model: 'prop_gazebo_03',
                name: 'Военная палатка',
                category: 'structure'
            },
            
            // ТЕХНИКА
            supply_crate: {
                model: 'prop_box_guncase_03a',
                name: 'Ящик с припасами',
                category: 'supply'
            },
            ammo_box: {
                model: 'prop_box_ammo03a',
                name: 'Ящик с патронами',
                category: 'supply'
            },
            medical_kit: {
                model: 'prop_ld_health_pack',
                name: 'Медицинский ящик',
                category: 'supply'
            },
            
            // ТРАНСПОРТ (для декораций)
            military_truck: {
                model: 'barracks',
                name: 'Военный грузовик',
                category: 'vehicle'
            },
            apc: {
                model: 'apc',
                name: 'БТР',
                category: 'vehicle'
            },
            tank: {
                model: 'rhino',
                name: 'Танк',
                category: 'vehicle'
            },
            helicopter: {
                model: 'buzzard',
                name: 'Вертолёт',
                category: 'vehicle'
            }
        };
    }

    // Создание зоны боевых действий
    createBattlefield(centerX, centerY, centerZ, radius = 500) {
        console.log(`[MAP OBJECTS] Creating battlefield at (${centerX}, ${centerY}, ${centerZ})`);
        
        // Создаём периметр обороны
        this.createDefensePerimeter(centerX, centerY, centerZ, radius);
        
        // Создаём объективы с укреплениями
        this.createObjectiveZone('ALPHA', centerX - 200, centerY - 200, centerZ);
        this.createObjectiveZone('BRAVO', centerX, centerY, centerZ);
        this.createObjectiveZone('CHARLIE', centerX + 200, centerY + 200, centerZ);
        
        // Создаём базы команд
        this.createTeamBase(1, centerX - 400, centerY - 400, centerZ);
        this.createTeamBase(2, centerX + 400, centerY + 400, centerZ);
        
        console.log(`[MAP OBJECTS] Battlefield created with ${this.objects.length} objects`);
    }

    // Периметр обороны
    createDefensePerimeter(centerX, centerY, centerZ, radius) {
        const segments = 16;
        for (let i = 0; i < segments; i++) {
            const angle = (Math.PI * 2 * i) / segments;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            // Бетонные барьеры по периметру
            this.createObject('barrier_concrete', x, y, centerZ, 0, 0, angle * (180 / Math.PI));
            
            // Мешки с песком каждые 2 сегмента
            if (i % 2 === 0) {
                this.createObject('sandbags', x + Math.cos(angle) * 5, y + Math.sin(angle) * 5, centerZ, 0, 0, angle * (180 / Math.PI));
            }
        }
    }

    // Зона объектива с укреплениями
    createObjectiveZone(name, x, y, z) {
        console.log(`[MAP OBJECTS] Creating objective zone: ${name} at (${x}, ${y}, ${z})`);
        
        // Центральное здание/бункер
        this.createObject('bunker_large', x, y, z, 0, 0, 0);
        
        // Сторожевые вышки вокруг
        const towerPositions = [
            [x - 30, y - 30, z],
            [x + 30, y - 30, z],
            [x - 30, y + 30, z],
            [x + 30, y + 30, z]
        ];
        
        towerPositions.forEach(pos => {
            this.createObject('watchtower', pos[0], pos[1], pos[2], 0, 0, 0);
        });
        
        // Баррикады
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            const bx = x + Math.cos(angle) * 20;
            const by = y + Math.sin(angle) * 20;
            this.createObject('barrier_metal', bx, by, z, 0, 0, angle * (180 / Math.PI));
        }
        
        // Ящики с припасами
        this.createObject('supply_crate', x - 5, y - 5, z, 0, 0, 0);
        this.createObject('ammo_box', x + 5, y - 5, z, 0, 0, 0);
        this.createObject('medical_kit', x - 5, y + 5, z, 0, 0, 0);
    }

    // База команды
    createTeamBase(teamId, x, y, z) {
        console.log(`[MAP OBJECTS] Creating team ${teamId} base at (${x}, ${y}, ${z})`);
        
        // Главное здание
        this.createObject('bunker_large', x, y, z, 0, 0, 0);
        this.createObject('bunker_small', x - 20, y, z, 0, 0, 0);
        this.createObject('bunker_small', x + 20, y, z, 0, 0, 0);
        
        // Военные палатки
        this.createObject('military_tent', x - 15, y + 15, z, 0, 0, 45);
        this.createObject('military_tent', x + 15, y + 15, z, 0, 0, -45);
        
        // Вышки
        this.createObject('watchtower', x - 40, y - 40, z, 0, 0, 0);
        this.createObject('watchtower', x + 40, y - 40, z, 0, 0, 0);
        this.createObject('watchtower', x - 40, y + 40, z, 0, 0, 0);
        this.createObject('watchtower', x + 40, y + 40, z, 0, 0, 0);
        
        // Защитный периметр
        const baseRadius = 50;
        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 * i) / 12;
            const bx = x + Math.cos(angle) * baseRadius;
            const by = y + Math.sin(angle) * baseRadius;
            this.createObject('sandbags', bx, by, z, 0, 0, angle * (180 / Math.PI));
        }
        
        // Техника для декорации
        this.createObject('military_truck', x - 30, y - 20, z, 0, 0, 90);
        this.createObject('military_truck', x + 30, y - 20, z, 0, 0, -90);
        this.createObject('apc', x, y - 30, z, 0, 0, 0);
        
        // Припасы
        for (let i = 0; i < 5; i++) {
            const sx = x - 10 + (i * 5);
            this.createObject('supply_crate', sx, y + 25, z, 0, 0, 0);
        }
    }

    // Создание одного объекта
    createObject(type, x, y, z, rx = 0, ry = 0, rz = 0) {
        const objType = this.objectTypes[type];
        if (!objType) {
            console.error(`[MAP OBJECTS] Unknown object type: ${type}`);
            return null;
        }
        
        try {
            const obj = mp.objects.new(mp.joaat(objType.model), new mp.Vector3(x, y, z), {
                rotation: new mp.Vector3(rx, ry, rz),
                alpha: 255,
                dimension: 0
            });
            
            this.objects.push({
                id: this.objects.length,
                type: type,
                object: obj,
                position: { x, y, z },
                rotation: { rx, ry, rz }
            });
            
            return obj;
        } catch (error) {
            console.error(`[MAP OBJECTS] Failed to create object ${type}:`, error.message);
            return null;
        }
    }

    // Удаление всех объектов
    destroyAll() {
        this.objects.forEach(obj => {
            if (obj.object) {
                obj.object.destroy();
            }
        });
        this.objects = [];
        console.log('[MAP OBJECTS] All objects destroyed');
    }

    // Получение объектов в радиусе
    getObjectsInRadius(x, y, z, radius) {
        return this.objects.filter(obj => {
            const dx = obj.position.x - x;
            const dy = obj.position.y - y;
            const dz = obj.position.z - z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            return dist <= radius;
        });
    }
}

// Предустановленные карты
const MAPS = {
    desert_conflict: {
        name: 'Desert Conflict',
        center: { x: 0, y: 0, z: 70 },
        radius: 600,
        weather: 'CLEAR',
        time: [12, 0]
    },
    urban_warfare: {
        name: 'Urban Warfare',
        center: { x: -1041, y: -2746, z: 21 },
        radius: 500,
        weather: 'CLOUDS',
        time: [18, 0]
    },
    forest_ambush: {
        name: 'Forest Ambush',
        center: { x: -234, y: 4567, z: 40 },
        radius: 550,
        weather: 'RAIN',
        time: [6, 0]
    },
    mountain_stronghold: {
        name: 'Mountain Stronghold',
        center: { x: 2489, y: 3554, z: 50 },
        radius: 650,
        weather: 'FOG',
        time: [21, 0]
    }
};

module.exports = { MapObjectsManager, MAPS };
