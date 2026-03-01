import { CONSTANTS } from './engine.js';

const generateUUID = () => Math.random().toString(36).substr(2, 9);

export class Elemento {
    constructor(x, y) {
        this.uuid = generateUUID();
        this.x = x;
        this.y = y;
        this.vida = 100; // Default high HP for generic elements
        this.maxVida = 100;
        this.isDead = false;
    }

    estaVivo() {
        return this.vida > 0;
    }

    takeDamage(amount) {
        this.vida -= amount;
        if (this.vida <= 0) {
            this.vida = 0;
            // Immediate death for non-animated objects, Personaje overrides for animations
            this.isDead = true;
        }
    }
}

export class Piedra extends Elemento {
    constructor(x, y) {
        super(x, y);
        this.vida = 150; // Rocks are sturdy barriers
        this.maxVida = 150;
    }
}

export class Personaje extends Elemento {
    constructor(x, y) {
        super(x, y);
        this.vida = 40;
        this.maxVida = 40;
        this.isDead = false; // Override isDead to wait for animation

        // --- Smooth pixel position (for interpolated rendering) ---
        this.pixelX = x * CONSTANTS.CELL_SIZE;
        this.pixelY = y * CONSTANTS.CELL_SIZE;
        this.targetPixelX = this.pixelX;
        this.targetPixelY = this.pixelY;
        this.moveSpeed = 0.025; // realistic walking pace (approx 25px per second)

        // --- Animation ---
        this.state = 'idle';
        this.frameIndex = 0;
        this.animationTimer = 0;
        this.facingRight = true;
        this.isDead = false;
        this.currentTarget = null;
        this.attackCooldown = 0;
        this.attackSpeed = 1000; // default 1s between attacks
    }

    estaVivo() {
        return this.vida > 0;
    }

    setState(newState) {
        if (this.state === 'death') return;
        if (this.state === 'attack' && newState === 'hit') return;
        if (this.state !== newState) {
            this.state = newState;
            this.frameIndex = 0;
            this.animationTimer = 0;
        }
    }

    // Update smooth pixel position toward target (called every frame with deltaTime in ms)
    updatePixelPosition(deltaTime) {
        const dx = this.targetPixelX - this.pixelX;
        const dy = this.targetPixelY - this.pixelY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const step = this.moveSpeed * deltaTime;

        if (dist <= step || dist < 0.5) {
            this.pixelX = this.targetPixelX;
            this.pixelY = this.targetPixelY;
        } else {
            this.pixelX += (dx / dist) * step;
            this.pixelY += (dy / dist) * step;
        }
    }

    setGridTarget(newX, newY) {
        this.targetPixelX = newX * CONSTANTS.CELL_SIZE;
        this.targetPixelY = newY * CONSTANTS.CELL_SIZE;
    }

    isAtTarget() {
        return Math.abs(this.pixelX - this.targetPixelX) < 1 &&
            Math.abs(this.pixelY - this.targetPixelY) < 1;
    }

    takeDamage(amount) {
        this.vida -= amount;
        this.setState('hit');
        if (this.vida <= 0) {
            this.vida = 0;
            this.setState('death');
        }
    }

    updateAnimation(deltaTime, framesCount) {
        this.animationTimer += deltaTime;

        let frameDuration = 110;
        if (this.state === 'attack') frameDuration = this instanceof Bueno ? 150 : 80; // Heroes attack much slower
        if (this.state === 'hit') frameDuration = 50;
        if (this.state === 'run') frameDuration = 140; // slowed to match walking speed
        if (this.state === 'death') frameDuration = 120;

        if (this.animationTimer >= frameDuration) {
            this.animationTimer = 0;
            this.frameIndex++;
            this.checkStrikeImpact();

            if (this.frameIndex >= framesCount) {
                if (this.state === 'attack' || this.state === 'hit') {
                    // Smart recovery: if we are still moving toward a target, return to 'run'
                    if (!this.isAtTarget()) {
                        this.setState('run');
                    } else {
                        this.setState('idle');
                    }
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

    checkStrikeImpact() { }
}

// ─── ENEMY TYPES ────────────────────────────────────────────────────────────

export const ENEMY_TYPES = ['FLYINGEYE', 'SKELETON', 'GOBLIN', 'MUSHROOM'];

export class Malo extends Personaje {
    constructor(x, y, type = 'FLYINGEYE', level = 1) {
        super(x, y);
        this.type = type;
        this.level = level;
        this.facingRight = false; // Enemies come from right

        // Scale stats by level - High base stats for Sector 01 challenge
        const hpBase = { FLYINGEYE: 45, SKELETON: 65, GOBLIN: 35, MUSHROOM: 90 };
        const dmgBase = { FLYINGEYE: 8, SKELETON: 12, GOBLIN: 6, MUSHROOM: 18 };

        const levelMult = (1 + (level - 1) * 0.45);
        const hp = Math.round((hpBase[type] || 15) * levelMult);
        this.vida = hp;
        this.maxVida = hp;
        this.damage = Math.round((dmgBase[type] || 3) * levelMult);
        this.moveSpeed = type === 'GOBLIN' ? 0.045 : (type === 'FLYINGEYE' ? 0.035 : 0.025);
        this.moveSpeed *= (0.9 + Math.random() * 0.2); // +10% variance for "professional" organic movement
    }

    atacar(objetivo) {
        if (this.state === 'attack' || this.state === 'death' || this.attackCooldown > 0) return;
        this.facingRight = (objetivo.x >= this.x); // Face the target
        this.setState('attack');
        this.currentTarget = objetivo;
        this.attackCooldown = this.attackSpeed;
    }

    checkStrikeImpact() {
        const strikeFrame = { FLYINGEYE: 3, SKELETON: 2, GOBLIN: 2, MUSHROOM: 3 };
        const sf = strikeFrame[this.type] || 2;
        if (this.state === 'attack' && this.frameIndex === sf && this.currentTarget) {
            const rand = Math.random();
            if (rand < 0.88) {
                this.currentTarget.takeDamage(this.damage);
            } else {
                this.takeDamage(Math.round(this.damage * 0.5)); // Slight self-damage on fail
            }
        }
    }
}

export class Bueno extends Personaje {
    constructor(x, y) {
        super(x, y);
        this.vida = 80; // Buffed heroes to survive the higher enemy damage
        this.maxVida = 80;
        this.damage = 10;
        this.facingRight = true;
        this.moveSpeed = 0.03;
    }

    atacar(objetivo) {
        if (this.state === 'attack' || this.state === 'death') return;
        this.facingRight = (objetivo.x >= this.x); // Face the target
        this.setState('attack');
        this.currentTarget = objetivo;
    }

    checkStrikeImpact() {
        if (this.state === 'attack' && this.frameIndex === 2 && this.currentTarget) {
            const rand = Math.random();
            if (rand < 0.75) {
                this.currentTarget.takeDamage(this.damage);
            } else if (rand >= 0.93) {
                // Critical success — double damage
                this.currentTarget.takeDamage(this.damage * 2);
            }
            // 18% miss
        }
    }
}