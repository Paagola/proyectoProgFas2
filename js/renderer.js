import { CONSTANTS } from './engine.js';
import { Malo, Bueno, Piedra } from './models.js';
import { ANIMATIONS } from './assets.js';
import { UI } from './ui.js';

let ctx = null;

function getCtx() {
    if (!ctx) ctx = UI.canvas.getContext('2d');
    return ctx;
}

/**
 * Resizes the canvas based on the available space.
 */
export function resizeCanvas() {
    // Forzar layout antes de leer dimensiones
    const wrapper = UI.canvas.parentElement;

    // Usar getBoundingClientRect que es más fiable que clientWidth en el primer render
    const rect = wrapper.getBoundingClientRect();
    let width = rect.width;
    let height = rect.height;

    // Fallbacks robustos si el layout aún no está listo
    if (!width || width < 100) width = window.innerWidth - 340;
    if (!height || height < 100) height = window.innerHeight;

    // Validar que width y height sean números válidos
    if (isNaN(width) || width <= 0) width = 800;
    if (isNaN(height) || height <= 0) height = 600;

    // Recalcular grid según el espacio disponible
    CONSTANTS.COLS = Math.max(10, Math.floor(width / CONSTANTS.CELL_SIZE));
    CONSTANTS.ROWS = Math.max(10, Math.floor(height / CONSTANTS.CELL_SIZE));

    UI.canvas.width = CONSTANTS.COLS * CONSTANTS.CELL_SIZE;
    UI.canvas.height = CONSTANTS.ROWS * CONSTANTS.CELL_SIZE;

    // Invalidar contexto cacheado al redimensionar
    ctx = UI.canvas.getContext('2d');
}

const FIXED_SIZE = 147;
const STONE_SIZE = 50;

/**
 * Dibuja un sprite de personaje en el canvas.
 */
export function drawSprite(assets, entity) {
    const context = getCtx();
    const isMalo = entity instanceof Malo;
    const config = isMalo ? ANIMATIONS.MALO : ANIMATIONS.BUENO;
    const imgName = `${isMalo ? 'MALO' : 'BUENO'}_${entity.state}`;
    const img = assets.images[imgName];

    if (!img) return;

    let drawX = Math.max(0, Math.min(entity.x, UI.canvas.width - FIXED_SIZE));
    let drawY = Math.max(0, Math.min(entity.y, UI.canvas.height - FIXED_SIZE));

    const sw = config.frameWidth;
    const sh = config.frameHeight;
    const sx = entity.frameIndex * sw;
    const targetW = FIXED_SIZE;
    const targetH = FIXED_SIZE * (sh / sw);

    context.save();

    if (!entity.facingRight) {
        context.translate(drawX + FIXED_SIZE, drawY);
        context.scale(-1, 1);
        context.translate(-drawX, -drawY);
    }

    context.drawImage(img, sx, 0, sw, sh, drawX, drawY, targetW, targetH);
    context.restore();

    const hp = Math.ceil(entity.vida);
const hpPercent = hp / entity.maxVida;
const textX = drawX + FIXED_SIZE - 40;  // pegado al borde derecho
const textY = drawY + FIXED_SIZE - 40;  // pegado al borde inferior

ctx.font = 'bold 12px "Courier New", monospace';
ctx.textAlign = 'right'; 

// Sombra
ctx.fillStyle = 'rgba(0,0,0,0.8)';
ctx.fillText(`${hp}p`, textX + 1, textY + 1);

// Texto con color según HP
ctx.fillStyle = hpPercent > 0.5 ? '#0f0' : (hpPercent > 0.2 ? '#ff0' : '#f00');
ctx.fillText(`${hp}p`, textX, textY);
}

/**
 * Dibuja una piedra en el canvas.
 */
function drawPiedra(assets, item) {
    const context = getCtx();
    const x = item.x;
    const y = item.y;
    const offset = -STONE_SIZE / 2;
    const img = assets.images['PIEDRA'];

    if (img) {
        const cropMargin = img.width * 0.1;
        const sourceSize = img.width * 0.8;
        context.drawImage(img, cropMargin, cropMargin, sourceSize, sourceSize,
            x + offset, y + offset, STONE_SIZE, STONE_SIZE);
    } else {
        const px = STONE_SIZE / 4;
        context.fillStyle = '#454d4f';
        context.fillRect(x + offset, y + offset + px, STONE_SIZE, STONE_SIZE - px);
        context.fillStyle = '#7f8c8d';
        context.fillRect(x + offset + px, y + offset, STONE_SIZE - 2 * px, STONE_SIZE);
    }
}

/**
 * Función principal de renderizado.
 */
export function draw(state, assets) {
    const context = getCtx();
    const W = UI.canvas.width;
    const H = UI.canvas.height;

    // Fondo base
    context.fillStyle = '#1a1a2e';
    context.fillRect(0, 0, W, H);

    // Fondo imagen (tileado)
    const bgImg = assets.images['BACKGROUND'];
    if (bgImg) {
        const pattern = context.createPattern(bgImg, 'repeat');
        if (pattern) {
            context.save();
            context.fillStyle = pattern;
            context.fillRect(0, 0, W, H);
            context.restore();
        }
    }

    // Renderizar entidades ordenadas por Y (pseudo-3D)
    const renderables = [...state.piedras, ...state.buenos, ...state.malos]
        .sort((a, b) => a.y - b.y);

    for (const item of renderables) {
        if (item instanceof Piedra) {
            drawPiedra(assets, item);
        } else {
            drawSprite(assets, item);
        }
    }

    // Textos flotantes de daño
    for (const t of state.floatingTexts) {
        context.save();
        context.globalAlpha = Math.max(0, t.life);
        context.fillStyle = t.color;
        context.font = 'bold 16px Arial';
        context.textAlign = 'center';
        context.fillText(t.text, t.x, t.y);
        context.restore();
    }
}