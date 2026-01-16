# Overview

JVSHomeControl is a local-first smart home dashboard that turns any tablet into a beautiful control panel.

---

## What It Does

| Component | Purpose |
|-----------|---------|
| **Server** | Polls Hubitat, caches device state, serves the UI |
| **UI** | React-based dashboard optimized for wall tablets |
| **Weather** | Built-in Open-Meteo integration (no API key needed) |

---

## Pages

| Page | What You See |
|------|--------------|
| **Home** | Room-by-room environment summary |
| **Climate** | Color-coded temperature/humidity heatmap |
| **Weather** | Local forecast |
| **Activity** | Motion and door events with optional sounds |
| **Controls** | Tap-to-control device buttons |

---

## Key Features

- **Real-time updates** via Socket.IO
- **Panel profiles** - different settings per tablet
- **Customizable themes** - colors, transparency, backgrounds
- **Camera support** - RTSP streams converted to browser-friendly HLS
- **Works offline** - no cloud dependency

---

## How Updates Work

1. Server polls Hubitat Maker API on startup and on interval
2. If Maker API `postURL` is configured, instant updates arrive via callbacks
3. UI receives updates in real-time via websocket

---

## Quick Links

| Topic | Link |
|-------|------|
| Installation | [03-Installation.md](03-Installation.md) |
| Hubitat Setup | [04-Hubitat.md](04-Hubitat.md) |
| Security | [07-Security.md](07-Security.md) |
| Troubleshooting | [09-Troubleshooting.md](09-Troubleshooting.md) |
