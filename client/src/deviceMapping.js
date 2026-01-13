const asNumber = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(num) ? num : null;
};

const asText = (value) => {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
};

const toLowerText = (value) => {
  const s = asText(value);
  return s ? s.toLowerCase() : null;
};

export const INTERNAL_DEVICE_TYPES = Object.freeze({
  SWITCH: 'switch',
  DIMMER: 'dimmer',
  MEDIA_PLAYER: 'media_player',
  BUTTON: 'button',
  SENSOR: 'sensor',
  UNKNOWN: 'unknown',
});

export function normalizeCommandSchemas(raw) {
  if (!Array.isArray(raw)) return [];

  // Accept:
  // - ['on','off']
  // - [{command:'on', parameters:[...]}]
  // - Maker API odd shapes (best-effort)
  return raw
    .map((item) => {
      if (!item) return null;

      if (typeof item === 'string') {
        const command = item.trim();
        if (!command) return null;
        return { command, parameters: [] };
      }

      if (typeof item === 'object') {
        const command = asText(item.command) || asText(item.name);
        if (!command) return null;
        const paramsRaw = Array.isArray(item.parameters) ? item.parameters : [];
        const parameters = paramsRaw
          .map((p) => {
            if (!p || typeof p !== 'object') return null;
            const name = asText(p.name);
            const type = asText(p.type);
            if (!name && !type) return null;
            return { ...(name ? { name } : {}), ...(type ? { type } : {}) };
          })
          .filter(Boolean);

        return { command, parameters };
      }

      return null;
    })
    .filter(Boolean);
}

export function getCommandNameSet(commandSchemas) {
  const schemas = normalizeCommandSchemas(commandSchemas);
  return new Set(schemas.map((s) => s.command));
}

export function filterCommandSchemasByAllowlist(commandSchemas, allowlist) {
  const schemas = normalizeCommandSchemas(commandSchemas);
  if (allowlist === null) return schemas;
  const allowSet = new Set((Array.isArray(allowlist) ? allowlist : []).map(String));
  return schemas.filter((s) => allowSet.has(String(s.command)));
}

export function inferInternalDeviceType({ hubitatType, capabilities, attributes, state, commandSchemas }) {
  const typeStr = toLowerText(hubitatType) || '';
  const caps = Array.isArray(capabilities) ? capabilities.map((c) => String(c || '').trim()).filter(Boolean) : [];
  const capSet = new Set(caps);
  const attrs = (attributes && typeof attributes === 'object') ? attributes : {};

  const cmdSet = getCommandNameSet(commandSchemas);

  const sw = toLowerText(attrs.switch) || toLowerText(state);
  const hasSwitchAttr = sw === 'on' || sw === 'off';
  const looksLikeSwitch = hasSwitchAttr || cmdSet.has('on') || cmdSet.has('off') || cmdSet.has('toggle') || capSet.has('Switch');

  if (looksLikeSwitch) {
    const looksLikeDimmer = cmdSet.has('setLevel') || asNumber(attrs.level) !== null || capSet.has('SwitchLevel');
    if (looksLikeDimmer) return INTERNAL_DEVICE_TYPES.DIMMER;
    return INTERNAL_DEVICE_TYPES.SWITCH;
  }

  if (typeStr.includes('chromecast') || capSet.has('MediaTransport') || capSet.has('AudioVolume')) {
    return INTERNAL_DEVICE_TYPES.MEDIA_PLAYER;
  }

  if (capSet.has('PushableButton') || capSet.has('HoldableButton') || capSet.has('DoubleTapableButton')) {
    return INTERNAL_DEVICE_TYPES.BUTTON;
  }

  // Fallback: if it has no actuator-ish commands, treat as sensor.
  if (capSet.has('Sensor')) return INTERNAL_DEVICE_TYPES.SENSOR;

  return INTERNAL_DEVICE_TYPES.UNKNOWN;
}

export function mapDeviceToControls({ deviceId, label, hubitatType, capabilities, attributes, state, commandSchemas }) {
  const id = asText(deviceId);
  if (!id) return [];

  const safeLabel = asText(label) || id;
  const attrs = (attributes && typeof attributes === 'object') ? attributes : {};
  const cmdSet = getCommandNameSet(commandSchemas);

  const internalType = inferInternalDeviceType({ hubitatType, capabilities, attributes: attrs, state, commandSchemas });

  if (internalType === INTERNAL_DEVICE_TYPES.SWITCH || internalType === INTERNAL_DEVICE_TYPES.DIMMER) {
    const sw = toLowerText(attrs.switch) || toLowerText(state);
    const isOn = sw === 'on';
    return [
      {
        kind: 'switch',
        deviceId: id,
        label: safeLabel,
        isOn,
        canOn: cmdSet.has('on'),
        canOff: cmdSet.has('off'),
        canToggle: cmdSet.has('toggle'),
        internalType,
      },
    ];
  }

  return [];
}
