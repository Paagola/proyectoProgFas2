// UI References
export const UI = {
    inputBuenos: document.getElementById('cfg-buenos'),
    inputMalos: document.getElementById('cfg-malos'),
    inputPiedras: document.getElementById('cfg-piedras'),
    inputFps: document.getElementById('cfg-fps'),
    btnStart: document.getElementById('btn-start'),
    btnPause: document.getElementById('btn-pause'),
    statBuenos: document.getElementById('stat-buenos'),
    statMalos: document.getElementById('stat-malos'),
    statTurnos: document.getElementById('stat-turnos'),
    modal: document.getElementById('modal-gameover'),
    winnerText: document.getElementById('winner-text'),
    btnModalRestart: document.getElementById('btn-modal-restart'),
    canvas: document.getElementById('simulationCanvas')
};

/**
 * Updates the text display for a range input.
 * @param {HTMLInputElement} input 
 * @param {string} idVal 
 */
export function updateInputDisplay(input, idVal) {
    document.getElementById(idVal).innerText = input.value;
}

/**
 * Updates the stats displayed in the UI.
 * @param {number} buenos 
 * @param {number} malos 
 * @param {number} turnos 
 */
export function updateStatsUI(buenos, malos, turnos) {
    UI.statBuenos.innerText = buenos;
    UI.statMalos.innerText = malos;
    UI.statTurnos.innerText = turnos;
}

/**
 * Shows the game over modal with the winner text.
 * @param {string} message 
 */
export function showGameOverModal(message) {
    UI.modal.classList.remove('hidden');
    UI.winnerText.innerText = message;
}

/**
 * Hides the game over modal.
 */
export function hideGameOverModal() {
    UI.modal.classList.add('hidden');
}

/**
 * Updates the pause button text.
 * @param {boolean} isRunning 
 */
export function updatePauseButton(isRunning) {
    UI.btnPause.innerText = isRunning ? "PAUSAR" : "REANUDAR";
}

/**
 * Updates the FPS display label.
 * @param {number} fps 
 */
export function updateFPSDisplay(fps) {
    document.getElementById('val-fps').innerText = fps;
}
