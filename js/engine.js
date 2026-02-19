import { Piedra, Malo, Bueno } from './models.js';

export const CONSTANTS = {
    ROWS: 10,
    COLS: 25,
    CELL_SIZE: 24,
    SAFE_DISTANCE: 120
};

export class GameEngine {
    constructor() {
        this.resetGrid();
    }

    resetGrid() {
        this.grid = Array(CONSTANTS.ROWS).fill(null).map(() => Array(CONSTANTS.COLS).fill(null));
    }

    // --- Helpers de Distancia ---
    getPixelDistance(e1, e2) {
        const dx = e1.x - e2.x;
        const dy = e1.y - e2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getChebyshevDistance(e1, e2) {
        const dx = Math.abs(e1.x - e2.x);
        const dy = Math.abs(e1.y - e2.y);
        return Math.max(Math.floor(dx / CONSTANTS.CELL_SIZE), Math.floor(dy / CONSTANTS.CELL_SIZE));
    }

    // --- Gestión del Grid ---
    isCellEmpty(x, y, margin = 0) {
        const gridX = Math.floor(x / CONSTANTS.CELL_SIZE);
        const gridY = Math.floor(y / CONSTANTS.CELL_SIZE);
        if (gridX < margin || gridX >= CONSTANTS.COLS - margin || gridY < margin || gridY >= CONSTANTS.ROWS - margin) return false;
        return this.grid[gridY][gridX] === null;
    }

    /**
     * Devuelve las celdas del grid ocupadas por una entidad.
     * - Personajes (isCharacter === true): solo celda central.
     * - Piedras: bounding box completo.
     */
    getOccupiedCellsForEntity(entity) {
        const s = CONSTANTS.CELL_SIZE;

        if (!entity.size) {
            // Entidad sin tamaño: una sola celda
            const gx = Math.floor(entity.x / s);
            const gy = Math.floor(entity.y / s);
            if (gx < 0 || gx >= CONSTANTS.COLS || gy < 0 || gy >= CONSTANTS.ROWS) return [];
            return [{ x: gx, y: gy }];
        }

        // Personajes: ocupan solo su celda central para no bloquearse entre sí
        if (entity.isCharacter === true) {
            const centerCellX = Math.floor(entity.x / s);
            const centerCellY = Math.floor(entity.y / s);
            if (centerCellX < 0 || centerCellX >= CONSTANTS.COLS || centerCellY < 0 || centerCellY >= CONSTANTS.ROWS) return [];
            return [{ x: centerCellX, y: centerCellY }];
        }

        // Piedras u otros objetos: bounding box completo
        const halfSize = entity.size / 2;
        const cellMinX = Math.max(0, Math.floor((entity.x - halfSize) / s));
        const cellMaxX = Math.min(CONSTANTS.COLS - 1, Math.floor((entity.x + halfSize - 1) / s));
        const cellMinY = Math.max(0, Math.floor((entity.y - halfSize) / s));
        const cellMaxY = Math.min(CONSTANTS.ROWS - 1, Math.floor((entity.y + halfSize - 1) / s));

        const cells = [];
        for (let gy = cellMinY; gy <= cellMaxY; gy++) {
            for (let gx = cellMinX; gx <= cellMaxX; gx++) {
                cells.push({ x: gx, y: gy });
            }
        }
        return cells.length > 0 ? cells : [{ x: Math.floor(entity.x / s), y: Math.floor(entity.y / s) }];
    }

    /**
     * Verifica si una entidad puede moverse a (newX, newY) sin colisionar.
     */
    canMoveTo(entity, newX, newY) {
        const temp = { x: newX, y: newY, size: entity.size, isCharacter: entity.isCharacter };
        const newCells = this.getOccupiedCellsForEntity(temp);

        for (const c of newCells) {
            if (c.x < 0 || c.x >= CONSTANTS.COLS || c.y < 0 || c.y >= CONSTANTS.ROWS) return false;
            const occupant = this.grid[c.y][c.x];
            if (occupant !== null && occupant !== entity) return false;
        }
        return true;
    }

    placeEntity(entity) {
        const cells = this.getOccupiedCellsForEntity(entity);
        if (!cells || cells.length === 0) return false;

        for (const c of cells) {
            if (this.grid[c.y][c.x] !== null) return false;
        }
        for (const c of cells) {
            this.grid[c.y][c.x] = entity;
        }
        entity._occupiedCells = cells;
        return true;
    }

    removeEntity(entity) {
        const cells = entity._occupiedCells;
        if (cells && cells.length > 0) {
            for (const c of cells) {
                if (this.grid[c.y] && this.grid[c.y][c.x] === entity) {
                    this.grid[c.y][c.x] = null;
                }
            }
            entity._occupiedCells = [];
        } else {
            const gx = Math.floor(entity.x / CONSTANTS.CELL_SIZE);
            const gy = Math.floor(entity.y / CONSTANTS.CELL_SIZE);
            if (this.grid[gy] && this.grid[gy][gx] === entity) {
                this.grid[gy][gx] = null;
            }
        }
    }

    updateEntityPosition(entity, newX, newY) {
        // Early exit: movimiento sub-pixel, no recalcular grid
        if (Math.abs(newX - entity.x) < 0.5 && Math.abs(newY - entity.y) < 0.5) {
            entity.x = newX;
            entity.y = newY;
            return true;
        }

        const oldCells = (entity._occupiedCells && entity._occupiedCells.length > 0)
            ? entity._occupiedCells
            : this.getOccupiedCellsForEntity(entity);

        const temp = { x: newX, y: newY, size: entity.size, isCharacter: entity.isCharacter };
        const newCells = this.getOccupiedCellsForEntity(temp);

        // Si las celdas no cambiaron, solo mover
        const cellsSame = oldCells.length === newCells.length &&
            oldCells.every((c, i) => c.x === newCells[i].x && c.y === newCells[i].y);

        if (cellsSame) {
            entity.x = newX;
            entity.y = newY;
            return true;
        }

        // Verificar que las nuevas celdas estén libres
        for (const c of newCells) {
            if (c.x < 0 || c.x >= CONSTANTS.COLS || c.y < 0 || c.y >= CONSTANTS.ROWS) return false;
            const occupant = this.grid[c.y][c.x];
            if (occupant !== null && occupant !== entity) return false;
        }

        // Liberar celdas antiguas
        for (const c of oldCells) {
            if (this.grid[c.y] && this.grid[c.y][c.x] === entity) {
                this.grid[c.y][c.x] = null;
            }
        }

        // Reservar nuevas celdas
        for (const c of newCells) {
            this.grid[c.y][c.x] = entity;
        }

        entity._occupiedCells = newCells;
        entity.x = newX;
        entity.y = newY;
        return true;
    }

    checkSafetyDistance(x, y, others) {
        for (const other of others) {
            const dx = x - other.x;
            const dy = y - other.y;
            if (Math.sqrt(dx * dx + dy * dy) < CONSTANTS.SAFE_DISTANCE) return false;
        }
        return true;
    }
}