# Security

JVSHomeControl is designed for **trusted local networks**, but I still recommend encryption everywhere.

---

## Quick Checklist

- [x] Use HTTPS for the dashboard (created automatically during install)
- [x] Use HTTPS for Hubitat Maker API (set `HUBITAT_TLS_INSECURE=1` for self-signed)
- [ ] Don't expose port 3000 to the internet
- [ ] Store tokens in environment file, not config
- [ ] Use device allowlists to limit control access

---

## Why HTTPS Even Locally?

Your Maker API access token is sent with every request to Hubitat. Without encryption:
- Anyone on your network can capture the token
- That token grants full control of your devices

**Always use HTTPS**, even on your home network.

---

## Protect Your Secrets

| Secret | Where to Store |
|--------|----------------|
| `HUBITAT_ACCESS_TOKEN` | `/etc/jvshomecontrol.env` |
| Event ingest token | `/etc/jvshomecontrol.env` |

Never commit tokens to git. The `.env` file should be `chmod 600`.

---

## Network Exposure

**Recommended:** Only allow local network access.

```bash
# Example: Allow only LAN (using ufw)
sudo ufw allow from 192.168.1.0/24 to any port 3000
```

**For remote access:** Use a VPN (WireGuard or Tailscale) instead of port forwarding.

---

## HTTPS Certificates

The installer creates a self-signed certificate automatically.

To trust it on your tablet:
1. Open `https://your-server:3000` in the browser
2. Accept the security warning
3. On iOS/Android, you may need to install the certificate

See [08-HTTPS.md](08-HTTPS.md) for details.

---

## Changing the Server Port

```bash
# In /etc/jvshomecontrol.env:
PORT=8443
```

Then restart: `sudo systemctl restart jvshomecontrol`

---

## Device Allowlists

Limit which devices can be controlled from the dashboard:

```bash
# In /etc/jvshomecontrol.env:
UI_ALLOWED_CTRL_DEVICE_IDS=24,25,26
UI_ALLOWED_MAIN_DEVICE_IDS=24,25
```

---

## Event Ingest Protection

If using Maker API postURL, protect the endpoint:

```bash
# In /etc/jvshomecontrol.env:
EVENTS_INGEST_TOKEN=your-secret-token
```

Then configure Maker API postURL as:
```
https://server:3000/api/events?token=your-secret-token
```

---

## Systemd Hardening

The installer enables these by default:
- `NoNewPrivileges=true`
- `PrivateTmp=true`
- `ProtectSystem=strict`
- `ProtectHome=true`
