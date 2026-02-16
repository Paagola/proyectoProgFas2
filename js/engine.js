import { Piedra, Malo, Bueno } from './models.js';

export const CONSTANTS = {
    ROWS: 50,
    COLS: 200,
    CELL_SIZE: 10,
    SAFE_DISTANCE: 5
};

export class GameEngine {
    constructor() {
        // Inicializar Grid vacío (Matriz de punteros a entidades o null)
        this.grid = Array(CONSTANTS.ROWS).fill(null).map(() => Array(CONSTANTS.COLS).fill(null));
    }

    // --- Helpers de Distancia ---

    getManhattanDistance(e1, e2) {
        return Math.abs(e1.x - e2.x) + Math.abs(e1.y - e2.y);
    }

    // Chebyshev para adyacencia (rango de ataque de 1 casilla incluyendo diagonales)
    getChebyshevDistance(e1, e2) {
        return Math.max(Math.abs(e1.x - e2.x), Math.abs(e1.y - e2.y));
    }

    // --- Gestión del Grid ---

    isCellEmpty(x, y) {
        if (x < 0 || x >= CONSTANTS.COLS || y < 0 || y >= CONSTANTS.ROWS) return false;
        return this.grid[y][x] === null;
    }

    placeEntity(entity) {
        if (this.isCellEmpty(entity.x, entity.y)) {
            this.grid[entity.y][entity.x] = entity;
            return true;
        }
        return false;
    }

    removeEntity(entity) {
        if (this.grid[entity.y][entity.x] === entity) {
            this.grid[entity.y][entity.x] = null;
        }
    }

    updateEntityPosition(entity, newX, newY) {
        this.grid[entity.y][entity.x] = null; // Liberar anterior
        entity.x = newX;
        entity.y = newY;
        this.grid[entity.y][entity.x] = entity; // Ocupar nueva
    }

    // --- Pathfinding Local (Greedy) ---

    calcularSiguientePaso(agente, objetivo) {
        let bestX = agente.x;
        let bestY = agente.y;
        
        // Si no hay objetivo, no se mueve
        if (!objetivo) return { x: bestX, y: bestY };

        let bestDistance = (agente instanceof Malo) ? Infinity : -1;

        // Escanear Vecindario de Moore (8 vecinos + centro)
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue; // Saltar propia posición actual

                const nx = agente.x + dx;
                const ny = agente.y + dy;

                // 1. Validar Límites y Colisiones
                if (this.isCellEmpty(nx, ny)) {
                    // 2. Evaluación Heurística (Manhattan al objetivo)
                    const dist = Math.abs(nx - objetivo.x) + Math.abs(ny - objetivo.y);

                    if (agente instanceof Malo) {
                        // Malo minimiza distancia (Cazar)
                        if (dist < bestDistance) {
                            bestDistance = dist;
                            bestX = nx;
                            bestY = ny;
                        }
                    } else if (agente instanceof Bueno) {
                        // Bueno maximiza distancia (Huir)
                        if (dist > bestDistance) {
                            bestDistance = dist;
                            bestX = nx;
                            bestY = ny;
                        }
                    }
                }
            }
        }
        return { x: bestX, y: bestY };
    }

    // --- Lógica de Spawning Seguro ---

    checkSafetyDistance(x, y, type, others) {
        // "others" es la lista de enemigos (Si soy Malo, paso la lista de Buenos)
        for (const other of others) {
            const dist = Math.abs(x - other.x) + Math.abs(y - other.y);
            if (dist < CONSTANTS.SAFE_DISTANCE) return false;
        }
        return true;
    }
}