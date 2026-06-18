# HR Assistant — Agent Context

RAG-based HR assistant chat (future). This repo is scaffolded as a **blank TanStack Start** app; feature work has not started.

## Scaffolding commands

**TanStack CLI** (run in a scratch directory, output merged into repo root):

```bash
npx @tanstack/cli@latest create my-tanstack-app --agent
```

**TanStack Intent** (run from repo root after merge):

```bash
npx @tanstack/intent@latest install
npx @tanstack/intent@latest list
```

Load a skill before substantial TanStack work:

```bash
pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core
```

## Stack and integrations

| Layer | Choice |
| --- | --- |
| Framework | **TanStack Start** (React 19, SSR/streaming) |
| Routing | **TanStack Router** — file-based routes in `src/routes/` |
| Bundler | **Vite 8** |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`, typography plugin) |
| Devtools | `@tanstack/devtools-vite`, `@tanstack/react-devtools`, router devtools panel |
| Testing | **Vitest** + Testing Library (no sample tests yet) |
| Package manager | **pnpm** (lockfile at repo root; single-package layout, not a monorepo) |

**Not included:** database, auth provider, TanStack Query UI wiring, deployment adapter, or RAG/LLM integrations.

CLI metadata (`.cta.json`): React, file-router mode, Tailwind, TypeScript, TanStack Intent enabled, `includeExamples: true` (starter pages/components).

## Commands

```bash
pnpm install          # install dependencies
pnpm dev              # dev server on http://localhost:3000
pnpm build            # production client + SSR build → dist/
pnpm preview          # preview production build
pnpm test             # vitest run
pnpm generate-routes  # regenerate src/routeTree.gen.ts (also runs on build via plugin)
```

Typecheck: `pnpm exec tsc --noEmit` (no dedicated script yet).

## Environment variables

**None required** for the blank starter.

When adding features, follow TanStack Start's execution model:

- **`VITE_*`** — exposed to client bundles; safe for public config only.
- **`process.env.*`** — server-only; use inside `createServerFn`, route `server` handlers, or `.server.ts` modules.

Copy `.env.example` when you add secrets (create the file; `.env` is gitignored). Never commit API keys.

Future RAG/HR work will likely need (not configured yet):

- `ANTHROPIC_API_KEY` or other LLM provider keys (server-only)
- Vector store / embedding service URLs and keys (server-only)
- Optional `VITE_*` flags for client-visible feature toggles

## Deployment notes

- Default output: `dist/client` (static assets) + `dist/server/server.js` (SSR handler).
- TanStack Start supports Cloudflare Workers, Netlify, Vercel, Node/Docker, Bun, Railway — see Intent skill `@tanstack/start-client-core#start-core/deployment` before choosing a target.
- Devtools are stripped from production builds via `@tanstack/devtools-vite` (`removeDevtoolsOnBuild`).
- No deployment config is committed yet; add platform adapter when ready.

## Architecture

```
src/
  router.tsx          # getRouter() factory + Register type
  routeTree.gen.ts    # generated route tree (do not edit)
  routes/
    __root.tsx        # HTML shell, HeadContent, Scripts, layout
    index.tsx         # /
    about.tsx         # /about
  components/         # Header, Footer, ThemeToggle (starter UI)
  styles.css          # Tailwind + theme tokens
vite.config.ts        # devtools → tailwind → tanstackStart → react
tsr.config.json       # router CLI target: react
public/               # static assets
```

**Key decisions:**

1. **Single app at repo root** — matches TanStack Start defaults; no `apps/` subfolder (workspace had no prior monorepo layout).
2. **Preserve CLI file structure** — routes, components, and configs kept as generated.
3. **pnpm over npm** — CLI used npm in scratch; workspace uses pnpm with a fresh lockfile.
4. **Intent skills** — consult package-shipped skills before router/Start/devtools changes; do not guess Next.js patterns.

## Known gotchas

- **Isomorphic by default** — route loaders and most route code run on server *and* client. Use `createServerFn` for DB/secrets (see `start-core/execution-model` skill).
- **Not Next.js** — no App Router, `"use server"`, or `getServerSideProps`.
- **`routeTree.gen.ts`** is auto-generated; VS Code marks it read-only (`.vscode/settings.json`).
- **CLI `--agent` mode** used npm and included starter example pages (home + about), not a zero-file skeleton — intentional preserve of CLI output.
- **pnpm v10** ignores `package.json` → `"pnpm"` block; use `.npmrc` / workspace settings if you need `onlyBuiltDependencies`.
- **TanStack CLI telemetry** — disable with `TANSTACK_CLI_TELEMETRY_DISABLED=1` or `tanstack telemetry disable`.

## Next steps (product)

1. Strip or replace starter marketing pages in `src/routes/` when building HR UI.
2. Add `.env.example` with server-only LLM/RAG variables.
3. Implement RAG pipeline via `createServerFn` + server routes (not client-side keys).
4. Add deployment target and CI (`pnpm build`, `pnpm test`).
5. Optional: TanStack Query for chat history / server state.

<!-- intent-skills:start -->
## Skill Loading

Before substantial work:
- Skill check: run `pnpm dlx @tanstack/intent@latest list`, or use skills already listed in context.
- Skill guidance: if one local skill clearly matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` and follow the returned `SKILL.md`.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

# Skill mappings - load `use` with `pnpm dlx @tanstack/intent@latest load <use>`.
skills:
  - when: "Install TanStack Devtools, pick framework adapter (React/Vue/Solid/Preact), register plugins via plugins prop, configure shell (position, hotkeys, theme, hideUntilHover, requireUrlFlag, eventBusConfig). TanStackDevtools component, defaultOpen, localStorage persistence."
    use: "@tanstack/devtools#devtools-app-setup"
  - when: "Publish plugin to npm and submit to TanStack Devtools Marketplace. PluginMetadata registry format, plugin-registry.ts, pluginImport (importName, type), requires (packageName, minVersion), framework tagging, multi-framework submissions, featured plugins."
    use: "@tanstack/devtools#devtools-marketplace"
  - when: "Build devtools panel components that display emitted event data. Listen via EventClient.on(), handle theme (light/dark), use @tanstack/devtools-ui components. Plugin registration (name, render, id, defaultOpen), lifecycle (mount, activate, destroy), max 3 active plugins. Two paths: Solid.js core with devtools-ui for multi-framework support, or framework-specific panels."
    use: "@tanstack/devtools#devtools-plugin-panel"
  - when: "Handle devtools in production vs development. removeDevtoolsOnBuild, devDependency vs regular dependency, conditional imports, NoOp plugin variants for tree-shaking, non-Vite production exclusion patterns."
    use: "@tanstack/devtools#devtools-production"
  - when: "Two-way event patterns between devtools panel and application. App-to-devtools observation, devtools-to-app commands, time-travel debugging with snapshots and revert. structuredClone for snapshot safety, distinct event suffixes for observation vs commands, serializable payloads only."
    use: "@tanstack/devtools-event-client#devtools-bidirectional"
  - when: "Create typed EventClient for a library. Define event maps with typed payloads, pluginId auto-prepend namespacing, emit()/on()/onAll()/onAllPluginEvents() API. Connection lifecycle (5 retries, 300ms), event queuing, enabled/disabled state, SSR fallbacks, singleton pattern. Unique pluginId requirement to avoid event collisions."
    use: "@tanstack/devtools-event-client#devtools-event-client"
  - when: "Analyze library codebase for critical architecture and debugging points, add strategic event emissions. Identify middleware boundaries, state transitions, lifecycle hooks. Consolidate events (1 not 15), debounce high-frequency updates, DRY shared payload fields, guard emit() for production. Transparent server/client event bridging."
    use: "@tanstack/devtools-event-client#devtools-instrumentation"
  - when: "Configure @tanstack/devtools-vite for source inspection (data-tsd-source, inspectHotkey, ignore patterns), console piping (client-to-server, server-to-client, levels), enhanced logging, server event bus (port, host, HTTPS), production stripping (removeDevtoolsOnBuild), editor integration (launch-editor, custom editor.open). Must be FIRST plugin in Vite config. Vite ^6 || ^7 only."
    use: "@tanstack/devtools-vite#devtools-vite-plugin"
  - when: "Step-by-step migration from Next.js App Router to TanStack Start: route definition conversion, API mapping, server function conversion from Server Actions, middleware conversion, data fetching pattern changes."
    use: "@tanstack/react-start#lifecycle/migrate-from-nextjs"
  - when: "React bindings for TanStack Start: createStart, StartClient, StartServer, React-specific imports, re-exports from @tanstack/react-router, full project setup with React, useServerFn hook."
    use: "@tanstack/react-start#react-start"
  - when: "Implement, review, debug, and refactor TanStack Start React Server Components in React 19 apps. Use when tasks mention @tanstack/react-start/rsc, renderServerComponent, createCompositeComponent, CompositeComponent, renderToReadableStream, createFromReadableStream, createFromFetch, Composite Components, React Flight streams, loader or query owned RSC caching, router.invalidate, structuralSharing: false, selective SSR, stale names like renderRsc or .validator, or migration from Next App Router RSC patterns. Do not use for generic SSR or non-TanStack RSC frameworks except brief comparison."
    use: "@tanstack/react-start#react-start/server-components"
  - when: "Framework-agnostic core concepts for TanStack Router: route trees, createRouter, createRoute, createRootRoute, createRootRouteWithContext, addChildren, Register type declaration, route matching, route sorting, file naming conventions. Entry point for all router skills."
    use: "@tanstack/router-core#router-core"
  - when: "Route protection with beforeLoad, redirect()/throw redirect(), isRedirect helper, authenticated layout routes (_authenticated), non-redirect auth (inline login), RBAC with roles and permissions, auth provider integration (Auth0, Clerk, Supabase), router context for auth state."
    use: "@tanstack/router-core#router-core/auth-and-guards"
  - when: "Automatic code splitting (autoCodeSplitting), .lazy.tsx convention, createLazyFileRoute, createLazyRoute, lazyRouteComponent, getRouteApi for typed hooks in split files, codeSplitGroupings per-route override, splitBehavior programmatic config, critical vs non-critical properties."
    use: "@tanstack/router-core#router-core/code-splitting"
  - when: "Route loader option, loaderDeps for cache keys, staleTime/gcTime/ defaultPreloadStaleTime SWR caching, pendingComponent/pendingMs/ pendingMinMs, errorComponent/onError/onCatch, beforeLoad, router context and createRootRouteWithContext DI pattern, router.invalidate, Await component, deferred data loading with unawaited promises."
    use: "@tanstack/router-core#router-core/data-loading"
  - when: "Link component, useNavigate, Navigate component, router.navigate, ToOptions/NavigateOptions/LinkOptions, from/to relative navigation, activeOptions/activeProps, preloading (intent/viewport/render), preloadDelay, navigation blocking (useBlocker, Block), createLink, linkOptions helper, scroll restoration, MatchRoute."
    use: "@tanstack/router-core#router-core/navigation"
  - when: "notFound() function, notFoundComponent, defaultNotFoundComponent, notFoundMode (fuzzy/root), errorComponent, CatchBoundary, CatchNotFound, isNotFound, NotFoundRoute (deprecated), route masking (mask option, createRouteMask, unmaskOnReload)."
    use: "@tanstack/router-core#router-core/not-found-and-errors"
  - when: "Dynamic path segments ($paramName), splat routes ($ / _splat), optional params ({-$paramName}), prefix/suffix patterns ({$param}.ext), useParams, params.parse/stringify, pathParamsAllowedCharacters, i18n locale patterns."
    use: "@tanstack/router-core#router-core/path-params"
  - when: "validateSearch, search param validation with Zod/Valibot/ArkType adapters, fallback(), search middlewares (retainSearchParams, stripSearchParams), custom serialization (parseSearch, stringifySearch), search param inheritance, loaderDeps for cache keys, reading and writing search params."
    use: "@tanstack/router-core#router-core/search-params"
  - when: "Non-streaming and streaming SSR, RouterClient/RouterServer, renderRouterToString/renderRouterToStream, createRequestHandler, defaultRenderHandler/defaultStreamHandler, HeadContent/Scripts components, head route option (meta/links/styles/scripts), ScriptOnce, automatic loader dehydration/hydration, memory history on server, data serialization, document head management."
    use: "@tanstack/router-core#router-core/ssr"
  - when: "Full type inference philosophy (never cast, never annotate inferred values), Register module declaration, from narrowing on hooks and Link, strict:false for shared components, getRouteApi for code-split typed access, addChildren with object syntax for TS perf, LinkProps and ValidateLinkOptions type utilities, as const satisfies pattern."
    use: "@tanstack/router-core#router-core/type-safety"
  - when: "TanStack Router bundler plugin for route generation and automatic code splitting. Supports Vite, Webpack, Rspack, and esbuild. Configures autoCodeSplitting, routesDirectory, target framework, and code split groupings."
    use: "@tanstack/router-plugin#router-plugin"
  - when: "Core overview for TanStack Start: tanstackStart() Vite plugin, getRouter() factory, root route document shell (HeadContent, Scripts, Outlet), client/server entry points, routeTree.gen.ts, tsconfig configuration. Entry point for all Start skills."
    use: "@tanstack/start-client-core#start-core"
  - when: "Server-side authentication primitives for TanStack Start: session cookies (HttpOnly, Secure, SameSite, __Host- prefix), session read/issue/destroy via createServerFn and middleware, OAuth authorization-code flow with state and PKCE, password-reset enumeration defense, CSRF for non-GET RPCs, rate limiting auth endpoints, session rotation on privilege change. Pairs with router-core/auth-and-guards for the routing side."
    use: "@tanstack/start-client-core#start-core/auth-server-primitives"
  - when: "Deploy to Cloudflare Workers, Netlify, Vercel, Node.js/Docker, Bun, Railway. Selective SSR (ssr option per route), SPA mode, static prerendering, ISR with Cache-Control headers, SEO and head management."
    use: "@tanstack/start-client-core#start-core/deployment"
  - when: "Isomorphic-by-default principle, environment boundary functions (createServerFn, createServerOnlyFn, createClientOnlyFn, createIsomorphicFn), ClientOnly component, useHydrated hook, import protection, dead code elimination, environment variable safety (VITE_ prefix, process.env)."
    use: "@tanstack/start-client-core#start-core/execution-model"
  - when: "createMiddleware, request middleware (.server only), server function middleware (.client + .server), context passing via next({ context }), sendContext for client-server transfer, global middleware via createStart in src/start.ts, middleware factories, method order enforcement, fetch override precedence."
    use: "@tanstack/start-client-core#start-core/middleware"
  - when: "createServerFn (GET/POST), validator (Zod or function), useServerFn hook, server context utilities (getRequest, getRequestHeader, setResponseHeader, setResponseStatus), error handling (throw errors, redirect, notFound), streaming, FormData handling, file organization (.functions.ts, .server.ts)."
    use: "@tanstack/start-client-core#start-core/server-functions"
  - when: "Server-side API endpoints using the server property on createFileRoute, HTTP method handlers (GET, POST, PUT, DELETE), createHandlers for per-handler middleware, handler context (request, params, context), request body parsing, response helpers, file naming for API routes."
    use: "@tanstack/start-client-core#start-core/server-routes"
  - when: "Server-side runtime for TanStack Start: createStartHandler, request/response utilities (getRequest, setResponseHeader, setCookie, getCookie, useSession), three-phase request handling, AsyncLocalStorage context."
    use: "@tanstack/start-server-core#start-server-core"
  - when: "Programmatic route tree building as an alternative to filesystem conventions: rootRoute, index, route, layout, physical, defineVirtualSubtreeConfig. Use with TanStack Router plugin's virtualRouteConfig option."
    use: "@tanstack/virtual-file-routes#virtual-file-routes"
<!-- intent-skills:end -->
