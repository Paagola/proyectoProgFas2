Entendido. Aquí tienes el Informe Técnico del Código Legacy en Java. Este documento analiza la arquitectura, lógica y algoritmos implementados en la versión original de consola, sin mencionar la migración a web.

Puedes guardar este archivo como JAVA_LEGACY_ANALYSIS.md.
Informe Técnico: Sistema Legacy (Java)

Proyecto: Simulación "Batalla de Elementos"
Versión del Código: Original (Java Console Application)
Fecha de Análisis: Enero 2025
1. Resumen de Arquitectura

El sistema es una aplicación de consola Java monohilo que simula un autómata celular finito. La arquitectura se basa en un Bucle de Juego Bloqueante (Blocking Game Loop) que orquesta la lógica de actualización de estado y el renderizado ASCII en cada iteración.
1.1 Estructura del Proyecto (Inferida)

El código se organiza en torno a la separación de la entidad (Modelo) y la lógica de ubicación (Controlador/Utilidad):

    App.java: Punto de entrada (main), bucle principal y gestión del ciclo de vida.

    Elemento.java (y subclases): Definición jerárquica de objetos.

    PosicionInteligente.java / NuevaPosicion.java: Motores de cálculo de coordenadas.

2. Definición del Dominio (Modelo de Datos)
2.1 Topología del Espacio

    Estructura de Datos: Matriz bidimensional de referencias a objetos (Elemento[][]).

    Dimensiones: Constantes ROWS = 50, COLS = 200.

    Geometría: Plano Euclidiano Acotado.

        Límites: Las coordenadas x < 0, x >= COLS, y < 0, y >= ROWS son tratadas como límites duros (Hard Walls). No existe comportamiento toroidal (wrap-around).

2.2 Jerarquía de Clases (OOD)

El sistema utiliza herencia clásica para definir comportamientos:

    Elemento (Clase Base)

        Responsabilidad: Identidad y posición espacial.

        Atributos: String uuid, int x, int y.

    Piedra extends Elemento

        Comportamiento: Estático. Actúa como obstáculo infranqueable (Collider).

    Personaje extends Elemento (Abstracta)

        Atributos: int vida (Inicial: 50).

        Métodos: Gestión de estado vital (estaVivo()).

    Malo extends Personaje

        Rol: Agente Activo (Cazador).

        Representación Visual: Carácter 'Ö' o Color Rojo.

    Bueno extends Personaje

        Rol: Agente Reactivo (Presa).

        Representación Visual: Carácter 'ï' o Color Verde.

3. Algoritmos y Lógica del Core
3.1 Inicialización y Restricciones (App.malosYbuenosLejos)

El sistema implementa un algoritmo de Satisfacción de Restricciones Espaciales durante el despliegue inicial (Spawning).

    Objetivo: Evitar la aniquilación temprana (Spawn Kill).

    Lógica:

        Generación de coordenada pseudoaleatoria

                
        (x,y)
        (x,y)

              

        .

        Verificación de vacante: Grid[y][x] == null.

        Restricción de Radio: Se calcula la Distancia Manhattan contra todos los enemigos existentes.

                
        D=∣x1−x2∣+∣y1−y2∣
        D=∣x1​−x2​∣+∣y1​−y2​∣

              

        Si

                
        D<5
        D<5

              

        para cualquier enemigo, la posición se descarta y se recalcula.

3.2 Motor de Navegación (PosicionInteligente.java)

El sistema no utiliza algoritmos de búsqueda global (A* o Dijkstra). Utiliza una Heurística Voraz Local (Greedy Best-First Search Local).

    Vecindad Operativa: Vecindad de Moore (8 celdas adyacentes).

    Algoritmo calcularSiguientePaso:

        Identificar el Target más cercano (Iteración

                
        O(N)
        O(N)

              

        ).

        Simular movimiento a las 8 casillas vecinas.

        Filtrar casillas inválidas (Muros o colisión con Elemento).

        Calcular coste heurístico (Distancia Manhattan al Target) para cada vecino válido.

        Toma de Decisión:

            Malo: Elige la celda con el mínimo coste (Acercarse).

            Bueno: Elige la celda con el máximo coste (Alejarse), solo si la amenaza está a distancia

                    
            <10
            <10

                  

            .

3.3 Mecánica de Combate (Determinista + Estocástica)

El combate se resuelve en el turno del atacante.

    Detección de Rango: Se usa la Distancia de Chebyshev:

            
    Dchebyshev=max⁡(∣x1−x2∣,∣y1−y2∣)
    Dchebyshev​=max(∣x1​−x2​∣,∣y1​−y2​∣)

          

        Condición de ataque:

                
        Dchebyshev≤1
        Dchebyshev​≤1

              

        (Adyacencia directa o diagonal).

    Resolución de Daño (RNG):

        Se genera un número aleatorio

                
        R∈[0.0,1.0]
        R∈[0.0,1.0]

              

        .

        Si

                
        R<0.90
        R<0.90

              

        : Acierto. Objetivo recibe -3 HP.

        Si

                
        R≥0.90
        R≥0.90

              

        : Fallo Crítico. Atacante recibe -5 HP (Auto-daño).

4. Análisis del Ciclo de Ejecución (Main Loop)

El flujo de control en App.java sigue un patrón secuencial estricto ejecutado en el Hilo Principal:
code Text

INICIO
  ├─ Instanciar Grid[50][200]
  ├─ Spawn Piedras (100)
  ├─ Spawn Malos (20)
  └─ Spawn Buenos (100) [Con restricción de distancia]

BUCLE (while true)
  ├─ Limpiar Consola (Flush)
  │
  ├─ FASE LÓGICA (Update)
  │   ├─ Sub-fase Combate:
  │   │   └─ Para cada Malo: Buscar Buenos adyacentes -> Ejecutar Atacar()
  │   │
  │   ├─ Sub-fase Limpieza (GC):
  │   │   └─ Eliminar referencias de Grid si vida <= 0
  │   │
  │   └─ Sub-fase Movimiento:
  │       └─ Para cada Personaje vivo:
  │           ├─ Calcular PosicionInteligente()
  │           └─ Actualizar punteros en Grid (nullify old -> set new)
  │
  ├─ FASE RENDERIZADO (Draw)
  │   └─ Iterar Grid[y][x] -> Imprimir carácter ASCII
  │
  └─ CONTROL DE TIEMPO
      └─ Thread.sleep(n) // Bloqueo de hilo para simular FPS

5. Complejidad y Rendimiento

    Complejidad Computacional:

        La búsqueda del objetivo más cercano es la operación más costosa:

                
        O(N×M)
        O(N×M)

              

        por frame, donde

                
        N
        N

              

        son agentes activos y

                
        M
        M

              

        sus objetivos.

        El movimiento y renderizado son lineales respecto al tamaño del Grid o número de entidades.

    Gestión de Memoria:

        Uso de memoria estática para el Grid.

        Dependencia del Garbage Collector (GC) de la JVM para limpiar objetos Elemento eliminados de las listas lógicas.

    Limitaciones Técnicas:

        Concurrencia: Al ser monohilo, la lógica de cálculo bloquea el renderizado. A mayor número de entidades, la simulación se ralentiza ("lag") afectando la percepción de velocidad.

        Visualización: Limitada por el buffer de la consola del sistema operativo. Posible parpadeo (flickering) al limpiar y repintar caracteres.