import { GameEngine, CONSTANTS } from './engine.js';
import { Pathfinding } from './pathfinding.js';
import { AssetManager, ANIMATIONS, getEnemyAnimConfig } from './assets.js';
import { state } from './state.js';
import { UI, updatePauseButton, hideGameOverModal } from './ui.js';
import { resizeCanvas, draw } from './renderer.js';
import { updateGameLogic, resetSimulation, handlePlayerInput } from './simulation.js';
import { ENEMY_TYPES } from './models.js';

// --- Instances ---
const engine = new GameEngine();
const pathfinder = new Pathfinding(engine);
const assets = new AssetManager();

// --- Init ---
function init() {

    resetSimulation(state, engine, resizeCanvas);
    updatePauseButton(true);
}

// --- Main Loop (requestAnimationFrame at 60fps) ---
let lastTimestamp = 0;
function loop(timestamp) {
    requestAnimationFrame(loop);
    const raw = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    // Clamp deltaTime to avoid huge jumps after tab-switch
    state.deltaTime = Math.min(raw, 50);

    if (state.isRunning) {
        updateGameLogic(state, engine, pathfinder);
    }
    draw(state, assets);
}

// --- Event Listeners ---

UI.btnStart.addEventListener('click', init);
UI.btnPause.addEventListener('click', () => {
    state.isRunning = !state.isRunning;
    updatePauseButton(state.isRunning);
});
UI.btnModalRestart.addEventListener('click', () => {
    hideGameOverModal();
    init();
});

window.addEventListener('resize', () => {
    resizeCanvas();
});

// --- Mouse Interaction ---
UI.canvas.addEventListener('mousedown', (e) => {
    if (!state.isRunning) return;

    const rect = UI.canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // Convert to grid coords
    const gridX = Math.floor((px * UI.canvas.width / rect.width) / CONSTANTS.CELL_SIZE);
    const gridY = Math.floor((py * UI.canvas.height / rect.height) / CONSTANTS.CELL_SIZE);

    // Call the interaction handler directly since it's already imported at the top
    handlePlayerInput(state, engine, pathfinder, gridX, gridY, state.selectedTool);
});

UI.toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        UI.toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedTool = btn.dataset.tool;
    });
});


// --- Asset Loading ---
async function loadGameAssets() {
    const promises = [];

    // Load BUENO sprites
    for (const stateName in ANIMATIONS.BUENO.states) {
        const path = ANIMATIONS.BUENO.basePath + ANIMATIONS.BUENO.states[stateName].file;
        promises.push(assets.loadAsset(`BUENO_${stateName}`, path));
    }

    // Load all 4 enemy type sprites
    for (const type of ENEMY_TYPES) {
        const config = getEnemyAnimConfig(type);
        for (const stateName in config.states) {
            const path = config.basePath + config.states[stateName].file;
            promises.push(assets.loadAsset(`${type}_${stateName}`, path));
        }
    }

    // Load decor
    promises.push(assets.loadAsset('PIEDRA', ANIMATIONS.PIEDRA.path));
    promises.push(assets.loadAsset('BACKGROUND', ANIMATIONS.BACKGROUND.path));

    await Promise.all(promises);
    console.log('✅ Assets loaded. Starting...');
    init();
}

// --- Start ---

state.isRunning = false;
updatePauseButton(false);

loadGameAssets();
requestAnimationFrame(loop);