# HTTPS Setup

The installer creates HTTPS certificates automatically. This doc covers manual setup and troubleshooting.

---

## How It Works

- If certificates exist in `server/data/certs/`, the server uses HTTPS
- If no certificates exist, it falls back to HTTP

---

## Certificate Locations

| File | Path |
|------|------|
| Certificate | `/opt/jvshomecontrol/server/data/certs/localhost.crt` |
| Private Key | `/opt/jvshomecontrol/server/data/certs/localhost.key` |

---

## Create/Recreate Certificates

Run the installer again - it will prompt you:

```bash
curl -fsSL https://raw.githubusercontent.com/jeamajoal/JVSHomeControl/main/scripts/install-debian.sh | sudo bash
```

Or manually:

```bash
cd /opt/jvshomecontrol/server
sudo -u jvshome node scripts/https-setup.js
```

---

## Trust the Certificate

Self-signed certificates show browser warnings. To avoid them:

### Desktop Browsers
1. Open `https://your-server:3000`
2. Click "Advanced" > "Proceed anyway"
3. Some browsers let you install the cert permanently

### iOS
1. Open the URL in Safari
2. Accept the warning
3. Go to Settings > General > About > Certificate Trust Settings
4. Enable the certificate

### Android
1. Download the `.crt` file
2. Go to Settings > Security > Install certificates

---

## Maker API postURL with HTTPS

If your dashboard uses HTTPS, configure Maker API to post to:
```
https://your-server:3000/api/events
```

**Note:** Hubitat may not trust self-signed certs. You may need to fall back to HTTP for the postURL.

---

## Hubitat HTTPS

If your Hubitat uses HTTPS with a self-signed cert:

```bash
# In /etc/jvshomecontrol.env:
HUBITAT_TLS_INSECURE=1
```

Then restart: `sudo systemctl restart jvshomecontrol`

---

## Custom Certificate Paths

```bash
# In /etc/jvshomecontrol.env:
HTTPS_CERT_PATH=/path/to/cert.crt
HTTPS_KEY_PATH=/path/to/cert.key
```

---

## Force HTTP Only

```bash
# In /etc/jvshomecontrol.env:
HTTP_ONLY=1
```
