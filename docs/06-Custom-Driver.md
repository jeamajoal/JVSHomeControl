# Custom Switch Driver (Hubitat)

This repo includes a Hubitat driver that supports the “virtual switch → HTTP call” approach.

- Driver source: [hubitat/driver/virtual-web-request-switch.groovy](../hubitat/driver/virtual-web-request-switch.groovy)

## What the driver typically does

- Defines a virtual switch (or dimmer) in Hubitat
- On `on()` / `off()`, calls your GAR endpoint (or another local bridge)
- Optionally syncs state back into Hubitat

## Why this is useful

Once the Google-linked device is represented as a Hubitat device, it becomes controllable via:

- Hubitat automations
- Hubitat dashboards
- Maker API
- This panel

## Recommended documentation

## Install in Hubitat

1. In Hubitat, go to **Drivers Code** → **New Driver**.
2. Copy/paste the contents of the driver file into the editor.
3. Click **Save**.
4. Create a device: **Devices** → **Add Device** → **Virtual**.
5. Set the device **Type** to **Virtual Web Request Switch**.
6. Configure the device preferences (URLs/methods/headers/body) for your ON/OFF actions.
