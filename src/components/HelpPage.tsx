import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  CornerDownRight,
  Diamond,
  Download,
  Flame,
  FolderKanban,
  GitBranch,
  History,
  Keyboard,
  Layers,
  Maximize2,
  Plus,
  Rocket,
  Search,
  ShieldAlert,
  Sliders,
  Trash2,
  Undo2,
  Upload,
} from 'lucide-react';
import { APP_VERSION } from '../types/gantt';

export interface HelpPageProps {
  onBackToGantt: () => void;
}

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  category: string;
  summary: string;
  content: React.ReactNode;
}

export const HelpPage: React.FC<HelpPageProps> = ({ onBackToGantt }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const sections: HelpSection[] = useMemo(
    () => [
      {
        id: 'releases',
        title: '1. Estructura Jerárquica y Gestión de Releases',
        icon: <Rocket className="w-5 h-5 text-indigo-500" />,
        category: 'releases',
        summary: 'Organización permanente por Release > Proyecto > Tareas e Hitos con catálogo oficial predefinido.',
        content: (
          <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-zinc-300">
            <p>
              GanttFlow organiza de manera fija y permanente todos los proyectos y tareas dentro de su <strong>Release oficial correspondiente</strong>. 
              Esto proporciona una estructura empresarial clara de tres niveles:
            </p>
            <div className="p-3 bg-slate-100 dark:bg-zinc-900 rounded-[4px] font-mono text-[11px] border border-slate-200 dark:border-zinc-800">
              🚀 Release (ej. T_26.12.1 DICIEMBRE 2026)<br />
              &nbsp;&nbsp;📁 Proyecto (ej. Banca Móvil)<br />
              &nbsp;&nbsp;&nbsp;&nbsp;■ Tarea (ej. Autenticación Biométrica)<br />
              &nbsp;&nbsp;&nbsp;&nbsp;◆ Hito (ej. Congelación de Alcance)
            </div>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong>Calendario Predefinido:</strong> La aplicación incluye un catálogo oficial de 14 Releases (desde <code>T_26.12.1</code> hasta <code>T_28.1.1</code>) extraído de la planificación corporativa.
              </li>
              <li>
                <strong>Barra de Resumen de Release:</strong> En el diagrama Gantt, la barra superior de cada release está acotada horizontalmente desde su inicio hasta la fecha exacta de su último hito.
              </li>
              <li>
                <strong>Asignación Rápida:</strong> Cada proyecto muestra en su fila la insignia con el código de su Release asignada (ej. <code>[🚀 T_26.12.1]</code>). Al hacer clic en ella, puedes reasignar el proyecto a otra Release de forma instantánea.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: 'milestones',
        title: '2. Hitos de Release (Quality Gates) y Líneas Guía',
        icon: <Diamond className="w-5 h-5 text-amber-500 fill-amber-500/20" />,
        category: 'releases',
        summary: 'Visualización de los 16 Quality Gates oficiales con líneas verticales delimitadas al área de la release.',
        content: (
          <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-zinc-300">
            <p>
              Cada Release cuenta con 16 hitos de control de calidad oficiales: <strong>QG1, QG2, QG3, QG4, QG5, RC INI, RC FIN, UAT INI, QG5.1,6, PREPRO INI, PREPRO FIN, QG7, 1L, QG8, IOP y QG9</strong>.
            </p>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong>Visibilidad por Defecto:</strong> Para mantener una vista despejada, por defecto solo son visibles los hitos clave <strong>QG4</strong> y <strong>QG5</strong>.
              </li>
              <li>
                <strong>Panel de Configuración de Hitos:</strong> En la cabecera de la tabla WBS encontrarás el botón <code>Hitos ▾</code>, donde puedes activar o desactivar individualmente cualquiera de los 16 hitos o aplicar presets (<em>Solo QG4/QG5</em>, <em>Todos</em> o <em>Ninguno</em>).
              </li>
              <li>
                <strong>Líneas Guía Delimitadas:</strong> Las líneas verticales punteadas se muestran <em>únicamente</em> en la zona vertical que ocupa la Release en el diagrama, evitando cruzar todo el calendario.
              </li>
              <li>
                <strong>Diamantes Interactivos:</strong> En la parte superior de cada Release en el cronograma se muestra un diamante con el nombre del hito (ej. <code>QG4</code>). Hacer clic sobre el diamante oculta o muestra su línea vertical.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: 'projects',
        title: '3. Gestión de Proyectos y Selector Múltiple',
        icon: <FolderKanban className="w-5 h-5 text-emerald-500" />,
        category: 'projects',
        summary: 'Creación de proyectos con Release asociada, filtro multi-proyecto y eliminación segura.',
        content: (
          <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-zinc-300">
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong>Creación con Release:</strong> Al crear un proyecto, puedes asignarle inmediatamente la Release correspondiente, su nombre y su color temático.
              </li>
              <li>
                <strong>Selector Multi-Proyecto:</strong> En la barra superior, el selector <code>Proyectos</code> te permite marcar con casillas qué proyectos deseas ver simultáneamente en el diagrama.
              </li>
              <li>
                <strong>Información y Detalles:</strong> Pulsa el icono de documento o la etiqueta de Release en la fila del proyecto para editar su descripción técnica, notas de alcance o cambiar su color.
              </li>
              <li>
                <strong>Eliminación con Confirmación:</strong> Cualquier proyecto (incluyendo el último) puede ser eliminado pulsando el icono de papelera. El sistema solicitará confirmación explícita antes de borrar el proyecto y todas sus tareas asociadas.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: 'tasks',
        title: '4. Tareas e Hitos de Proyecto',
        icon: <Calendar className="w-5 h-5 text-sky-500" />,
        category: 'tasks',
        summary: 'Creación, reordenación drag & drop, ajuste de fechas, duración y progreso.',
        content: (
          <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-zinc-300">
            <p>
              El cronograma permite dos tipos de elementos dentro de los proyectos:
            </p>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong>Tareas:</strong> Cuentan con fecha de inicio, fecha de fin, duración en días, porcentaje de avance (0-100%) y responsable/equipo asignado.
              </li>
              <li>
                <strong>Hitos:</strong> Representan metas o entregas puntuales con duración de 0 días y fecha fija, representados por un rombo de color.
              </li>
              <li>
                <strong>Añadir Rápido:</strong> En la fila de cada proyecto y al final de la tabla dispones de botones directos para añadir tareas o hitos al instante.
              </li>
              <li>
                <strong>Reordenar Posición:</strong> Arrastra el icono de agarre lateral (puntos verticales) o usa las flechas arriba/abajo para cambiar el orden de las tareas dentro del proyecto.
              </li>
              <li>
                <strong>Edición en Diagrama:</strong> Arrastra el cuerpo de una barra para mover sus fechas en el calendario, o arrastra su borde derecho para alargar o acortar su duración.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: 'dependencies',
        title: '5. Dependencias y Enlaces entre Tareas',
        icon: <GitBranch className="w-5 h-5 text-cyan-500" />,
        category: 'dependencies',
        summary: 'Creación visual de dependencias, 4 tipos estándar (FS, SS, FF, SF) y prevención de ciclos.',
        content: (
          <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-zinc-300">
            <p>
              Las tareas pueden enlazarse para reflejar precedencias temporales con curvas suaves y flechas direccionales:
            </p>
            <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-100 dark:bg-zinc-900 rounded-[4px] border border-slate-200 dark:border-zinc-800 text-[11px] font-mono">
              <div><strong>FS (Fin a Inicio):</strong> Sucesor empieza al acabar predecesor.</div>
              <div><strong>SS (Inicio a Inicio):</strong> Ambos empiezan al mismo tiempo.</div>
              <div><strong>FF (Fin a Fin):</strong> Ambos finalizan al mismo tiempo.</div>
              <div><strong>SF (Inicio a Fin):</strong> Sucesor no finaliza hasta que empieza el predecesor.</div>
            </div>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong>Crear en el Diagrama:</strong> Pasa el cursor por una barra y arrastra desde el puerto de conexión circular hacia otra barra para establecer la dependencia.
              </li>
              <li>
                <strong>Eliminar Dependencia:</strong> Haz clic en el botón <code>×</code> sobre la flecha de dependencia en el diagrama para desvincularla al instante.
              </li>
              <li>
                <strong>Prevención de Ciclos:</strong> El motor valida automáticamente que ningún enlace cree una dependencia circular infinita (ej. A depende de B y B de A).
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: 'cpm',
        title: '6. Ruta Crítica (CPM), Holguras y Métricas',
        icon: <Flame className="w-5 h-5 text-amber-500" />,
        category: 'analytics',
        summary: 'Cálculo analítico de tareas críticas, holgura libre y panel de métricas del proyecto.',
        content: (
          <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-zinc-300">
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong>Botón Ruta Crítica (Llama):</strong> En la barra superior, activa el botón de llama para resaltar en rojo las tareas que no tienen margen de retraso y determinan la fecha final del plan.
              </li>
              <li>
                <strong>Holguras (Slack):</strong> Muestra el tiempo máximo que una tarea puede retrasarse sin afectar la fecha final de la release o proyecto.
              </li>
              <li>
                <strong>Panel de Métricas:</strong> El botón de gráfico de barras despliega un resumen completo: porcentaje de avance global ponderado, días totales de duración, tareas en ruta crítica y recuento total de ítems.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: 'history',
        title: '7. Historial de Cambios, Deshacer y Rehacer',
        icon: <History className="w-5 h-5 text-violet-500" />,
        category: 'history',
        summary: 'Auditoría cronológica de cambios y capacidad de retroceder o avanzar en cualquier momento.',
        content: (
          <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-zinc-300">
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong>Deshacer / Rehacer:</strong> Usa los botones directos de la barra superior o los atajos <code>⌘Z</code> / <code>Ctrl+Z</code> y <code>⌘Y</code> / <code>Ctrl+Y</code> para revertir cualquier cambio.
              </li>
              <li>
                <strong>Página de Historial:</strong> Pulsa el botón <code>Historial</code> en la cabecera para ver la lista de todas las acciones registradas con fecha y hora, y restaurar una instantánea previa del plan con un solo clic.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: 'storage',
        title: '8. Persistencia y Exportación / Importación JSON',
        icon: <Download className="w-5 h-5 text-emerald-500" />,
        category: 'storage',
        summary: 'Guardado continuo en navegador y copias de seguridad portátiles en formato JSON.',
        content: (
          <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-zinc-300">
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong>Guardado Automático:</strong> Todos los cambios en proyectos, tareas, fechas, dependencias y Releases se almacenan en <code>localStorage</code> del navegador, persistiendo entre sesiones y recargas de página.
              </li>
              <li>
                <strong>Exportación JSON Directa:</strong> Pulsa el botón <code>Exportar</code> en la cabecera para descargar inmediatamente un archivo <code>.json</code> con la estructura completa de tu cronograma.
              </li>
              <li>
                <strong>Importación:</strong> Pulsa el botón <code>Importar</code> o simplemente arrastra y suelta un archivo <code>.json</code> sobre la ventana para cargar y fusionar tus proyectos.
              </li>
            </ul>
          </div>
        ),
      },
      {
        id: 'navigation',
        title: '9. Navegación, Zoom y Atajos de Teclado',
        icon: <Keyboard className="w-5 h-5 text-slate-500" />,
        category: 'navigation',
        summary: 'Escalas de tiempo continuas, ajuste automático y atajos para maximizar productividad.',
        content: (
          <div className="space-y-3 text-xs leading-relaxed text-slate-700 dark:text-zinc-300">
            <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-100 dark:bg-zinc-900 rounded-[4px] border border-slate-200 dark:border-zinc-800 text-[11px] font-mono">
              <div><code>Escape</code>: Cerrar modal / panel</div>
              <div><code>⌘Z / Ctrl+Z</code>: Deshacer cambio</div>
              <div><code>⌘Y / Ctrl+Y</code>: Rehacer cambio</div>
              <div><code>Rueda ratón</code>: Zoom suave</div>
            </div>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong>Ir a Hoy:</strong> El botón de brújula centra instantáneamente la línea roja del día actual.
              </li>
              <li>
                <strong>Ajustar a Pantalla:</strong> El botón de maximizar adapta la escala temporal para ver todos los proyectos dentro del ancho de la ventana.
              </li>
              <li>
                <strong>Ocultar Tabla:</strong> El botón superior izquierdo junto a la versión permite colapsar la tabla para ver únicamente el diagrama Gantt a pantalla completa.
              </li>
            </ul>
          </div>
        ),
      },
    ],
    []
  );

  const categories = [
    { id: 'all', label: 'Todas las funcionalidades' },
    { id: 'releases', label: 'Releases e Hitos' },
    { id: 'projects', label: 'Proyectos' },
    { id: 'tasks', label: 'Tareas' },
    { id: 'dependencies', label: 'Dependencias' },
    { id: 'analytics', label: 'Ruta Crítica' },
    { id: 'history', label: 'Historial' },
    { id: 'storage', label: 'Datos & JSON' },
    { id: 'navigation', label: 'Atajos & Zoom' },
  ];

  const filteredSections = useMemo(() => {
    return sections.filter((sec) => {
      const matchesCat =
        selectedCategory === 'all' || sec.category === selectedCategory;
      if (!matchesCat) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        sec.title.toLowerCase().includes(q) ||
        sec.summary.toLowerCase().includes(q)
      );
    });
  }, [sections, selectedCategory, searchQuery]);

  return (
    <div
      data-testid="help-page-container"
      className="min-h-screen bg-[#F4F4F1] dark:bg-[#0C0C09] text-[#0C0C09] dark:text-[#F4F4F1] flex flex-col font-sans"
    >
      {/* Top sticky navigation bar */}
      <header className="sticky top-0 z-30 h-12 px-4 bg-[#F4F4F1] dark:bg-[#0C0C09] border-b border-[#0C0C09] dark:border-zinc-800 flex items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-3">
          <button
            type="button"
            data-testid="help-back-to-gantt-btn"
            onClick={onBackToGantt}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-semibold text-[#0C0C09] dark:text-zinc-200 hover:bg-[#0C0C09] hover:text-white dark:hover:bg-zinc-100 dark:hover:text-[#0C0C09] transition cursor-pointer shadow-none"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al Diagrama Gantt</span>
          </button>

          <div className="h-4 w-px bg-[#E2E2DC] dark:bg-zinc-800 hidden sm:block" />

          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-sm font-bold tracking-tight">Guía de Ayuda y Funcionalidades</h1>
            <span
              data-testid="help-version-badge"
              className="px-1.5 py-0.5 rounded-[2px] bg-white dark:bg-zinc-900 text-[#6B6B66] dark:text-zinc-400 text-[10px] font-mono font-bold border border-[#E2E2DC] dark:border-zinc-700"
            >
              {`v${APP_VERSION}`}
            </span>
          </div>
        </div>

        <div className="relative w-64 max-w-[280px] hidden md:block">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            data-testid="help-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar en la ayuda..."
            className="w-full pl-8 pr-3 py-1 text-xs rounded-[4px] border border-[#0C0C09] dark:border-zinc-700 bg-white dark:bg-zinc-900 text-[#0C0C09] dark:text-zinc-100 placeholder-slate-400 outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
          />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Category Pills Filter */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-[#E2E2DC] dark:border-zinc-800">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 rounded-[4px] text-xs font-medium transition cursor-pointer border ${
                selectedCategory === cat.id
                  ? 'bg-[#0C0C09] border-[#0C0C09] text-white dark:bg-zinc-100 dark:border-white dark:text-[#0C0C09] font-bold'
                  : 'bg-white dark:bg-zinc-900 border-[#E2E2DC] dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-[#0C0C09] dark:hover:border-zinc-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Section Cards */}
        <div className="grid grid-cols-1 gap-4">
          {filteredSections.map((sec) => (
            <article
              key={sec.id}
              data-testid={`help-section-${sec.id}`}
              className="bg-white dark:bg-zinc-900 border border-[#0C0C09] dark:border-zinc-800 rounded-[6px] p-5 shadow-xs transition hover:border-indigo-600 dark:hover:border-indigo-400"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 rounded-[4px] bg-[#F4F4F1] dark:bg-zinc-800 border border-[#E2E2DC] dark:border-zinc-700 shrink-0">
                  {sec.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-bold text-[#0C0C09] dark:text-white">
                    {sec.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    {sec.summary}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E2E2DC] dark:border-zinc-800/80">
                {sec.content}
              </div>
            </article>
          ))}

          {filteredSections.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-zinc-900 border border-dashed border-slate-300 dark:border-zinc-800 rounded-[6px]">
              <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">
                No se encontraron resultados para "{searchQuery}"
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 underline font-medium cursor-pointer"
              >
                Restablecer filtros
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-[#E2E2DC] dark:border-zinc-800 text-center text-xs text-slate-500 dark:text-zinc-500 font-mono">
        GanttFlow v{APP_VERSION} · Guía y Manual de Usuario
      </footer>
    </div>
  );
};
