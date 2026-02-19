import { Piedra, Malo, Bueno } from './models.js';
import { CONSTANTS } from './engine.js';
import { ANIMATIONS } from './assets.js';
import { UI, showGameOverModal, updateStatsUI } from './ui.js';

export function findClosest(engine, entity, targets) {
    let closest = null;
    let minDst = Infinity;
    const validTargets = targets.filter(t => t.estaVivo() && t.state !== 'death');
    for (const t of validTargets) {
        const dst = engine.getPixelDistance(entity, t);
        if (dst < minDst) { minDst = dst; closest = t; }
    }
    return { target: closest, dist: minDst };
}

export function spawnFloatingText(state, x, y, text, color) {
    state.floatingTexts.push({
        x: x + CONSTANTS.CELL_SIZE / 2,
        y: y,
        text: text,
        color: color,
        life: 1.0,
        speed: 1.5
    });
}

export function updateGameLogic(state, engine, pathfinder, deltaTime) {
    // ✅ Guard PRIMERO
    if (!state.isRunning) return;

    const allEntities = [...state.buenos, ...state.malos];

    // Textos flotantes de daño
    allEntities.forEach(e => {
        const prev = state.prevVida.get(e.uuid);
        if (prev !== undefined && e.vida < prev) {
            spawnFloatingText(state, e.x, e.y, `-${Math.round(prev - e.vida)}`, '#ff4757');
        }
        state.prevVida.set(e.uuid, e.vida);
    });

    state.floatingTexts.forEach(t => { t.y -= t.speed; t.life -= 0.05; });
    state.floatingTexts = state.floatingTexts.filter(t => t.life > 0);

    state.turnos++;

    const FIXED_SIZE = 147;
    const FLIP_COOLDOWN = 400;

    allEntities.forEach(agente => {
        if (!agente.estaVivo() || agente.state === 'death') return;
        if (agente.state === 'attack' || agente.state === 'hit') return;

        // Buscar target
        let target = null;
        if (agente instanceof Malo) {
            target = findClosest(engine, agente, state.buenos).target;
        } else if (agente instanceof Bueno) {
            target = findClosest(engine, agente, state.malos).target;
        }

        if (target) {
            // ✅ Caché de pathfinding por celda (dentro del forEach, donde agente existe)
            const currentCellX = Math.floor(agente.x / CONSTANTS.CELL_SIZE);
            const currentCellY = Math.floor(agente.y / CONSTANTS.CELL_SIZE);
            const cellChanged = agente._lastCellX !== currentCellX || agente._lastCellY !== currentCellY;

            if (cellChanged || !agente._cachedNextCell) {
                agente._lastCellX = currentCellX;
                agente._lastCellY = currentCellY;
                agente._cachedNextCell = pathfinder.calcularSiguientePaso(agente, target);
            }

            const nextCell = agente._cachedNextCell;

            if (nextCell.x !== currentCellX || nextCell.y !== currentCellY) {
                // Moverse hacia el centro de la celda destino
                const targetPixelX = nextCell.x * CONSTANTS.CELL_SIZE + CONSTANTS.CELL_SIZE / 2;
                const targetPixelY = nextCell.y * CONSTANTS.CELL_SIZE + CONSTANTS.CELL_SIZE / 2;
                const dx = targetPixelX - agente.x;
                const dy = targetPixelY - agente.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    agente.vx = (dx / dist) * agente.speed;
                    agente.vy = (dy / dist) * agente.speed;
                }
            } else {
                // Misma celda: ir directo al target
                const dx = target.x - agente.x;
                const dy = target.y - agente.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    agente.vx = (dx / dist) * agente.speed;
                    agente.vy = (dy / dist) * agente.speed;
                } else {
                    agente.vx = 0;
                    agente.vy = 0;
                }
            }
        } else {
            agente.vx = 0;
            agente.vy = 0;
        }

        // Aplicar movimiento
        const maxX = CONSTANTS.COLS * CONSTANTS.CELL_SIZE - FIXED_SIZE;
        const maxY = CONSTANTS.ROWS * CONSTANTS.CELL_SIZE - FIXED_SIZE;

        if (!isNaN(maxX) && !isNaN(maxY) && maxX > 0 && maxY > 0) {
            const nextX = Math.max(0, Math.min(agente.x + agente.vx * (deltaTime / 1000), maxX));
            const nextY = Math.max(0, Math.min(agente.y + agente.vy * (deltaTime / 1000), maxY));

            if (!engine.updateEntityPosition(agente, nextX, nextY)) {
                // Intentar sliding en X o Y por separado
                if (!engine.updateEntityPosition(agente, nextX, agente.y)) {
                    engine.updateEntityPosition(agente, agente.x, nextY);
                }
            }
        }

        // Facing con cooldown anti-flip
        const now = performance.now();
        agente._lastFlip = agente._lastFlip || 0;
        if (agente.vx > 0.5 && !agente.facingRight && now - agente._lastFlip > FLIP_COOLDOWN) {
            agente.facingRight = true;
            agente._lastFlip = now;
        } else if (agente.vx < -0.5 && agente.facingRight && now - agente._lastFlip > FLIP_COOLDOWN) {
            agente.facingRight = false;
            agente._lastFlip = now;
        }

        // Animación idle/run
        if (Math.abs(agente.vx) > 0.1 || Math.abs(agente.vy) > 0.1) {
            if (agente.state === 'idle') agente.setState('run');
        } else {
            if (agente.state === 'run') agente.setState('idle');
        }
    });

    // Combate
    state.malos.forEach(malo => {
        if (!malo.estaVivo() || malo.state === 'death' || malo.state === 'attack') return;
        const targets = state.buenos.filter(b => b.estaVivo() && b.state !== 'death' && engine.getPixelDistance(malo, b) <= 2 * CONSTANTS.CELL_SIZE);
        if (targets.length > 0) malo.atacar(targets[0]);
    });

    state.buenos.forEach(bueno => {
        if (!bueno.estaVivo() || bueno.state === 'death' || bueno.state === 'attack') return;
        const targets = state.malos.filter(m => m.estaVivo() && m.state !== 'death' && engine.getPixelDistance(bueno, m) <= 2 * CONSTANTS.CELL_SIZE);
        if (targets.length > 0) bueno.atacar(targets[0]);
    });

    // Animación y limpieza de muertos
    const deadFilter = (e) => {
        const config = (e instanceof Malo) ? ANIMATIONS.MALO : ANIMATIONS.BUENO;
        e.updateAnimation(deltaTime, config.states[e.state].frames);
        if (!e.estaVivo()) {
            if (e.state !== 'death') e.setState('death');
            if (e.isDead) {
                engine.removeEntity(e);
                state.prevVida.delete(e.uuid);
                return false;
            }
        }
        return true;
    };

    state.buenos = state.buenos.filter(deadFilter);
    state.malos = state.malos.filter(deadFilter);

    updateStatsUI(state.buenos.length, state.malos.length, state.turnos);

    if (state.buenos.length === 0 || state.malos.length === 0) {
        state.isRunning = false;
        showGameOverModal(state.buenos.length === 0 ? "¡ORDEN 66 COMPLETADA!" : "¡LA FUERZA HA PREVALECIDO!");
    }
}

export function getRandomCoord() {
    return {
        x: Math.floor(Math.random() * CONSTANTS.COLS),
        y: Math.floor(Math.random() * CONSTANTS.ROWS)
    };
}

export function resetSimulation(state, engine, resizeCallback) {
    resizeCallback();
    engine.resetGrid();
    state.buenos = [];
    state.malos = [];
    state.piedras = [];
    state.turnos = 0;
    state.floatingTexts = [];
    state.prevVida.clear();
    state.isRunning = true;

    UI.modal.classList.add('hidden');
    UI.btnPause.innerText = "PAUSAR";

    const countBuenos = parseInt(UI.inputBuenos.value);
    const countMalos = parseInt(UI.inputMalos.value);
    const countPiedras = parseInt(UI.inputPiedras.value);
    const MARGIN = 1;

    let i = 0;
    while (i < countPiedras) {
        const c = {
            x: Math.floor(Math.random() * (CONSTANTS.COLS - 2 * MARGIN)) + MARGIN,
            y: Math.floor(Math.random() * (CONSTANTS.ROWS - 2 * MARGIN)) + MARGIN
        };
        const piedra = new Piedra(
            c.x * CONSTANTS.CELL_SIZE + CONSTANTS.CELL_SIZE / 2,
            c.y * CONSTANTS.CELL_SIZE + CONSTANTS.CELL_SIZE / 2
        );
        if (engine.placeEntity(piedra)) { state.piedras.push(piedra); i++; }
    }

    i = 0;
    while (i < countMalos) {
        const c = {
            x: Math.floor(Math.random() * (CONSTANTS.COLS - 2 * MARGIN)) + MARGIN,
            y: Math.floor(Math.random() * (CONSTANTS.ROWS - 2 * MARGIN)) + MARGIN
        };
        const malo = new Malo(
            c.x * CONSTANTS.CELL_SIZE + CONSTANTS.CELL_SIZE / 2,
            c.y * CONSTANTS.CELL_SIZE
        );
        if (engine.placeEntity(malo)) { state.malos.push(malo); i++; }
    }

    let attempts = 0;
    i = 0;
    while (i < countBuenos && attempts < 100000) {
        const c = {
            x: Math.floor(Math.random() * (CONSTANTS.COLS - 2 * MARGIN)) + MARGIN,
            y: Math.floor(Math.random() * (CONSTANTS.ROWS - 2 * MARGIN)) + MARGIN
        };
        const pixelX = c.x * CONSTANTS.CELL_SIZE + CONSTANTS.CELL_SIZE / 2;
        const pixelY = c.y * CONSTANTS.CELL_SIZE;
        if (engine.isCellEmpty(pixelX, pixelY, MARGIN)) {
            const b = new Bueno(pixelX, pixelY);
            engine.placeEntity(b);
            state.buenos.push(b);
            i++;
        }
        attempts++;
    }
}