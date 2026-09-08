<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/e0ccefc9-eeb0-40ac-ab32-22ddda70ffe1

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Run with Docker

**Prerequisites:** Docker Desktop, or Docker Engine with the Compose v2 plugin.

1. Create your env file and set your Gemini API key in it:
   `cp .env.example .env`
2. Start the dev server:
   `docker compose up --build`
3. Open http://localhost:3000

The source directory is mounted into the container, so edits on your machine
reload in the browser. `Ctrl-C` stops it; `docker compose down` removes the
container.

### Production build

To build the app and serve the static output with nginx:

```
docker compose --profile prod up --build prod
```

Open http://localhost:8080.

### Notes

- **The Gemini API key is compiled into the JavaScript bundle.** `vite.config.ts`
  substitutes `process.env.GEMINI_API_KEY` at build time, so anyone who loads the
  page can read it. Keep the `prod` image local, and do not push it to a registry
  or deploy it anywhere public with a key you care about.
- **Changing dependencies** requires rebuilding the image and discarding the
  cached modules: `docker compose down -v && docker compose up --build`.
- **If edits do not trigger a reload** (usual on macOS and Windows, where the
  host's filesystem events do not reach the container), run with
  `CHOKIDAR_USEPOLLING=true docker compose up`.
- **To change ports**, set `DEV_PORT` or `PROD_PORT` in `.env` — for example
  `DEV_PORT=4000` serves the dev container on http://localhost:4000.
- **Google sign-in** works because Firebase authorizes `localhost` by default and
  ignores the port. Reaching the app at any other hostname means adding that
  hostname under Authentication → Settings → Authorized domains in the Firebase
  console.
