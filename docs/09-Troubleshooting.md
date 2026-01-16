# Troubleshooting

Quick fixes for common issues.

---

## Dashboard Loads But No Data

**Check 1: Hubitat connection**
```bash
curl -s http://localhost:3000/api/hubitat/health
```

**Check 2: Environment variables**
```bash
cat /etc/jvshomecontrol.env | grep HUBITAT
```

Make sure `HUBITAT_HOST`, `HUBITAT_APP_ID`, and `HUBITAT_ACCESS_TOKEN` are set.

**Check 3: Service status**
```bash
sudo systemctl status jvshomecontrol
```

---

## Service Won't Start

**View logs:**
```bash
sudo journalctl -u jvshomecontrol -n 50
```

**Common causes:**
- Missing environment variables
- Port 3000 already in use
- Permission issues on data directory

---

## HTTPS Not Working

**Check if certs exist:**
```bash
ls -la /opt/jvshomecontrol/server/data/certs/
```

**Regenerate certs:**
```bash
cd /opt/jvshomecontrol/server
sudo -u jvshome node scripts/https-setup.js
sudo systemctl restart jvshomecontrol
```

---

## Cameras Not Loading

**Check if ffmpeg is installed:**
```bash
which ffmpeg
```

**Check HLS health:**
```bash
curl -s http://localhost:3000/api/hls/health
```

**Common issues:**
- Camera RTSP URL is wrong
- Camera requires authentication (add to URL)
- Network firewall blocking RTSP port

---

## Mixed Content Errors

If you see "blocked loading mixed active content":
- Make sure you're accessing via HTTPS (not HTTP)
- Or force HTTP only: `HTTP_ONLY=1`

---

## Config File Location

```bash
# Main config (UI settings, rooms, devices)
/opt/jvshomecontrol/server/data/config.json

# Backups
/opt/jvshomecontrol/server/data/backups/
```

---

## Reset to Defaults

**Warning: This erases your configuration!**

```bash
sudo systemctl stop jvshomecontrol
sudo rm /opt/jvshomecontrol/server/data/config.json
sudo systemctl start jvshomecontrol
```

---

## Still Stuck?

Check the logs:
```bash
sudo journalctl -u jvshomecontrol -f
```

Or open an issue on GitHub.
