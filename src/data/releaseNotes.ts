export interface ReleaseNoteEntry {
  version: string;
  date: string;
  title: string;
  isLatest?: boolean;
  features?: string[];
  improvements?: string[];
  fixes?: string[];
}

export const RELEASE_NOTES: ReleaseNoteEntry[] = [
  {
    version: '1.18.1',
    date: '28 Nov 2026',
    title: 'Doble clic en separador de columna para expandir al texto completo y restaurar',
    isLatest: true,
    features: [
      'Al hacer doble clic en el separador de cualquier columna en Planificación se calcula y aplica el ancho completo para ver todo el texto sin truncar (hasta 960px)',
      'Un segundo doble clic restaura exactamente el tamaño anterior',
      'Evitada interferencia de mouseup sin arrastre con el toggle de doble clic',
    ],
  },
  {
    version: '1.18.0',
    date: '28 Nov 2026',
    title: 'Soporte completo de etiquetas (tags) con autocompletado y filtro',
    features: [
      'Nuevo campo opcional tags en proyectos, tareas e hitos con normalización sin duplicados, sanitización JSON, diffs en Historial y exportación Excel',
      'Componente reutilizable TagInput con pills #etiqueta y autocompletado en Planificación (columna opcional Etiquetas con rollup en proyectos), RightSidePanel y Paso 1 del Wizard',
      'Filtro por etiqueta integrado en SearchFilterBar para Planificación y Cronograma (compatible con filtros guardados y barra inferior sticky)',
    ],
  },
  {
    version: '1.17.4',
    date: '28 Nov 2026',
    title: 'Añadir campo Descripción en el Paso 1 del asistente de proyectos',
    features: [
      'Nuevo campo opcional Descripción en la primera pantalla del ProjectWizardModal',
      'Se persiste al crear el proyecto y se muestra en el Paso 3 de resumen si se rellena',
    ],
  },
  {
    version: '1.17.3',
    date: '28 Nov 2026',
    title: 'Corregir asignación indebida de release en proyectos creados sin release',
    features: [
      'Evitado que effectiveProjects y la carga desde localStorage sobrescriban proyectos con releaseId vacío con la primera release disponible',
      'Los proyectos creados con Sin release se mantienen correctamente en Sin Release tras crearlos y al recargar la página',
    ],
  },
  {
    version: '1.17.2',
    date: '28 Nov 2026',
    title: 'Ordenar panel de filtros: filtro Equipo, sin No contiene y Columnas colapsadas',
    features: [
      'Eliminado el campo No contiene del panel de búsqueda avanzada',
      'Añadido selector de Equipo en Planificación y Cronograma (integrado también en filtros guardados y barra inferior)',
      'Sección de Columnas visibles colapsada por defecto con despliegue animado al hacer clic',
    ],
  },
  {
    version: '1.17.1',
    date: '28 Nov 2026',
    title: 'Estilo y animación de expand/collapse en Planificación igual que Cronograma',
    features: [
      'Chevron rotatorio de 240ms cubic-bezier(0.22,1,0.36,1) y animaciones suaves de expansión/colapso de filas en Planificación',
      'Jerarquía visual clara idéntica a Cronograma con cabeceras oscuras para Releases, borde lateral y badge de color por Proyecto, e indentación con conector └ para tareas e hitos',
    ],
  },
  {
    version: '1.17.0',
    date: '28 Nov 2026',
    title: 'Bitácora de seguimiento por comentarios con rollup en proyectos',
    features: [
      'Nuevo campo Seguimiento (hilo cronológico de comentarios) en proyectos, tareas e hitos con actualización atómica opcional de Nivel de Alerta y Progreso %',
      'Drawer rápido y columna Seguimiento en Planificación + badge 💬 en Cronograma y sección integrada en RightSidePanel',
      'Agregación automática (rollup) de seguimiento y notas de subtareas en la fila del proyecto al filtrar por Tipo: Proyecto y en la exportación Excel',
    ],
  },
  {
    version: '1.16.0',
    date: '28 Nov 2026',
    title: 'Plegado jerárquico y expansión bajo demanda (+N) de Releases y Proyectos en Planificación',
    features: [
      'Añade chevron de colapso/expansión en filas de Release y Proyecto en Planificación (colapsar oculta siempre todos los descendientes)',
      'Muestra píldoras +N proyectos / +N subtareas en resultados filtrados para desplegar hijos ocultos como contexto sin perder el filtro',
      'Marca las filas de contexto visualmente (borde índigo + etiqueta contexto) y muestra el contador +N de contexto en la barra inferior sticky',
    ],
  },
  {
    version: '1.15.2',
    date: '28 Nov 2026',
    title: 'Barra inferior sticky con parámetros de filtro activos (sin columnas) en Planificación',
    features: [
      'Añade overflow-hidden a los contenedores flex en vista Planificación para garantizar barra inferior y scroll horizontal siempre fijos',
      'Muestra en la barra inferior sticky todos los parámetros de filtro activos (Contiene, No contiene, En, Tipo, Plat., Alerta, Release, + Subtareas) con cierre individual y botón Limpiar, excluyendo columnas',
    ],
  },
  {
    version: '1.15.1',
    date: '28 Nov 2026',
    title: 'Barra inferior y scroll horizontal fijos (sticky) en Planificación',
    features: [
      'Fija el contenedor raíz de App a h-screen overflow-hidden en la vista Planificación para que la tabla haga scroll interno, manteniendo siempre fijos la cabecera, la barra de scroll horizontal y la barra inferior de estado (sticky bottom-0)',
    ],
  },
  {
    version: '1.15.0',
    date: '28 Nov 2026',
    title: 'Tabla de Planificación a pantalla completa con barra única compacta',
    features: [
      'Elimina márgenes exteriores y borde de tarjeta en la vista Planificación para ocupar el 100% del ancho y alto disponibles',
      'Fusiona cabecera, pestaña y barra de filtros en una única barra compacta (~120px más de filas visibles)',
      'Expande la tabla horizontalmente (min-w-full w-max) y compacta la barra de estado inferior',
    ],
  },
  {
    version: '1.14.0',
    date: '27 Nov 2026',
    title: 'Limpieza de barras: elimina botones redundantes Guardar filtro, Filtros guardados y Formato: Completo',
    features: [
      'Elimina el botón redundante Guardar filtro de Cronograma',
      'Elimina los desplegables redundantes Filtros guardados y Formato: Completo de Planificación',
      'Centraliza la selección de columnas, creación y edición de filtros guardados en el panel unificado estilo Gmail y sus píldoras',
    ],
  },
  {
    version: '1.13.4',
    date: '27 Nov 2026',
    title: 'Mejora de margen y posición del badge junto al icono de opciones de búsqueda',
    features: [
      'Añade mayor margen derecho en la píldora de búsqueda y coloca el badge contador en línea al lado del icono de filtros sin solaparlo',
    ],
  },
  {
    version: '1.13.3',
    date: '27 Nov 2026',
    title: 'Ajuste dinámico de altura del panel de búsqueda al viewport disponible',
    features: [
      'Calcula dinámicamente maxHeight según el espacio real bajo la barra de búsqueda (window.innerHeight - rect.bottom - 16px) para que el pie con Crear filtro y Actualizar nunca quede fuera de la ventana en Planificación ni Cronograma',
    ],
  },
  {
    version: '1.13.2',
    date: '27 Nov 2026',
    title: 'Pie fijo en panel de búsqueda estilo Gmail para que Crear filtro y Actualizar sean siempre visibles',
    features: [
      'Limita la altura del panel avanzado con scroll interno en el cuerpo de criterios',
      'Mantiene fija la cabecera y la barra inferior con Restablecer, Actualizar, Crear filtro y Buscar en cualquier tamaño de pantalla',
    ],
  },
  {
    version: '1.13.1',
    date: '27 Nov 2026',
    title: 'Limpieza de archivo temporal de test',
    features: [
      'Elimina archivo temporal de bundle SSR en tests/',
    ],
  },
  {
    version: '1.13.0',
    date: '27 Nov 2026',
    title: 'Buscador unificado estilo Gmail con filtros avanzados, exclusión, columnas y edición completa de filtros guardados',
    features: [
      'Píldora única de búsqueda estilo Gmail con panel desplegable de criterios completos (Contiene, No contiene, campos, tipo, plataforma, alerta, release y subtareas)',
      'Selector de columnas visibles integrado en el panel de Planificación',
      'Pills de filtros guardados con aplicación en 1 clic y edición completa (texto, exclusión, criterios y columnas) mediante lápiz',
      'Chips removibles de filtros activos en Cronograma y Planificación',
    ],
  },
  {
    version: '1.12.5',
    date: '27 Nov 2026',
    title: 'Actualizar guía de Ayuda con las nuevas funcionalidades',
    features: [
      'Añade sección 10 sobre Planificación, Wizard de proyectos (QG5 y presets DIGI/ARQ/QA), clic derecho contextual, enfoque multi-proyecto, filtros unificados y auto-ajuste de columnas',
      'Actualiza las secciones de Configuración, Exportación JSON (Cmd/Ctrl+S) y Ajustar Zoom con Modo Enfoque',
    ],
  },
  {
    version: '1.12.4',
    date: '27 Nov 2026',
    title: 'Selector directo de columnas al guardar filtros y perfiles',
    features: [
      'Añade selector de columnas directamente dentro del menú Filtros guardados al guardar con columnas actuales',
      'Mantiene siempre visible la barra Guardar perfil de columnas tanto en la pestaña Formatos como en Columnas',
    ],
  },
  {
    version: '1.12.3',
    date: '27 Nov 2026',
    title: 'Scroll aislado en Ayuda, pestaña Planificación y Catálogo Releases en Configuración',
    features: [
      'Corrige el scroll de la página de Ayuda dentro del modal de Configuración (overflow-y-auto, overscroll-contain y bloqueo de scroll del body)',
      'Renombra la pestaña y página de informes a Planificación',
      'Mueve el acceso al Catálogo de Releases al panel de Configuración eliminando la subpestaña duplicada',
    ],
  },
  {
    version: '1.12.2',
    date: '27 Nov 2026',
    title: 'Atajo Cmd/Ctrl+S para exportar JSON',
    features: [
      'Intercepta Cmd+S / Ctrl+S globalmente para exportar el cronograma en formato JSON en lugar del diálogo del navegador',
      'Actualiza el tooltip del botón de exportar JSON con el atajo Cmd/Ctrl+S',
    ],
  },
  {
    version: '1.12.1',
    date: '27 Nov 2026',
    title: 'Mover página de Ayuda al panel de Configuración',
    features: [
      'Mueve la guía de Ayuda como categoría dedicada dentro del panel de Configuración',
      'Elimina la pestaña Ayuda de la barra superior dejando solo Cronograma e Informes',
    ],
  },
  {
    version: '1.12.0',
    date: '27 Nov 2026',
    title: 'Wizard de proyectos, enfoque multi-proyecto, formato+columnas unificado y filtros guardados en barra',
    features: [
      'Añade Wizard guiado de 3 pasos para crear proyectos con subtareas en el Informe de Planificación con límite QG5 automático, inicio Hoy/Otra fecha y presets DIGI (MC), ARQ (ARQ) y QA (QA)',
      'Añade enfoque en uno o más proyectos desde el clic derecho y barra de enfoque en el Informe de Planificación',
      'Unifica los botones de Formato y Columnas en un único selector con pestañas Formatos y Columnas',
      'Mueve Filtros guardados dentro de la barra de búsqueda/filtros tanto en Informe de Planificación como en Cronograma',
    ],
  },
  {
    version: '1.11.32',
    date: '27 Nov 2026',
    title: 'Menú contextual clic derecho para crear elementos en Informe de Planificación',
    features: [
      'Añade menú contextual con clic derecho sobre filas de Release, Proyecto, Tarea o Hito en el Informe de Planificación',
      'Permite crear nueva tarea en el proyecto, nuevo hito en el proyecto, nuevo proyecto en la release y nuevo hito externo directamente desde la tabla',
      'Abre automáticamente el panel de detalles del nuevo elemento creado',
    ],
  },
  {
    version: '1.11.31',
    date: '27 Nov 2026',
    title: 'Ancho mínimo automático de columnas en Informe de Planificación',
    features: [
      'Calcula por defecto el ancho mínimo óptimo de cada columna según su contenido y cabecera sin desperdiciar espacio horizontal',
      'Usa w-max en las tablas del informe para respetar exactamente los anchos ajustados',
      'Permite doble clic en el divisor de cualquier columna para restablecerla al ancho auto-ajustado',
    ],
  },
  {
    version: '1.11.30',
    date: '27 Nov 2026',
    title: 'Acceso directo al panel de configuración',
    features: [
      'Elimina el popup desplegable del botón superior derecho y abre directamente el panel de Configuración',
      'Mueve el botón Recargar app al pie de la barra lateral de Configuración',
    ],
  },
  {
    version: '1.11.29',
    date: '27 Nov 2026',
    title: 'Barra de búsqueda y filtros unificada',
    features: [
      'Unifica la barra de búsqueda y filtros entre Cronograma e Informe de Planificación con SearchFilterBar sin duplicados',
      'Añade selector de campos de búsqueda (En: ...) y casilla Subtareas al Informe de Planificación',
      'Añade filtros de Tipo y Release al Cronograma',
    ],
  },
  {
    version: '1.11.28',
    date: '27 Nov 2026',
    title: 'Ajustar zoom respetando el modo enfoque',
    features: [
      'Ajustar zoom maximiza ahora el proyecto, release o tarea enfocados cuando el modo enfoque está activo',
      'Sincroniza el origen temporal del canvas para desplazar exactamente al elemento enfocado',
      'Actualiza el tooltip y notificación del botón Ajustar zoom según el enfoque activo',
    ],
  },
  {
    version: '1.11.27',
    date: '26 Nov 2026',
    title: 'Rediseño de Configuración estilo macOS, limpieza de Releases y Ayuda en barra principal',
    features: [
      'Eliminadas opciones redundantes de ocultar/mostrar release en ReleasesModal',
      'Rediseñado SettingsModal con barra lateral izquierda de categorías (General, Releases, Historial y Versiones/Changelog) y panel derecho de detalle',
      'Movida la página de Ayuda al selector principal junto a Cronograma e Informes',
    ],
  },
  {
    version: '1.11.26',
    date: '26 Nov 2026',
    title: 'Comparación de hasta 2 commits y subpestañas en Cambios (Del elemento / Commits)',
    features: [
      'Permitida la activación de hasta 2 botones de comparación entre commits distintos mostrando el diff directo A -> B y deshabilitando un 3.º',
      'Reorganizadas las pestañas del RightSidePanel en Detalles, Cambios (con subpestañas Del elemento y Commits) y Conflictos',
    ],
  },
  {
    version: '1.11.25',
    date: '26 Nov 2026',
    title: 'Vista agrupada en Historial de Cambios y pestaña Cambios en panel derecho',
    features: [
      'Añadida vista Agrupado (Release -> Proyecto -> Tarea/Hito) en PlanHistoryPage con resumen neto por campo y cronología desplegable con restauración',
      'Añadida pestaña Cambios en RightSidePanel mostrando los cambios agrupados del elemento seleccionado y sus hijos',
    ],
  },
  {
    version: '1.11.24',
    date: '24 Nov 2026',
    title: 'Hitos externos independientes por defecto, checkbox en panel derecho y retirada de TaskFormModal',
    features: [
      'Retirado TaskFormModal de App.tsx creando tareas e hitos directamente en el panel derecho',
      'Los hitos nuevos nacen externos por defecto sin proyecto ni release y se agrupan en sección independiente Hitos Externos',
      'Añadido checkbox Hito externo en RightSidePanel y botón rápido + Nuevo Hito',
    ],
  },
  {
    version: '1.11.23',
    date: '24 Nov 2026',
    title: 'Dependencias visuales por puerto (FS/FF/SS/SF) sin desplazar fechas',
    features: [
      'Mapeado automático de puerto origen/destino en barras del cronograma a FS, FF, SS o SF',
      'Bloqueo preventivo con aviso y sugerencia cuando la dependencia implicaría mover fechas de la tarea destino',
    ],
  },
  {
    version: '1.11.22',
    date: '24 Nov 2026',
    title: 'Jerarquía Rail + Banda Dual y animación fluida al colapsar proyectos',
    features: [
      'Aplicada Propuesta 3 (rail de árbol izquierdo, tinte dual WBS+Cronograma y cierre inferior del grupo por color de proyecto)',
      'Actualizada animación de colapsar/expandir a acordeón fluido de 280ms sincronizado en WBS y Cronograma',
    ],
  },
  {
    version: '1.11.21',
    date: '24 Nov 2026',
    title: 'Generar URL automática para elementos DIGI, HDEV y HUAT',
    features: [
      'Añadido campo url autogenerado para elementos cuyo nombre comienza por DIGI-, HDEV- o HUAT- apuntando a https://hdev.bancsabadell.com/browse/<ID>',
      'Mostrado enlace clicable en detalles del RightSidePanel y opción Abrir enlace en menú contextual derecho',
    ],
  },
  {
    version: '1.11.20',
    date: '24 Nov 2026',
    title: 'Corregir z-index de barra de herramientas del Cronograma sobre cabecera WBS',
    features: [
      'Subido z-index de cronograma-toolbar de z-30 a z-40 para evitar que el botón de columnas y cabecera WBS se superpongan a los menús desplegables de filtro',
    ],
  },
  {
    version: '1.11.19',
    date: '24 Nov 2026',
    title: 'Añadir checkboxes de Subtareas y Predecesoras en barra de filtros del Cronograma',
    features: [
      'Añadido checkbox Subtareas (desactivado por defecto) para controlar la visibilidad de subtareas no coincidentes de proyectos filtrados',
      'Añadido checkbox Predecesoras (excluido por defecto) para incluir opcionalmente el texto y código de las tareas predecesoras en la búsqueda',
    ],
  },
  {
    version: '1.11.18',
    date: '24 Nov 2026',
    title: 'Añadir filtros guardados con formato de columnas específico en Informe Planificación',
    features: [
      'Permitido guardar filtros combinados con formato y orden de columnas específico',
      'Añadido renombrado, edición de formato vinculado y eliminación de filtros guardados en Informe Planificación',
    ],
  },
  {
    version: '1.11.17',
    date: '23 Nov 2026',
    title: 'Simplificar formatos con orden de columnas, añadir filtro por tipo y ajustar selector Plat.',
    features: [
      'Eliminados presets predeterminados dejando solo Completo',
      'Guardado y restaurado del orden de columnas por formato',
      'Añadido filtro por Tipo junto al buscador en Informe Planificación',
      'Renombrado selector de plataforma a Plat. sin opción Todas',
    ],
  },
  {
    version: '1.11.16',
    date: '23 Nov 2026',
    title: 'Eliminar Código WBS, simplificar formatos predeterminados y permitir renombrado',
    features: [
      'Eliminada columna redundante Código WBS en informe y exportación Excel',
      'Conservados solo formatos predeterminados Completo y Resumen Ejecutivo',
      'Añadida edición y renombrado interactivo de formatos con persistencia local',
    ],
  },
  {
    version: '1.11.15',
    date: '23 Nov 2026',
    title: 'Sincronización por pestaña y actualización de presets de formato en Informes',
    features: [
      'Sincroniza el preset activo por pestaña evitando desajustes al alternar entre Cronograma y Releases',
      'Actualiza presets personalizados existentes al guardar con el mismo nombre',
      'Muestra tooltip con nombre completo del formato activo y añade verificación ampliada en suite de tests',
    ],
  },
  {
    version: '1.11.14',
    date: '23 Nov 2026',
    title: 'Selector de formatos y presets de columnas en Informe Planificación',
    features: [
      'Añade selector de formatos predeterminados y personalizados para columnas visibles en Informe Planificación',
      'Permite guardar y nombrar presets de configuración de columnas con persistencia en localStorage',
      'Permite alternar instantáneamente entre vistas y formatos',
    ],
  },
  {
    version: '1.11.13',
    date: '23 Nov 2026',
    title: 'Unificar fila única por tarea en informe Cronograma Completo',
    features: [
      'Consolida tareas con múltiples dependencias en 1 sola fila en Cronograma Completo y Excel',
      'Agrupa dependencias con badges en la misma celda de la tabla',
      'Elimina subfilas redundantes manteniendo paridad 1:1 con la vista Cronograma',
    ],
  },
  {
    version: '1.11.12',
    date: '23 Nov 2026',
    title: 'ID único para proyectos y tareas (P1, T1, P1T1), badge coloreado en tabla y columna ID en Informes',
    features: [
      'Añadido taskIndex estable y displayId único (P1, T1, P1T1) en motor y creación de tareas',
      'Etiqueta coloreada con el ID de cada tarea en la tabla del cronograma con el mismo estilo que los proyectos',
      'Reemplazada la columna # por la columna ID en las 3 pestañas de Informes',
    ],
  },
  {
    version: '1.11.11',
    date: '23 Nov 2026',
    title: 'Eliminado botón redundante Volver al Gantt en Informes',
    features: [
      'Eliminado el botón Volver al Gantt de la cabecera de Informes al existir ya el selector principal Cronograma | Informes en la barra superior',
    ],
  },
  {
    version: '1.11.10',
    date: '23 Nov 2026',
    title: 'Columnas Nivel de Alerta y Notas en Cronograma Completo y reordenación drag-and-drop',
    features: [
      'Añadidas las columnas editables Nivel de Alerta y Notas / Descripción al informe Cronograma Completo y exportación Excel',
      'Soporte de reordenación de columnas mediante arrastrar y soltar encabezados en las 3 pestañas de Informes con persistencia en localStorage',
    ],
  },
  {
    version: '1.11.9',
    date: '23 Nov 2026',
    title: 'Detalle completo de proyectos en el RightSidePanel',
    features: [
      'Añadido soporte completo para proyectos en el panel lateral derecho con cabecera de badges, edición de nombre, color, release, plataforma y nivel de alerta, métricas de tareas/hitos/equipos y listado clicable de tareas e hitos hijos',
    ],
  },
  {
    version: '1.11.8',
    date: '23 Nov 2026',
    title: 'Selector principal Cronograma | Informes y botones Importar/Exportar a la derecha',
    features: [
      'Creado selector segmentado de páginas principales al mismo nivel (Cronograma | Informes) en la cabecera',
      'Movidos los botones de Importar y Exportar a la derecha de la misma barra superior',
    ],
  },
  {
    version: '1.11.7',
    date: '23 Nov 2026',
    title: 'Abrir RightSidePanel con detalles al seleccionar filas en Informes',
    features: [
      'Al seleccionar una tarea, proyecto o release en cualquiera de las 3 pestañas de Informes se abre el panel derecho en la pestaña Detalles mostrando el elemento seleccionado y resaltando la fila',
    ],
  },
  {
    version: '1.11.6',
    date: '23 Nov 2026',
    title: 'Ocultar automáticamente el RightSidePanel al clicar fuera',
    features: [
      'El panel lateral derecho se oculta al hacer clic en áreas de la pantalla que no requieren su visibilidad, manteniéndose abierto al interactuar con el propio panel, botones de toggle/conflictos, filas/barras seleccionables y diálogos',
    ],
  },
  {
    version: '1.11.5',
    date: '23 Nov 2026',
    title: 'Columna Equipo en informes Cronograma Completo y Resumen Proyectos',
    features: [
      'Añadida columna configurable y redimensionable Equipo en las pestañas 1 (Cronograma Completo, editable inline por tarea) y 2 (Resumen Proyectos, equipos agregados del proyecto) además de la exportación Excel y búsqueda',
    ],
  },
  {
    version: '1.11.4',
    date: '23 Nov 2026',
    title: 'Cajas de descripción redimensionables y conservación de filtros al seleccionar',
    features: [
      'Las cajas de texto de descripción y notas en panel derecho, modal de tarea e inspector de proyecto ahora son redimensionables verticalmente (resize-y)',
      'Seleccionar un proyecto o tarea filtrada para ver sus detalles en el panel derecho ya no limpia los filtros activos de búsqueda, plataforma o alerta',
    ],
  },
  {
    version: '1.11.3',
    date: '23 Nov 2026',
    title: 'Nivel de alerta en tareas y selección desde tabla en panel de detalle',
    features: [
      'Soporte de alertLevel (0-3) en tareas e hitos desde el panel derecho, modal de tarea, tabla y cronograma completo',
      'Clicar proyectos o tareas en la tabla selecciona el elemento y actualiza el panel de detalle derecho igual que desde el cronograma',
    ],
  },
  {
    version: '1.11.2',
    date: '23 Nov 2026',
    title: 'Creación de tareas y proyectos sin release desde la barra inferior',
    features: [
      'El botón + Nuevo Proyecto de la barra inferior ahora inicia sin release seleccionada (opción Sin release) y crea proyectos fuera de releases',
      'El botón + Nueva Tarea de la barra inferior crea tareas directamente sin ninguna release asociada mediante handleCreateUnassignedTask',
    ],
  },
  {
    version: '1.11.1',
    date: '23 Nov 2026',
    title: 'Edición directa de la descripción existente en Resumen Proyectos',
    features: [
      'La celda de Descripción en Resumen Proyectos ahora carga el texto completo existente dentro del textarea editable en lugar de mostrarlo duplicado en solo lectura',
    ],
  },
  {
    version: '1.11.0',
    date: '23 Nov 2026',
    title: 'Informes con columnas configurables, redimensionables y edición directa',
    features: [
      'Añade selector de columnas visibles por pestaña en ReportsView persistido en localStorage',
      'Añade tiradores para redimensionar el ancho de cada columna en Cronograma Completo, Resumen Proyectos y Catálogo Releases',
      'Permite editar directamente textos, fechas, duraciones, holgura, progreso, plataformas, niveles de alerta y releases desde las tablas de informes',
    ],
  },
  {
    version: '1.10.23',
    date: '23 Nov 2026',
    title: 'Ghost apilado y movimiento sincronizado en arrastre múltiple',
    features: [
      'El ghost flotante muestra todas las tareas seleccionadas apiladas al arrastrar',
      'Las barras arrastradas en el cronograma siguen el cursor de forma inmediata sin retraso respecto a la tabla',
    ],
  },
  {
    version: '1.10.22',
    date: '22 Nov 2026',
    title: 'Arrastre múltiple de tareas seleccionadas',
    features: [
      'Permite seleccionar múltiples tareas con Cmd/Ctrl+Clic o Shift+Clic en tabla y cronograma y arrastrarlas juntas tanto en fechas como en orden vertical entre o dentro de proyectos',
    ],
  },
  {
    version: '1.10.21',
    date: '22 Nov 2026',
    title: 'Evitar re-animación de filas al soltar drag-and-drop',
    features: [
      'La transición de posición vertical (top/height) solo se aplica durante colapsado y expandido (isCollapseAnimating), evitando que la fila desplazada vuelva a moverse al soltar',
    ],
  },
  {
    version: '1.10.20',
    date: '22 Nov 2026',
    title: 'Animación de colapso/expansión más lenta (450ms) y posición fija sin salto de scroll',
    features: [
      'Se añade animación de colapso de 450ms tanto en filas de tabla como en barras del cronograma antes de ocultar los hijos y se ralentiza la expansión a 450ms',
      'Se fija la posición vertical de la barra colapsada mediante anclaje de scroll y espaciador inferior dinámico para evitar saltos al colapsar cerca del final',
    ],
  },
  {
    version: '1.10.19',
    date: '22 Nov 2026',
    title: 'Animación sincronizada en tabla al colapsar y expandir',
    features: [
      'Las filas de la tabla utilizan posicionamiento vertical con transición suave en top y altura del contenedor para deslizarse sincronizadas con el cronograma al colapsar o expandir',
    ],
  },
  {
    version: '1.10.18',
    date: '22 Nov 2026',
    title: 'Animación al colapsar y expandir releases y proyectos',
    features: [
      'Rotación suave del chevron en cabeceras de release y proyecto al colapsar o expandir',
      'Animación progresiva de entrada en filas y barras al expandir',
      'Desplazamiento vertical fluido en el cronograma al colapsar o expandir grupos',
    ],
  },
  {
    version: '1.10.17',
    date: '22 Nov 2026',
    title: 'Nuevo Proyecto sin borde, cabecera fija y barra de proyecto coloreada',
    features: [
      'El botón Nuevo Proyecto adopta el estilo sin borde en índigo y crea directamente el proyecto heredando la release padre',
      'Botón de configuración de columnas fijado a la izquierda del separador y eliminación de textos # / Orden y Nombre',
      'La barra de resumen de proyecto en el cronograma usa el mismo color asignado al proyecto en la tabla',
    ],
  },
  {
    version: '1.10.16',
    date: '22 Nov 2026',
    title: 'Botón Nueva Tarea sin borde, creación directa y limpieza de botones DIGI/SCR',
    features: [
      'El botón Nueva Tarea pasa a mostrarse sin borde y con texto coloreado en índigo',
      'Al hacer clic crea directamente una tarea heredando automáticamente el proyecto y la release padres',
      'Se eliminan los botones Tarea DIGI y Tarea SCR en proyectos vacíos dejando únicamente Nueva Tarea',
    ],
  },
  {
    version: '1.10.15',
    date: '22 Nov 2026',
    title: 'Animación estable sin parpadeos y arrastre vertical desde barras del cronograma',
    features: [
      'Se corrige la oscilación al intercambiar filas congelando las posiciones base (snapshot) al iniciar el arrastre en lugar de leer getBoundingClientRect() durante la transición CSS',
      'Se añade soporte para reordenar tareas, hitos y proyectos arrastrando verticalmente directamente desde sus barras en el cronograma',
    ],
  },
  {
    version: '1.10.14',
    date: '22 Nov 2026',
    title: 'Animación en vivo de intercambio en tabla y cronograma al arrastrar',
    features: [
      'Al arrastrar una tarea o proyecto también se desplaza su barra correspondiente en el cronograma',
      'Los elementos desplazados animan suavemente su posición (translateY con transition duration-200) para ocupar el lugar original del elemento arrastrado',
    ],
  },
  {
    version: '1.10.13',
    date: '22 Nov 2026',
    title: 'Checkbox de selección múltiple visible solo con Ctrl/Cmd+Clic',
    features: [
      'El checkbox de selección múltiple en filas de proyecto y tarea solo se muestra cuando el elemento está seleccionado mediante Ctrl/Cmd+Clic',
    ],
  },
  {
    version: '1.10.12',
    date: '22 Nov 2026',
    title: 'Evitar recorte de insignias en filas de proyecto y tarea',
    features: [
      'Permite que el contenedor del nombre de proyecto y tarea encoja (min-w-0 shrink) en reposo para que las insignias como \'X ítems\' o indicadores de hito nunca queden recortadas',
    ],
  },
  {
    version: '1.10.11',
    date: '22 Nov 2026',
    title: 'Menú contextual con clic derecho para acciones de proyecto/tarea y pie de proyecto simplificado',
    features: [
      'Se mueven los botones de acción de filas de proyecto y tarea a un menú contextual con clic derecho (wbs-context-menu) evitando solapamientos en Chrome',
      'Se deja únicamente el botón Nueva Tarea en el pie de proyecto heredando automáticamente proyecto y release padres',
    ],
  },
  {
    version: '1.10.10',
    date: '22 Nov 2026',
    title: 'Eliminación de botones chevron redundantes en proyectos y tareas',
    features: [
      'Se eliminan las flechas arriba/abajo redundantes en las filas de proyectos y tareas manteniendo el asa de arrastre flotante GripVertical',
    ],
  },
  {
    version: '1.10.9',
    date: '22 Nov 2026',
    title: 'Arrastre visual flotante para filas de Proyecto',
    features: [
      'Se añade asa de arrastre y vista previa flotante siguiendo el puntero en las filas de proyecto',
      'Reordenamiento directo de proyectos dentro de la misma release mediante moveProject con indicador de destino antes/después',
    ],
  },
  {
    version: '1.10.8',
    date: '22 Nov 2026',
    title: 'Arrastre visual siguiendo el puntero y publicación automática determinística',
    features: [
      'Al arrastrar tareas en tabla WBS aparece una tarjeta flotante siguiendo el puntero y en el cronograma las barras se mueven 1:1 con silueta de encaje.',
      'Se añade flujo determinístico de publicación automática con Stop hook (.agents/hooks.json), regla AGENTS.md y script scripts/publish.mjs.',
    ],
  },
  {
    version: '1.10.7',
    date: '22 Nov 2026',
    title: 'Configuración de hitos en barra de cronograma y cierre universal de modales',
    features: [
      'Se mueve el botón de configuración de hitos de release visibles a la barra de herramientas del cronograma.',
      'Todas las ventanas modales se cierran ahora al hacer clic fuera o al pulsar la tecla Escape.',
    ],
  },
  {
    version: '1.10.6',
    date: '20 Nov 2026',
    title: 'Barra de release con color de proyecto y doble punta en cada extremo',
    features: [
      'La barra de release adopta el color de la barra de proyecto (#0C0C09 / zinc-200 en modo oscuro) y añade dos puntas en cada extremo para diferenciarla visualmente',
    ],
  },
  {
    version: '1.10.5',
    date: '20 Nov 2026',
    title: 'Barra de release en forma de corchete y versionado automático en pre-push',
    features: [
      'La barra de release adopta la misma forma de corchete que la barra de proyecto manteniendo su color índigo',
      'Se añade hook .githooks/pre-push y regla de workspace para exigir el incremento de versión en cada publicación a main',
    ],
  },
  {
    version: '1.10.4',
    date: '19 Nov 2026',
    title: 'Traslado del aviso de conflictos a la nueva pestaña Conflictos del panel lateral derecho',
    features: [
      'Se elimina el banner de conflictos sobre el diagrama y se traslada toda la lista de conflictos y el botón de reprogramación automática a una nueva pestaña Conflictos en el panel lateral derecho, accesible también desde un indicador compacto en la barra superior.',
    ],
  },
  {
    version: '1.10.3',
    date: '19 Nov 2026',
    title: 'Unificación de detalles y edición de tareas en el panel lateral derecho',
    features: [
      'La pestaña Detalles del panel lateral derecho integra ahora la edición completa de tareas e hitos (nombre, tipo, proyecto, equipo, color, plataforma, release, fechas, duración, progreso, dependencias y notas), evitando que se abra un modal/popover al editar una tarea existente.',
    ],
  },
  {
    version: '1.10.2',
    date: '19 Nov 2026',
    title: 'Visibilidad del tirador de progreso en barras de tareas',
    features: [
      'Se reubica el tirador de progreso en el borde inferior de la barra (clamp entre los bordes izquierdo y derecho) para evitar que quede oculto tras los puertos de dependencia y tiradores de redimensionamiento.',
    ],
  },
  {
    version: '1.10.1',
    date: '18 Nov 2026',
    title: 'Panel lateral derecho unificado con pestañas de Detalles (tarea, proyecto, release) y Commits',
    features: [
      'El panel lateral derecho incorpora las pestañas Detalles y Commits. Al hacer clic sobre una tarea, hito, proyecto o release en el cronograma se abre automáticamente la pestaña Detalles en el panel lateral en lugar de un popover flotante.',
    ],
  },
  {
    version: '1.10.0',
    date: '18 Nov 2026',
    title: 'Línea base visual sobre commits, calendario de días laborables y festivos, auto-planificación en 1 clic, progreso en barra y nombre completo sin solapamiento',
    features: [
      'Se implementa la comparación visual de Línea Base contra cualquier commit (con barra fantasma y desviación en días), el modo opcional de días laborables Lun-Vie con festivos configurables, la auto-planificación en 1 clic respetando bloqueos, el tirador de progreso directo en cada barra y la elevación z-50 del nombre completo en tabla.',
    ],
  },
  {
    version: '1.9.10',
    date: '18 Nov 2026',
    title: 'Ancho completo en pantallas grandes y barra de release limpia con hitos centrados de alta visibilidad',
    features: [
      'Se elimina el límite de 1920px para aprovechar todo el ancho de pantallas grandes. La barra de release muestra código, mes, fechas, duración tras la fecha de fin y progreso por encima de la barra sin icono, dejando los rombos de hitos centrados verticalmente y destacados en ámbar.',
    ],
  },
  {
    version: '1.9.9',
    date: '18 Nov 2026',
    title: 'Redimensionamiento de fecha de inicio en barras e historial de commits en panel lateral',
    features: [
      'Las barras de tareas permiten ajustar la fecha de inicio manteniendo fija la de fin desde su extremo izquierdo. Se añade además un historial de cambios basado en commits con comentario y un botón de panel lateral en la barra superior para consultar cada commit y sus diferencias.',
    ],
  },
  {
    version: '1.9.8',
    date: '18 Nov 2026',
    title: 'Scroll vertical con rueda del ratón, zoom con Ctrl/Cmd+rueda y desplegable de equipos con color consistente',
    features: [
      'La rueda del ratón realiza scroll vertical en el diagrama mientras que Ctrl/Cmd + rueda aplica zoom. Además, el campo Responsable/Rol en el modal de tarea muestra un desplegable con los equipos existentes y mantiene siempre el mismo color por defecto para cada equipo.',
    ],
  },
  {
    version: '1.9.7',
    date: '18 Nov 2026',
    title: 'Hitos de release visibles sobre la barra con tooltip de solo fecha y limpieza de botones duplicados en tabla',
    features: [
      'Los rombos de hitos de release ahora se renderizan por encima de la barra de release (z-30) mostrando únicamente la fecha al pasar el cursor, y se eliminan los 2 botones duplicados de la cabecera izquierda de la tabla.',
    ],
  },
  {
    version: '1.9.6',
    date: '14 Nov 2026',
    title: 'Holgura automática restringida a dependencias Fin-Inicio (FS)',
    features: [
      'La holgura libre automática solo se calcula y muestra en tareas que tienen sucesoras con dependencia Fin-Inicio (FS).',
    ],
  },
  {
    version: '1.9.5',
    date: '14 Nov 2026',
    title: 'Corrección de hooks en el modal de edición de tareas',
    features: [
      'Se corrige un error de orden de hooks de React en TaskFormModal al abrir la edición de tareas desde el estado cerrado.',
    ],
  },
  {
    version: '1.9.4',
    date: '14 Nov 2026',
    title: 'Selección múltiple para mover tareas y proyectos juntos y holgura automática visible en barras del cronograma',
    features: [
      'Se añade multiselección (checkbox, Cmd/Ctrl+Clic, Shift+Clic) en tabla y cronograma para arrastrar o desplazar múltiples tareas y proyectos juntos manteniendo fechas relativas, barra flotante de desplazamiento rápido (-7d/-1d/+1d/+7d) con protección de proyectos bloqueados, y visualización automática de la barra fantasma de holgura libre en tareas con sucesoras.',
    ],
  },
  {
    version: '1.9.3',
    date: '13 Nov 2026',
    title: 'Cálculo e indicación automática de holgura libre (Slack) dadas las tareas siguientes',
    features: [
      'Motor CPM calcula holgura libre exacta con sucesoras',
      'Indicador automático de holgura y tareas siguientes en tabla de cronograma',
      'Panel lateral con sucesoras directas y tarea límite',
      'Vista previa y ajuste en modal de edición',
    ],
  },
  {
    version: '1.9.2',
    date: '11 Nov 2026',
    title: 'Bloqueo de proyectos en el cronograma y aviso interactivo de desbloqueo',
    features: [
      'Bloqueo de proyectos en el cronograma: nuevo botón de candado directamente en cada fila de proyecto de la tabla WBS y en las propiedades del proyecto para protegerlo frente a movimientos o ediciones accidentales.',
      'Aviso automático para desbloquear: al intentar arrastrar barras o hitos en el diagrama, editar fechas/duración/holgura/nombres, reordenar tareas o modificar dependencias de un proyecto bloqueado, el cambio se detiene y salta una ventana modal que permite desbloquear el proyecto con un solo clic.',
    ],
    improvements: [
      'Indicador visual de bloqueo tanto en la fila del proyecto como en su barra resumen del diagrama Gantt.',
      'Protección contra cascada automática de fechas sobre tareas pertenecientes a proyectos bloqueados y registro en el Historial de Versiones.',
    ],
  },
  {
    version: '1.9.1',
    date: '09 Nov 2026',
    title: 'Filtros unificados de plataforma y alerta en todos los informes y nuevo formato con viñetas en Resumen Proyectos',
    isLatest: false,
    features: [
      'Filtros completos en todos los informes de plan: las 3 pestañas de informes («Cronograma Completo», «Resumen Proyectos» y «Catálogo Releases») incorporan los mismos controles interactivos que la tabla principal: filtro visual por plataforma (con iconos iOS y Android) y filtro por nivel de alerta (0 a 3 con indicadores por color), aplicados de forma coherente.',
      'Formato estructurado de descripción compuesta en Resumen Proyectos: la columna de descripción combina la descripción general del proyecto seguida de una línea en blanco y la lista de subtareas con viñetas en formato «* <nombre tarea> <descripción tarea>».',
    ],
    improvements: [
      'Badges indicadores del nivel de alerta en las filas de proyecto del informe «Cronograma Completo».',
      'Filtrado sincronizado en «Catálogo Releases» que filtra automáticamente aquellas releases asociadas a proyectos que coincidan con la plataforma o el nivel de alerta seleccionado.',
    ],
  },
  {
    version: '1.9.0',
    date: '08 Nov 2026',
    title: 'Campo Nivel de Alerta (0 a 3) en proyectos y filtrado multinivel en la barra de herramientas',
    isLatest: false,
    features: [
      'Nivel de Alerta (0 a 3) en proyectos: cada proyecto dispone de un nuevo atributo de nivel de alerta configurable (0 = Normal/Sin alerta, 1 = Baja, 2 = Media, 3 = Alta/Crítica), visible mediante un badge indicador en la fila del proyecto en la tabla WBS.',
      'Filtro por Nivel de Alerta en la barra del Cronograma: nuevo menú desplegable de filtro que permite aislar proyectos según su nivel de alerta (Todas, Nivel 0, Nivel 1, Nivel 2, Nivel 3) combinable simultáneamente con el filtro de plataforma y el buscador por texto.',
      'Columna Nivel de Alerta y descripciones compuestas en Informes de plan (Resumen Proyectos): la pestaña «Resumen Proyectos» tanto en pantalla como en la exportación Excel incluye la columna «Nivel de Alerta» y desglosa en la columna «Descripción» la descripción del proyecto junto con cada una de sus subtareas en formato «<nombre tarea> <descripción tarea>» separadas por salto de línea.',
    ],
    improvements: [
      'Configuración del Nivel de Alerta tanto en la ventana modal de nuevo proyecto como en la modal de edición e inspección del proyecto existente.',
      'Registro del cambio de Nivel de Alerta en las diferencias de estado del Historial de Versiones del plan.',
    ],
  },
  {
    version: '1.8.9',
    date: '08 Nov 2026',
    title: 'Identificación de elementos en avisos de conflicto y navegación directa con un clic',
    isLatest: false,
    features: [
      'Identificación y navegación interactiva desde el aviso de conflicto: cuando existen tareas o hitos con fechas anteriores al fin de sus predecesoras, el banner indica explícitamente cada elemento afectado (con su proyecto) y al hacer clic navega, despliega, centra y abre automáticamente el detalle del elemento en el cronograma.',
    ],
    improvements: [
      'Alerta detallada de conflicto de predecesoras dentro del panel lateral de inspección del elemento seleccionado.',
    ],
  },
  {
    version: '1.8.8',
    date: '08 Nov 2026',
    title: 'Filtro desplegable de plataforma con iconos, limpieza de barras de Release en tabla y eliminación de selector duplicado',
    isLatest: false,
    features: [
      'Menú desplegable de filtro por plataforma con iconos nativos: el selector de plataforma en la barra del cronograma muestra directamente los iconos de iOS, Android y ambos iconos juntos (para filtrar proyectos y tareas multiplataforma).',
    ],
    improvements: [
      'Barras de Release minimalistas en la tabla: se eliminaron el icono de cohete y el nombre largo de la release en las cabeceras de la tabla izquierda, mostrando únicamente el código que empieza por T_.',
      'Eliminación del selector de plataforma duplicado en la barra superior principal, centralizando el filtrado en la barra de herramientas del cronograma.',
    ],
  },
  {
    version: '1.8.7',
    date: '08 Nov 2026',
    title: 'Detalle exacto de estados en el Historial, plataforma iOS/Android con iconos e iconos limpios en Releases',
    isLatest: false,
    features: [
      'Descripción exacta de cambios de estado en el Historial: cada entrada muestra explícitamente qué campos cambiaron (Antes → Después) en proyectos, tareas e hitos tanto en la tarjeta principal como en una nueva tabla de «Cambios exactos en esta versión».',
      'Plataforma «iOS/Android» e iconos nativos en la tabla: se sustituyó el valor «Multiplataforma» por «iOS/Android» y se representa visualmente la plataforma en las filas de proyecto de la tabla con los iconos de iOS y Android.',
    ],
    improvements: [
      'Botones compactos solo-icono en barras de Release: los botones de Ocultar y Enfocar en las cabeceras de release muestran únicamente su icono con tooltip descriptivo para ahorrar espacio horizontal.',
    ],
  },
  {
    version: '1.8.6',
    date: '08 Nov 2026',
    title: 'Limpieza visual de nombres de proyecto en el diagrama Gantt y columna Proyecto en Historial',
    isLatest: false,
    features: [
      'Columna Proyecto en el Historial de Cambios: en el desglose de tareas de cada versión del historial se sustituyó el ID técnico interno (t-17936...) por el nombre legible del Proyecto al que pertenece cada tarea.',
    ],
    improvements: [
      'Nombres de proyecto limpios en el diagrama Gantt y selectores: se eliminó el prefijo técnico P1:, P9: encima de las barras del cronograma y en los desplegables de filtro/modal, manteniendo los códigos WBS únicamente en la columna WBS de la tabla izquierda.',
    ],
  },
  {
    version: '1.8.5',
    date: '08 Nov 2026',
    title: 'Cobertura completa del calendario hasta el fin de todas las barras de Release visibles',
    isLatest: false,
    features: [
      'Cobertura automática de Releases en el calendario: el cálculo de límites temporales incluye siempre el inicio, fin e hitos de todas las barras de release visibles y ventanas de proyectos vacíos.',
    ],
    fixes: [
      'Corrección de corte prematuro del calendario: se solucionó el problema por el cual la barra del calendario y las columnas de días se detenían en la última tarea (p. ej. 15 de marzo) cuando existían barras de release posteriores (p. ej. T_27.3.1 o T_27.4.1 hasta finales de marzo o abril).',
    ],
  },
  {
    version: '1.8.4',
    date: '08 Nov 2026',
    title: 'Barra de calendario sticky, panel de herramientas visible, ID fijo de proyectos, tareas SCR con Release y propagación Proyecto → Hijos',
    isLatest: false,
    features: [
      'Tareas SCR asociadas a Release: al igual que las tareas DIGI, las tareas de tipo SCR están asociadas a una release y ajustan automáticamente sus fechas al rango de dicha release.',
      'Propagación de Release y Plataforma a hijos con sobreescritura individual: al cambiar la release o la plataforma en un proyecto, los valores se propagan automáticamente a todas sus tareas hijas, permitiendo después que cada tarea sobreescriba su propia release o plataforma.',
      'ID único y fijo por proyecto: cada proyecto conserva su código identificador (P1, P2, etc. y prefijo WBS) de forma invariante aunque se reordenen los proyectos hacia arriba o hacia abajo.',
    ],
    fixes: [
      'Barra de calendario sticky durante el scroll vertical: sincronización de desplazamiento vertical y apilamiento z-index para que la cabecera del calendario permanezca fija justo debajo de la barra del cronograma.',
      'Visibilidad completa del panel de herramientas: elevación del apilamiento de la barra superior (z-50) sobre la barra del cronograma (z-30) para evitar que el menú desplegable de herramientas quede oculto.',
    ],
  },
  {
    version: '1.8.3',
    date: '08 Nov 2026',
    title: 'Reubicación del botón de exportación Excel a la vista de Informes y simplificación de barra superior',
    isLatest: false,
    features: [
      'Descarga de Excel centralizada en Informes: botón de acción con icono de descarga exclusivo en la vista de hojas de cálculo (.xlsx) para exportar el libro con sus 3 pestañas.',
    ],
    improvements: [
      'Barra superior simplificada: eliminación del botón directo de Excel de la barra superior para evitar duplicidad de iconos y separar claramente el respaldo técnico (JSON) de la exportación de reportes (Excel).',
      'Acceso rápido a Informes y Excel: tooltip clarificado en el botón de Informes de la cabecera para acceder directamente a las tablas y a la descarga de Excel.',
    ],
  },
  {
    version: '1.8.2',
    date: '04 Nov 2026',
    title: 'Corrección de barra de búsqueda y eliminación de sombras de fines de semana en barras de tareas',
    isLatest: false,
    features: [
      'Búsqueda y filtro de plataforma optimizados en la barra superior del cronograma, garantizando visibilidad continua y total claridad de las filas de release.',
    ],
    fixes: [
      'Ubicación óptima de la barra de búsqueda y filtro de plataformas: trasladada a la barra de herramientas del cronograma (sticky top-12), evitando que se superponga o tape las filas de release e información de duración y proyectos en la tabla WBS.',
      'Alineación perfecta de cabecera de tabla: la cabecera de la tabla WBS permanece en sticky top-0 con altura sincronizada a 60px, sin desplazamientos que corten las releases.',
      'Eliminación de sombras de fines de semana sobre las barras de tareas: las barras de tareas y de hitos ahora cuentan con elevación z-20 y capas de fondo optimizadas (z-[1]) para que el sombreado de fines de semana se dibuje estrictamente de fondo y nunca opaque o corte las barras del diagrama.',
    ],
  },
  {
    version: '1.8.1',
    date: '04 Nov 2026',
    title: 'Interfaz despejada: eliminación de botones de zoom y deshacer/rehacer, y favicon oficial',
    isLatest: false,
    features: [
      'Favicon oficial en pestaña del navegador: el icono distintivo GitBranch se muestra como icono oficial de la aplicación al cargar la web.',
    ],
    improvements: [
      'Eliminación de los botones redundantes de Zoom (+/-) en la barra del cronograma para maximizar el espacio de visualización.',
      'Eliminación de los botones de Deshacer y Rehacer de la cabecera superior, preservando los atajos de teclado completos (Ctrl+Z, Ctrl+Shift+Z, ⌘Z, ⌘⇧Z) y la página de Historial.',
      'Eliminación del texto de marca GanttFlow y su icono de la barra superior para optimizar el espacio horizontal disponible.',
    ],
  },
  {
    version: '1.8.0',
    date: '04 Nov 2026',
    title: 'Filtro por búsqueda y plataforma en tabla, dependencias entre proyectos colapsados, reordenación y barra sticky',
    isLatest: false,
    features: [
      'Búsqueda en tiempo real por texto (nombre, notas, asignado) y filtro de plataforma (Todas, iOS, Android, Multiplataforma) directamente desde la cabecera de la tabla WBS.',
      'Visualización de dependencias entre proyectos colapsados: al colapsar proyectos, las dependencias entre tareas de distintos proyectos se conectan automáticamente desde y hacia las barras de resumen de los proyectos.',
      'Reordenar proyectos dentro de una misma release: botones de subir y bajar posición entre proyectos de la misma release directamente en la tabla.',
      'Cambiar el color de todas las tareas de un proyecto de una sola vez, tanto desde el selector de la fila del proyecto como desde el modal de edición.',
      'Expansión al pasar el ratón (hover) sobre nombres truncados: visualiza el nombre completo desplazando temporalmente a la derecha los demás elementos de la fila.',
      'Barra superior del cronograma fija (sticky top-12) y cabeceras sincronizadas que no desaparecen al hacer scroll vertical.',
    ],
    improvements: [
      'Eliminación de la etiqueta de release repetida en las barras de proyecto (los proyectos ya se agrupan visiblemente dentro de su release).',
      'Eliminación del botón "Gestionar" redundante en las cabeceras de release de la tabla WBS.',
    ],
  },
  {
    version: '1.7.1',
    date: '04 Nov 2026',
    title: 'Soporte completo para proyectos sin tareas, estado vacío visual y prevención de vistas en blanco',
    features: [
      'Fila informativa de estado vacío en tabla WBS con botones directos para añadir tareas.',
      'Barra visual de ventana de release en el cronograma para proyectos con 0 tareas (nunca queda el diagrama en blanco).',
      'Botón rápido de creación de tarea DIGI automática cubriendo la release asignada.',
      'Manejo enriquecido de Modo Enfoque en proyectos vacíos con aviso y acción directa para crear tarea o salir de enfoque.',
    ],
  },
  {
    version: '1.7.0',
    date: '04 Nov 2026',
    title: 'Selección en diagrama de proyectos/releases, enfoque contextual y botones compactos',
    features: [
      'Selección directa de proyectos y releases en el diagrama de Gantt',
      'Modo enfoque contextual sobre el elemento seleccionado (tarea, proyecto o release)',
      'Botones de Importar y Exportar (JSON/Excel) trasladados a la barra superior',
      'Botón de Releases reubicado en el menú de Herramientas',
      'Botones de cabecera exclusivamente con icono y tooltips informativos',
    ],
  },
  {
    version: '1.6.0',
    date: '04 Nov 2026',
    title: 'Barra dedicada de cronograma con botones compactos y corrección de sombreado',
    features: [
      'Barra de herramientas dedicada para el cronograma directamente sobre el diagrama.',
      'Botones de cronograma con formato icono-único (sin texto) y tooltips hints flotantes para máximo ahorro de espacio.',
      'Botón interactivo de versión con pantalla modal de Notas de Versión (Release Notes).',
    ],
    improvements: [
      'Limpieza del menú superior "Herramientas", eliminando la cuadrícula redundante de opciones del cronograma.',
      'Controles rápidos de zoom (+ / -) y alternancia de tabla WBS integrados en la barra del cronograma.',
    ],
    fixes: [
      'Aislamiento del sombreado de fines de semana (z-20): las columnas de sábado y domingo ya no afectan ni se superponen a las barras de release y proyecto.',
      'Posicionamiento z-30 para los rombos de hitos de release (QG4, QG5) y el marcador del día actual (HOY).',
    ],
  },
  {
    version: '1.5.0',
    date: '04 Nov 2026',
    title: 'Plataforma en tareas, menú secundario de cabecera y script de versionado automático',
    features: [
      'Campo tecnología/plataforma a nivel de tarea (iOS, Android, Multiplataforma o herencia por defecto del proyecto).',
      'Etiquetas visuales de plataforma en la tabla de tareas WBS y en el panel lateral de inspección.',
      'Columna de plataforma por tarea en la exportación jerárquica a Excel (.xlsx).',
    ],
    improvements: [
      'Menú secundario "Herramientas" para descongestionar la barra superior de elementos solapados.',
      'Script automatizado de versionado `bump-version.mjs` para sincronización íntegra entre package.json, types y tests.',
      'Cabeceras anti-caché en Vercel para garantizar la visualización inmediata de cada nueva versión desplegada.',
    ],
    fixes: [
      'Sincronización de versiones en despliegues sin retención de caché.',
    ],
  },
  {
    version: '1.4.0',
    date: '03 Nov 2026',
    title: 'Exportación jerárquica Excel, informes en la app, modo enfoque y límite de truncado',
    features: [
      'Exportación Excel con dependencias detalladas una a una por fila y con nombre legible en vez de código.',
      'Nueva página "Informes" con 3 pestañas estilo hoja de cálculo (Cronograma Completo, Resumen Proyectos, Catálogo Releases).',
      'Modalidad Enfoque (Focus Mode) para aislar un proyecto o tarea con salida mediante tecla Escape o pulsación de botón.',
      'Límite de caracteres de truncado configurable desde el panel de Ajustes Generales.',
    ],
    improvements: [
      'Botón para restablecer la visibilidad de releases ocultas.',
      'Selector de filtro por plataforma tecnológica en cabecera.',
    ],
    fixes: [
      'Asegurada la visibilidad de nombres de proyecto largos en el diagrama sin cortes.',
    ],
  },
  {
    version: '1.3.0',
    date: '03 Nov 2026',
    title: 'Hitos externos, sombreado de fines de semana y líneas de separación configurables',
    features: [
      'Hitos externos marcados con distintivo ámbar para hitos fuera de releases.',
      'Sombreado configurable de columnas de fines de semana (sábados y domingos).',
      'Líneas horizontales de separación entre filas configurables.',
    ],
    improvements: [
      'Ocultación selectiva de releases y proyectos en el cronograma.',
      'Truncado inteligente de nombres a 37 caracteres sin cortes abruptos.',
    ],
    fixes: [
      'Centrado de etiquetas de hitos sobre las líneas guía del calendario.',
    ],
  },
  {
    version: '1.2.0',
    date: '02 Nov 2026',
    title: 'Historial de cambios (Undo/Redo), página de ayuda y asignación de releases',
    features: [
      'Sistema de Deshacer y Rehacer (Undo/Redo) con página completa de historial de snapshots.',
      'Página de Ayuda con documentación y guía visual de atajos.',
      'Asignación obligatoria de release al crear un proyecto y tarea automática DIGI.',
    ],
    improvements: [
      'Preservación persistente en almacenamiento local contra pérdidas de datos en recargas.',
    ],
    fixes: [
      'Alineación y cálculo de duración completa de releases hasta su último hito.',
    ],
  },
  {
    version: '1.1.0',
    date: '02 Nov 2026',
    title: 'Edición interactiva de dependencias en diagrama y catálogo de releases',
    features: [
      'Creación, reconexión y eliminación de flechas de dependencia directamente sobre las barras del diagrama.',
      'Catálogo de 16 hitos de release (QG1 a QG5) con guías verticales de alineación.',
      'Selector desplegable múltiple de proyectos para visualización selectiva en el Gantt.',
    ],
    improvements: [
      'Validación de dependencias circulares en tiempo real (anti-ciclos).',
      'Líneas ortogonales con esquinas redondeadas tipo fillet.',
    ],
  },
  {
    version: '1.0.0',
    date: '01 Nov 2026',
    title: 'Lanzamiento inicial de GanttFlow',
    features: [
      'Diagrama de Gantt interactivo con división de paneles (WBS Table + Timeline Canvas).',
      'Motor de Ruta Crítica (CPM) y cálculo de holgura (Total Slack).',
      'Exportación e importación de proyectos en JSON y Excel.',
      'Soporte de temas Claro y Oscuro.',
    ],
  },
];
