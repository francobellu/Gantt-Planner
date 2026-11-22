---
description: Obligación de publicar determinísticamente (versión, releaseNotes, tests, build, commit y push) al finalizar cada feature
---

# Publicación y Versionado Determinístico en `main`

Siempre que termines una feature, mejora o fix en `main` (o vayas a publicar cambios), **debes** ejecutar el script determinístico unificado `scripts/publish.mjs` antes de finalizar tu respuesta (salvo que el usuario pida explícitamente no publicar):

```bash
node scripts/publish.mjs patch "<Título breve en español>" "<Descripción clara de los cambios; separada por ; si hay varios>"
```
*(Usa `minor` o `major` cuando corresponda por entidad del cambio.)*

Este flujo está garantizado por tres barreras determinísticas:
1. **Regla always-on** en `AGENTS.md` y esta guía.
2. **Lifecycle Hook `Stop`** en `.agents/hooks.json` (`.agents/hooks/enforce-publish.mjs`), que bloquea la finalización del agente si quedan archivos modificados o commits sin hacer push en `main`.
3. **Hook `.githooks/pre-push`**, que bloquea cualquier `git push` a `main` si no se actualizaron `package.json`, `src/types/gantt.ts` y `src/data/releaseNotes.ts`.
