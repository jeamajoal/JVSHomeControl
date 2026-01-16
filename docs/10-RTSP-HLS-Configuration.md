# Camera Setup (RTSP/HLS)

Stream RTSP cameras directly in the dashboard. The server converts RTSP to browser-friendly HLS.

---

## How It Works

```
Camera (RTSP) --> ffmpeg --> HLS segments --> Browser
```

The server runs ffmpeg to convert RTSP streams into HLS format that plays in any browser.

---

## Requirements

- **ffmpeg** installed on the server (the installer does this automatically)
- Camera with RTSP support
- Camera accessible from the server

---

## Adding a Camera

In the dashboard Settings > Cameras:

1. Click **Add Camera**
2. Enter the RTSP URL: `rtsp://user:pass@camera-ip:554/stream`
3. Save

The camera will appear on the Controls page.

---

## Common RTSP URL Formats

| Brand | URL Pattern |
|-------|-------------|
| Generic | `rtsp://user:pass@ip:554/stream1` |
| Hikvision | `rtsp://user:pass@ip:554/Streaming/Channels/101` |
| Dahua | `rtsp://user:pass@ip:554/cam/realmonitor?channel=1&subtype=0` |
| Amcrest | `rtsp://user:pass@ip:554/cam/realmonitor?channel=1&subtype=0` |
| Reolink | `rtsp://user:pass@ip:554/h264Preview_01_main` |

---

## Tuning (Optional)

Set in `/etc/jvshomecontrol.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `RTSP_HLS_SEGMENT_SECONDS` | 2 | Segment duration (1-6) |
| `RTSP_HLS_OUTPUT_FPS` | 15 | Output framerate (1-60) |
| `RTSP_HLS_RTSP_TRANSPORT` | tcp | Protocol: `tcp` or `udp` |

---

## Health Monitoring

The server automatically:
- Detects when streams stall
- Restarts failed streams
- Cleans up old segments

Check health:
```bash
curl -s http://localhost:3000/api/hls/health | jq
```

---

## Troubleshooting

**Camera not loading:**
```bash
# Test RTSP URL directly
ffmpeg -i "rtsp://user:pass@camera:554/stream" -t 5 -f null -
```

**Stream keeps restarting:**
- Try UDP instead of TCP: `RTSP_HLS_RTSP_TRANSPORT=udp`
- Increase stale threshold: `RTSP_HLS_STALE_THRESHOLD_SECONDS=30`

**High CPU usage:**
- Lower the framerate: `RTSP_HLS_OUTPUT_FPS=10`
- Use substream instead of main stream in RTSP URL

---

## Advanced Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `RTSP_HLS_HEALTH_CHECK_INTERVAL_MS` | 10000 | Health check interval |
| `RTSP_HLS_MAX_RESTART_ATTEMPTS` | 5 | Max auto-restarts |
| `RTSP_HLS_STALE_THRESHOLD_SECONDS` | 15 | When to consider stream dead |
| `RTSP_HLS_CLEANUP_ON_SHUTDOWN` | false | Delete HLS files on stop |
