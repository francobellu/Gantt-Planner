# Regla de Versionado y Release Notes Obligatoria

En cada commit o cambio de funcionalidad que se realice en este repositorio, se DEBE actualizar la versión de la aplicación y las notas de la versión (**Release Notes**).

## Archivos a actualizar en cada cambio/commit:

1. **`package.json`**:
   - Incrementar la versión (e.g., `1.8.2` -> `1.8.3` para patches/mejoras, `1.9.0` para features grandes).

2. **`src/types/gantt.ts`**:
   - Actualizar la constante `APP_VERSION`:
     ```ts
     export const APP_VERSION = 'X.Y.Z';
     ```

3. **`src/data/releaseNotes.ts`**:
   - Agregar una nueva entrada al inicio del array `RELEASE_NOTES` con `isLatest: true`:
     ```ts
     {
       version: 'X.Y.Z',
       date: 'DD Mon YYYY', // e.g. '08 Nov 2026'
       title: 'Título descriptivo de los cambios',
       isLatest: true,
       features?: [...],
       improvements?: [...],
       fixes?: [...],
     }
     ```
   - Cambiar la versión anterior a `isLatest: false`.

4. **`tests/ganttEngine.test.mjs`**:
   - Actualizar las aserciones de versión del test suite para que verifiquen la nueva versión `X.Y.Z`.
   - Asegurarse de que `npm test` y `npm run build` pasen al 100% antes de hacer el commit.
