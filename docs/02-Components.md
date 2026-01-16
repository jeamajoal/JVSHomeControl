# Components

What you need to run JVSHomeControl.

---

## Required

| Component | Purpose |
|-----------|---------|
| **Hubitat Hub** | Your smart home brain (tested on C-8) |
| **Maker API** | Hubitat app that exposes devices via HTTP |
| **Server** | Raspberry Pi, mini PC, or any Debian/Ubuntu machine |
| **Display** | Wall tablet, phone, or any browser on your network |

---

## Optional

| Component | Purpose |
|-----------|---------|
| **Google Assistant Relay** | Control Google-only devices through Hubitat |
| **Custom Hubitat Driver** | Makes Google devices appear as Hubitat switches |
| **RTSP Cameras** | Server converts to browser-friendly HLS |

---

## How They Connect

```
[Hubitat] <--Maker API--> [JVSHomeControl Server] <--WebSocket--> [Tablet/Browser]
                                    |
                          [Optional: Google Assistant Relay]
```

---

## Built-in Weather

The server fetches weather from **Open-Meteo** (free, no API key needed) and caches it for the UI.

---

## Next Steps

| Task | Doc |
|------|-----|
| Install the server | [03-Installation.md](03-Installation.md) |
| Configure Hubitat | [04-Hubitat.md](04-Hubitat.md) |
| Add Google devices | [05-Google-Assistant-Relay.md](05-Google-Assistant-Relay.md) |
