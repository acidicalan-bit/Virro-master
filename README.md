# VIRRO IMPULSA

Experiencia pública de VIRRO IMPULSA construida con Next.js App Router, TypeScript y Tailwind CSS. El proyecto vive exclusivamente en `pivot/business-modernization` y preserva VIRRO Core como producto independiente.

## Ejecutar

```bash
pnpm install
pnpm dev
```

Abra `http://localhost:3000`.

## Validar

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Entornos

- Local/Replit: datos ficticios; ninguna PII se persiste.
- Preview: rama `pivot/business-modernization`.
- Staging/producción: requieren variables separadas, revisión de privacidad y sign-off.

No agregue `.env` al repositorio. Use Replit Secrets u otro gestor de secretos. Supabase y el admin pertenecen a una fase posterior y no deben conectarse a producción sin revisión de migraciones y RLS.

Consulte [README-PIVOT.md](./README-PIVOT.md) para preservación, alcance y rollback.
