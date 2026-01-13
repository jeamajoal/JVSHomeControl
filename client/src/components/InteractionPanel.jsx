import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Power, SlidersHorizontal } from 'lucide-react';

import { getUiScheme } from '../uiScheme';
import { API_HOST } from '../apiHost';
import { useAppState } from '../appState';
import { buildRoomsWithStatuses, getCtrlVisibleDeviceIdSet, getDeviceCommandAllowlist } from '../deviceSelectors';
import { filterCommandSchemasByAllowlist, mapDeviceToControls, normalizeCommandSchemas } from '../deviceMapping';
import HlsPlayer from './HlsPlayer';

const asNumber = (value) => {
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isFinite(num) ? num : null;
};

const asText = (value) => {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
};

const useFitScale = () => {
  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const viewportEl = viewportRef.current;
    const contentEl = contentRef.current;
    if (!viewportEl || !contentEl) return;

    const compute = () => {
      const isMdUp = typeof window !== 'undefined'
        ? window.matchMedia('(min-width: 768px)').matches
        : true;

      if (!isMdUp) {
        setScale(1);
        return;
      }

      const SAFE_GUTTER_PX = 16;
      const vw = Math.max((viewportEl.clientWidth || 1) - SAFE_GUTTER_PX, 1);
      const vh = Math.max((viewportEl.clientHeight || 1) - SAFE_GUTTER_PX, 1);
      const cw = Math.max(contentEl.scrollWidth, contentEl.clientWidth, 1);
      const ch = Math.max(contentEl.scrollHeight, contentEl.clientHeight, 1);

      const raw = Math.min(vw / cw, vh / ch) * 0.99;
      const next = Math.min(raw, 1.15);
      setScale((prev) => (Math.abs(prev - next) < 0.01 ? prev : next));
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(viewportEl);
    ro.observe(contentEl);
    window.addEventListener('resize', compute);

    return () => {
      window.removeEventListener('resize', compute);
      ro.disconnect();
    };
  }, []);

  return { viewportRef, contentRef, scale };
};

async function sendDeviceCommand(deviceId, command, args = []) {
  const cleanedArgs = Array.isArray(args)
    ? args
      .filter((a) => a !== null && a !== undefined)
      .filter((a) => (typeof a === 'string') || (typeof a === 'number' && Number.isFinite(a)))
    : [];

  const res = await fetch(`${API_HOST}/api/devices/${encodeURIComponent(deviceId)}/command`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command, args: cleanedArgs }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Command failed (${res.status})`);
  }
}

const SwitchTile = ({
  label,
  isOn,
  disabled,
  busyOn,
  busyOff,
  busyToggle,
  canOn,
  canOff,
  canToggle,
  onOn,
  onOff,
  onToggle,
  controlStyle,
  animationStyle,
  uiScheme,
}) => {
  const anyBusy = Boolean(busyOn || busyOff || busyToggle);
  const mode = (controlStyle === 'buttons' || controlStyle === 'switch' || controlStyle === 'auto') ? controlStyle : 'auto';
  const pulseOn = animationStyle === 'pulse' && isOn === true && !anyBusy;

  const handleToggle = () => {
    if (isOn === true && canOff) return onOff();
    if (isOn === false && canOn) return onOn();
    if (canToggle) return onToggle();
    if (isOn === true) return onOff();
    return onOn();
  };

  const subtitle = (typeof isOn === 'boolean') ? (isOn ? 'On' : 'Off') : 'Command only';

  return (
    <div className={`w-full rounded-2xl border p-4 md:p-5 bg-white/5 border-white/10 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 text-left">
          <div className="text-[11px] md:text-xs uppercase tracking-[0.2em] text-white/55 font-semibold truncate">{label}</div>
          <div className="mt-1 text-xs text-white/45">{subtitle}</div>
        </div>
        <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl border border-white/10 bg-black/30 flex items-center justify-center">
          {anyBusy ? (
            <Loader2 className={`w-6 h-6 md:w-7 md:h-7 animate-spin jvs-icon ${uiScheme?.metricIcon || 'text-neon-blue'}`} />
          ) : (
            <Power className={`w-6 h-6 md:w-7 md:h-7 text-white/60 ${pulseOn ? 'animate-pulse' : ''}`} />
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {mode === 'switch' ? (
          <button
            type="button"
            disabled={disabled || anyBusy}
            onClick={handleToggle}
            className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-3 transition-colors active:scale-[0.99] ${(disabled || anyBusy) ? 'opacity-50' : 'hover:bg-white/5'} ${
              isOn === true
                ? (uiScheme?.actionButton || 'text-neon-blue border-neon-blue/30 bg-neon-blue/10')
                : 'text-white/70 border-white/10 bg-black/20'
            }`}
            aria-pressed={isOn === true ? 'true' : 'false'}
          >
            <div className="text-xs font-bold uppercase tracking-[0.18em]">
              {anyBusy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : (isOn === true ? 'On' : 'Off')}
            </div>

            <div
              className={`relative w-14 h-8 rounded-full border transition-colors ${
                isOn === true
                  ? (uiScheme?.actionButton || 'text-neon-blue border-neon-blue/30 bg-neon-blue/10')
                  : 'border-white/10 bg-black/30'
              } ${pulseOn ? 'animate-pulse' : ''}`}
            >
              <div
                className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white/70 transition-transform ${
                  isOn === true ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </div>
          </button>
        ) : null}

        {mode !== 'switch' && canOn ? (
          <button
            type="button"
            disabled={disabled || busyOn}
            onClick={onOn}
            className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] transition-colors active:scale-[0.99] ${uiScheme?.actionButton || 'text-neon-blue border-neon-blue/30 bg-neon-blue/10'} ${(disabled || busyOn) ? 'opacity-50' : 'hover:bg-white/5'}`}
          >
            {busyOn ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'On'}
          </button>
        ) : null}

        {mode !== 'switch' && canOff ? (
          <button
            type="button"
            disabled={disabled || busyOff}
            onClick={onOff}
            className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] transition-colors active:scale-[0.99] ${uiScheme?.actionButton || 'text-neon-blue border-neon-blue/30 bg-neon-blue/10'} ${(disabled || busyOff) ? 'opacity-50' : 'hover:bg-white/5'}`}
          >
            {busyOff ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Off'}
          </button>
        ) : null}

        {mode !== 'switch' && !canOn && !canOff && canToggle ? (
          <button
            type="button"
            disabled={disabled || busyToggle}
            onClick={onToggle}
            className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] transition-colors active:scale-[0.99] ${uiScheme?.actionButton || 'text-neon-blue border-neon-blue/30 bg-neon-blue/10'} ${(disabled || busyToggle) ? 'opacity-50' : 'hover:bg-white/5'}`}
          >
            {busyToggle ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Toggle'}
          </button>
        ) : null}
      </div>
    </div>
  );
};

const LevelTile = ({ label, isOn, level, disabled, busy, onToggle, onSetLevel, uiScheme }) => {
  const levelNum = asNumber(level);
  const displayLevel = levelNum === null ? 0 : Math.max(0, Math.min(100, Math.round(levelNum)));
  const [draft, setDraft] = useState(displayLevel);

  useEffect(() => {
    setDraft(displayLevel);
  }, [displayLevel]);

  return (
    <div className={`w-full rounded-2xl border p-4 md:p-5 bg-white/5 border-white/10 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="text-[11px] md:text-xs uppercase tracking-[0.2em] text-white/55 font-semibold truncate">
            {label}
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <div className={`text-2xl md:text-3xl font-extrabold tracking-tight ${isOn ? (uiScheme?.selectedText || 'text-neon-blue') : 'text-white/70'}`}>
              {isOn ? 'ON' : 'OFF'}
            </div>
            <div className="text-sm text-white/55 font-bold">{displayLevel}%</div>
          </div>
        </div>

        <button
          type="button"
          disabled={disabled || busy}
          onClick={onToggle}
          className={`shrink-0 rounded-xl border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors active:scale-[0.99] ${
            isOn ? (uiScheme?.actionButton || 'text-neon-blue border-neon-blue/30 bg-neon-blue/10') : 'text-white/60 border-white/10 bg-white/5'
          } ${(disabled || busy) ? 'opacity-50' : 'hover:bg-white/10'}`}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : 'Toggle'}
        </button>
      </div>

      <div className="mt-4">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={draft}
          disabled={disabled || busy}
          onChange={(e) => setDraft(Number(e.target.value))}
          onMouseUp={() => onSetLevel(draft)}
          onTouchEnd={() => onSetLevel(draft)}
          className="w-full"
        />
        <div className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/40">Slide and release to set level</div>
      </div>
    </div>
  );
};

const InteractionPanel = ({ config: configProp, statuses: statusesProp, connected: connectedProp, uiScheme: uiSchemeProp }) => {
  const { viewportRef, contentRef, scale } = useFitScale();

  const ctx = useAppState();
  const config = configProp ?? ctx?.config;
  const statuses = statusesProp ?? ctx?.statuses;
  const connected = connectedProp ?? ctx?.connected;
  const uiScheme = uiSchemeProp ?? ctx?.uiScheme;
  const resolvedUiScheme = useMemo(
    () => uiScheme || getUiScheme(config?.ui?.accentColorId),
    [uiScheme, config?.ui?.accentColorId],
  );

  const switchControlStyle = useMemo(() => {
    const raw = String(config?.ui?.deviceControlStyles?.switch?.controlStyle ?? '').trim().toLowerCase();
    if (raw === 'auto' || raw === 'buttons' || raw === 'switch') return raw;
    return 'auto';
  }, [config?.ui?.deviceControlStyles?.switch?.controlStyle]);

  const switchAnimationStyle = useMemo(() => {
    const raw = String(config?.ui?.deviceControlStyles?.switch?.animationStyle ?? '').trim().toLowerCase();
    if (raw === 'none' || raw === 'pulse') return raw;
    return 'none';
  }, [config?.ui?.deviceControlStyles?.switch?.animationStyle]);

  const ctrlVisibleDeviceIds = useMemo(() => getCtrlVisibleDeviceIdSet(config), [config]);

  const rooms = useMemo(() => {
    return buildRoomsWithStatuses(config, statuses, { ignoreVisibleRooms: true, deviceIdSet: ctrlVisibleDeviceIds });
  }, [config, statuses, ctrlVisibleDeviceIds]);

  const controlsCameraPreviewsEnabled = useMemo(
    () => config?.ui?.controlsCameraPreviewsEnabled === true,
    [config?.ui?.controlsCameraPreviewsEnabled],
  );

  const cameraPreviewRefreshSeconds = useMemo(() => {
    const raw = Number(config?.ui?.cameraPreviewRefreshSeconds);
    if (!Number.isFinite(raw)) return 10;
    return Math.max(2, Math.min(120, Math.round(raw)));
  }, [config?.ui?.cameraPreviewRefreshSeconds]);

  const cameras = useMemo(
    () => (Array.isArray(config?.ui?.cameras) ? config.ui.cameras : []),
    [config?.ui?.cameras],
  );

  const topCameraIds = useMemo(
    () => (Array.isArray(config?.ui?.topCameraIds) ? config.ui.topCameraIds.map((v) => String(v || '').trim()).filter(Boolean) : []),
    [config?.ui?.topCameraIds],
  );

  const topCameraSize = useMemo(() => {
    const raw = String(config?.ui?.topCameraSize ?? '').trim().toLowerCase();
    if (raw === 'xs' || raw === 'sm' || raw === 'md' || raw === 'lg') return raw;
    return 'md';
  }, [config?.ui?.topCameraSize]);

  const visibleCameraIds = useMemo(
    () => (Array.isArray(config?.ui?.visibleCameraIds) ? config.ui.visibleCameraIds : []),
    [config?.ui?.visibleCameraIds],
  );

  const [cameraBrokenIds, setCameraBrokenIds] = useState(() => new Set());

  const [cameraTick, setCameraTick] = useState(0);
  useEffect(() => {
    if (!controlsCameraPreviewsEnabled) return;
    const ms = Math.max(2, Math.min(120, Number(cameraPreviewRefreshSeconds) || 10)) * 1000;
    const compute = () => setCameraTick(ms > 0 ? Math.floor(Date.now() / ms) : 0);
    compute();
    const id = setInterval(compute, ms);
    return () => clearInterval(id);
  }, [controlsCameraPreviewsEnabled, cameraPreviewRefreshSeconds]);

  const topCameras = useMemo(() => {
    if (!controlsCameraPreviewsEnabled) return [];
    const ids = Array.isArray(topCameraIds) ? topCameraIds : [];
    if (!ids.length) return [];

    const allow = Array.isArray(visibleCameraIds)
      ? visibleCameraIds.map((v) => String(v || '').trim()).filter(Boolean)
      : [];
    const allowSet = new Set(allow);
    const allowAll = allowSet.size === 0;

    const list = Array.isArray(cameras) ? cameras : [];
    const byId = new Map(list.map((c) => [String(c?.id || '').trim(), c]));

    return ids
      .map((idRaw) => {
        const id = String(idRaw || '').trim();
        if (!id) return null;
        const c = byId.get(id);
        if (!c || typeof c !== 'object') return null;
        const cid = String(c.id || '').trim();
        if (!cid) return null;
        const label = String(c.label || cid).trim() || cid;
        const enabled = c.enabled !== false;
        const hasSnapshot = c.hasSnapshot === true;
        const hasEmbed = c.hasEmbed === true && typeof c.embedUrl === 'string' && c.embedUrl.trim();
        const embedUrl = hasEmbed ? String(c.embedUrl).trim() : '';
        const hasRtsp = c.hasRtsp === true;
        const hasAnyPreview = Boolean(hasEmbed || hasRtsp || hasSnapshot);

        if (!enabled || !hasAnyPreview) return null;
        if (!allowAll && !allowSet.has(cid)) return null;

        return {
          id: cid,
          label,
          hasSnapshot,
          hasEmbed,
          embedUrl,
          hasRtsp,
        };
      })
      .filter(Boolean);
  }, [cameras, controlsCameraPreviewsEnabled, topCameraIds, visibleCameraIds]);

  const [commandSchemasById, setCommandSchemasById] = useState(() => ({}));
  const [commandArgDrafts, setCommandArgDrafts] = useState(() => ({}));

  const deviceIdsNeedingSchemas = useMemo(() => {
    const ids = [];
    for (const bucket of (Array.isArray(rooms) ? rooms : [])) {
      for (const d of (Array.isArray(bucket?.devices) ? bucket.devices : [])) {
        const id = asText(d?.id);
        if (!id) continue;
        // Only fetch schemas if the device is already reporting commands.
        const commandsRaw = Array.isArray(d?.status?.commands) ? d.status.commands : [];
        if (!commandsRaw.length) continue;
        if (Object.prototype.hasOwnProperty.call(commandSchemasById, id)) continue;
        ids.push(id);
      }
    }
    return ids;
  }, [rooms, commandSchemasById]);

  useEffect(() => {
    if (!connected) return;
    if (!deviceIdsNeedingSchemas.length) return;

    let cancelled = false;

    const runFetches = async () => {
      for (const id of deviceIdsNeedingSchemas) {
        try {
          const res = await fetch(`${API_HOST}/api/devices/${encodeURIComponent(id)}/commands`);
          if (!res.ok) continue;
          const json = await res.json().catch(() => null);
          const schemas = normalizeCommandSchemas(json?.commands);
          if (cancelled) return;
          setCommandSchemasById((prev) => {
            if (Object.prototype.hasOwnProperty.call(prev, id)) return prev;
            return { ...prev, [id]: schemas };
          });
        } catch {
          // best-effort
        }
      }
    };

    runFetches();
    return () => { cancelled = true; };
  }, [connected, deviceIdsNeedingSchemas]);

  const topCameraGridClassName = useMemo(() => {
    if (topCameraSize === 'lg') return 'grid-cols-1';
    if (topCameraSize === 'sm') return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    if (topCameraSize === 'xs') return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
    return 'grid-cols-1 md:grid-cols-2';
  }, [topCameraSize]);

  const noArgUiCommands = useMemo(() => new Set([
    // Common “safe” commands that typically take no args
    'on', 'off', 'toggle',
    'open', 'close',
    'lock', 'unlock',
    'start', 'stop', 'pause', 'play',
    'refresh', 'poll',
    'push',
    // Common alarm/camera-ish actions
    'siren', 'strobe', 'both',
  ]), []);

  const [busy, setBusy] = useState(() => new Set());

  const run = async (deviceId, command, args = []) => {
    const key = `${deviceId}:${command}`;
    setBusy((prev) => new Set(prev).add(key));
    try {
      await sendDeviceCommand(deviceId, command, args);
    } finally {
      setBusy((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  return (
    <div ref={viewportRef} className="w-full h-full overflow-auto md:overflow-hidden p-4 md:p-6">
      <div
        className="w-full h-full"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
      >
        <div ref={contentRef} className="w-full">
          <div className="glass-panel border border-white/10 p-4 md:p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="text-[11px] md:text-xs uppercase tracking-[0.2em] text-white/55 font-semibold">
                  Interactions
                </div>
                <div className="mt-1 text-xl md:text-2xl font-extrabold tracking-tight text-white">
                  Device Controls
                </div>
                <div className="mt-1 text-xs text-white/45">
                  Controls render based on device capabilities (switch / dimmer / commands).
                </div>
              </div>

              <button
                type="button"
                disabled={!connected}
                onClick={() => {
                  // Best-effort: ask the backend to run an immediate Hubitat sync.
                  fetch(`${API_HOST}/api/refresh`, { method: 'POST' }).catch(() => undefined);
                }}
                className={`rounded-xl border px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors active:scale-[0.99] ${resolvedUiScheme.actionButton} ${!connected ? 'opacity-50' : 'hover:bg-white/5'}`}
              >
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  Refresh
                </span>
              </button>
            </div>
          </div>

          {topCameras.length ? (
            <div className="mt-4 glass-panel border border-white/10 p-4 md:p-5">
              <div className="text-[11px] md:text-xs uppercase tracking-[0.2em] text-white/55 font-semibold">
                Cameras
              </div>
              <div className={`mt-3 grid ${topCameraGridClassName} gap-3`}>
                {topCameras.map((cam) => {
                  const broken = cameraBrokenIds.has(cam.id);
                  const src = `${API_HOST}/api/cameras/${encodeURIComponent(cam.id)}/snapshot?t=${cameraTick}`;
                  return (
                    <div key={cam.id} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                      <div className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/80 truncate">
                        {cam.label || cam.id}
                      </div>
                      <div className="mt-2 overflow-hidden rounded-xl bg-black/30">
                        {cam.hasEmbed ? (
                          <iframe
                            src={cam.embedUrl}
                            title={cam.label || cam.id}
                            className="w-full aspect-video"
                            style={{ border: 0 }}
                            allow="autoplay; fullscreen"
                            referrerPolicy="no-referrer"
                          />
                        ) : cam.hasRtsp ? (
                          <HlsPlayer cameraId={cam.id} />
                        ) : (!broken ? (
                          <img
                            src={src}
                            alt={cam.label || cam.id}
                            className="w-full aspect-video object-cover"
                            onError={() => {
                              setCameraBrokenIds((prev) => {
                                const next = new Set(prev);
                                next.add(cam.id);
                                return next;
                              });
                            }}
                          />
                        ) : (
                          <div className="w-full aspect-video flex items-center justify-center text-xs text-white/45">
                            Snapshot unavailable
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {rooms.length ? (
              rooms.map(({ room, devices }) => {
                const controllables = devices
                  .map((d) => {
                    const attrs = d.status?.attributes || {};
                    const commandsRaw = Array.isArray(d.status?.commands) ? d.status.commands : [];
                    const perDevice = getDeviceCommandAllowlist(config, d.id);

                    const schemasRaw = Object.prototype.hasOwnProperty.call(commandSchemasById, String(d.id))
                      ? commandSchemasById[String(d.id)]
                      : null;

                    // If we have schema, filter by allowlist at the schema level.
                    const schemas = perDevice === null
                      ? normalizeCommandSchemas(schemasRaw || commandsRaw)
                      : filterCommandSchemasByAllowlist(schemasRaw || commandsRaw, perDevice);

                    const commands = schemas.map((s) => s.command);

                    const controls = mapDeviceToControls({
                      deviceId: d.id,
                      label: d.label,
                      hubitatType: d.type,
                      capabilities: d.status?.capabilities,
                      attributes: attrs,
                      state: d.status?.state,
                      commandSchemas: schemas,
                    });

                    return {
                      id: d.id,
                      label: d.label,
                      attrs,
                      commands,
                      commandSchemas: schemas,
                      controls,
                      state: d.status?.state,
                    };
                  })
                  // IMPORTANT: include all devices that report any commands.
                  // Some devices (thermostats, cameras, etc.) may only expose arg-based commands.
                  // Those will still show up here, even if we can’t render full controls yet.
                  .filter((d) => d.commands.length);

                if (!controllables.length) return null;

                return (
                  <section key={room.id} className="glass-panel p-4 md:p-5 border border-white/10">
                    <div className="text-[11px] md:text-xs uppercase tracking-[0.2em] text-white/55 font-semibold">
                      Room
                    </div>
                    <h2 className="mt-1 text-base md:text-lg font-extrabold tracking-wide text-white truncate">
                      {room.name}
                    </h2>

                    <div className="mt-4 grid grid-cols-1 gap-3">
                      {controllables.map((d) => {
                        const level = d.attrs.level;
                        const hasLevel = d.commands.includes('setLevel') || asNumber(level) !== null;

                        const switchControl = Array.isArray(d.controls)
                          ? d.controls.find((c) => c && c.kind === 'switch')
                          : null;

                        const isOn = switchControl ? switchControl.isOn : false;
                        const canOn = switchControl ? switchControl.canOn : d.commands.includes('on');
                        const canOff = switchControl ? switchControl.canOff : d.commands.includes('off');
                        const canToggle = switchControl ? switchControl.canToggle : d.commands.includes('toggle');

                        if (switchControl && hasLevel && d.commands.includes('setLevel')) {
                          return (
                            <LevelTile
                              key={d.id}
                              label={d.label}
                              isOn={isOn}
                              level={level}
                              disabled={!connected}
                              busy={busy.has(`${d.id}:toggle`) || busy.has(`${d.id}:setLevel`) || busy.has(`${d.id}:on`) || busy.has(`${d.id}:off`)}
                              onToggle={() => {
                                if (isOn && canOff) return run(d.id, 'off');
                                if (!isOn && canOn) return run(d.id, 'on');
                                if (canToggle) return run(d.id, 'toggle');
                                return run(d.id, isOn ? 'off' : 'on');
                              }}
                              onSetLevel={(next) => {
                                const n = Math.max(0, Math.min(100, Math.round(Number(next))));
                                return run(d.id, 'setLevel', [n]);
                              }}
                              uiScheme={resolvedUiScheme}
                            />
                          );
                        }

                        if (switchControl) {
                          const onToggle = () => {
                            if (isOn && canOff) return run(d.id, 'off');
                            if (!isOn && canOn) return run(d.id, 'on');
                            if (canToggle) return run(d.id, 'toggle');
                            return run(d.id, isOn ? 'off' : 'on');
                          };

                          return (
                            <SwitchTile
                              key={d.id}
                              label={d.label}
                              isOn={isOn}
                              disabled={!connected}
                              busyOn={busy.has(`${d.id}:on`)}
                              busyOff={busy.has(`${d.id}:off`)}
                              busyToggle={busy.has(`${d.id}:toggle`)}
                              canOn={canOn}
                              canOff={canOff}
                              canToggle={canToggle}
                              onOn={() => run(d.id, 'on')}
                              onOff={() => run(d.id, 'off')}
                              onToggle={onToggle}
                              controlStyle={switchControlStyle}
                              animationStyle={switchAnimationStyle}
                              uiScheme={resolvedUiScheme}
                            />
                          );
                        }

                        // Fallback: show safe action buttons if present
                        // Controls previously showed only a hardcoded “safe” subset of commands.
                        // That caused allowlisted TV/media commands (e.g. volume/mode/select) to be hidden.
                        // Show all allowlisted commands; if a command needs parameters, render inline inputs.
                        const schemaList = Array.isArray(d.commandSchemas) ? d.commandSchemas : [];
                        if (!schemaList.length) {
                          return (
                            <div key={d.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5 opacity-80">
                              <div className="text-[11px] md:text-xs uppercase tracking-[0.2em] text-white/55 font-semibold truncate">
                                {d.label}
                              </div>
                              <div className="mt-2 text-xs text-white/45">No commands available.</div>
                            </div>
                          );
                        }

                        return (
                          <div key={d.id} className="rounded-2xl border border-white/10 bg-black/20 p-4 md:p-5">
                            <div className="text-[11px] md:text-xs uppercase tracking-[0.2em] text-white/55 font-semibold truncate">
                              {d.label}
                            </div>

                            <div className="mt-3 flex flex-col gap-2">
                              {schemaList.map((schema) => {
                                const cmd = String(schema?.command || '').trim();
                                if (!cmd) return null;

                                const params = Array.isArray(schema?.parameters) ? schema.parameters : [];
                                const keyPrefix = `${d.id}:${cmd}`;
                                const isBusy = busy.has(keyPrefix);

                                const currentParamValues = (commandArgDrafts && typeof commandArgDrafts === 'object') ? commandArgDrafts[keyPrefix] : null;
                                const paramValues = (currentParamValues && typeof currentParamValues === 'object') ? currentParamValues : {};

                                const parseArg = (param, valueRaw) => {
                                  const t = String(param?.type || '').toLowerCase();
                                  const s = String(valueRaw ?? '').trim();
                                  if (!s) return null;

                                  // Basic type coercion. Maker API varies; keep it forgiving.
                                  if (t.includes('int') || t.includes('number') || t.includes('decimal') || t.includes('float') || t.includes('double')) {
                                    const n = Number(s);
                                    return Number.isFinite(n) ? n : s;
                                  }

                                  if (t.includes('bool')) {
                                    if (s.toLowerCase() === 'true') return true;
                                    if (s.toLowerCase() === 'false') return false;
                                  }

                                  return s;
                                };

                                const canRun = (() => {
                                  if (!connected || isBusy) return false;
                                  if (!params.length) return true;
                                  // Require all parameter fields to be filled (we don't have explicit required flags).
                                  return params.every((p, idx) => {
                                    const name = String(p?.name || `arg${idx}`).trim();
                                    const v = paramValues[name];
                                    return String(v ?? '').trim().length > 0;
                                  });
                                })();

                                const runWithArgs = () => {
                                  const args = params.map((p, idx) => {
                                    const name = String(p?.name || `arg${idx}`).trim();
                                    return parseArg(p, paramValues[name]);
                                  });
                                  return run(d.id, cmd, args);
                                };

                                return (
                                  <div key={cmd} className="flex flex-wrap items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={!canRun}
                                      onClick={() => (params.length ? runWithArgs() : run(d.id, cmd))}
                                      className={`rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] transition-colors active:scale-[0.99] ${resolvedUiScheme.actionButton} ${(!canRun) ? 'opacity-50' : 'hover:bg-white/5'}`}
                                    >
                                      {isBusy ? <Loader2 className="w-4 h-4 animate-spin inline" /> : cmd}
                                    </button>

                                    {params.map((p, idx) => {
                                      const name = String(p?.name || `arg${idx}`).trim() || `arg${idx}`;
                                      const typeHint = String(p?.type || '').trim();
                                      const placeholder = typeHint ? `${name} (${typeHint})` : name;
                                      const value = String(paramValues[name] ?? '');
                                      return (
                                        <input
                                          key={`${cmd}:${name}`}
                                          value={value}
                                          onChange={(e) => {
                                            const next = e.target.value;
                                            setCommandArgDrafts((prev) => {
                                              const base = (prev && typeof prev === 'object') ? prev : {};
                                              const existing = (base[keyPrefix] && typeof base[keyPrefix] === 'object') ? base[keyPrefix] : {};
                                              return {
                                                ...base,
                                                [keyPrefix]: {
                                                  ...existing,
                                                  [name]: next,
                                                },
                                              };
                                            });
                                          }}
                                          disabled={!connected || isBusy}
                                          placeholder={placeholder}
                                          className="min-w-[140px] flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white/80 placeholder:text-white/35"
                                        />
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })
            ) : (
              <div className="glass-panel p-8 border border-white/10 text-center text-white/50 lg:col-span-2 xl:col-span-3">
                <div className="text-sm uppercase tracking-[0.2em]">No data</div>
                <div className="mt-2 text-xl font-extrabold text-white">Waiting for devices…</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractionPanel;
