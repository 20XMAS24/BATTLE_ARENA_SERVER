// ============================================================================
// MAIN MENU - Client Controller
// ============================================================================

console.log('[MAIN MENU] Script loading...');

let mainMenuBrowser = null;

// Show main menu
mp.events.add('showMainMenu', () => {
    console.log('[MAIN MENU] Opening main menu...');
    
    if (mainMenuBrowser) {
        mainMenuBrowser.destroy();
    }
    
    mainMenuBrowser = mp.browsers.new('package://cef/main-menu.html');
    mp.gui.cursor.visible = true;
    mp.gui.chat.show(false);
    
    console.log('[MAIN MENU] Main menu opened');
});

// Hide main menu
mp.events.add('hideMainMenu', () => {
    console.log('[MAIN MENU] Closing main menu...');
    
    if (mainMenuBrowser) {
        mainMenuBrowser.destroy();
        mainMenuBrowser = null;
    }
    
    mp.gui.cursor.visible = false;
    mp.gui.chat.show(true);
});

// Player selected team and mode
mp.events.add('selectTeamAndMode', (teamId, gameMode) => {
    console.log(`[MAIN MENU] Selected Team ${teamId}, Mode: ${gameMode}`);
    mp.events.callRemote('selectTeamAndMode', teamId, gameMode);
    mp.events.call('hideMainMenu');
});

// Close menu
mp.events.add('closeMainMenu', () => {
    mp.events.call('hideMainMenu');
});

// Request server stats
mp.events.add('requestServerStats', () => {
    mp.events.callRemote('requestServerStats');
});

// Update server stats from server
mp.events.add('updateMainMenuStats', (statsJson) => {
    if (mainMenuBrowser) {
        mainMenuBrowser.execute(`updateServerStats('${statsJson}')`);
    }
});

console.log('[MAIN MENU] Script loaded');
