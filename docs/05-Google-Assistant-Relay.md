# Google Assistant Relay (Optional)

Control Google-only devices through your Hubitat and this dashboard.

---

## What Is This For?

Some cheap smart devices only work with Google Home and don't integrate with Hubitat directly. Google Assistant Relay (GAR) lets you trigger Google Assistant commands via HTTP.

**Example flow:**
```
Dashboard -> Hubitat Switch -> GAR Server -> Google Assistant -> Smart Device
```

---

## Stability Warning

GAR relies on unofficial Google APIs. As Google rolls out Gemini and changes their ecosystem, GAR may stop working without notice. Keep your critical automations in Hubitat whenever possible.

---

## Setup Overview

1. **Install GAR** on a machine on your network
   - [GAR Installation Guide](https://greghesp.github.io/assistant-relay/docs/getting-started/installation/)

2. **Create a virtual switch in Hubitat** that calls GAR
   - See [06-Custom-Driver.md](06-Custom-Driver.md)

3. **Add the device to Maker API**

4. **Control it from this dashboard**

---

## How It Works

| Step | What Happens |
|------|--------------|
| 1 | You tap a button on the dashboard |
| 2 | Dashboard sends command to Hubitat |
| 3 | Hubitat virtual switch calls GAR endpoint |
| 4 | GAR triggers Google Assistant |
| 5 | Google controls the device |

---

## Example GAR Endpoint

```bash
curl -X POST http://gar-server:3000/assistant \
  -H "Content-Type: application/json" \
  -d '{"command": "turn on living room lights"}'
```

---

## Next Step

Set up the Hubitat driver: [06-Custom-Driver.md](06-Custom-Driver.md)
