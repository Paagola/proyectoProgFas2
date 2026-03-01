export class AssetManager {
    constructor() {
        this.images = {};
        this.totalAssets = 0;
        this.loadedAssets = 0;
    }

    async loadAsset(name, url) {
        this.totalAssets++;
        return new Promise((resolve) => {
            const img = new Image();
            img.src = url;
            img.onload = () => {
                this.images[name] = img;
                this.loadedAssets++;
                resolve(img);
            };
            img.onerror = () => {
                console.warn(`Asset not found: ${url}. Using fallback.`);
                this.loadedAssets++;
                resolve(null); // Resolve even on error so game still starts
            };
        });
    }

    isLoaded() {
        return this.totalAssets > 0 && this.loadedAssets === this.totalAssets;
    }

    getProgress() {
        if (this.totalAssets === 0) return 100;
        return (this.loadedAssets / this.totalAssets) * 100;
    }
}

const MONSTER_BASE = 'assets/Monsters_Creatures_Fantasy/Monsters_Creatures_Fantasy/';

export const ANIMATIONS = {
    // ── HEROES ──────────────────────────────────────────────────────────────
    BUENO: {
        basePath: 'assets/FreeKnight_v1/Colour1/Outline/120x80_PNGSheets/',
        frameWidth: 120,
        frameHeight: 80,
        states: {
            idle: { file: '_Idle.png', frames: 10 },
            run: { file: '_Run.png', frames: 10 },
            attack: { file: '_Attack.png', frames: 4 },
            hit: { file: '_Hit.png', frames: 1 },
            death: { file: '_Death.png', frames: 10 },
        }
    },

    // ── ENEMIES ─────────────────────────────────────────────────────────────

    FLYINGEYE: {
        basePath: `${MONSTER_BASE}Flying eye/`,
        frameWidth: 150,
        frameHeight: 110,
        states: {
            idle: { file: 'Flight.png', frames: 8 },
            run: { file: 'Flight.png', frames: 8 },
            attack: { file: 'Attack.png', frames: 8 },
            hit: { file: 'Take Hit.png', frames: 4 },
            death: { file: 'Death.png', frames: 4 },
        }
    },

    SKELETON: {
        basePath: `${MONSTER_BASE}Skeleton/`,
        frameWidth: 150,
        frameHeight: 150,
        states: {
            idle: { file: 'Idle.png', frames: 4 },
            run: { file: 'Walk.png', frames: 4 },
            attack: { file: 'Attack.png', frames: 8 },
            hit: { file: 'Take Hit.png', frames: 4 },
            death: { file: 'Death.png', frames: 4 },
        }
    },

    GOBLIN: {
        basePath: `${MONSTER_BASE}Goblin/`,
        frameWidth: 150,
        frameHeight: 150,
        states: {
            idle: { file: 'Idle.png', frames: 4 },
            run: { file: 'Run.png', frames: 8 },
            attack: { file: 'Attack.png', frames: 8 },
            hit: { file: 'Take Hit.png', frames: 4 },
            death: { file: 'Death.png', frames: 4 },
        }
    },

    MUSHROOM: {
        basePath: `${MONSTER_BASE}Mushroom/`,
        frameWidth: 150,
        frameHeight: 150,
        states: {
            idle: { file: 'Idle.png', frames: 4 },
            run: { file: 'Run.png', frames: 8 },
            attack: { file: 'Attack.png', frames: 8 },
            hit: { file: 'Take Hit.png', frames: 4 },
            death: { file: 'Death.png', frames: 4 },
        }
    },

    // ── DECOR ───────────────────────────────────────────────────────────────
    PIEDRA: {
        path: 'assets/Decor/stone_pixel.png'
    },
    BACKGROUND: {
        path: 'assets/Decor/background.png'
    }
};

/** Maps ENEMY_TYPE string → ANIMATIONS config key */
export function getEnemyAnimConfig(type) {
    return ANIMATIONS[type] || ANIMATIONS.FLYINGEYE;
}
