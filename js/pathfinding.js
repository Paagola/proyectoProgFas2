import { Malo, Bueno } from './models.js';
import { CONSTANTS } from './engine.js';

/**
 * A* Pathfinding — navigates around rocks (and other entities) for both teams.
 */
export class Pathfinding {
    constructor(engine) {
        this.engine = engine;
    }

    /**
     * Finds the next step toward a target using A*.
     * Rocks are hard obstacles. Other characters are treated as soft obstacles
     * (we allow standing on them for pathfinding so units don't get stuck).
     */
    findNextStep(agente, objetivo) {
        if (!objetivo) return null;

        const startX = agente.x;
        const startY = agente.y;
        const goalX = objetivo.x;
        const goalY = objetivo.y;

        if (startX === goalX && startY === goalY) return null;

        const h = (x, y) => Math.abs(x - goalX) + Math.abs(y - goalY);

        // openSet: [f, g, x, y, parentX, parentY]
        const open = [];
        const closed = new Set();
        const gScore = new Map();
        const cameFrom = new Map();

        const key = (x, y) => y * CONSTANTS.COLS + x;

        gScore.set(key(startX, startY), 0);
        open.push({ f: h(startX, startY), g: 0, x: startX, y: startY });

        let iterations = 0;
        const MAX_ITER = CONSTANTS.ROWS * CONSTANTS.COLS;

        while (open.length > 0 && iterations++ < MAX_ITER) {
            // Pick lowest-f node
            let bestIdx = 0;
            for (let i = 1; i < open.length; i++) {
                if (open[i].f < open[bestIdx].f) bestIdx = i;
            }
            const current = open.splice(bestIdx, 1)[0];
            const ck = key(current.x, current.y);

            if (closed.has(ck)) continue;
            closed.add(ck);

            if (current.x === goalX && current.y === goalY) {
                // Reconstruct path — we only need the first step
                let node = { x: current.x, y: current.y };
                let parent = cameFrom.get(key(node.x, node.y));
                while (parent) {
                    const grandparent = cameFrom.get(key(parent.x, parent.y));
                    if (!grandparent) {
                        return { x: node.x, y: node.y };
                    }
                    node = parent;
                    parent = grandparent;
                }
                return { x: node.x, y: node.y };
            }

            // 4-directional movement (no diagonal to avoid corner-cutting through rocks)
            const dirs = [
                { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
                { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
                // Allow diagonal ONLY if both lateral cells are free
                { dx: 1, dy: 1 }, { dx: -1, dy: 1 },
                { dx: 1, dy: -1 }, { dx: -1, dy: -1 },
            ];

            for (const dir of dirs) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;

                if (!this.engine.isCellWalkable(nx, ny)) continue;

                // Corner-cutting prevention for diagonals
                if (dir.dx !== 0 && dir.dy !== 0) {
                    if (!this.engine.isCellWalkable(current.x + dir.dx, current.y)) continue;
                    if (!this.engine.isCellWalkable(current.x, current.y + dir.dy)) continue;
                }

                const nk = key(nx, ny);
                if (closed.has(nk)) continue;

                // Cost: diagonal costs slightly more
                const moveCost = (dir.dx !== 0 && dir.dy !== 0) ? 1.41 : 1;
                const tentG = (gScore.get(ck) || 0) + moveCost;

                if (!gScore.has(nk) || tentG < gScore.get(nk)) {
                    gScore.set(nk, tentG);
                    cameFrom.set(nk, { x: current.x, y: current.y });
                    open.push({ f: tentG + h(nx, ny), g: tentG, x: nx, y: ny });
                }
            }
        }

        // A* failed (no path) — try greedy fallback
        return this._greedyFallback(agente, objetivo);
    }

    _greedyFallback(agente, objetivo) {
        // Includes diagonals for wiggle room
        const dirs = [
            { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
            { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
            { dx: 1, dy: 1 }, { dx: -1, dy: -1 },
            { dx: 1, dy: -1 }, { dx: -1, dy: 1 }
        ];

        // Shuffle dirs to prevent predictable vibrating
        for (let i = dirs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
        }

        let best = null;
        let bestDist = Infinity;
        const currentDist = Math.abs(agente.x - objetivo.x) + Math.abs(agente.y - objetivo.y);

        for (const dir of dirs) {
            const nx = agente.x + dir.dx;
            const ny = agente.y + dir.dy;
            if (!this.engine.isCellWalkable(nx, ny)) continue;
            // Also check if unoccupied by another entity for the fallback
            if (!this.engine.isCellEmptyForMove(nx, ny)) continue;

            const d = Math.abs(nx - objetivo.x) + Math.abs(ny - objetivo.y);
            // Allow stepping laterally if locked
            if (d <= bestDist && d <= currentDist + 1) {
                bestDist = d;
                best = { x: nx, y: ny };
            }
        }
        return best;
    }

    /**
     * Legacy interface kept for simulation.js compatibility.
     */
    calcularSiguientePaso(agente, objetivo) {
        if (!objetivo) return { x: agente.x, y: agente.y };
        const step = this.findNextStep(agente, objetivo);
        if (!step) return { x: agente.x, y: agente.y };

        // Only move if cell is actually empty (not occupied by a live character)
        if (!this.engine.isCellEmptyForMove(step.x, step.y)) {
            return { x: agente.x, y: agente.y };
        }
        return step;
    }
}
