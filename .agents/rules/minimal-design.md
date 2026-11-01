# Minimal Design System Guidelines (bergside/awesome-design-skills@minimal)

Este proyecto adopta formalmente el sistema de diseño **Minimal** para todas sus interfaces, componentes y vistas.

## 1. Fundamentos Visuales y Filosofía
- **Estilo:** Minimal, limpio, estructurado y de alta precisión editorial.
- **Espacios y Contraste:** Generoso espacio en blanco/neutro, cero sombras difusas pesadas, cero gradientes saturados.
- **Bordes:** 1px hairline (`#E2E2DC`) para delimitaciones sutiles y 1px tinta (`#0C0C09`) para bordes de alto contraste y botones principales.
- **Radios:**
  - `rounded-[4px]` (`sm`) para botones, inputs, celdas y pastillas.
  - `rounded-[8px]` (`md`) para contenedores principales, tarjetas y modales.
- **Densidad:** Calibrada a 8/10 para herramientas SaaS de alta productividad.

## 2. Paleta de Colores Semántica
- `primary`: `#0C0C09` (Tinta negra profunda / texto principal / bordes clave)
- `surface`: `#F4F4F1` (Alabastro / fondo de encabezados, barras y contenedores secundarios)
- `background`: `#FFFFFF` o `#F4F4F1` (según jerarquía del lienzo)
- `secondary`: `#312C85` (Azul marino / acento de foco e interacción)
- `success`: `#16A34A` (Progreso 100% / estado completado)
- `warning`: `#D97706` (Ruta crítica / hitos clave)
- `danger`: `#DC2626` (Acciones destructivas / eliminación)
- `muted`: `#6B6B66` (Texto secundario y etiquetas auxiliares)

## 3. Tipografía
- **Display / Encabezados:** `Inter`, tracking `-0.02em`, peso semibold (600) o bold (700).
- **Lectura / Contenido:** `Open Sans` o sans-serif de sistema limpio (400, 500).
- **Datos Numéricos, Fechas y WBS:** `Inconsolata`, números tabulares (`tnum`), monoespaciado nítido para evitar desalineación en tablas y diagramas.

## 4. Diagrama Gantt y Flechas de Dependencia
- **Flechas Estándar:** SVG ortogonal de 1.5px de grosor en color `#0C0C09` (opacidad 60% en reposo, 100% en hover).
- **Flechas de Ruta Crítica:** Línea discontinua `stroke-dasharray="4 2"` en color `#D97706`.
- **Punta de Flecha:** Marcador triangular plano de 5×5px sin relieves.
- **Pastilla de Acción en Punto Medio:** Al pasar el cursor, aparece una pastilla rectangular con borde de 1px: `[ FS · ✕ ]` con tipografía `Inconsolata`.
- **Puertos de Conexión:** Círculos de 6px en los extremos de las barras (borde `#0C0C09`, fondo blanco).

## 5. Accesibilidad e Interacción
- Cumplimiento WCAG 2.2 AA (contraste mínimo 4.5:1 para texto normal).
- Anillos de foco visibles (`focus:ring-2 focus:ring-[#0C0C09]/20`).
- Microinteracciones ágiles de 150ms con transiciones suaves.
