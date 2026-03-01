import { Piedra } from './models.js';

export let CONSTANTS = {
    ROWS: 14,
    COLS: 32,
    CELL_SIZE: 64,
    SAFE_DISTANCE: 6,
    HERO_SPAWN_COLS: 8,    // Heroes spawn in left 8 columns
    ENEMY_SPAWN_COL: 31,   // Enemies spawn at rightmost column
};

export class GameEngine {
    constructor() {
        this.resetGrid();
    }

    resetGrid() {
        this.grid = Array(CONSTANTS.ROWS).fill(null).map(() => Array(CONSTANTS.COLS).fill(null));
    }

    getManhattanDistance(e1, e2) {
        return Math.abs(e1.x - e2.x) + Math.abs(e1.y - e2.y);
    }

    getChebyshevDistance(e1, e2) {
        return Math.max(Math.abs(e1.x - e2.x), Math.abs(e1.y - e2.y));
    }

    isCellEmpty(x, y, margin = 0) {
        if (x < margin || x >= CONSTANTS.COLS - margin || y < margin || y >= CONSTANTS.ROWS - margin) return false;
        return this.grid[y][x] === null;
    }

    isCellWalkable(x, y) {
        // We block y < 2 to prevent sprites clipping out the top (HUD area).
        if (x < 0 || x >= CONSTANTS.COLS || y < 2 || y >= CONSTANTS.ROWS) return false;
        const cell = this.grid[y][x];
        // Rocks are not walkable - using constructor name to avoid circular dependency
        if (cell && cell.constructor.name === 'Piedra') return false;
        return true;
    }

    isCellEmptyForMove(x, y) {
        if (x < 0 || x >= CONSTANTS.COLS || y < 2 || y >= CONSTANTS.ROWS) return false;
        return this.grid[y][x] === null;
    }

    placeEntity(entity) {
        if (entity.x >= 0 && entity.x < CONSTANTS.COLS && entity.y >= 2 && entity.y < CONSTANTS.ROWS && this.grid[entity.y][entity.x] === null) {
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
        if (!this.isCellEmptyForMove(newX, newY)) return false;
        this.grid[entity.y][entity.x] = null;
        entity.x = newX;
        entity.y = newY;
        this.grid[entity.y][entity.x] = entity;
        return true;
    }

    checkSafetyDistance(x, y, others, dist) {
        const d = dist || CONSTANTS.SAFE_DISTANCE;
        for (const other of others) {
            if (Math.abs(x - other.x) + Math.abs(y - other.y) < d) return false;
        }
        return true;
    }
}