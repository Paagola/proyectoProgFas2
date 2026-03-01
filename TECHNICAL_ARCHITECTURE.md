# CORE | Tactical Engine - Manual de Arquitectura Técnica

Este documento proporciona un desglose exhaustivo y técnico de la implementación de **CORE | Tactical Engine**. El proyecto está construido bajo una arquitectura modular desacoplada, separando la simulación lógica del renderizado visual.

---

## 1. Estructura del Proyecto

```
/
├── index.html          # Interfaz de Usuario (HUD, Sidebar, Modal)
├── style.css           # Sistema de Diseño Corporativo (Slate & Cyan)
└── js/
    ├── main.js         # Orquestador del bucle principal
    ├── engine.js       # Gestor Espacial (Grid y Colisiones)
    ├── models.js       # Definición de Entidades y Estados
    ├── simulation.js   # Lógica de Combate e IA Tactica
    ├── renderer.js     # Pipeline de Dibujo y Post-procesado
    ├── pathfinding.js  # Motor de Navegación A*
    ├── assets.js       # Configuración de Sprites y Animaciones
    ├── state.js        # Almacén de Estado Global
    └── ui.js           # Controlador de DOM y Tactical Log
```

---

## 2. Gestión Espacial (`engine.js`)

La simulación opera sobre un sistema de celdas (Grid). Cada unidad ocupa una coordenada discreta `(x, y)`.

### Definiciones Críticas
- **Dimensiones**: El tablero se calcula dinámicamente, pero mantiene una resolución lógica basada en `CELL_SIZE` (64px).
- **Límite de Seguridad (HUD)**: Para evitar que los sprites (que son más altos que una celda) se solapen con la interfaz superior, las funciones `isCellWalkable` e `isCellEmptyForMove` restringen el movimiento a `y >= 2`.

```javascript
isCellWalkable(x, y) {
    // Bloqueo de y < 2 para proteger el área del HUD
    if (x < 0 || x >= CONSTANTS.COLS || y < 2 || y >= CONSTANTS.ROWS) return false;
    // Las piedras bloquean el paso
    if (this.grid[y][x] instanceof Piedra) return false;
    return true;
}
```

---

## 3. Sistema de Entidades (`models.js`)

Utiliza una jerarquía de clases basada en `Personaje`.

### Máquina de Estados de Animación
Cada personaje gestiona su estado visual (`idle`, `run`, `attack`, `hit`, `death`).
- **Recuperación tras Daño**: La lógica implementada en `updateAnimation` asegura que si una unidad recibe un impacto mientras se mueve, retorne automáticamente al estado `run` si su posición lógica aún no coincide con su objetivo.

### Movimiento Suave (Interpolación)
Aunque el mundo es una cuadrícula, las unidades se desplazan visualmente mediante `pixelX` y `pixelY`, que transicionan hacia la posición de la celda lógica a una velocidad definida por `moveSpeed`.

---

## 4. Inteligencia Artificial y Combate (`simulation.js`)

Este es el núcleo lógico del motor.

### Inteligencia y Orientación
- **Proximity Locking**: Para evitar que las unidades ignoren amenazas inmediatas, cualquier objetivo a `distancia <= 1` recibe un bono masivo de prioridad (+200 puntos).
- **IA de Pesos Tácticos**: Utiliza una fórmula balanceada: `PDC = (100 - dist * 2) + (bonus_salud) + (bonus_proximidad)`.
- **Alcance Chebyshev**: El combate se rige por **Distancia Chebyshev <= 1**. Esto incluye las diagonales, permitiendo ataques en 8 direcciones, lo que evita bloqueos visuales y mecánicos innecesarios.

```javascript
const distScore = (100 - d * 2);
const proximityBonus = (d <= 1) ? 200 : 0;
const totalScore = distScore + healthScore + proximityBonus;
```

### Escalado Dinámico de Amenaza
El sistema implementa un multiplicador `threatLevel` que crece con el tiempo de misión (+0.005/seg). Este nivel afecta directamente a:
- La vida base de los enemigos al spawnear.
- El daño infligido por las nuevas unidades enemigas.

---

## 5. Navegación Avanzada (`pathfinding.js`)

Implementación personalizada de **A*** con soporte para diagonales y prevención de "corner-cutting" (atravesar esquinas de piedras).

- **Obstáculos Blandos**: Las unidades de la misma facción se tratan como obstáculos transitables pero penalizados, permitiendo que las unidades no se bloqueen entre sí en cuellos de botella.
- **Greedy Fallback**: Si el camino A* está totalmente bloqueado, se activa un algoritmo codicioso aleatorizado para intentar "rodear" el bloqueo.

---

## 6. Pipeline de Renderizado (`renderer.js`)

El renderizado utiliza un enfoque de **Capas y Ordenación por Y** (Algoritmo del Pintor).

### Post-procesado Táctico
Para lograr la estética "Corporate | Tactical", se aplican varios filtros en tiempo real:
1. **Y-Sorting**: Todos los elementos se ordenan por su coordenada `y` antes de dibujar, garantizando una perspectiva correcta.
2. **Viginette**: Un gradiente radial oscuro que centra la atención en la zona de combate.
3. **Scanlines**: Un bucle que dibuja líneas horizontales semitransparentes para simular una terminal de datos.

```javascript
function _drawScanlines(W, H) {
    ctx.globalAlpha = 0.04;
    for (let y = 0; y < H; y += 3) {
        ctx.fillRect(0, y, W, 1);
    }
}
```

---

## 7. Interfaz y Feedback (`ui.js`)

El controlador de UI gestiona el **Tactical Log**, un feed de eventos que utiliza un sistema de `prepend` en el DOM combinado con estilos monospaciados para reportar eventos críticos de la simulación.

---

Este motor ha sido optimizado para ofrecer una experiencia de simulación táctica fluida a 60 FPS, manteniendo un diseño visual premium y una lógica de decisión profunda.
