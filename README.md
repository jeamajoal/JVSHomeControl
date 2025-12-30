# JVSHomeControl

Home automation dashboard (client) + Node/Express backend (server) with realtime updates via Socket.IO.

- **Server** polls Hubitat Maker API, normalizes device data into `rooms` + `sensors`, persists layout/mapping in `server/data/config.json`, and broadcasts updates.
- **Client** renders an environment dashboard, heatmap, and basic interactions UI.

## Repo layout

- `client/` — React + Vite UI
- `server/` — Express + Socket.IO backend
- `server/data/config.json` — persisted, installation-specific configuration (rooms/sensors mapping + layout + weather settings)

## Quick start (local dev)

Prereqs:
- Node.js 18+ (server uses built-in `fetch`)

Terminal 1 (server):

```bash
cd server
npm install
npm run dev
```

Terminal 2 (client):

```bash
cd client
npm install
npm run dev
```

Then open the Vite URL (usually `http://localhost:5173`). The client expects the server at port **3000** by default.

## Configuration

### Hubitat Maker API

Set these environment variables before starting the server:

- `HABITAT_HOST` (example: `http://192.168.1.50`)
- `HABITAT_APP_ID`
- `HABITAT_ACCESS_TOKEN` (secret)

Security note: the current code contains a fallback/default token value in `server/server.js`. Treat it as compromised and rotate your Maker API token if it’s real.

### Weather (Open‑Meteo)

Config priority is:

1. Environment variables
2. `server/data/config.json`
3. Server defaults

Env vars:

- `OPEN_METEO_LAT`
- `OPEN_METEO_LON`
- `OPEN_METEO_TZ`
- `OPEN_METEO_TEMPERATURE_UNIT`
- `OPEN_METEO_WIND_SPEED_UNIT`
- `OPEN_METEO_PRECIPITATION_UNIT`

## Server endpoints (high level)

- `GET /api/config` — merged rooms/sensors config
- `GET /api/status` — latest device statuses
- `GET /api/weather` — cached Open‑Meteo response
- `POST /api/devices/:id/command` — Maker API command passthrough
- `POST /api/layout` — persist room layout + sensor positions

## Static values to make configurable (for new implementations)

This repo is currently tuned for a specific home/network. For any new installation, these should be parameters (env vars, config file entries, or UI settings), not hard-coded:

### Backend (`server/`)

- **HTTP port**: `PORT = 3000` in `server/server.js`.
- **CORS policy**: Socket.IO and Express currently allow `origin: "*"`.
- **Hubitat connection defaults**: `HABITAT_HOST`, `HABITAT_APP_ID`, `HABITAT_ACCESS_TOKEN` should not have hard-coded fallback values.
- **Hubitat polling interval**: `setInterval(syncHabitatData, 2000)` (2s refresh).
- **Weather defaults**: default lat/lon + units + timezone.
- **Weather cache TTL**: `/api/weather` caches for 5 minutes.
- **Filesystem locations**:
  - `server/data/config.json` (persisted config)
  - `server/data/backups/` (auto-created backups; will grow over time)
  - floorplan SVG search path candidates

### Frontend (`client/`)

- **API base URL**: multiple components build `http://${window.location.hostname}:3000`.
  - In a production deployment you’ll likely want this to be a single configurable value (or use relative `/api/...` with a proxy).
- **Branding text**: the app title/header strings are currently static.

### Data (`server/data/config.json`)

- **Rooms**: names, IDs, floors, and grid/layout positions are specific to one floorplan.
- **Sensors**: Hubitat device IDs and the room mapping are installation-specific.

## Notes

- The server auto-backs up `server/data/config.json` into `server/data/backups/` on writes. Consider excluding backups from source control for long-term use.
- See `server/MAKER_API.md` for Maker API endpoint patterns.
