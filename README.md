# JellyCat SPA

JellyCat SPA is a static browser client for Jellyfin music libraries. The app has no backend: your browser connects directly to your Jellyfin server.

## Run From Docker Hub

```bash
docker pull maralreadytaken/jellycat:latest
docker run -d -p 3003:80 maralreadytaken/jellycat:latest
```

Then open `http://localhost:3003`.

You can also use Docker Compose:

```bash
docker compose up -d
```

`docker-compose.yml` uses the published `maralreadytaken/jellycat:latest` image and maps host port `3003` to container port `80`.

## Docker Tags

Docker image tags correspond to `package.json` versions.

- `maralreadytaken/jellycat:latest` tracks the latest published `main` build.
- `maralreadytaken/jellycat:1.0.1` corresponds to `package.json` version `1.0.1`.
- Git tags like `v1.0.1` publish the Docker tag `1.0.1`.

## Local Development

```bash
npm install
npm run dev
```

The development server defaults to `http://127.0.0.1:5173`.

To build the hosted/default app:

```bash
npm run build
```

To run the verification suite:

```bash
npm run lint
npm test
npm run e2e
```

To build the self-hosted Docker image locally:

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t maralreadytaken/jellycat:local .
```

The Docker build disables Vercel Analytics with `VITE_ENABLE_ANALYTICS=false`. The hosted/default build keeps analytics enabled.

## Source Structure

The SPA uses a feature-first React/Vite layout with shared core modules:

```text
src/
  app/              App shell, routes, providers, global app store
  core/
    jellyfin/       Jellyfin API client, mappers, request helpers, tests
    player/         Browser audio service, lyrics, recent activity
    storage/        Browser storage helpers and tests
  domain/           Shared domain types and formatting helpers
  features/         Home, search, library, player, settings, trust pages
  shared/ui/        Reusable terminal UI primitives, cards, rows, player UI
  styles/           Global CSS and design tokens
  test/             Unit test setup
```

Cross-area imports use path aliases:

- `@app/*`
- `@core/*`
- `@domain/*`
- `@features/*`
- `@shared/*`
- `@styles/*`

Keep relative imports for nearby files inside the same feature/module folder.

## Git Hygiene

Generated and local-only files are ignored, including `node_modules/`, `dist/`, `.vite/`, `.vercel/`, `test-results/`, `playwright-report/`, `*.tsbuildinfo`, `.DS_Store`, and `artifacts/`.

You do not need to delete `node_modules/` before committing or pushing; Git will ignore it. Screenshots generated for local review live under `artifacts/screenshots/` and are also ignored.

## Jellyfin Browser Requirements

Because JellyCat is a static web client, the browser talks directly to your Jellyfin server.

- Your Jellyfin server must allow CORS requests from the JellyCat origin.
- HTTPS-hosted JellyCat pages can be blocked from connecting to HTTP Jellyfin servers by browser mixed-content rules.
- Self-hosting gives you control over the served JellyCat client, but it does not add a proxy or store Jellyfin credentials server-side.

Login is session-only by default. If you choose "Remember this browser," the Jellyfin access token is stored in browser `localStorage` on that device.
