import { Piedra, Malo, Bueno, ENEMY_TYPES } from './models.js';
import { CONSTANTS } from './engine.js';
import { ANIMATIONS, getEnemyAnimConfig } from './assets.js';
import { UI, updateStatsUI, showHudMessage, showGameOverModal, updatePauseButton, addLogEntry, clearLog } from './ui.js';

// ─── UTIL ───────────────────────────────────────────────────────────────────

export function findClosest(engine, entity, targets) {
    if (targets.length === 0) return { target: null, dist: 999 };

    let bestTarget = null;
    let bestScore = -Infinity;

    for (const t of targets) {
        if (!t.estaVivo()) continue;
        const d = engine.getChebyshevDistance(entity, t);

        // ── Tactical Weighted Score ──────────────────
        // Prioritize distance heavily, but give a MASSIVE bonus to immediate threats (adjacents)
        const distScore = (100 - d * 2);
        const healthPct = t.vida / t.maxVida;
        const healthScore = (1 - healthPct) * 5; // Slight bias for weak enemies

        // Immediate Engagement Bonus: If adjacent, we MUST prioritize it
        const proximityBonus = (d <= 1) ? 200 : 0;

        const totalScore = distScore + healthScore + proximityBonus;

        if (totalScore > bestScore) {
            bestScore = totalScore;
            bestTarget = t;
        }
    }

    return {
        target: bestTarget,
        dist: bestTarget ? engine.getChebyshevDistance(entity, bestTarget) : 999
    };
}

export function spawnFloatingText(state, x, y, text, color) {
    state.floatingTexts.push({
        x: x * CONSTANTS.CELL_SIZE + CONSTANTS.CELL_SIZE / 2,
        y: y * CONSTANTS.CELL_SIZE,
        text, color,
        life: 1.0,
        speed: 1.8
    });
}

export function spawnParticle(state, px, py, color) {
    for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 3;
        state.particles.push({
            x: px, y: py,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: 0.04 + Math.random() * 0.03,
            size: 2 + Math.random() * 4,
            color
        });
    }
}

// ─── WAVE CONFIG ────────────────────────────────────────────────────────────

/**
 * Returns wave config for a given level + wave number.
 * Enemies scale in count and type per wave.
 */
function getWaveConfig(level, wave) {
    // Increased base count for immediate challenge
    const baseCount = 12 + (level - 1) * 6 + wave * 3;
    const types = [
        ENEMY_TYPES[(wave - 1) % ENEMY_TYPES.length] // cycle through types
    ];
    // Later waves mix types
    if (wave >= 2) types.push(ENEMY_TYPES[(wave) % ENEMY_TYPES.length]);
    if (level >= 2) types.push(ENEMY_TYPES[(wave + 1) % ENEMY_TYPES.length]);

    return {
        count: Math.min(baseCount, 60),
        types,
        spawnDelay: Math.max(700 - level * 80, 100), // ms between individual enemy spawns
    };
}

// ─── MAIN UPDATE ────────────────────────────────────────────────────────────

export function updateGameLogic(state, engine, pathfinder) {
    if (!state.isRunning) return;
    const dt = state.deltaTime;

    // ── Screen shake decay ──────────────────────────────────────────────────
    if (state.shakeIntensity > 0.1) {
        state.shakeIntensity *= state.shakeDecay;
    } else {
        state.shakeIntensity = 0;
    }

    // ── HUD message timer ───────────────────────────────────────────────────
    if (state.hudMessageTimer > 0) {
        state.hudMessageTimer -= dt;
        if (state.hudMessageTimer <= 0) showHudMessage('');
    }

    // ── Wave transition (between waves or levels) ───────────────────────────
    if (!state.waveInProgress) {
        state.waveTransitionTimer -= dt;
        if (state.waveTransitionTimer <= 0) {
            _startNextWave(state, engine);
        }
        // Still update pixel positions & animations during transition
        _updateEntityAnimations(state, dt);
        _updateSmoothMovement(state, dt);
        return;
    }

    // ── Level transition ────────────────────────────────────────────────────
    if (state.levelTransitionActive) {
        state.levelTransitionTimer -= dt;
        if (state.levelTransitionTimer <= 0) {
            state.levelTransitionActive = false;
            _startLevel(state, engine);
        }
        return;
    }

    // ── Enemy wave spawning (trickle) ───────────────────────────────────────
    if (state._spawnQueue && state._spawnQueue.length > 0) {
        state._spawnTimer = (state._spawnTimer || 0) - dt;
        if (state._spawnTimer <= 0) {
            const { type, level, side } = state._spawnQueue.shift();
            _spawnEnemy(state, engine, type, level, side);
            state._spawnTimer = state._spawnConfig?.spawnDelay || 500;
        }
    }

    // ── Smooth movement & animations ────────────────────────────────────────
    _updateSmoothMovement(state, dt);
    _updateEntityAnimations(state, dt);

    // ── Floating texts & particles ──────────────────────────────────────────
    state.floatingTexts.forEach(t => { t.y -= t.speed; t.life -= 0.04; });
    state.floatingTexts = state.floatingTexts.filter(t => t.life > 0);

    state.particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.1; // gravity
        p.life -= p.decay;
    });
    state.particles = state.particles.filter(p => p.life > 0);

    // ── AI Logic (only move entities that have reached their target) ─────────
    const allLive = [...state.buenos, ...state.malos].filter(
        e => e.estaVivo() && e.state !== 'death'
    );

    allLive.forEach(agente => {
        // Handle cooldowns
        if (agente.attackCooldown > 0) {
            agente.attackCooldown = Math.max(0, agente.attackCooldown - dt);
        }

        if (!agente.isAtTarget()) return; // Wait for smooth move to complete
        if (agente.state === 'attack' || agente.state === 'hit') return;

        if (agente instanceof Malo) {
            _processMaloAI(state, engine, pathfinder, agente);
        } else {
            _processBuenoAI(state, engine, pathfinder, agente);
        }
    });

    // ── Combat check ────────────────────────────────────────────────────────
    _processCombat(state, engine);

    // ── Update counters ──────────────────────────────────────────────────────
    state.turnos++;

    // Dynamic Threat Scaling: +0.005 per second (very slow growth)
    state.threatLevel += (dt / 1000) * 0.005;
    state.stats.peakThreat = Math.max(state.stats.peakThreat, state.threatLevel);

    if (state.turnos % 600 === 0) {
        addLogEntry(`THREAT ASSESSMENT UPDATED: LVL ${state.threatLevel.toFixed(2)}`, "system");
    }

    // ── Death cleanup ────────────────────────────────────────────────────────
    _cleanup(state, engine);

    // ── Stats UI ─────────────────────────────────────────────────────────────
    updateStatsUI(state.buenos.length, state.malos.length, state.currentWave, state.currentLevel, state.gold);

    // ── Win/lose conditions ──────────────────────────────────────────────────
    if (state.buenos.length === 0) {
        state.isRunning = false;
        showGameOverModal('defeat', state.currentLevel, state.currentWave, state.stats);
        addLogEntry(`DEFEAT! All heroes vanquished. Level ${state.currentLevel}, Wave ${state.currentWave}.`, "alert");
        return;
    }

    const enemiesRemaining = state.malos.length; // includes dying (not yet removed)
    const stillSpawning = state._spawnQueue && state._spawnQueue.length > 0;

    if (enemiesRemaining === 0 && !stillSpawning && state.waveInProgress) {
        // Wave cleared!
        state.waveInProgress = false;
        if (state.currentWave >= state.totalWavesPerLevel) {
            // Level complete!
            showHudMessage(`SECTOR ${state.currentLevel} SECURED`);
            addLogEntry(`LEVEL ${state.currentLevel} CLEARED. ADVANCING TO NEXT LEVEL.`, "reward");
            state.hudMessageTimer = 3000;
            state.currentLevel++;
            state.currentWave = 0;
            state.levelTransitionActive = true;
            state.levelTransitionTimer = state.levelTransitionDelay;
            // Heal heroes a bit
            state.buenos.forEach(b => { b.vida = Math.min(b.vida + 10, b.maxVida); });
        } else {
            showHudMessage(`PHASE ${state.currentWave} COMPLETED`);
            addLogEntry(`WAVE ${state.currentWave} CLEARED. REPLENISHMENT AUTHORIZED.`, "reward");
            state.hudMessageTimer = 2000;
            state.waveTransitionTimer = state.waveTransitionDelay;
        }
        updateStatsUI(state.buenos.length, 0, state.currentWave, state.currentLevel, state.gold);
    }
}

// ─── AI HELPERS ─────────────────────────────────────────────────────────────

function _processMaloAI(state, engine, pathfinder, malo) {
    const { target, dist } = findClosest(engine, malo, state.buenos);
    if (!target) return;

    // Using Chebyshev Distance enables diagonal attacks
    const d = engine.getChebyshevDistance(malo, target);
    if (d <= 1) {
        malo.facingRight = (target.x >= malo.x);
        return;
    }

    const next = pathfinder.calcularSiguientePaso(malo, target);

    // Fallback: If pathfinder returns current or no cell, we might be blocked
    if (next.x === malo.x && next.y === malo.y) {
        // Search for adjacent rocks to clear
        const neighbors = [
            { x: malo.x + 1, y: malo.y }, { x: malo.x - 1, y: malo.y },
            { x: malo.x, y: malo.y + 1 }, { x: malo.x, y: malo.y - 1 },
            { x: malo.x + 1, y: malo.y + 1 }, { x: malo.x - 1, y: malo.y - 1 }, // and diagonals
            { x: malo.x + 1, y: malo.y - 1 }, { x: malo.x - 1, y: malo.y + 1 }
        ];
        for (const n of neighbors) {
            if (n.x < 0 || n.x >= CONSTANTS.COLS || n.y < 2 || n.y >= CONSTANTS.ROWS) continue;
            const b = engine.grid[n.y][n.x];
            if (b instanceof Piedra) {
                malo.facingRight = (n.x >= malo.x);
                malo.atacar(b);
                return;
            }
        }
    }

    // Check if path is blocked by a rock
    const cell = engine.grid[next.y][next.x];
    if (cell instanceof Piedra) {
        malo.facingRight = (next.x >= malo.x);
        malo.atacar(cell);
        return;
    }

    if (next.x !== malo.x || next.y !== malo.y) {
        malo.facingRight = next.x > malo.x;
        const moved = engine.updateEntityPosition(malo, next.x, next.y);
        if (moved) {
            malo.setGridTarget(next.x, next.y);
            malo.setState('run');
        }
    } else {
        // Totally blocked - look for any adjacent rock to clear space
        const neighbors = [
            { x: malo.x + 1, y: malo.y }, { x: malo.x - 1, y: malo.y },
            { x: malo.x, y: malo.y + 1 }, { x: malo.x, y: malo.y - 1 }
        ];
        for (const n of neighbors) {
            if (n.x < 0 || n.x >= CONSTANTS.COLS || n.y < 2 || n.y >= CONSTANTS.ROWS) continue;
            const block = engine.grid[n.y][n.x];
            if (block && block.constructor.name === 'Piedra') {
                malo.facingRight = (n.x >= malo.x);
                malo.atacar(block);
                return;
            }
        }
        malo.setState('idle');
    }
}

function _processBuenoAI(state, engine, pathfinder, bueno) {
    // Only target enemies that are fully within the operation zone (y >= 2)
    const visibleEnemies = state.malos.filter(m => m.estaVivo() && m.isAtTarget() && m.y >= 2);
    const { target, dist } = findClosest(engine, bueno, visibleEnemies);

    if (!target) { bueno.setState('idle'); return; }

    const d = engine.getChebyshevDistance(bueno, target);
    if (d <= 1) {
        // Adjacent or Diagonal — face the enemy, attack handled in combat phase
        bueno.facingRight = (target.x >= bueno.x);
        return;
    }

    if (dist < 15) {
        // Move toward enemies
        const next = pathfinder.calcularSiguientePaso(bueno, target);
        if (next.x !== bueno.x || next.y !== bueno.y) {
            bueno.facingRight = next.x > bueno.x;
            const moved = engine.updateEntityPosition(bueno, next.x, next.y);
            if (moved) {
                bueno.setGridTarget(next.x, next.y);
                bueno.setState('run');
            }
        } else {
            bueno.setState('idle');
        }
    } else {
        if (bueno.state === 'run') bueno.setState('idle');
    }
}

function _processCombat(state, engine) {
    // Malos attack adjacent targets (heroes or rocks)
    state.malos.forEach(malo => {
        if (!malo.estaVivo() || malo.state === 'death' || malo.state === 'attack' || !malo.isAtTarget()) return;

        // Target list: Heroes or Rocks
        const potentialTargets = [...state.buenos, ...state.piedras];
        const adj = potentialTargets.filter(t =>
            t.estaVivo() &&
            engine.getChebyshevDistance(malo, t) <= 1
        );

        if (adj.length > 0) {
            // Prioritize heroes if both are adjacent
            const hero = adj.find(t => t instanceof Bueno);
            malo.atacar(hero || adj[0]);
        }
    });

    // Buenos attack adjacent malos
    state.buenos.forEach(bueno => {
        if (!bueno.estaVivo() || bueno.state === 'death' || bueno.state === 'attack' || !bueno.isAtTarget()) return;
        const adj = state.malos.filter(m =>
            m.estaVivo() && m.state !== 'death' &&
            engine.getChebyshevDistance(bueno, m) <= 1
        );
        if (adj.length > 0) bueno.atacar(adj[0]);
    });
}

/** 
 * AWARD GOLD FOR KILLS (Helper called from within combat logic or damage system)
 */
function _rewardKill(state) {
    const goldEarned = 15 + Math.floor(Math.random() * 15);
    state.gold += goldEarned;
    state.stats.kills++;
    addLogEntry(`+${goldEarned} GOLD for enemy elimination.`, "reward");
}

function _updateEntityAnimations(state, dt) {
    const allEntities = [...state.buenos, ...state.malos];
    const prevVida = state.prevVida;

    allEntities.forEach(e => {
        // Track damage for floating text + particles
        const prev = prevVida.get(e.uuid);
        if (prev !== undefined && e.vida < prev) {
            let dmg = Math.round(prev - e.vida);
            if (isNaN(dmg)) dmg = 0;

            if (dmg > 0) {
                spawnFloatingText(state, e.x, e.y, `-${dmg}`, '#ff4757');
                spawnParticle(state,
                    e.pixelX + CONSTANTS.CELL_SIZE / 2,
                    e.pixelY + CONSTANTS.CELL_SIZE / 2,
                    e instanceof Malo ? '#ff4444' : '#4488ff'
                );
                state.shakeIntensity = Math.min(state.shakeIntensity + dmg * 0.5, 8);

                // Visual hit feedback - trigger animation if not in high-priority state
                if (e.state !== 'death' && e.state !== 'attack') {
                    e.setState('hit');
                }
            }

            // Reward gold if Malo just died
            if (e instanceof Malo && e.vida <= 0 && prev > 0) {
                _rewardKill(state);
            }
        }
        prevVida.set(e.uuid, e.vida);

        const config = (e instanceof Malo)
            ? getEnemyAnimConfig(e.type)
            : ANIMATIONS.BUENO;
        const stateFrames = config.states[e.state]?.frames || 4;
        e.updateAnimation(dt, stateFrames);
    });
}

function _updateSmoothMovement(state, dt) {
    [...state.buenos, ...state.malos].forEach(e => e.updatePixelPosition(dt));
}

function _cleanup(state, engine) {
    const deadFilter = (e) => {
        if (!e.estaVivo() && e.state !== 'death' && e instanceof Personaje) e.setState('death');
        if (e.isDead) {
            engine.removeEntity(e);
            if (e instanceof Piedra) {
                addLogEntry("DEFENSIVE BARRIER BREACHED", "warning");
                spawnParticle(state, e.x * 64 + 32, e.y * 64 + 32, '#666');
            }
            return false;
        }
        return true;
    };
    state.buenos = state.buenos.filter(deadFilter);
    state.malos = state.malos.filter(deadFilter);
    state.piedras = state.piedras.filter(deadFilter);
}

// ─── SPAWN / RESET ───────────────────────────────────────────────────────────

function _spawnEnemy(state, engine, type, level, side = 'right') {
    let spots = [];
    if (side === 'right') {
        const col = CONSTANTS.COLS - 1;
        for (let r = 2; r < CONSTANTS.ROWS - 1; r++) spots.push({ x: col, y: r });
    } else if (side === 'left') {
        const col = 0;
        for (let r = 2; r < CONSTANTS.ROWS - 1; r++) spots.push({ x: col, y: r });
    } else if (side === 'top') {
        const row = 2; // Start at row 2 to be fully visible below HUD
        for (let c = 1; c < CONSTANTS.COLS - 1; c++) spots.push({ x: c, y: row });
    } else if (side === 'bottom') {
        const row = CONSTANTS.ROWS - 2; // Start one row inside
        for (let c = 1; c < CONSTANTS.COLS - 1; c++) spots.push({ x: c, y: row });
    }

    spots.sort(() => Math.random() - 0.5);

    for (const spot of spots) {
        if (engine.isCellEmptyForMove(spot.x, spot.y)) {
            const enemy = new Malo(spot.x, spot.y, type, level);
            engine.placeEntity(enemy);
            state.malos.push(enemy);
            addLogEntry(`ENEMY ${enemy.type.toUpperCase()} SPAWNED AT [${spot.x},${spot.y}]`, "system");
            return;
        }
    }
}

function _startNextWave(state, engine) {
    state.currentWave++;
    state.waveInProgress = true;

    const cfg = getWaveConfig(state.currentLevel, state.currentWave);
    state._spawnConfig = cfg;

    // Build spawn queue
    state._spawnQueue = [];
    const sides = ['right', 'top', 'bottom', 'left'];
    for (let i = 0; i < cfg.count; i++) {
        const type = cfg.types[i % cfg.types.length];
        const side = sides[Math.floor(Math.random() * sides.length)];
        state._spawnQueue.push({ type, level: state.currentLevel, side });
    }
    state._spawnTimer = 300; // First enemy spawns after 300ms

    showHudMessage(`PHASE ${state.currentWave} / ${state.totalWavesPerLevel}`);
    addLogEntry(`WAVE ${state.currentWave} INITIATED. ${cfg.count} ENEMIES DETECTED.`, "system");
    state.hudMessageTimer = 2000;
}

function _startLevel(state, engine) {
    // Clear remaining malos just in case
    state.malos.forEach(m => engine.removeEntity(m));
    state.malos = [];
    state.currentWave = 0;
    state.waveInProgress = false;
    state.waveTransitionTimer = 1500;
    showHudMessage(`INITIALIZING SECTOR ${state.currentLevel}`);
    addLogEntry(`LEVEL ${state.currentLevel} INITIALIZED — STANDBY FOR DEPLOYMENT`, "system");
    state.hudMessageTimer = 2500;
}

export function resetSimulation(state, engine, resizeCallback) {
    resizeCallback();
    engine.resetGrid();

    state.buenos = [];
    state.malos = [];
    state.piedras = [];
    state.turnos = 0;
    state.floatingTexts = [];
    state.particles = [];
    state.prevVida.clear();
    state.isRunning = true;
    state.gold = 150; // Reset gold on new game
    state.currentLevel = 1;
    state.currentWave = 0;
    state.waveInProgress = false;
    state.waveTransitionTimer = 800; // Start first wave after 0.8s
    state.levelTransitionActive = false;
    state._spawnQueue = [];
    state._spawnTimer = 0;
    state.shakeIntensity = 0;
    state.hudMessage = '';
    state.hudMessageTimer = 0;

    UI.modal.classList.add('hidden');
    clearLog();
    addLogEntry("SIMULATION REINITIALIZED", "system");
    addLogEntry(`LEVEL 01 INITIALIZED — STANDBY FOR DEPLOYMENT`, "system");

    // Config from sliders - Forcing direct DOM read to fix the "16" bug
    const inputB = document.getElementById('cfg-buenos');
    const inputP = document.getElementById('cfg-piedras');
    const countBuenos = inputB ? parseInt(inputB.value) : 6;
    const countPiedras = inputP ? parseInt(inputP.value) : 20;

    const MARGIN = 1;

    // ── Spawn rocks (not in hero zone or enemy spawn column) ────────────────
    let i = 0;
    let rockAttempts = 0;
    while (i < countPiedras && rockAttempts < 50000) {
        rockAttempts++;
        const x = 1 + Math.floor(Math.random() * (CONSTANTS.COLS - 3));
        const y = 2 + Math.floor(Math.random() * (CONSTANTS.ROWS - 3));
        // Don't place rocks in the hero spawn zone (first 3 cols)
        if (x < 3) continue;
        // Don't place rocks on far-right enemy column
        if (x >= CONSTANTS.COLS - 2) continue;
        const p = new Piedra(x, y);
        if (engine.placeEntity(p)) { state.piedras.push(p); i++; }
    }
    addLogEntry(`${i} BARRIERS DEPLOYED.`, "system");


    // ── Spawn heroes on left side ────────────────────────────────────────────
    i = 0;
    let attempts = 0;
    while (i < countBuenos && attempts < 100000) {
        const x = 1 + Math.floor(Math.random() * (CONSTANTS.HERO_SPAWN_COLS - 1));
        const y = 2 + Math.floor(Math.random() * (CONSTANTS.ROWS - 3));
        if (engine.isCellEmptyForMove(x, y)) {
            const b = new Bueno(x, y);
            engine.placeEntity(b);
            state.buenos.push(b);
            i++;
        }
        attempts++;
    }
    addLogEntry(`${i} TACTICAL UNITS DEPLOYED.`, "system");

    showHudMessage(`SECTOR 1 — STANDBY`);
    state.hudMessageTimer = 2500;

    updateStatsUI(state.buenos.length, state.malos.length, state.currentWave, state.currentLevel, state.gold);
}

// ── INTERACTION ──────────────────────────────────────────────────────────────

export async function handlePlayerInput(state, engine, pathfinder, x, y, tool) {
    if (x < 0 || x >= CONSTANTS.COLS || y < 2 || y >= CONSTANTS.ROWS) {
        if (y < 2) addLogEntry("COMMAND DENIED: Reserved tactical airspace.", "warning");
        return;
    }

    const gx = x; // grid x
    const gy = y; // grid y

    if (tool === 'hero') {
        if (state.gold >= 70 && engine.isCellEmptyForMove(gx, gy)) {
            const hero = new Bueno(gx, gy);
            if (engine.placeEntity(hero)) {
                state.buenos.push(hero);
                state.gold -= 70;
                state.stats.goldSpent += 70;
                _spawnEffect(state, gx, gy, '#4d9fff');
                addLogEntry(`TACTICAL UNIT DEPLOYED AT [${gx},${gy}]`, "system");
            }
        } else if (state.gold < 70) {
            spawnFloatingText(state, gx, gy, 'Falta Oro', '#ffcc00');
            addLogEntry(`INSUFFICIENT GOLD for hero deployment.`, "warning");
        }
    } else if (tool === 'rock') {
        if (state.gold >= 25 && engine.isCellEmptyForMove(gx, gy)) {
            const rock = new Piedra(gx, gy);
            if (engine.placeEntity(rock)) {
                state.piedras.push(rock);
                state.gold -= 25;
                state.stats.goldSpent += 25;
                _spawnEffect(state, gx, gy, '#8a7a6a');
                addLogEntry(`BARRIER CONSTRUCTED AT [${gx},${gy}]`, "system");
            }
        } else if (state.gold < 25) {
            spawnFloatingText(state, gx, gy, 'Falta Oro', '#ffcc00');
            addLogEntry(`INSUFFICIENT GOLD for barrier construction.`, "warning");
        }
    } else if (tool === 'spell') {
        if (state.gold >= 120) {
            state.gold -= 120;
            state.stats.goldSpent += 120;
            _castLightning(state, gx, gy);
            addLogEntry(`LIGHTNING STRIKE AT [${gx},${gy}]`, "reward");
        } else {
            spawnFloatingText(state, x, y, 'Falta Oro', '#ffcc00');
            addLogEntry(`INSUFFICIENT GOLD for lightning strike.`, "warning");
        }
    }
}

function _spawnEffect(state, x, y, color) {
    const s = 64; // CELL_SIZE
    const px = x * s + s / 2;
    const py = y * s + s / 2;
    for (let i = 0; i < 15; i++) {
        state.particles.push({
            x: px, y: py,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 1.0, decay: 0.02 + Math.random() * 0.03,
            color: color
        });
    }
}

function _castLightning(state, x, y) {
    const s = 64;
    const px = x * s + s / 2;
    const py = y * s + s / 2;

    for (let i = 0; i < 40; i++) {
        state.particles.push({
            x: px, y: py - Math.random() * 400,
            vx: (Math.random() - 0.5) * 10,
            vy: Math.random() * 15,
            life: 1.0, decay: 0.03,
            color: '#fff044'
        });
    }

    state.malos.forEach(m => {
        const dx = m.x - x;
        const dy = m.y - y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 2.5) {
            const dmg = 45;
            spawnFloatingText(state, m.x, m.y, `⚡-${dmg}`, '#ffff44');
            m.takeDamage(dmg);
        }
    });

    state.shakeIntensity = 15;
}
