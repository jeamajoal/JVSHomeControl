import { API_HOST } from './apiHost';

export function normalizeDeviceIconTypeToken(value) {
  const s = String(value || '').trim().toLowerCase();
  if (!s) return null;
  if (s.length > 64) return null;
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(s)) return null;
  return s;
}

export function getDeviceTypeIconSrc(config, deviceType) {
  const t = normalizeDeviceIconTypeToken(deviceType);
  if (!t) return null;

  const rawMap = (config?.ui?.deviceTypeIcons && typeof config.ui.deviceTypeIcons === 'object')
    ? config.ui.deviceTypeIcons
    : {};

  const file = rawMap[t];
  const f = (typeof file === 'string') ? file.trim() : '';
  if (!f) return null;

  return `${API_HOST}/device-icons/${encodeURIComponent(t)}/${encodeURIComponent(f)}`;
}
