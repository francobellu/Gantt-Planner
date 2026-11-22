# Reglas del Proyecto (Gantt-Planner)

## Publicación Automática y Determinística al Finalizar Cada Feature

Al terminar de implementar cualquier **feature, mejora o corrección** en la rama `main` (salvo que el usuario indique explícitamente no publicar, p. ej. *"no publiques"* / *"sin publicar"*), es **obligatorio** publicar antes de dar por finalizada la respuesta:

1. Ejecuta el script determinístico unificado:
   ```bash
   node scripts/publish.mjs patch "<Título breve en español>" "<Descripción clara; separada por ; si hay varios puntos>"
   ```
   *(Usa `minor` o `major` en lugar de `patch` cuando la entidad del cambio lo requiera.)*
2. Este script realiza de forma atómica e idempotente:
   - Incremento de versión (`package.json`, `src/types/gantt.ts`, `src/data/releaseNotes.ts`, `tests/ganttEngine.test.mjs`) mediante `scripts/bump-version.mjs` si la versión local coincide con `origin/main`.
   - Verificación completa: `npm test` y `npm run build`.
   - `git add -A`, `git commit -m "vX.Y.Z: ..."` y `git push origin main` (validado también por `.githooks/pre-push`).
3. **No finalices la tarea ni respondas como completada** mientras queden cambios sin commitear o commits sin subir en `main`. El hook `Stop` configurado en `.agents/hooks.json` (`.agents/hooks/enforce-publish.mjs`) bloquea determinísticamente la parada del agente si quedan cambios pendientes sin publicar.
