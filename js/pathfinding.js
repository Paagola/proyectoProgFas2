import { Malo, Bueno } from './models.js';
import { CONSTANTS } from './engine.js';

/**
 * Motor de Navegación (Heurística Voraz Local)
 * Moore Neighborhood (8 celdas adyacentes)
 */
export class Pathfinding {
    constructor(engine) {
        this.engine = engine;
    }

    calcularSiguientePaso(agente, objetivo) {
        let bestX = agente.x;
        let bestY = agente.y;

        if (!objetivo) return { x: bestX, y: bestY };

        // Malo: busca mínimo coste (acercarse). Bueno: busca máximo coste (alejarse)
        let bestDistance = (agente instanceof Malo) ? Infinity : -1;

        // Vecindad de Moore (8 direcciones)
        const dirs = [
            { dx: 0, dy: 0 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 },
            { dx: 1, dy: 1 }, { dx: -1, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 },
            { dx: -1, dy: -1 }
        ].sort(() => Math.random() - 0.5); // Randomizar orden para evitar sesgo diagonal

        for (let dir of dirs) {
            const nx = agente.x + dir.dx;
            const ny = agente.y + dir.dy;

            // Verificar límites y vacante (Hard Walls) con margen de seguridad
            const isDestinationEmpty = this.engine.isCellEmpty(nx, ny, 1);

            if (isDestinationEmpty) {
                // Prevención de "Corner Cutting": No pasar en diagonal si hay un obstáculo en el lateral
                // if (dir.dx !== 0 && dir.dy !== 0) {
                //     const block1 = !this.engine.isCellEmpty(agente.x + dir.dx, agente.y);
                //     const block2 = !this.engine.isCellEmpty(agente.x, agente.y + dir.dy);
                //     if (block1 || block2) continue; // Bloquear si hay pared en las esquinas
                // }

                const dist = Math.abs(nx - objetivo.x) + Math.abs(ny - objetivo.y);

                if (agente instanceof Malo) {
                    if (dist < bestDistance) {
                        bestDistance = dist;
                        bestX = nx; bestY = ny;
                    }
                } else { // Bueno alejándose
                    if (dist > bestDistance) {
                        bestDistance = dist;
                        bestX = nx; bestY = ny;
                    }
                }
            }
        }
        return { x: bestX, y: bestY };
    }
}
