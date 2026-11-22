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
    version: '1.10.16',
    date: '22 Nov 2026',
    title: 'Botón Nueva Tarea sin borde, creación directa y limpieza de botones DIGI/SCR',
    isLatest: true,
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
