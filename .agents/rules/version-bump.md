---
description: Obligación de incrementar la versión y actualizar releaseNotes.ts antes de publicar a main
---

# Versionado determinístico antes de cada push a `main`

Siempre que vayas a hacer `git push` a `main` (o publicar cambios), **debes** incrementar la versión antes del commit/push usando `scripts/bump-version.mjs` (el hook `.githooks/pre-push` bloqueará el push si no se hace):

1. Ejecuta:
   ```bash
   node scripts/bump-version.mjs patch "<Título breve en español>" "<Descripción clara de los cambios; separada por ; si hay varios>"
   ```
   (Usa `minor` o `major` cuando corresponda por entidad del cambio.)
2. Verifica que `npm test && npm run build` pasan **después** del bump.
3. Haz commit con el prefijo de versión (por ejemplo `v1.10.5: ...`) y entonces `git push`.
