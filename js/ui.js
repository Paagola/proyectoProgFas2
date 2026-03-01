// UI References
export const UI = {
    inputBuenos: document.getElementById('cfg-buenos'),
    inputMalos: document.getElementById('cfg-malos'),
    inputPiedras: document.getElementById('cfg-piedras'),
    btnStart: document.getElementById('btn-start'),
    btnPause: document.getElementById('btn-pause'),
    statBuenos: document.getElementById('stat-buenos'),
    statMalos: document.getElementById('stat-malos'),
    statWave: document.getElementById('stat-wave'),
    statLevel: document.getElementById('stat-level'),
    statGold: document.getElementById('stat-gold'),
    modal: document.getElementById('modal-gameover'),
    winnerText: document.getElementById('winner-text'),
    winnerSub: document.getElementById('winner-sub'),
    btnModalRestart: document.getElementById('btn-modal-restart'),
    canvas: document.getElementById('simulationCanvas'),
    toolBtns: document.querySelectorAll('.tool-btn'),
    logEntries: document.getElementById('log-entries'),
    _hudMessage: '',
};

export function updateInputDisplay(input, idVal) {
    const el = document.getElementById(idVal);
    if (el) el.innerText = input.value;
}

export function updateStatsUI(buenos, malos, wave, level, gold) {
    if (UI.statBuenos) UI.statBuenos.innerText = buenos;
    if (UI.statMalos) UI.statMalos.innerText = malos;
    if (UI.statWave) UI.statWave.innerText = wave;
    if (UI.statLevel) UI.statLevel.innerText = level;
    if (UI.statGold) UI.statGold.innerText = gold;
}

export function showHudMessage(msg) {
    UI._hudMessage = msg;
}

export function showGameOverModal(result, level, wave, stats) {
    if (!UI.modal) return;
    UI.modal.classList.remove('hidden');
    UI.modal.dataset.result = result;

    if (result === 'defeat') {
        if (UI.winnerText) UI.winnerText.innerText = '☠ OPERACIÓN COMPROMETIDA ☠';
        if (UI.winnerSub) UI.winnerSub.innerText = `Sector perdido en el Nivel ${level}, Fase ${wave}.`;
    } else {
        if (UI.winnerText) UI.winnerText.innerText = '⚔ MISIÓN COMPLETADA ⚔';
        if (UI.winnerSub) UI.winnerSub.innerText = `¡Dominio total del sistema establecido!`;
    }

    if (stats) {
        document.getElementById('m-stat-kills').innerText = stats.kills;
        document.getElementById('m-stat-gold').innerText = stats.goldSpent;
        document.getElementById('m-stat-threat').innerText = stats.peakThreat.toFixed(2);
    }
}

export function hideGameOverModal() {
    if (UI.modal) UI.modal.classList.add('hidden');
}

export function updatePauseButton(isRunning) {
    if (UI.btnPause) UI.btnPause.innerText = isRunning ? 'PAUSAR' : 'REANUDAR';
}

export function addLogEntry(msg, type = 'combat') {
    if (!UI.logEntries) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    entry.innerText = `[${time}] ${msg}`;
    UI.logEntries.prepend(entry); // Prepend because we use flex-direction: column-reverse? No, let's just append and scroll.
    // Actually, prepend works better with column-reverse if we want newest at top, 
    // but the CSS was column-reverse which means newest at bottom. 
    // Let's use append and scroll.
}

export function clearLog() {
    if (UI.logEntries) UI.logEntries.innerHTML = '';
}
