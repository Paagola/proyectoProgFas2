import { Piedra, Malo, Bueno, Elemento } from './models.js';
import { GameEngine, CONSTANTS } from './engine.js';

// --- Configuración e Inicialización ---
const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');
const engine = new GameEngine();

// Ajustar tamaño del canvas
canvas.width = CONSTANTS.COLS * CONSTANTS.CELL_SIZE;
canvas.height = CONSTANTS.ROWS * CONSTANTS.CELL_SIZE;

// Listas de entidades
let buenos = [];
let malos = [];
let piedras = [];
let isRunning = true;

// Referencias UI
const uiBuenos = document.getElementById('counter-buenos');
const uiMalos = document.getElementById('counter-malos');
const modal = document.getElementById('modal-gameover');
const winnerText = document.getElementById('winner-text');

function getRandomCoord() {
    return {
        x: Math.floor(Math.random() * CONSTANTS.COLS),
        y: Math.floor(Math.random() * CONSTANTS.ROWS)
    };
}

function initWorld() {
    // 1. Generar Piedras (Sin restricción de distancia, solo colisión simple)
    let placed = 0;
    while (placed < 100) {
        const { x, y } = getRandomCoord();
        if (engine.isCellEmpty(x, y)) {
            const p = new Piedra(x, y);
            engine.placeEntity(p);
            piedras.push(p);
            placed++;
        }
    }

    // 2. Generar Malos (20 unidades)
    placed = 0;
    while (placed < 20) {
        const { x, y } = getRandomCoord();
        // Validar Grid vacío
        if (engine.isCellEmpty(x, y)) {
            const m = new Malo(x, y);
            engine.placeEntity(m);
            malos.push(m);
            placed++;
        }
    }

    // 3. Generar Buenos (100 unidades)
    // Validar: Grid vacío Y lejanía de Malos
    placed = 0;
    let attempts = 0;
    while (placed < 100 && attempts < 100000) {
        const { x, y } = getRandomCoord();
        if (engine.isCellEmpty(x, y)) {
            // Verificar "App.malosYbuenosLejos"
            if (engine.checkSafetyDistance(x, y, 'Bueno', malos)) {
                const b = new Bueno(x, y);
                engine.placeEntity(b);
                buenos.push(b);
                placed++;
            }
        }
        attempts++;
    }
    
    // Nota: Se podría implementar la validación inversa (Malo lejos de Bueno) 
    // pero el orden del prompt sugiere instanciar y validar en cascada.
}

// --- Lógica del Juego (Fases) ---

function findClosest(entity, targets) {
    let closest = null;
    let minDst = Infinity;

    for (const t of targets) {
        const dst = engine.getManhattanDistance(entity, t);
        if (dst < minDst) {
            minDst = dst;
            closest = t;
        }
    }
    return { target: closest, dist: minDst };
}

function update() {
    if (!isRunning) return;

    // 1. Fase de Combate (Iterar sobre Malos)
    malos.forEach(malo => {
        // Buscar Buenos en rango de ataque (Chebyshev <= 1)
        const targetsInMelee = buenos.filter(b => engine.getChebyshevDistance(malo, b) <= 1);
        
        if (targetsInMelee.length > 0) {
            // Atacar al primero encontrado (o aleatorio)
            malo.atacar(targetsInMelee[0]);
        }
    });

    // 2. Fase de Limpieza (Garbage Collection)
    const deadFilter = (e) => {
        if (!e.estaVivo()) {
            engine.removeEntity(e); // Quitar del grid lógico
            return false;
        }
        return true;
    };

    buenos = buenos.filter(deadFilter);
    malos = malos.filter(deadFilter); // Malos pueden morir por fallo crítico

    // Actualizar UI
    uiBuenos.innerText = buenos.length;
    uiMalos.innerText = malos.length;

    // Verificar Game Over
    if (buenos.length === 0 || malos.length === 0) {
        isRunning = false;
        modal.classList.remove('hidden');
        winnerText.innerText = buenos.length === 0 ? "¡Los MALOS han ganado!" : "¡Los BUENOS han sobrevivido!";
        return;
    }

    // 3. Fase de Movimiento
    // Unir listas para iterar movimiento (podríamos randomizar el orden para evitar sesgo)
    const movers = [...malos, ...buenos];
    
    movers.forEach(agente => {
        if (!agente.estaVivo()) return;

        let target = null;

        if (agente instanceof Malo) {
            // Objetivo: Bueno más cercano
            const result = findClosest(agente, buenos);
            target = result.target;
        } else if (agente instanceof Bueno) {
            // Objetivo: Malo más cercano (para huir)
            const result = findClosest(agente, malos);
            // Trigger de Huida: Solo si Distancia < 10
            if (result.dist < 10) {
                target = result.target;
            }
        }

        // Calcular siguiente posición válida
        const nextPos = engine.calcularSiguientePaso(agente, target);

        // Mover si cambió la posición
        if (nextPos.x !== agente.x || nextPos.y !== agente.y) {
            engine.updateEntityPosition(agente, nextPos.x, nextPos.y);
        }
    });
}

function draw() {
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar todas las entidades
    // Función helper interna
    const drawEntity = (e) => {
        ctx.fillStyle = e.color;
        // Dibujamos un cuadrado de 10x10 en la posición calculada
        ctx.fillRect(e.x * CONSTANTS.CELL_SIZE, e.y * CONSTANTS.CELL_SIZE, CONSTANTS.CELL_SIZE, CONSTANTS.CELL_SIZE);
    };

    piedras.forEach(drawEntity);
    buenos.forEach(drawEntity);
    malos.forEach(drawEntity);
}

// --- Game Loop ---

let lastTime = 0;
// Limitador de FPS opcional si se quiere ver más lento, 
// pero requestAnimationFrame suele ir a 60fps.
function loop(timestamp) {
    if (!isRunning) return;

    // Ejecutar lógica y render
    update();
    draw();

    requestAnimationFrame(loop);
}

// Iniciar
initWorld();
requestAnimationFrame(loop);