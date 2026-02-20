/**
 * Server-side device type inference.
 *
 * Mirrors the client-side `inferInternalDeviceType()` logic from
 * client/src/deviceMapping.js so the server can classify devices
 * without client involvement (used for device type defaults).
 */

'use strict';

const INTERNAL_DEVICE_TYPES = Object.freeze({
    THERMOSTAT: 'thermostat',
    FAN_CONTROLLER: 'fan_controller',
    COLOR_LIGHT: 'color_light',
    CT_LIGHT: 'ct_light',
    SHADE: 'shade',
    LOCK: 'lock',
    GARAGE: 'garage',
    VALVE: 'valve',
    SIREN: 'siren',
    DIMMER: 'dimmer',
    SWITCH: 'switch',
    MEDIA_PLAYER: 'media_player',
    BUTTON: 'button',
    SENSOR: 'sensor',
    UNKNOWN: 'unknown',
});

const VALID_INTERNAL_TYPES = new Set(Object.values(INTERNAL_DEVICE_TYPES));

/** Lowercase-trim helper (returns '' for falsy). */
function toLowerText(v) {
    if (v == null) return '';
    return String(v).trim().toLowerCase();
}

/** Parse a number or return null. */
function asNumber(v) {
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

/**
 * Extract a Set of command-name strings from a commands array.
 *
 * Accepts:
 * - `['on','off']`
 * - `[{command:'on', parameters:[...]}]`
 */
function getCommandNameSet(commands) {
    if (!Array.isArray(commands)) return new Set();
    const names = commands.map((item) => {
        if (!item) return null;
        if (typeof item === 'string') return item.trim() || null;
        if (typeof item === 'object') {
            const name = String(item.command || item.name || '').trim();
            return name || null;
        }
        return null;
    }).filter(Boolean);
    return new Set(names);
}

/**
 * Infer the internal device type from capabilities/commands/attributes.
 *
 * Tries the most specific types first so that e.g. a thermostat with a
 * switch attribute isn't misclassified as a plain switch.
 *
 * @param {object} opts
 * @param {string} [opts.hubitatType]   - Hubitat driver type name
 * @param {string[]} [opts.capabilities] - Hubitat capability strings
 * @param {object} [opts.attributes]     - Device attribute key/value pairs
 * @param {string} [opts.state]          - Device state string
 * @param {string[]} [opts.commands]     - Flat command name strings (or schema objects)
 * @returns {string} One of INTERNAL_DEVICE_TYPES values
 */
function inferInternalDeviceType({ hubitatType, capabilities, attributes, state, commands } = {}) {
    const typeStr = toLowerText(hubitatType);
    const caps = Array.isArray(capabilities) ? capabilities.map((c) => String(c || '').trim()).filter(Boolean) : [];
    const capSet = new Set(caps);
    const attrs = (attributes && typeof attributes === 'object') ? attributes : {};
    const cmdSet = getCommandNameSet(commands);

    // ── Thermostat ──
    if (
        capSet.has('Thermostat') ||
        capSet.has('ThermostatHeatingSetpoint') ||
        capSet.has('ThermostatCoolingSetpoint') ||
        capSet.has('ThermostatSetpoint') ||
        cmdSet.has('setHeatingSetpoint') ||
        cmdSet.has('setCoolingSetpoint') ||
        cmdSet.has('setThermostatMode') ||
        typeStr.includes('thermostat')
    ) return INTERNAL_DEVICE_TYPES.THERMOSTAT;

    // ── Lock ──
    if (
        capSet.has('Lock') ||
        (cmdSet.has('lock') && cmdSet.has('unlock')) ||
        typeStr.includes('lock')
    ) return INTERNAL_DEVICE_TYPES.LOCK;

    // ── Garage door ──
    if (
        capSet.has('GarageDoorControl') ||
        attrs.door !== undefined ||
        typeStr.includes('garage')
    ) return INTERNAL_DEVICE_TYPES.GARAGE;

    // ── Window shade / blind ──
    if (
        capSet.has('WindowShade') ||
        capSet.has('WindowBlind') ||
        cmdSet.has('setPosition') ||
        attrs.windowShade !== undefined ||
        typeStr.includes('shade') ||
        typeStr.includes('blind')
    ) return INTERNAL_DEVICE_TYPES.SHADE;

    // ── Valve ──
    if (
        capSet.has('Valve') ||
        attrs.valve !== undefined ||
        typeStr.includes('valve')
    ) return INTERNAL_DEVICE_TYPES.VALVE;

    // ── Siren ──
    if (
        capSet.has('Alarm') ||
        cmdSet.has('siren') ||
        cmdSet.has('strobe') ||
        typeStr.includes('siren')
    ) return INTERNAL_DEVICE_TYPES.SIREN;

    // ── Color light (hue/saturation) ──
    if (
        capSet.has('ColorControl') ||
        cmdSet.has('setColor') ||
        cmdSet.has('setHue')
    ) return INTERNAL_DEVICE_TYPES.COLOR_LIGHT;

    // ── Color temperature light ──
    if (
        capSet.has('ColorTemperature') ||
        cmdSet.has('setColorTemperature')
    ) return INTERNAL_DEVICE_TYPES.CT_LIGHT;

    // ── Fan controller ──
    if (
        capSet.has('FanControl') ||
        cmdSet.has('setSpeed') ||
        cmdSet.has('cycleSpeed') ||
        typeStr.includes('fan')
    ) return INTERNAL_DEVICE_TYPES.FAN_CONTROLLER;

    // ── Sound sensor (virtual/physical) ──
    if (
        capSet.has('SoundSensor') ||
        attrs.sound !== undefined ||
        attrs.soundPressure !== undefined ||
        attrs.soundPressureLevel !== undefined ||
        typeStr.includes('sound sensor')
    ) return INTERNAL_DEVICE_TYPES.SENSOR;

    // ── Media player ──
    const hasStrongMediaCapability =
        capSet.has('MediaTransport') || capSet.has('AudioVolume') || capSet.has('MusicPlayer');
    const hasMediaCommands =
        cmdSet.has('play') || cmdSet.has('pause') || cmdSet.has('stop') ||
        cmdSet.has('setVolume') || cmdSet.has('mute') || cmdSet.has('unmute') ||
        cmdSet.has('nextTrack') || cmdSet.has('previousTrack');
    const looksLikeMediaType =
        typeStr.includes('chromecast') || typeStr.includes('media') || typeStr.includes('speaker') ||
        typeStr.includes('sonos') || typeStr.includes('roku') || typeStr.includes('tv') ||
        typeStr.includes('audio player');
    const hasOnlySpeechSynthesis = capSet.has('SpeechSynthesis') && !hasStrongMediaCapability && !hasMediaCommands;
    if (
        hasStrongMediaCapability ||
        hasMediaCommands ||
        (looksLikeMediaType && !hasOnlySpeechSynthesis)
    ) return INTERNAL_DEVICE_TYPES.MEDIA_PLAYER;

    // ── Generic switch / dimmer ──
    const sw = toLowerText(attrs.switch) || toLowerText(state);
    const hasSwitchAttr = sw === 'on' || sw === 'off';
    const looksLikeSwitch = hasSwitchAttr || cmdSet.has('on') || cmdSet.has('off') || cmdSet.has('toggle') || capSet.has('Switch');

    if (looksLikeSwitch) {
        const looksLikeDimmer = cmdSet.has('setLevel') || asNumber(attrs.level) !== null || capSet.has('SwitchLevel');
        if (looksLikeDimmer) return INTERNAL_DEVICE_TYPES.DIMMER;
        return INTERNAL_DEVICE_TYPES.SWITCH;
    }

    // ── Button ──
    if (capSet.has('PushableButton') || capSet.has('HoldableButton') || capSet.has('DoubleTapableButton')) {
        return INTERNAL_DEVICE_TYPES.BUTTON;
    }

    // Fallback: if it has no actuator-ish commands, treat as sensor.
    // Many Hubitat sensors do NOT include the generic `Sensor` capability.
    // Treat common sensor/measurement capabilities (and their attributes) as sensor.
    const isSensorish =
        capSet.has('Sensor') ||
        capSet.has('MotionSensor') ||
        capSet.has('ContactSensor') ||
        capSet.has('TemperatureMeasurement') ||
        capSet.has('RelativeHumidityMeasurement') ||
        capSet.has('IlluminanceMeasurement') ||
        capSet.has('PresenceSensor') ||
        capSet.has('WaterSensor') ||
        capSet.has('SmokeDetector') ||
        capSet.has('CarbonMonoxideDetector') ||
        attrs.temperature !== undefined ||
        attrs.humidity !== undefined ||
        attrs.illuminance !== undefined ||
        typeof attrs.motion === 'string' ||
        typeof attrs.contact === 'string' ||
        typeof attrs.door === 'string' ||
        typeof attrs.presence === 'string' ||
        typeof attrs.water === 'string' ||
        typeof attrs.smoke === 'string' ||
        typeof attrs.carbonMonoxide === 'string';
    if (isSensorish) return INTERNAL_DEVICE_TYPES.SENSOR;

    return INTERNAL_DEVICE_TYPES.UNKNOWN;
}

module.exports = {
    INTERNAL_DEVICE_TYPES,
    VALID_INTERNAL_TYPES,
    inferInternalDeviceType,
    getCommandNameSet,
};
