import { CONSTANTS } from './engine.js';
import { Malo, Bueno, Piedra } from './models.js';
import { ANIMATIONS, getEnemyAnimConfig } from './assets.js';
import { UI } from './ui.js';

const ctx = UI.canvas.getContext('2d');

export function resizeCanvas() {
    const wrapper = UI.canvas.parentElement;
    CONSTANTS.COLS = Math.floor(wrapper.clientWidth / CONSTANTS.CELL_SIZE);
    CONSTANTS.ROWS = Math.floor(wrapper.clientHeight / CONSTANTS.CELL_SIZE);
    UI.canvas.width = CONSTANTS.COLS * CONSTANTS.CELL_SIZE;
    UI.canvas.height = CONSTANTS.ROWS * CONSTANTS.CELL_SIZE;
}

// ─── SPRITE DRAWING ──────────────────────────────────────────────────────────

function drawSprite(assets, entity) {
    const isMalo = entity instanceof Malo;
    const config = isMalo ? getEnemyAnimConfig(entity.type) : ANIMATIONS.BUENO;
    const stateConfig = config.states[entity.state];
    if (!stateConfig) return;

    const imgKey = isMalo
        ? `${entity.type}_${entity.state}`
        : `BUENO_${entity.state}`;
    const img = assets.images[imgKey];

    const size = CONSTANTS.CELL_SIZE;
    const drawX = entity.pixelX;
    const drawY = entity.pixelY;

    ctx.save();

    if (!entity.facingRight) {
        ctx.translate(drawX + size, drawY);
        ctx.scale(-1, 1);
        ctx.translate(-drawX, -drawY);
    }

    const sw = config.frameWidth;
    const sh = config.frameHeight;
    const sx = entity.frameIndex * sw;

    const scale = 2.6;
    const targetW = size * scale;
    const targetH = targetW * (sh / sw);
    const offsetX = (size - targetW) / 2;
    const offsetY = size - targetH + 2;

    if (img) {
        ctx.drawImage(img, sx, 0, sw, sh, drawX + offsetX, drawY + offsetY, targetW, targetH);
    } else {
        // Fallback colored square
        ctx.fillStyle = isMalo ? '#cc2200' : '#0099ff';
        ctx.fillRect(drawX + size * 0.1, drawY + size * 0.1, size * 0.8, size * 0.8);
    }

    ctx.restore();

    // Health bars removed per user request
}

// ─── HUD OVERLAY ─────────────────────────────────────────────────────────────

function drawHUD(state) {
    const W = UI.canvas.width;
    const H = UI.canvas.height;

    // Wave progress bar (top of canvas)
    const totalWaves = state.totalWavesPerLevel;
    const wavePct = state.currentWave / totalWaves;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, 20);

    // Gold fill
    // Professional slate vignette
    const grad = ctx.createLinearGradient(0, 0, W * wavePct, 0);
    grad.addColorStop(0, 'rgba(15, 23, 42, 0)');
    grad.addColorStop(1, 'rgba(2, 6, 23, 0.5)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W * wavePct, 20);

    ctx.strokeStyle = '#ffd70055';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, W, 20);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`PHASE ${state.currentWave} / ${totalWaves}  |  SECTOR ${state.currentLevel}`, W / 2, 13);
    ctx.textAlign = 'left';

    // ── HUD center message ────────────────────────────────────────────────────
    if (state.hudMessageTimer > 0 && UI._hudMessage) {
        const alpha = Math.min(1, state.hudMessageTimer / 500);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = '700 24px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Digital Glow
        ctx.shadowColor = 'var(--accent)';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#fff';

        // Background strip for better legibility
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, H / 2 - 40, W, 80);

        ctx.fillStyle = '#fff';
        ctx.fillText(UI._hudMessage.toUpperCase(), W / 2, H / 2);

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();
    }
}

// ─── PARTICLE DRAWING ─────────────────────────────────────────────────────────

function drawParticles(state) {
    state.particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// ─── MAIN DRAW ───────────────────────────────────────────────────────────────

export function draw(state, assets) {
    const W = UI.canvas.width;
    const H = UI.canvas.height;

    // Screen shake
    ctx.save();
    if (state.shakeIntensity > 0.5) {
        const sx = (Math.random() - 0.5) * state.shakeIntensity;
        const sy = (Math.random() - 0.5) * state.shakeIntensity;
        ctx.translate(sx, sy);
    }

    // ── Background ────────────────────────────────────────────────────────────
    ctx.fillStyle = '#0d0820';
    ctx.fillRect(0, 0, W, H);

    const bgImg = assets.images['BACKGROUND'];
    if (bgImg) {
        ctx.globalAlpha = 0.6;
        const scale = Math.max(W / bgImg.width, H / bgImg.height);
        const bw = bgImg.width * scale;
        const bh = bgImg.height * scale;
        ctx.drawImage(bgImg, (W - bw) / 2, (H - bh) / 2, bw, bh);
        ctx.globalAlpha = 1;
    }

    // Vignette / Ambient shadows
    const vignette = ctx.createRadialGradient(W / 2, H / 2, H / 2, W / 2, H / 2, W * 0.9);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    // ── Hero zone subtle highlight ────────────────────────────────────────────
    const heroZoneW = CONSTANTS.HERO_SPAWN_COLS * CONSTANTS.CELL_SIZE;
    const zoneGrad = ctx.createLinearGradient(0, 0, heroZoneW, 0);
    zoneGrad.addColorStop(0, 'rgba(0,100,255,0.08)');
    zoneGrad.addColorStop(1, 'rgba(0,100,255,0)');
    ctx.fillStyle = zoneGrad;
    ctx.fillRect(0, 0, heroZoneW, H);

    // ── Enemy zone subtle red ─────────────────────────────────────────────────
    const ezGrad = ctx.createLinearGradient(W - 60, 0, W, 0);
    ezGrad.addColorStop(0, 'rgba(255,0,0,0)');
    ezGrad.addColorStop(1, 'rgba(255,0,0,0.12)');
    ctx.fillStyle = ezGrad;
    ctx.fillRect(W - 60, 0, 60, H);

    // ── Sort renderables by Y (painter's algorithm) ───────────────────────────
    const renderables = [
        ...state.piedras,
        ...state.buenos,
        ...state.malos
    ].sort((a, b) => a.y - b.y);

    renderables.forEach(item => {
        if (item instanceof Piedra) {
            _drawRock(assets, item);
        } else {
            drawSprite(assets, item);
        }
    });

    // ── Particles ────────────────────────────────────────────────────────────
    drawParticles(state);

    // ── Floating damage texts ─────────────────────────────────────────────────
    state.floatingTexts.forEach(t => {
        ctx.save();
        ctx.globalAlpha = t.life;
        ctx.shadowColor = t.color;
        ctx.shadowBlur = 4;
        ctx.fillStyle = t.color;
        ctx.font = '700 13px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(t.text, t.x, t.y);
        ctx.restore();
    });

    // ── HUD ───────────────────────────────────────────────────────────────────
    drawHUD(state);

    // ── Post-processing: Scanlines ────────────────────────────────────────────
    _drawScanlines(W, H);

    ctx.restore(); // Restore from screen shake
}

function _drawScanlines(W, H) {
    ctx.save();
    ctx.globalAlpha = 0.04; // Very subtle
    ctx.fillStyle = "#ffffff";
    for (let y = 0; y < H; y += 3) {
        ctx.fillRect(0, y, W, 1);
    }
    ctx.restore();
}

function _drawRock(assets, item) {
    const s = CONSTANTS.CELL_SIZE;
    const px = item.x * s;
    const py = item.y * s;
    const img = assets.images['PIEDRA'];

    if (img) {
        const margin = img.width * 0.05;
        const srcSize = img.width * 0.9;
        const dstSize = s * 0.8; // Rocks scaled slightly less than before to feel solid but not giant
        const off = (s - dstSize) / 2;
        ctx.drawImage(img, margin, margin, srcSize, srcSize, px + off, py + off, dstSize, dstSize);
    } else {
        // Fallback polygon rock
        ctx.fillStyle = '#4a4a5a';
        ctx.strokeStyle = '#2a2a3a';
        ctx.lineWidth = 2;
        const r = s * 0.38;
        const cx2 = px + s / 2, cy2 = py + s / 2;
        ctx.beginPath();
        ctx.moveTo(cx2 - r, cy2 + r * 0.3);
        ctx.lineTo(cx2 - r * 0.4, cy2 - r);
        ctx.lineTo(cx2 + r * 0.5, cy2 - r * 0.8);
        ctx.lineTo(cx2 + r, cy2 + r * 0.2);
        ctx.lineTo(cx2 + r * 0.3, cy2 + r);
        ctx.lineTo(cx2 - r * 0.5, cy2 + r * 0.9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
}
