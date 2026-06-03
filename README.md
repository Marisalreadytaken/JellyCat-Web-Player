# JellyCat Web Music Player

JellyCat is a static browser client for Jellyfin music libraries. The app has no backend: your browser connects directly to your Jellyfin server.

## Run From Docker Hub

```bash
docker pull maralreadytaken/jellycat:latest
docker run -d -p 3003:80 maralreadytaken/jellycat:latest
```

Then open `http://yourip:3003`.

You can also use Docker Compose:

```
services:
  jellycat:
    image: maralreadytaken/jellycat:latest
    ports:
      - "3003:80"
    restart: unless-stopped
```
```
docker compose up -d
```

`docker-compose.yml` uses the published `maralreadytaken/jellycat:latest` image.


To build the self-hosted Docker image locally:

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t maralreadytaken/jellycat:local .
```

The Docker build disables Vercel Analytics with `VITE_ENABLE_ANALYTICS=false`. The hosted/default build keeps analytics enabled, this analytics are only to know the people interested in the web player.

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



## Jellyfin Browser Requirements

Because JellyCat is a static web client, the browser talks directly to your Jellyfin server.

- Your Jellyfin server must allow CORS requests from the JellyCat origin.
- HTTPS-hosted JellyCat pages can be blocked from connecting to HTTP Jellyfin servers by browser mixed-content rules.
- Self-hosting gives you control over the served JellyCat client, but it does not add a proxy or store Jellyfin credentials server-side.

Login is session-only by default. If you choose "Remember this browser," the Jellyfin access token is stored in browser `localStorage` on that device.
