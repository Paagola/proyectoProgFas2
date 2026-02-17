import { GameEngine } from './engine.js';
import { Pathfinding } from './pathfinding.js';
import { AssetManager, ANIMATIONS } from './assets.js';
import { state } from './state.js';
import { UI, updateInputDisplay, updatePauseButton, hideGameOverModal, updateFPSDisplay } from './ui.js';
import { resizeCanvas, draw } from './renderer.js';
import { updateGameLogic, resetSimulation } from './simulation.js';

// --- Estado Global e Instancias ---
const engine = new GameEngine();
const pathfinder = new Pathfinding(engine);
const assets = new AssetManager();

// --- Lógica de Inicialización ---

function init() {
    resetSimulation(state, engine, resizeCanvas);
    draw(state, assets);
}

// Bucle de animación
function loop(timestamp) {
    requestAnimationFrame(loop);
    const elapsed = timestamp - state.lastFrameTime;
    if (elapsed > state.fpsInterval) {
        state.lastFrameTime = timestamp - (elapsed % state.fpsInterval);
        if (state.isRunning) {
            updateGameLogic(state, engine, pathfinder);
        }
        draw(state, assets); // Dibujar siempre, incluso en pausa
    }
}

// --- Listeners de Eventos ---

UI.inputBuenos.addEventListener('input', () => updateInputDisplay(UI.inputBuenos, 'val-buenos'));
UI.inputMalos.addEventListener('input', () => updateInputDisplay(UI.inputMalos, 'val-malos'));
UI.inputPiedras.addEventListener('input', () => updateInputDisplay(UI.inputPiedras, 'val-piedras'));
UI.inputFps.addEventListener('input', (e) => {
    state.fpsInterval = 1000 / e.target.value;
    updateFPSDisplay(e.target.value);
});

UI.btnStart.addEventListener('click', init);
UI.btnPause.addEventListener('click', () => {
    state.isRunning = !state.isRunning;
    updatePauseButton(state.isRunning);
});
UI.btnModalRestart.addEventListener('click', () => {
    hideGameOverModal();
    init();
});

// --- Carga de Assets ---

async function loadGameAssets() {
    const promises = [];

    // Cargar sprites de personajes
    for (const key in ANIMATIONS) {
        if (key === 'PIEDRA') continue;
        const config = ANIMATIONS[key];
        for (const stateName in config.states) {
            const path = config.basePath + config.states[stateName].file;
            promises.push(assets.loadAsset(`${key}_${stateName}`, path)
                .catch(err => console.error(`Fallo al cargar ${path}:`, err)));
        }
    }

    // Cargar sprite de piedra
    promises.push(assets.loadAsset('PIEDRA', ANIMATIONS.PIEDRA.path)
        .catch(err => console.error(`Fallo al cargar ${ANIMATIONS.PIEDRA.path}:`, err)));

    // Cargar fondo
    promises.push(assets.loadAsset('BACKGROUND', ANIMATIONS.BACKGROUND.path)
        .catch(err => console.error(`Fallo al cargar ${ANIMATIONS.BACKGROUND.path}:`, err)));

    await Promise.all(promises);
    console.log("Assets cargados!");
    init();
}

// --- Arranque ---

// Configuración inicial de visualización
updateInputDisplay(UI.inputBuenos, 'val-buenos');
updateInputDisplay(UI.inputMalos, 'val-malos');
updateInputDisplay(UI.inputPiedras, 'val-piedras');

state.isRunning = false;
UI.btnPause.innerText = "INICIAR";

loadGameAssets(); // Cargar assets antes de iniciar
requestAnimationFrame(loop);