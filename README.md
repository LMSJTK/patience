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
2. Run the app:
   `npm run dev`

Nothing else to configure. The one feature that calls the Gemini API — the AI
card back generator — asks for your own API key under Settings, and keeps it in
your browser's local storage.

## Development

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on http://localhost:3000 |
| `npm test` | Unit tests for the rules and store reducers |
| `npm run lint` | TypeScript, in strict mode |
| `npm run build` | Production bundle into `dist/` |

Three browser scripts check the things unit tests cannot. Each pins the deal so
two runs can be compared, and each needs `npm run dev` already running in
another terminal. They use Playwright: run `npx playwright install chromium`
once, or set `CHROMIUM_PATH` to a browser you already have.

| Command | What it does |
| --- | --- |
| `npm run smoke` | Plays every game and checks moves land and nothing throws |
| `npm run fingerprint` | Records where every card is; diff two runs to prove a change was invisible |
| `npm run trace` | Times a card to the foundation, and fails if it takes over 250ms |

### Deal numbers

Every deal is shuffled from a number shown in the game header. The same number
always deals the same cards, so `/play/klondike?deal=8675309` opens an
identical game for anyone who follows the link.

## Run with Docker

**Prerequisites:** Docker Desktop, or Docker Engine with the Compose v2 plugin.

1. Start the dev server:
   `docker compose up --build`
2. Open http://localhost:3000

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

- **No API keys are baked into the image.** The Gemini key is entered in the
  running app and stored per-browser, so the same image works for everyone and
  carries no secret of yours.
- **Changing dependencies** requires rebuilding the image and discarding the
  cached modules: `docker compose down -v && docker compose up --build`.
- **If edits do not trigger a reload** (usual on macOS and Windows, where the
  host's filesystem events do not reach the container), run with
  `CHOKIDAR_USEPOLLING=true docker compose up`.
- **To change ports**, set `DEV_PORT` or `PROD_PORT` in your shell or in a `.env`
  file — for example `DEV_PORT=4000` serves the dev container on
  http://localhost:4000.
- **Google sign-in** works because Firebase authorizes `localhost` by default and
  ignores the port. Reaching the app at any other hostname means adding that
  hostname under Authentication → Settings → Authorized domains in the Firebase
  console.
