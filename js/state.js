export const state = {
    buenos: [],
    malos: [],
    piedras: [],
    isRunning: false,
    turnos: 0,
    fpsInterval: 1000 / 5,
    lastFrameTime: 0,
    floatingTexts: [],
    prevVida: new Map() // Para detectar cambios de vida
};
