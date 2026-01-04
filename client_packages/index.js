// ============================================================================
// BATTLE ARENA - Client Side Main
// Визуальная система, GUI, маркеры
// ============================================================================

let playerTeam = null;
let playerRole = null;
let playerSquad = null;
let hudBrowser = null;
let menuBrowser = null;
let showingMenu = false;

// ============================================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================================

mp.events.add('playerReady', () => {
    console.log('[CLIENT] Player ready, initializing UI...');
    
    // Создаём HUD
    createHUD();
    
    // Показываем меню выбора команды
    setTimeout(() => {
        showTeamSelectionMenu();
    }, 1000);
    
    // Инициализируем маркеры
    initializeMarkers();
});

// ============================================================================
// HUD СИСТЕМА
// ============================================================================

function createHUD() {
    if (hudBrowser) return;
    
    hudBrowser = mp.browsers.new('package://cef/hud.html');
    
    console.log('[CLIENT] HUD created');
}

function updateHUD(data) {
    if (!hudBrowser) return;
    
    hudBrowser.execute(`updateHUD(${JSON.stringify(data)})`);
}

// Обновление HUD каждую секунду
setInterval(() => {
    if (playerTeam && mp.players.local) {
        const data = {
            health: mp.players.local.getHealth(),
            armor: mp.players.local.getArmour(),
            team: playerTeam,
            role: playerRole,
            squad: playerSquad
        };
        updateHUD(data);
    }
}, 1000);

// ============================================================================
// МЕНЮ ВЫБОРА КОМАНДЫ
// ============================================================================

function showTeamSelectionMenu() {
    if (menuBrowser) {
        menuBrowser.destroy();
    }
    
    menuBrowser = mp.browsers.new('package://cef/team_menu.html');
    
    mp.gui.cursor.show(true, true);
    mp.players.local.freezePosition(true);
    showingMenu = true;
    
    console.log('[CLIENT] Team selection menu shown');
}

function hideMenu() {
    if (menuBrowser) {
        menuBrowser.destroy();
        menuBrowser = null;
    }
    
    mp.gui.cursor.show(false, false);
    mp.players.local.freezePosition(false);
    showingMenu = false;
}

// ============================================================================
// СОБЫТИЯ ИЗ CEF (Web UI)
// ============================================================================

mp.events.add('selectTeam', (teamId) => {
    console.log('[CLIENT] Selected team:', teamId);
    playerTeam = teamId;
    
    // Отправляем на сервер
    mp.events.callRemote('client:selectTeam', teamId);
    
    // Показываем меню выбора роли
    showRoleSelectionMenu();
});

mp.events.add('selectRole', (roleName) => {
    console.log('[CLIENT] Selected role:', roleName);
    playerRole = roleName;
    
    // Отправляем на сервер
    mp.events.callRemote('client:selectRole', roleName);
    
    // Закрываем меню
    hideMenu();
    
    // Показываем уведомление
    showNotification(`Вы присоединились к команде ${playerTeam} как ${roleName}`, 'success');
});

// ============================================================================
// МЕНЮ ВЫБОРА РОЛИ
// ============================================================================

function showRoleSelectionMenu() {
    if (menuBrowser) {
        menuBrowser.destroy();
    }
    
    menuBrowser = mp.browsers.new('package://cef/role_menu.html');
    
    console.log('[CLIENT] Role selection menu shown');
}

// ============================================================================
// СИСТЕМА МАРКЕРОВ
// ============================================================================

let objectiveMarkers = [];
let fobMarkers = [];
let playerMarkers = new Map();

function initializeMarkers() {
    console.log('[CLIENT] Markers system initialized');
}

// Создание маркера для объектива
mp.events.add('createObjectiveMarker', (objId, name, x, y, z, team) => {
    const blip = mp.blips.new(1, new mp.Vector3(x, y, z), {
        name: name,
        color: team === 1 ? 38 : 1, // Синий или красный
        alpha: 255,
        scale: 1.0,
        shortRange: false
    });
    
    objectiveMarkers.push({ id: objId, blip: blip });
    
    console.log(`[CLIENT] Created objective marker: ${name}`);
});

// Обновление маркера объектива
mp.events.add('updateObjectiveMarker', (objId, team) => {
    const marker = objectiveMarkers.find(m => m.id === objId);
    if (marker) {
        marker.blip.setColour(team === 1 ? 38 : team === 2 ? 1 : 47); // Синий/Красный/Нейтральный
    }
});

// Создание маркера FOB
mp.events.add('createFOBMarker', (fobId, x, y, z, team) => {
    const blip = mp.blips.new(564, new mp.Vector3(x, y, z), {
        name: 'FOB',
        color: team === 1 ? 38 : 1,
        alpha: 255,
        scale: 0.8,
        shortRange: false
    });
    
    fobMarkers.push({ id: fobId, blip: blip });
    
    console.log(`[CLIENT] Created FOB marker`);
});

// ============================================================================
// СИСТЕМА УВЕДОМЛЕНИЙ
// ============================================================================

function showNotification(message, type = 'info') {
    if (!hudBrowser) return;
    
    hudBrowser.execute(`showNotification('${message}', '${type}')`);
}

mp.events.add('showNotification', (message, type) => {
    showNotification(message, type);
});

// ============================================================================
// 3D ТЕКСТ НАД ОБЪЕКТИВАМИ
// ============================================================================

let textLabels = [];

mp.events.add('createObjectiveLabel', (x, y, z, text) => {
    const label = mp.labels.new(text, new mp.Vector3(x, y, z + 5), {
        los: true,
        font: 4,
        drawDistance: 100.0,
        color: [255, 255, 255, 255]
    });
    
    textLabels.push(label);
});

// ============================================================================
// КЛАВИШИ
// ============================================================================

mp.keys.bind(0x4D, true, () => { // M - Map
    if (!showingMenu) {
        showMap();
    }
});

mp.keys.bind(0x09, true, () => { // TAB - Scoreboard
    if (!showingMenu) {
        showScoreboard();
    }
});

mp.keys.bind(0x54, true, () => { // T - Team menu
    if (!showingMenu && playerTeam) {
        showTeamChat();
    }
});

function showMap() {
    console.log('[CLIENT] Opening map...');
    // TODO: Implement map UI
}

function showScoreboard() {
    console.log('[CLIENT] Opening scoreboard...');
    // TODO: Implement scoreboard
}

function showTeamChat() {
    console.log('[CLIENT] Opening team chat...');
    // TODO: Implement team chat
}

// ============================================================================
// СОБЫТИЯ С СЕРВЕРА
// ============================================================================

mp.events.add('server:matchStarted', () => {
    showNotification('⚔️ МАТЧ НАЧАЛСЯ! Захватывайте объективы!', 'success');
});

mp.events.add('server:matchEnded', (winnerTeam) => {
    showNotification(`🏆 МАТЧ ЗАВЕРШЁН! Победила команда ${winnerTeam}`, 'success');
});

mp.events.add('server:objectiveCaptured', (objName, teamName) => {
    showNotification(`📍 ${objName} захвачен командой ${teamName}!`, 'warning');
});

mp.events.add('server:playerKilled', (killerName, victimName) => {
    if (victimName === mp.players.local.name) {
        showNotification(`☠️ Вас убил ${killerName}`, 'error');
    }
});

// ============================================================================
// КАМЕРА СПАВНА
// ============================================================================

let spawnCamera = null;

mp.events.add('startSpawnCamera', (x, y, z) => {
    if (spawnCamera) {
        spawnCamera.destroy();
    }
    
    spawnCamera = mp.cameras.new('default', new mp.Vector3(x, y, z + 50), new mp.Vector3(-20, 0, 0), 60);
    spawnCamera.pointAtCoord(x, y, z);
    spawnCamera.setActive(true);
    
    mp.game.cam.renderScriptCams(true, false, 0, true, false);
});

mp.events.add('stopSpawnCamera', () => {
    if (spawnCamera) {
        spawnCamera.setActive(false);
        mp.game.cam.renderScriptCams(false, false, 0, true, false);
        spawnCamera.destroy();
        spawnCamera = null;
    }
});

// ============================================================================
// DEBUG
// ============================================================================

mp.events.add('render', () => {
    // Отрисовка дебаг информации
    if (playerTeam && playerRole) {
        mp.game.graphics.drawText(`Team: ${playerTeam} | Role: ${playerRole}`, [0.5, 0.95], {
            font: 4,
            color: [255, 255, 255, 255],
            scale: [0.4, 0.4],
            outline: true
        });
    }
});

console.log('[CLIENT] Battle Arena client initialized');
