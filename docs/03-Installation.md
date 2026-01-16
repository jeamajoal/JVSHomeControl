# Installation

## Recommended: One-Command Install (Debian/Ubuntu)

```bash
curl -fsSL https://raw.githubusercontent.com/jeamajoal/JVSHomeControl/main/scripts/install-debian.sh | sudo bash
```

The script will:
- Install Node.js 22, git, and ffmpeg
- Clone the repo to `/opt/jvshomecontrol`
- Build the UI
- Create HTTPS certificates (prompts you)
- Set up a systemd service
- Preserve your config on future updates

---

## After Install

### 1. Configure Hubitat credentials

Edit the environment file:
```bash
sudo nano /etc/jvshomecontrol.env
```

Set these values (get them from Hubitat > Apps > Maker API):
```bash
# Recommended: Use HTTPS for Hubitat (even on local network)
HUBITAT_HOST=https://192.168.1.50
HUBITAT_APP_ID=30
HUBITAT_ACCESS_TOKEN=your-token-here

# Required if Hubitat uses a self-signed certificate
HUBITAT_TLS_INSECURE=1
```

> **Security Note:** I recommend using HTTPS for both the dashboard AND Hubitat, even on your local network. The Maker API access token should always be encrypted in transit.

### 2. Restart the service

```bash
sudo systemctl restart jvshomecontrol
```

### 3. Open the dashboard

Browse to `https://your-server-ip:3000`

---

## Updating

Run the same install command - it will update in place and preserve your config:

```bash
curl -fsSL https://raw.githubusercontent.com/jeamajoal/JVSHomeControl/main/scripts/install-debian.sh | sudo bash
```

---

## Check Status

```bash
# View logs
sudo journalctl -u jvshomecontrol -f

# Check health
curl -sk https://localhost:3000/api/hubitat/health
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HUBITAT_HOST` | Yes | Hubitat URL (e.g., `https://192.168.1.50`) |
| `HUBITAT_APP_ID` | Yes | Maker API app ID |
| `HUBITAT_ACCESS_TOKEN` | Yes | Maker API token |
| `HUBITAT_TLS_INSECURE` | Recommended | Set to `1` for self-signed Hubitat HTTPS |
| `HUBITAT_POLL_INTERVAL_MS` | No | Poll interval in ms (default: 2000) |
| `PORT` | No | Server port (default: 3000) |

---

## Changing the Server Port

To run on a different port:

```bash
# In /etc/jvshomecontrol.env:
PORT=8443
```

Then restart: `sudo systemctl restart jvshomecontrol`

---

## Weather Location

Weather uses [Open-Meteo](https://open-meteo.com/) (free, no API key needed). By default it auto-detects your location from IP. To set a specific location:

```bash
# In /etc/jvshomecontrol.env:
OPEN_METEO_LAT=35.2271
OPEN_METEO_LON=-80.8431
```

Then restart: `sudo systemctl restart jvshomecontrol`

---

## Installing a Different Branch

```bash
sudo REPO_BRANCH=develop bash scripts/install-debian.sh
```

---

## Manual Install (Advanced)

If you prefer not to use the script:

```bash
# Build the UI
cd client && npm install && npm run build

# Start the server
cd ../server && npm install && npm start
```

---

## File Locations

| File | Purpose |
|------|---------|
| `/opt/jvshomecontrol/` | Application files |
| `/etc/jvshomecontrol.env` | Environment variables |
| `/opt/jvshomecontrol/server/data/config.json` | UI settings |
| `/opt/jvshomecontrol/server/data/certs/` | HTTPS certificates |
