import { CONSTANTS } from './engine.js';
import { Malo, Bueno, Piedra } from './models.js';
import { ANIMATIONS } from './assets.js';
import { UI } from './ui.js';

const ctx = UI.canvas.getContext('2d');

/**
 * Resizes the canvas based on the wrapper size and CELL_SIZE.
 */
export function resizeCanvas() {
    const wrapper = UI.canvas.parentElement;
    const width = wrapper.clientWidth;
    const height = wrapper.clientHeight;

    CONSTANTS.COLS = Math.floor(width / CONSTANTS.CELL_SIZE);
    CONSTANTS.ROWS = Math.floor(height / CONSTANTS.CELL_SIZE);

    UI.canvas.width = CONSTANTS.COLS * CONSTANTS.CELL_SIZE;
    UI.canvas.height = CONSTANTS.ROWS * CONSTANTS.CELL_SIZE;
}

/**
 * Draws a sprite on the canvas.
 * @param {object} assets 
 * @param {object} entity 
 */
export function drawSprite(assets, entity) {
    const config = (entity instanceof Malo) ? ANIMATIONS.MALO : ANIMATIONS.BUENO;
    const stateConfig = config.states[entity.state];
    const imgName = `${entity instanceof Malo ? 'MALO' : 'BUENO'}_${entity.state}`;
    const img = assets.images[imgName];

    if (!img) return;

    const size = CONSTANTS.CELL_SIZE;
    const drawX = entity.x * size;
    const drawY = entity.y * size;

    ctx.save();

    if (!entity.facingRight) {
        ctx.translate(drawX + size, drawY);
        ctx.scale(-1, 1);
        ctx.translate(-drawX, -drawY);
    }

    const sw = config.frameWidth;
    const sh = config.frameHeight;
    const sx = entity.frameIndex * sw;

    const targetW = size * 2.3;
    const targetH = targetW * (sh / sw);
    const offsetX = (size - targetW) / 2;
    const offsetY = size - targetH + 5;

    if (img) {
        ctx.drawImage(
            img,
            sx, 0, sw, sh,
            drawX + offsetX, drawY + offsetY, targetW, targetH
        );
    } else {
        ctx.fillStyle = (entity instanceof Malo) ? '#f00' : '#0f0';
        ctx.fillRect(drawX + size / 4, drawY + size / 4, size / 2, size / 2);
    }

    ctx.restore();

    const hp = Math.ceil(entity.vida);
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.textAlign = 'right';

    const textX = drawX + size - 2;
    let textY = drawY + size - 2;

    if (entity instanceof Malo) {
        textY -= 15;
    }

    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillText(`${hp}p`, textX + 1, textY + 1);

    const hpPercent = hp / entity.maxVida;
    ctx.fillStyle = hpPercent > 0.5 ? '#0f0' : (hpPercent > 0.2 ? '#ff0' : '#f00');
    ctx.fillText(`${hp}p`, textX, textY);
}

/**
 * Main draw function.
 * @param {object} state 
 * @param {object} assets 
 */
export function draw(state, assets) {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, UI.canvas.width, UI.canvas.height);

    const bgImg = assets.images['BACKGROUND'];
    if (bgImg) {
        const pattern = ctx.createPattern(bgImg, 'repeat');
        if (pattern) {
            ctx.save();
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, UI.canvas.width, UI.canvas.height);
            ctx.restore();
        }
    }

    const renderables = [
        ...state.piedras,
        ...state.buenos,
        ...state.malos
    ].sort((a, b) => {
        const ay = (a instanceof Piedra) ? a.y + 0.5 : a.y;
        const by = (b instanceof Piedra) ? b.y + 0.5 : b.y;
        return ay - by;
    });

    renderables.forEach(item => {
        if (item instanceof Piedra) {
            const x = item.x * CONSTANTS.CELL_SIZE;
            const y = item.y * CONSTANTS.CELL_SIZE;
            const s = CONSTANTS.CELL_SIZE;

            const img = assets.images['PIEDRA'];
            if (img) {
                const cropMargin = img.width * 0.35;
                const sourceSize = img.width * 0.35;
                const stoneSize = s * 0.8;
                const offset = (s - stoneSize) / 2;

                ctx.drawImage(
                    img,
                    cropMargin, cropMargin, sourceSize, sourceSize,
                    x + offset, y + offset, stoneSize, stoneSize
                );
            } else {
                const stoneSize = s * 0.6;
                const offset = (s - stoneSize) / 2;
                const px = stoneSize / 4;
                ctx.fillStyle = '#454d4f';
                ctx.fillRect(x + offset, y + offset + px, stoneSize, stoneSize - px);
                ctx.fillStyle = '#7f8c8d';
                ctx.fillRect(x + offset + px, y + offset, stoneSize - 2 * px, stoneSize);
            }
        } else {
            drawSprite(assets, item);
        }
    });

    state.floatingTexts.forEach(t => {
        ctx.save();
        ctx.globalAlpha = t.life;
        ctx.fillStyle = t.color;
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
    });
}
