# 🎮 BATTLE ARENA v2.4 - Complete Guide

## 🆕 What's New in v2.4

### ✨ **Main Menu System**
- Beautiful landing page when joining server
- Real-time server statistics
- Game mode selection before team selection
- Professional UI with animations

### 🎯 **4 Game Modes**
1. **Conquest** - Classic capture and hold
2. **Rush** - Progressive attack/defend (NEW!)
3. **Insurgency** - Hardcore asymmetric warfare (NEW!)
4. **Training** - Practice range with unlimited resources (NEW!)

### 🚀 **Auto-Start Server**
- Match starts automatically when server launches
- No need for `/start` command
- Players can join and play immediately

---

## 📋 Game Modes Explained

### 🎯 Conquest (Classic)
```
✅ Capture and hold objectives
✅ Team with fewer objectives loses tickets over time
✅ Deaths reduce tickets
✅ First team to 0 tickets loses

Win Condition: Bleed enemy team to 0 tickets
```

### ⚡ Rush (Battlefield Style)
```
✅ 3 stages of progressive objectives
✅ Attackers (Team 1) vs Defenders (Team 2)
✅ Attackers have limited tickets (75 + bonuses)
✅ Defenders have unlimited respawns
✅ Capture all objectives in a stage to advance

Win Conditions:
- Attackers: Capture all 3 stages
- Defenders: Deplete attacker tickets
```

### 💀 Insurgency (Hardcore)
```
✅ Asymmetric warfare
✅ Attackers must find and destroy 3 weapon caches
✅ Attackers: Only 50 respawns total!
✅ Defenders: Unlimited respawns
✅ High stakes, tactical gameplay

Win Conditions:
- Attackers: Destroy all 3 caches
- Defenders: Deplete attacker respawns

Note: Caches can be destroyed with C4 (Engineer) or RPG (AT Gunner)
```

### 🎓 Training (Practice Mode)
```
✅ No death penalties
✅ Instant respawn (1 second)
✅ God mode enabled
✅ Perfect for learning weapons and tactics

Features:
- Unlimited ammo refill at spawn
- No score tracking
- Test all vehicles
- Practice with all weapons
```

---

## 🎮 How to Play

### **Step 1: Join Server**
When you connect, you'll see the **Main Menu**:
- Server stats (players, mode, map, time)
- 4 game mode cards
- Choose your preferred mode

### **Step 2: Select Game Mode**
Click on one of the mode cards:
- **Conquest** - Traditional team vs team
- **Rush** - Attack or defend sequentially
- **Insurgency** - Hunt or protect caches
- **Training** - Practice everything

### **Step 3: Choose Team**
After selecting mode:
- **Task Force Phantom** (🔵 Blue) - Usually attackers in Rush
- **Soviet Defenders** (🔴 Red) - Usually defenders in Rush

### **Step 4: Select Role**
Choose from 7 specialized roles:

1. **Squad Leader** 👑
   - Carbine Rifle + Pistol
   - Can place FOBs
   - Can set rally points
   
2. **Rifleman** 🔫
   - Assault Rifle
   - Standard infantry
   
3. **Medic** ⚕️
   - SMG
   - Extra armor
   - Can heal teammates at FOB
   
4. **Engineer** 🔧
   - SMG + C4
   - Can repair vehicles faster
   - Can destroy caches (Insurgency mode)
   - Extra armor
   
5. **Marksman** 🎯
   - Marksman Rifle
   - Long range specialist
   
6. **MG Gunner** 🔥
   - Machine Gun
   - Suppressive fire
   
7. **AT Gunner** 💥
   - RPG + Carbine
   - Anti-vehicle/structure
   - Can destroy caches (Insurgency mode)

### **Step 5: Play!**
You'll spawn at your team's base ready to fight!

---

## 🏗️ FOB System (Forward Operating Base)

### **What is a FOB?**
A deployable spawn point that provides:
- Respawn location
- Ammo resupply
- Health regeneration

### **How to Use FOBs:**

#### **Deploy FOB** (Squad Leader only)
```
/placefob
```
- Max 3 FOBs per team
- Must be in safe location
- Can be destroyed by enemies

#### **Resupply at FOB**
```
/resupply
```
- Must be within 30m of friendly FOB
- Refills ammo and equipment

#### **Heal at FOB**
```
/heal
```
- Must be within 30m of friendly FOB
- Restores health and armor

#### **List Team FOBs**
```
/fobs
```
- Shows all your team's FOBs
- Displays health and distance

---

## 🚗 Vehicles

5 vehicle types spawn automatically:
1. **Humvee** - Fast transport
2. **APC** - Armored carrier
3. **Tank** - Heavy firepower
4. **Attack Helicopter** - Air support
5. **Transport Truck** - Squad transport

### Vehicle Commands:
```
/repair - Repair vehicle (when inside)
```

---

## 💬 Commands

### **Player Commands**
```
/pos          - Show your position
/resupply     - Resupply at FOB
/heal         - Heal at FOB
/placefob     - Deploy FOB (Squad Leader)
/fobs         - List team FOBs
/repair       - Repair vehicle
```

### **Admin Commands**
```
/mode [name]  - Change game mode
                (conquest/rush/insurgency/training)
/tp <x> <y> <z> - Teleport to coordinates
/makeadmin <name> - Grant admin to player
```

---

## ⌨️ Keybinds

```
ESC  - Close menus
M    - Toggle objectives panel
T    - Toggle squad panel
B    - Toggle spawn menu
```

---

## 🎯 Scoring System

### **Points**
- Kill: +10 points
- Objective Capture: +100 points (team)
- Death: -1 ticket (Conquest/Rush)

### **Win Conditions by Mode**

**Conquest:**
- First team to reduce enemy tickets to 0

**Rush:**
- Attackers: Capture all 3 stages
- Defenders: Deplete attacker tickets

**Insurgency:**
- Attackers: Destroy all 3 caches
- Defenders: Deplete 50 attacker respawns

**Training:**
- No win condition (practice mode)

---

## 🐛 Troubleshooting

### **Main menu doesn't show**
1. Press ESC to close any stuck menus
2. Reconnect to server
3. Check console (F8) for errors

### **Can't select team/role**
1. Make sure you clicked the button
2. Check browser console (F8 → browser console)
3. Try refreshing: disconnect and reconnect

### **Spawn issues**
1. Check if match is active
2. Make sure you selected both team AND role
3. Check chat for error messages

### **FOB not working**
1. Squad Leader role required to place
2. Check if match is active
3. Team might have max FOBs (3)

---

## 📊 Technical Details

### **Server Configuration**
- Max Players: 100
- Respawn Time: 15 seconds
- FOBs per Team: 3
- Objective Radius: 50m
- Match: Auto-starts on server launch

### **File Structure**
```
BATTLE_ARENA_SERVER/
├── packages/tactical-warfare/
│   ├── index.js              # Main server logic
│   └── modules/
│       ├── vehicles.js       # Vehicle system
│       ├── fob.js           # FOB system
│       └── gamemodes.js     # 4 game modes
├── client_packages/
│   ├── index.js             # Client controller
│   └── cef/
│       ├── main-menu.html   # Main menu
│       ├── team-select.html # Team selection
│       ├── role-select.html # Role selection
│       ├── hud.html         # In-game HUD
│       └── capture-bar.html # Objective capture UI
└── conf.json                # Server config
```

---

## 🔄 Version History

### **v2.4** (Current)
- ✅ Main menu with game mode selection
- ✅ 3 new game modes (Rush, Insurgency, Training)
- ✅ Auto-start server
- ✅ Fixed team/role selection flow

### **v2.2**
- ✅ FOB system
- ✅ Vehicle spawning
- ✅ Objectives with capture bars
- ✅ 7 role classes

### **v2.0**
- ✅ Basic team vs team
- ✅ Conquest mode
- ✅ HUD system

---

## 🚀 Quick Start Guide

1. **Start Server**
   ```bash
   # Match auto-starts!
   ```

2. **Join Game**
   - Connect to server
   - Main menu appears automatically

3. **Select Mode**
   - Choose: Conquest, Rush, Insurgency, or Training

4. **Pick Team**
   - Blue (Attackers) or Red (Defenders)

5. **Choose Role**
   - 7 roles available

6. **Fight!**
   - Capture objectives
   - Deploy FOBs (/placefob)
   - Win the match!

---

## 💡 Pro Tips

### **For Squad Leaders:**
- Place FOBs strategically near objectives
- Don't place all 3 FOBs at once
- Protect your FOBs!

### **For Engineers:**
- You can destroy enemy FOBs with C4
- In Insurgency mode, you're essential for destroying caches
- Repair friendly vehicles

### **For AT Gunners:**
- Save RPG for vehicles and FOBs
- In Insurgency, you can destroy caches from range

### **For Medics:**
- Stay near teammates
- Use FOBs to heal squad

### **For Marksman:**
- Cover objectives from distance
- Protect Squad Leaders

---

## 🎯 Strategy Guides

### **Conquest Strategy:**
1. Cap nearest objective first
2. Hold majority of points
3. Defend key objectives
4. Use FOBs to maintain map control

### **Rush Strategy (Attackers):**
1. Coordinate attacks
2. Use smoke/cover
3. Flank defenders
4. Conserve tickets!

### **Rush Strategy (Defenders):**
1. Set up defensive FOBs
2. Mine approaches
3. Hold choke points
4. Counter-attack when weak

### **Insurgency Strategy (Attackers):**
1. Scout carefully (limited respawns!)
2. Use Engineers and AT Gunners
3. Clear area before destroying cache
4. Protect demolition team

### **Insurgency Strategy (Defenders):**
1. Hide cache locations
2. Patrol aggressively
3. Hunt enemy Squad Leaders
4. Use unlimited respawns to overwhelm

---

## 📞 Support

If you encounter issues:
1. Check this README first
2. Press F8 to check console logs
3. Try reconnecting
4. Report bugs with console logs

---

## 🎉 Have Fun!

Enjoy BATTLE ARENA v2.4 with 4 exciting game modes!

**Good luck, soldier!** 🎖️
