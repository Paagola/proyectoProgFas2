import { Piedra, Malo, Bueno } from './models.js';
import { CONSTANTS } from './engine.js';
import { ANIMATIONS } from './assets.js';
import { UI, showGameOverModal, updateStatsUI } from './ui.js';

/**
 * Finds the closest target for an entity.
 * @param {object} engine 
 * @param {object} entity 
 * @param {array} targets 
 * @returns {object}
 */
export function findClosest(engine, entity, targets) {
    let closest = null;
    let minDst = Infinity;
    const validTargets = targets.filter(t => t.estaVivo() && t.state !== 'death');

    for (const t of validTargets) {
        const dst = engine.getManhattanDistance(entity, t);
        if (dst < minDst) { minDst = dst; closest = t; }
    }
    return { target: closest, dist: minDst };
}

/**
 * Spawns a floating damage text.
 * @param {object} state 
 * @param {number} x 
 * @param {number} y 
 * @param {string} text 
 * @param {string} color 
 */
export function spawnFloatingText(state, x, y, text, color) {
    state.floatingTexts.push({
        x: x * CONSTANTS.CELL_SIZE + CONSTANTS.CELL_SIZE / 2,
        y: y * CONSTANTS.CELL_SIZE,
        text: text,
        color: color,
        life: 1.0,
        speed: 1.5
    });
}

/**
 * Updates the game logic for a single tick.
 * @param {object} state 
 * @param {object} engine 
 * @param {object} pathfinder 
 */
export function updateGameLogic(state, engine, pathfinder) {
    if (!state.isRunning) return;

    const allEntities = [...state.buenos, ...state.malos];

    allEntities.forEach(e => {
        const prev = state.prevVida.get(e.uuid);
        if (prev !== undefined && e.vida < prev) {
            spawnFloatingText(state, e.x, e.y, `-${Math.round(prev - e.vida)}`, '#ff4757');
        }
        state.prevVida.set(e.uuid, e.vida);
    });

    state.floatingTexts.forEach(t => {
        t.y -= t.speed;
        t.life -= 0.05;
    });
    state.floatingTexts = state.floatingTexts.filter(t => t.life > 0);

    state.turnos++;

    allEntities.forEach(agente => {
        if (!agente.estaVivo() || agente.state === 'death') return;
        if (agente.state === 'attack' || agente.state === 'hit') return;

        const isBeingAttacked = allEntities.some(e => e.state === 'attack' && e.currentTarget === agente);
        if (isBeingAttacked) return;

        let target = null;
        if (agente instanceof Malo) {
            const result = findClosest(engine, agente, state.buenos);
            target = result.target;
        } else if (agente instanceof Bueno) {
            const result = findClosest(engine, agente, state.malos);
            if (result.dist < 10) target = result.target;
        }

        const nextPos = pathfinder.calcularSiguientePaso(agente, target);

        if (nextPos.x > agente.x) agente.facingRight = true;
        else if (nextPos.x < agente.x) agente.facingRight = false;

        if (nextPos.x !== agente.x || nextPos.y !== agente.y) {
            agente.setState('run');
            engine.updateEntityPosition(agente, nextPos.x, nextPos.y);
        } else {
            if (agente.state === 'run') agente.setState('idle');
        }
    });

    state.malos.forEach(malo => {
        if (!malo.estaVivo() || malo.state === 'death' || malo.state === 'attack') return;
        const targets = state.buenos.filter(b => b.estaVivo() && b.state !== 'death' && engine.getChebyshevDistance(malo, b) <= 1);
        if (targets.length > 0) malo.atacar(targets[0]);
    });

    state.buenos.forEach(bueno => {
        if (!bueno.estaVivo() || bueno.state === 'death' || bueno.state === 'attack') return;
        const targets = state.malos.filter(m => m.estaVivo() && m.state !== 'death' && engine.getChebyshevDistance(bueno, m) <= 1);
        if (targets.length > 0) bueno.atacar(targets[0]);
    });

    const deadFilter = (e) => {
        const config = (e instanceof Malo) ? ANIMATIONS.MALO : ANIMATIONS.BUENO;
        e.updateAnimation(state.fpsInterval, config.states[e.state].frames);

        if (!e.estaVivo()) {
            if (e.state !== 'death') e.setState('death');
            if (e.isDead) {
                engine.removeEntity(e);
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

/**
 * Gets a random horizontal/vertical coordinate with a margin.
 * @returns {object}
 */
export function getRandomCoord() {
    return {
        x: Math.floor(Math.random() * (CONSTANTS.COLS)),
        y: Math.floor(Math.random() * (CONSTANTS.ROWS))
    };
}

/**
 * Initializes the simulation state and spawning.
 * @param {object} state 
 * @param {object} engine 
 * @param {function} resizeCallback 
 */
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

    let i = 0; while (i < countPiedras) {
        let c = {
            x: Math.floor(Math.random() * (CONSTANTS.COLS - 2 * MARGIN)) + MARGIN,
            y: Math.floor(Math.random() * (CONSTANTS.ROWS - 2 * MARGIN)) + MARGIN
        };
        if (engine.placeEntity(new Piedra(c.x, c.y))) { state.piedras.push(engine.grid[c.y][c.x]); i++; }
    }

    i = 0; while (i < countMalos) {
        let c = {
            x: Math.floor(Math.random() * (CONSTANTS.COLS - 2 * MARGIN)) + MARGIN,
            y: Math.floor(Math.random() * (CONSTANTS.ROWS - 2 * MARGIN)) + MARGIN
        };
        if (engine.placeEntity(new Malo(c.x, c.y))) { state.malos.push(engine.grid[c.y][c.x]); i++; }
    }

    let attempts = 0; i = 0;
    while (i < countBuenos && attempts < 100000) {
        let c = {
            x: Math.floor(Math.random() * (CONSTANTS.COLS - 2 * MARGIN)) + MARGIN,
            y: Math.floor(Math.random() * (CONSTANTS.ROWS - 2 * MARGIN)) + MARGIN
        };
        if (engine.isCellEmpty(c.x, c.y, MARGIN) && engine.checkSafetyDistance(c.x, c.y, state.malos)) {
            let b = new Bueno(c.x, c.y);
            engine.placeEntity(b);
            state.buenos.push(b);
            i++;
        }
        attempts++;
    }
}
