# Custom Hubitat Driver

A virtual switch that makes HTTP calls when toggled.

---

## What It Does

This driver creates a switch in Hubitat that:
- Calls a URL when turned **ON**
- Calls a different URL when turned **OFF**

Perfect for triggering Google Assistant Relay or any HTTP-based service.

---

## Installation

### Step 1: Add the driver code

1. In Hubitat, go to **Drivers Code**
2. Click **New Driver**
3. Paste the contents of:
   ```
   hubitat/driver/virtual-web-request-switch.groovy
   ```
4. Click **Save**

### Step 2: Create a device

1. Go to **Devices** > **Add Device** > **Virtual**
2. Set **Type** to **Virtual Web Request Switch**
3. Click **Save Device**

### Step 3: Configure the device

In the device preferences, set:
- **ON URL** - the endpoint to call when switched on
- **OFF URL** - the endpoint to call when switched off
- **Method** - GET or POST
- **Headers** (optional) - e.g., `Content-Type: application/json`
- **Body** (optional) - request payload

---

## Example: Google Assistant Relay

| Setting | Value |
|---------|-------|
| ON URL | `http://gar-server:3000/assistant` |
| Method | POST |
| Headers | `Content-Type: application/json` |
| Body | `{"command": "turn on living room lights"}` |

---

## Import URL

You can also import directly in Hubitat using:
```
https://raw.githubusercontent.com/jeamajoal/JVSHomeControl/main/hubitat/driver/virtual-web-request-switch.groovy
```

---

## Test It

1. Go to the device in Hubitat
2. Click **ON** or **OFF**
3. Check that your target endpoint receives the request
