# 📊 GanttFlow Pro — Planificador Visual de Proyectos & Ruta Crítica

Aplicación web moderna de visualización y gestión de **Diagramas de Gantt** lista para desplegar en **Vercel**, diseñada siguiendo las mejores prácticas de ingeniería de proyectos (**CPM / Critical Path Method**) y UI/UX moderno (inspirado en Linear, Instagantt y Asana).

---

## ✨ Características Principales

1. **Tareas Configurables con Sincronización Bidireccional**:
   - **Nombre de la tarea**, responsable, notas y progreso (`0% - 100%`).
   - **Initial Date (Fecha Inicial)**, **Final Date (Fecha Final)** y **Duration (Duración en días)** sincronizados automáticamente: cambiar la duración recalcula la fecha final y viceversa.
   - **Slack / Holgura Configurable (Default `0`)**: Cada tarea permite definir días de holgura (`slack`), visualizados directamente en el cronograma como una barra fantasma tramada (`+Xd slack`) que indica el margen disponible antes de afectar la entrega.
2. **Hitos (Milestones `◆`) Configurables**:
   - Puntos de control de duración `0 días` representados con diamantes (`◆`) en su fecha objetivo y conectables mediante dependencias.
3. **Dependencias Inteligentes & Enrutamiento Ortogonal**:
   - Soporte para relaciones **FS** (Fin a Inicio), **SS** (Inicio a Inicio) y **FF** (Fin a Fin).
   - Detección automática de ciclos circulares (impide dependencias inválidas).
   - Trazado SVG ortogonal limpio con resaltado interactivo al pasar el cursor y reprogramación automática en cascada (**Auto-Cascada**).
4. **Ruta Crítica (CPM) & Mejores Prácticas UI/UX**:
   - **Vista Dividida (Split-Pane Redimensionable)**: Tabla WBS editable en línea a la izquierda + Lienzo Gantt interactivo a la derecha.
   - **Drag & Drop en el Cronograma**: Arrastra cualquier barra para mover sus fechas o arrastra su borde derecho para ajustar su duración en tiempo real.
   - **Zoom Multi-Escala**: Vistas por **Día**, **Semana** y **Mes**, indicador vertical de **HOY**, modo oscuro/claro y exportación/importación en **JSON** y **CSV**.

---

## 🚀 Desarrollo Local

```bash
npm install
npm run dev
```

Para compilar la versión de producción:

```bash
npm run build
```

---

## ⚙️ Pipeline CI/CD con GitHub Actions y Vercel

El archivo [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) ejecuta automáticamente en cada `push` a `main` y en cada `pull_request`:

1. **`build-and-verify`**: Instala dependencias con `npm ci`, verifica tipos con TypeScript (`tsc -b`) y construye el bundle optimizado con Vite (`vite build`).
2. **`deploy-vercel`**: Despliega automáticamente a Vercel usando artefactos precompilados (`vercel build` + `vercel deploy --prebuilt`).

### Configuración de Secrets en GitHub para Despliegue por CLI
En tu repositorio de GitHub (**Settings > Secrets and variables > Actions**), añade los siguientes 3 secrets de tu cuenta de Vercel:
- `VERCEL_TOKEN`: Token creado en [Vercel Tokens](https://vercel.com/account/tokens).
- `VERCEL_ORG_ID`: ID de tu equipo/usuario en Vercel (o generado en `.vercel/project.json` tras ejecutar `npx vercel link`).
- `VERCEL_PROJECT_ID`: ID del proyecto en Vercel.
