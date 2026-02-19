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
        if (!objetivo) {
            const agenteCellX = Math.floor(agente.x / CONSTANTS.CELL_SIZE);
            const agenteCellY = Math.floor(agente.y / CONSTANTS.CELL_SIZE);
            return { x: agenteCellX, y: agenteCellY };
        }

        // Calcular dirección hacia el objetivo
        const dx = objetivo.x - agente.x;
        const dy = objetivo.y - agente.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist === 0) {
            const agenteCellX = Math.floor(agente.x / CONSTANTS.CELL_SIZE);
            const agenteCellY = Math.floor(agente.y / CONSTANTS.CELL_SIZE);
            return { x: agenteCellX, y: agenteCellY };
        }

        // Normalizar dirección
        const dirX = dx / dist;
        const dirY = dy / dist;

        // Calcular 8 direcciones prioritizadas por cercanía al objetivo
        const directions = [
            { x: dirX, y: dirY, name: "direct" },           // Dirección directa
            { x: dirX > 0 ? 1 : -1, y: 0, name: "x" },      // Horizontal
            { x: 0, y: dirY > 0 ? 1 : -1, name: "y" },      // Vertical
            { x: dirX > 0 ? 1 : -1, y: dirY > 0 ? 1 : -1, name: "diagonal" },  // Diagonal
            { x: -dirY, y: dirX, name: "slide_left" },      // Perpendicular izquierda
            { x: dirY, y: -dirX, name: "slide_right" }        // Opuesto (fallback)
        ];

        // Para cada dirección, intentar un pequeño paso en píxeles
        const stepSize = CONSTANTS.CELL_SIZE; // 1 celda de movimiento (más fino)
        
        for (const dir of directions) {
            const testX = agente.x + dir.x * stepSize;
            const testY = agente.y + dir.y * stepSize;
            
            if (this.engine.canMoveTo(agente, testX, testY)) {
                // Retornar la celda destino (no el pixel exacto)
                const cellX = Math.floor(testX / CONSTANTS.CELL_SIZE);
                const cellY = Math.floor(testY / CONSTANTS.CELL_SIZE);
                return { x: cellX, y: cellY };
            }
        }

        // Si todas las direcciones están bloqueadas, intentar pasos más pequeños (media celda)
        const smallStepSize = CONSTANTS.CELL_SIZE / 2;
        const smallDirections = [
            { x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 },
            { x: 1, y: 1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: -1, y: -1 }
        ];
        
        for (const dir of smallDirections) {
            const testX = agente.x + dir.x * smallStepSize;
            const testY = agente.y + dir.y * smallStepSize;
            
            if (this.engine.canMoveTo(agente, testX, testY)) {
                const cellX = Math.floor(testX / CONSTANTS.CELL_SIZE);
                const cellY = Math.floor(testY / CONSTANTS.CELL_SIZE);
                return { x: cellX, y: cellY };
            }
        }

        // Si aún así no se puede mover, quedarse en lugar
        const agenteCellX = Math.floor(agente.x / CONSTANTS.CELL_SIZE);
        const agenteCellY = Math.floor(agente.y / CONSTANTS.CELL_SIZE);
        return { x: agenteCellX, y: agenteCellY };
    }
}
