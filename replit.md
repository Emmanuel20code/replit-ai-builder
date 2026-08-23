# JEVISH AI Builder

JEVISH AI Builder turns plain-language ideas into editable web project files and publishes them to GitHub from the Settings screen.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required secret: `OPENROUTER_API_KEY` — secure AI generation access

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/jevish-ai-builder/src/App.tsx` — builder, editor, preview, project detail, and publishing settings UI
- `artifacts/jevish-ai-builder/src/index.css` — JEVISH visual theme and responsive layout tokens
- `artifacts/api-server/src/routes/builder.ts` — AI generation endpoint
- `artifacts/api-server/src/routes/github.ts` — GitHub status, repository creation, and file publishing
- `lib/api-spec/openapi.yaml` — source of truth for generated API contracts

## Architecture decisions

- AI requests stay server-side so the OpenRouter secret is never shipped to the browser.
- The builder uses the free routing choice through OpenRouter while intentionally keeping provider/model branding out of user-facing copy.
- GitHub publishing uses the Replit connector proxy, creating or reusing a repository and serially updating each generated file.
- Project files and recent builds persist locally in the browser for a lightweight first-run workspace without requiring account setup.

## Product

- Natural-language project generation and refinement
- Editable file tree and code editor
- Generated project preview and project detail route
- Local recent-build history
- GitHub connection status and publish form with repository/commit links

## User preferences

- Keep model names out of the product interface.
- App name is JEVISH AI Builder.

## Gotchas

- The GitHub connection must be authorized in Replit before publishing.
- The Vite production build requires `PORT` and `BASE_PATH`; use the managed workflow or provide both when running it manually.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
