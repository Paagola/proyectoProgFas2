export const state = {
    // Entities
    buenos: [],
    malos: [],
    piedras: [],
    gold: 150,
    selectedTool: 'hero', // 'hero', 'rock', 'spell'

    // Wave & Level system
    currentLevel: 1,
    currentWave: 0,
    totalWavesPerLevel: 5,
    waveInProgress: false,
    waveTransitionTimer: 0,
    waveTransitionDelay: 3000, // ms between waves
    levelTransitionTimer: 0,
    levelTransitionDelay: 4000,
    levelTransitionActive: false,
    waveEnemiesForThisWave: 0,

    // Runtime
    isRunning: false,
    turnos: 0,
    lastFrameTime: 0,
    deltaTime: 0,

    // Visual effects
    floatingTexts: [],
    particles: [],
    prevVida: new Map(),

    // Screen shake
    shakeIntensity: 0,
    shakeDecay: 0.85,

    // HUD message
    hudMessage: '',
    hudMessageTimer: 0,
    threatLevel: 1.0, // Difficulty multiplier

    // Stats for professional reporting
    stats: {
        kills: 0,
        goldSpent: 0,
        peakThreat: 1.0,
    }
};
