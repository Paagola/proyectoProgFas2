import { Piedra, Malo, Bueno } from './models.js';

export let CONSTANTS = {
    ROWS: 10,
    COLS: 25,
    CELL_SIZE: 64,      // Resolución ajustada para que quepan más elementos
    SAFE_DISTANCE: 5    // Distancia mínima en spawn (Ajustada según Java legacy)
};

export class GameEngine {
    constructor() {
        this.resetGrid();
    }

    resetGrid() {
        this.grid = Array(CONSTANTS.ROWS).fill(null).map(() => Array(CONSTANTS.COLS).fill(null));
    }

    // --- Helpers de Distancia ---
    getManhattanDistance(e1, e2) {
        return Math.abs(e1.x - e2.x) + Math.abs(e1.y - e2.y);
    }

    getChebyshevDistance(e1, e2) {
        return Math.max(Math.abs(e1.x - e2.x), Math.abs(e1.y - e2.y));
    }

    // --- Gestión del Grid ---
    isCellEmpty(x, y, margin = 0) {
        if (x < margin || x >= CONSTANTS.COLS - margin || y < margin || y >= CONSTANTS.ROWS - margin) return false;
        const cell = this.grid[y][x];
        return cell === null;
    }

    placeEntity(entity) {
        if (this.isCellEmpty(entity.x, entity.y)) {
            this.grid[entity.y][entity.x] = entity;
            return true;
        }
        return false;
    }

    removeEntity(entity) {
        if (this.grid[entity.y] && this.grid[entity.y][entity.x] === entity) {
            this.grid[entity.y][entity.x] = null;
        }
    }

    updateEntityPosition(entity, newX, newY) {
        // Validación de seguridad estricta: NO mover si el destino está ocupado
        // (Esto previene que un bug de IA borre una piedra del grid)
        if (!this.isCellEmpty(newX, newY)) {
            return;
        }

        this.grid[entity.y][entity.x] = null;
        entity.x = newX;
        entity.y = newY;
        this.grid[entity.y][entity.x] = entity;
    }

    checkSafetyDistance(x, y, others) {
        for (const other of others) {
            const dist = Math.abs(x - other.x) + Math.abs(y - other.y);
            if (dist < CONSTANTS.SAFE_DISTANCE) return false;
        }
        return true;
    }
}