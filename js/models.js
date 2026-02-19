import { CONSTANTS } from './engine.js';

const generateUUID = () => Math.random().toString(36).substr(2, 9);

export class Elemento {
    constructor(x, y) {
        this.uuid = generateUUID();
        this.x = x;
        this.y = y;
    }
}

export class Piedra extends Elemento {
    constructor(x, y) {
        super(x, y);
        // Tamaño en píxeles que usa el renderer (no cambiar aquí sin sincronizar)
        this.size = 50;
        // Lista de celdas del grid ocupadas por esta piedra
        this._occupiedCells = [];
    }
}

export class Personaje extends Elemento {
    constructor(x, y) {
        super(x, y);
        this.vida = 10;
        this.maxVida = 10;

        // --- Animación ---
        this.state = 'idle'; // idle, run, attack, hit, death
        this.frameIndex = 0;
        this.animationTimer = 0;
        this.facingRight = true;
        this.isDead = false;
        this.currentTarget = null;

        // --- Movimiento fluido ---
        this.vx = 0;
        this.vy = 0;
        this.speed = 50; // pixels per second

        // --- Ocupación de grid ---
        this.size = 147; // Tamaño del sprite en píxeles
        this.isCharacter = true; // Para que engine.js lo identifique como personaje
        this._occupiedCells = [];
    }

    estaVivo() {
        return this.vida > 0;
    }

    setState(newState) {
        if (this.state === 'death') return; // No se puede cambiar si ya murió
        // --- BALANCE: No permitir que 'hit' interrumpa un ataque en curso ---
        if (this.state === 'attack' && newState === 'hit') return;

        if (this.state !== newState) {
            this.state = newState;
            this.frameIndex = 0;
            this.animationTimer = 0;
        }
    }

    updateAnimation(deltaTime, framesCount) {
        this.animationTimer += deltaTime;

        // Velocidades variables según el estado (ataques más lentos)
        let frameDuration = 100; // base: idle/run
        if (this.state === 'attack') frameDuration = 90; // Más lento
        if (this.state === 'hit') frameDuration = 80;    // Reacción más lenta

        if (this.animationTimer >= frameDuration) {
            this.animationTimer = 0;
            this.frameIndex++;

            // Lógica de Impacto: Aplicar daño en el frame exacto del golpe
            this.checkStrikeImpact();

            if (this.frameIndex >= framesCount) {
                if (this.state === 'attack' || this.state === 'hit') {
                    this.setState('idle');
                    this.currentTarget = null;
                } else if (this.state === 'death') {
                    this.frameIndex = framesCount - 1;
                    this.isDead = true;
                } else {
                    this.frameIndex = 0;
                }
            }
        }
    }

    checkStrikeImpact() {
        // Implementado en subclases para frames específicos
    }
}

export class Malo extends Personaje {
    constructor(x, y) {
        super(x, y);
        this.speed = 60; // Slightly faster than Bueno
    }

    atacar(objetivo) {
        if (this.state === 'attack' || this.state === 'death') return;
        this.setState('attack');
        this.currentTarget = objetivo;
    }

    checkStrikeImpact() {
        // Skeleton (Malo) impacta en frame 2 para balance
        if (this.state === 'attack' && this.frameIndex === 2 && this.currentTarget) {
            const rand = Math.random();
            if (rand < 0.90) {
                this.currentTarget.vida -= 3; // Daño Java Standard
                this.currentTarget.setState('hit');
            } else {
                this.vida -= 5; // Fallo Crítico Java
                this.setState('hit');
            }
        }
    }
}

export class Bueno extends Personaje {
    constructor(x, y) {
        super(x, y);
        this.speed = 40; // Slower than Malo
    }

    // Los buenos podrían contraatacar o simplemente defenderse visualmente
    atacar(objetivo) {
        if (this.state === 'attack' || this.state === 'death') return;
        this.setState('attack');
        this.currentTarget = objetivo;
    }

    checkStrikeImpact() {
        // Knight (Bueno) impacta en frame 2 para balance
        if (this.state === 'attack' && this.frameIndex === 2 && this.currentTarget) {
            const rand = Math.random();
            if (rand < 0.10) { // Nerf: Solo 10% de acierto
                this.currentTarget.vida -= 3;
                this.currentTarget.setState('hit');
            } else if (rand >= 0.90) { // 10% de Fallo Crítico
                this.vida -= 5;
                this.setState('hit');
            }
            // El otro 80% es un "miss" (no pasa nada)
        }
    }
}