// ============================================================================
// ROLE SELECTION - JavaScript Controller
// ============================================================================

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
    console.log(`[ROLE SELECT] Selected role: ${roleName}`);
    
    // Check if role is available
    const slot = roleSlots[roleName];
    if (slot && slot.current >= slot.max) {
        showError('This role is full. Please select another.');
        return;
    }
    
    // Visual feedback
    const card = document.querySelector(`.role-card.${roleName}`);
    card.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
        card.style.transform = '';
        
        // Send to RAGE MP
        if (typeof mp !== 'undefined') {
            mp.trigger('cef:selectRole', roleName);
        }
    }, 200);
}

function updateRoleSlots(slotsData) {
    Object.keys(slotsData).forEach(role => {
        roleSlots[role] = slotsData[role];
        
        const slotElement = document.getElementById(`${role}-slots`);
        if (slotElement) {
            const { current, max } = slotsData[role];
            slotElement.textContent = `${max - current}/${max}`;
            
            // Mark as unavailable if full
            const card = document.querySelector(`.role-card.${role}`);
            if (current >= max) {
                card.classList.add('unavailable');
                slotElement.classList.remove('available');
                slotElement.classList.add('full');
            } else {
                card.classList.remove('unavailable');
                slotElement.classList.add('available');
                slotElement.classList.remove('full');
            }
        }
    });
}

function showError(message) {
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

// ESC key handler
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        // Auto-assign rifleman (most available)
        selectRole('rifleman');
    }
});

// Events from RAGE MP
if (typeof mp !== 'undefined') {
    mp.events.add('updateRoleSlots', (data) => {
        const slots = JSON.parse(data);
        updateRoleSlots(slots);
    });
    
    // Request initial slot data
    mp.trigger('cef:requestRoleSlots');
}

console.log('[ROLE SELECT] Role selection UI loaded');
