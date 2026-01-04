// ============================================================================
// ROLE SELECTION - JavaScript Controller with Event Delegation
// ============================================================================

console.log('[ROLE SELECT] Script loading...');

const roleSlots = {
    'squad_leader': { max: 1, current: 0 },
    'rifleman': { max: 3, current: 0 },
    'medic': { max: 1, current: 0 },
    'engineer': { max: 1, current: 0 },
    'marksman': { max: 1, current: 0 },
    'mg_gunner': { max: 1, current: 0 },
    'at_gunner': { max: 1, current: 0 }
};

function selectRole(roleName) {
    console.log(`[ROLE SELECT] ===== ROLE SELECTED =====`);
    console.log(`[ROLE SELECT] Role: ${roleName}`);
    console.log(`[ROLE SELECT] MP object exists: ${typeof mp !== 'undefined'}`);
    
    // Check if role is available
    const slot = roleSlots[roleName];
    if (slot && slot.current >= slot.max) {
        console.log(`[ROLE SELECT] ERROR: Role ${roleName} is full!`);
        showError('This role is full. Please select another.');
        return;
    }
    
    console.log(`[ROLE SELECT] Role ${roleName} is available, selecting...`);
    
    // Visual feedback
    const card = document.querySelector(`[data-role="${roleName}"]`);
    if (card) {
        console.log(`[ROLE SELECT] Found card element, applying visual feedback`);
        card.style.transform = 'scale(0.95)';
        card.style.opacity = '0.7';
    } else {
        console.log(`[ROLE SELECT] ERROR: Card element not found for ${roleName}`);
    }
    
    setTimeout(() => {
        if (card) {
            card.style.transform = '';
            card.style.opacity = '1';
        }
        
        // Send to RAGE MP
        if (typeof mp !== 'undefined') {
            console.log(`[ROLE SELECT] Sending event to RAGE MP: cef:selectRole`);
            try {
                mp.trigger('cef:selectRole', roleName);
                console.log(`[ROLE SELECT] SUCCESS: Event sent to RAGE MP!`);
            } catch (error) {
                console.error(`[ROLE SELECT] ERROR sending to RAGE MP:`, error);
            }
        } else {
            console.error(`[ROLE SELECT] ERROR: MP object not found! Running in browser?`);
            alert(`Selected role: ${roleName} (DEV MODE - MP not available)`);
        }
    }, 200);
}

// Make function globally available
window.selectRole = selectRole;
console.log('[ROLE SELECT] selectRole function is now global:', typeof window.selectRole);

function updateRoleSlots(slotsData) {
    console.log('[ROLE SELECT] Updating role slots:', slotsData);
    
    Object.keys(slotsData).forEach(role => {
        roleSlots[role] = slotsData[role];
        
        const slotElement = document.getElementById(`${role}-slots`);
        if (slotElement) {
            const { current, max } = slotsData[role];
            slotElement.textContent = `${max - current}/${max}`;
            
            // Mark as unavailable if full
            const card = document.querySelector(`[data-role="${role}"]`);
            if (card) {
                if (current >= max) {
                    card.classList.add('unavailable');
                    slotElement.classList.remove('available');
                    slotElement.classList.add('full');
                    console.log(`[ROLE SELECT] Role ${role} is now FULL`);
                } else {
                    card.classList.remove('unavailable');
                    slotElement.classList.add('available');
                    slotElement.classList.remove('full');
                    console.log(`[ROLE SELECT] Role ${role} is AVAILABLE`);
                }
            }
        }
    });
}

function showError(message) {
    console.log(`[ROLE SELECT] Showing error: ${message}`);
    
    // Create error notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 68, 68, 0.9);
        color: white;
        padding: 15px 30px;
        border-radius: 8px;
        font-weight: bold;
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ============================================================================
// EVENT DELEGATION - Handle clicks on role cards
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('[ROLE SELECT] DOM loaded, setting up event listeners...');
    
    // Get all role cards
    const roleCards = document.querySelectorAll('.role-card');
    console.log(`[ROLE SELECT] Found ${roleCards.length} role cards`);
    
    // Add click listener to each card
    roleCards.forEach(card => {
        const roleName = card.getAttribute('data-role');
        console.log(`[ROLE SELECT] Attaching listener to ${roleName}`);
        
        card.addEventListener('click', (event) => {
            console.log(`[ROLE SELECT] CLICK EVENT on ${roleName}!`);
            console.log(`[ROLE SELECT] Event target:`, event.target);
            console.log(`[ROLE SELECT] Current target:`, event.currentTarget);
            
            // Prevent if unavailable
            if (card.classList.contains('unavailable')) {
                console.log(`[ROLE SELECT] Card is unavailable, ignoring click`);
                showError('This role is full!');
                return;
            }
            
            selectRole(roleName);
        });
        
        // Also add mouseenter for debugging
        card.addEventListener('mouseenter', () => {
            console.log(`[ROLE SELECT] Mouse entered ${roleName} card`);
        });
    });
    
    console.log('[ROLE SELECT] Event listeners attached successfully!');
});

// ESC key handler
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        console.log('[ROLE SELECT] ESC pressed, auto-selecting rifleman');
        selectRole('rifleman');
    }
});

// Global click event debugging
document.addEventListener('click', (event) => {
    console.log('[ROLE SELECT] Global click detected at:', event.clientX, event.clientY);
    console.log('[ROLE SELECT] Clicked element:', event.target.tagName, event.target.className);
});

// Events from RAGE MP
if (typeof mp !== 'undefined') {
    console.log('[ROLE SELECT] MP object found, setting up RAGE MP events');
    
    mp.events.add('updateRoleSlots', (data) => {
        console.log('[ROLE SELECT] Received updateRoleSlots from server');
        const slots = JSON.parse(data);
        updateRoleSlots(slots);
    });
    
    // Request initial slot data
    console.log('[ROLE SELECT] Requesting initial role slots from server');
    mp.trigger('cef:requestRoleSlots');
} else {
    console.warn('[ROLE SELECT] MP object NOT found - running in browser dev mode');
}

console.log('[ROLE SELECT] ===== Role selection UI script loaded =====');
