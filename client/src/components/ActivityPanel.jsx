import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DoorOpen, Footprints, Volume2, VolumeX } from 'lucide-react';

import { socket } from '../socket';

const asText = (value) => {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
};

const buildRoomsWithActivity = (config, statuses) => {
  const rooms = Array.isArray(config?.rooms) ? config.rooms : [];
  const sensors = Array.isArray(config?.sensors) ? config.sensors : [];

  const byRoomId = new Map();
  for (const r of rooms) byRoomId.set(String(r.id), { room: r, devices: [] });

  const unassigned = [];

  for (const s of sensors) {
    const id = String(s?.id ?? '').trim();
    if (!id) continue;

    const st = statuses?.[id] || null;
    const attrs = st?.attributes && typeof st.attributes === 'object' ? st.attributes : {};

    const motion = asText(attrs.motion);
    const contact = asText(attrs.contact);

    const hasActivity = (motion === 'active' || motion === 'inactive') || (contact === 'open' || contact === 'closed');
    if (!hasActivity) continue;

    const entry = {
      id,
      label: String(s?.label || st?.label || id),
      motion,
      contact,
      lastUpdated: asText(st?.lastUpdated),
      roomId: String(s?.roomId ?? ''),
    };

    const bucket = byRoomId.get(entry.roomId);
    if (bucket) bucket.devices.push(entry);
    else unassigned.push(entry);
  }

  const result = Array.from(byRoomId.values())
    .map(({ room, devices }) => ({ room, devices }))
    .filter((r) => r.devices.length > 0)
    .sort((a, b) => String(a.room?.name || '').localeCompare(String(b.room?.name || '')));

  if (unassigned.length) {
    result.push({ room: { id: 'unassigned', name: 'Unassigned' }, devices: unassigned });
  }

  return result;
};

const tone = async (audioCtx, { freq = 440, durationMs = 120, gain = 0.05 } = {}) => {
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.value = freq;

  g.gain.value = 0;
  osc.connect(g);
  g.connect(audioCtx.destination);

  const now = audioCtx.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gain, now + 0.01);
  g.gain.linearRampToValueAtTime(0, now + durationMs / 1000);

  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.02);

  return new Promise((resolve) => {
    osc.onended = () => resolve();
  });
};

const playMotionSound = async (audioCtx) => {
  // Simple “footstep-ish” double tap.
  await tone(audioCtx, { freq: 220, durationMs: 90, gain: 0.05 });
  await tone(audioCtx, { freq: 180, durationMs: 90, gain: 0.05 });
};

const playDoorSound = async (audioCtx) => {
  // Simple “creak-ish” descending tone.
  await tone(audioCtx, { freq: 520, durationMs: 140, gain: 0.045 });
  await tone(audioCtx, { freq: 360, durationMs: 180, gain: 0.045 });
};

const ActivityPanel = ({ config, statuses, connected, uiScheme }) => {
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const audioCtxRef = useRef(null);

  const prevRef = useRef({ byId: new Map(), initialized: false });
  const lastPlayedRef = useRef({ perSensor: new Map(), globalAt: 0 });

  const rooms = useMemo(() => buildRoomsWithActivity(config, statuses), [config, statuses]);

  const summary = useMemo(() => {
    let motionActive = 0;
    let doorOpen = 0;

    for (const r of rooms) {
      for (const d of r.devices) {
        if (d.motion === 'active') motionActive += 1;
        if (d.contact === 'open') doorOpen += 1;
      }
    }

    return { motionActive, doorOpen };
  }, [rooms]);

  const ensureAudio = async () => {
    if (!audioCtxRef.current) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      audioCtxRef.current = new Ctor();
    }

    try {
      await audioCtxRef.current.resume();
    } catch {
      // ignore
    }

    return audioCtxRef.current;
  };

  // Track state transitions from polling refreshes (visual correctness + fallback audio).
  useEffect(() => {
    const nowMs = Date.now();

    const nextById = new Map();
    for (const r of rooms) {
      for (const d of r.devices) {
        nextById.set(d.id, { motion: d.motion, contact: d.contact });
      }
    }

    const prev = prevRef.current;
    if (!prev.initialized) {
      prev.byId = nextById;
      prev.initialized = true;
      return;
    }

    if (!alertsEnabled) {
      prev.byId = nextById;
      return;
    }

    const audioCtx = audioCtxRef.current;
    if (!audioCtx) {
      prev.byId = nextById;
      return;
    }

    for (const [id, nextState] of nextById.entries()) {
      const prevState = prev.byId.get(id) || {};

      const motionTriggered = prevState.motion !== 'active' && nextState.motion === 'active';
      const doorTriggered = prevState.contact !== 'open' && nextState.contact === 'open';

      if (!motionTriggered && !doorTriggered) continue;

      const last = lastPlayedRef.current;
      const perKey = `${id}:${doorTriggered ? 'door' : 'motion'}`;
      const lastAt = last.perSensor.get(perKey) || 0;
      const sinceKey = nowMs - lastAt;
      const sinceGlobal = nowMs - last.globalAt;

      // Rate limits: avoid spam if device bounces or status refresh repeats.
      if (sinceKey < 5000) continue;
      if (sinceGlobal < 600) continue;

      last.perSensor.set(perKey, nowMs);
      last.globalAt = nowMs;

      if (doorTriggered) playDoorSound(audioCtx).catch(() => undefined);
      else playMotionSound(audioCtx).catch(() => undefined);
    }

    prev.byId = nextById;
  }, [alertsEnabled, rooms]);

  // Prefer realtime Maker postURL events for audio cues (more immediate than polling).
  useEffect(() => {
    const handler = async ({ events } = {}) => {
      if (!alertsEnabled) return;
      if (!Array.isArray(events) || !events.length) return;

      const audioCtx = await ensureAudio();
      if (!audioCtx) return;

      const nowMs = Date.now();

      for (const e of events) {
        const payload = e?.payload || {};
        const deviceId = payload?.deviceId ?? payload?.device_id ?? payload?.id;
        const name = asText(payload?.name) || asText(payload?.attribute) || asText(payload?.attributeName);
        const value = asText(payload?.value);

        const id = deviceId !== null && deviceId !== undefined ? String(deviceId) : '';
        if (!id) continue;

        const isDoor = name && name.toLowerCase() === 'contact' && value && value.toLowerCase() === 'open';
        const isMotion = name && name.toLowerCase() === 'motion' && value && value.toLowerCase() === 'active';
        if (!isDoor && !isMotion) continue;

        const last = lastPlayedRef.current;
        const perKey = `${id}:${isDoor ? 'door' : 'motion'}`;
        const lastAt = last.perSensor.get(perKey) || 0;
        const sinceKey = nowMs - lastAt;
        const sinceGlobal = nowMs - last.globalAt;

        if (sinceKey < 3500) continue;
        if (sinceGlobal < 400) continue;

        last.perSensor.set(perKey, nowMs);
        last.globalAt = nowMs;

        if (isDoor) playDoorSound(audioCtx).catch(() => undefined);
        else playMotionSound(audioCtx).catch(() => undefined);
      }
    };

    socket.on('events_ingested', handler);
    return () => socket.off('events_ingested', handler);
  }, [alertsEnabled]);

  return (
    <div className="w-full h-full overflow-auto p-3 md:p-5">
      <div className="glass-panel border border-white/10 p-4 md:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1 text-white/80">
                <Footprints className={`w-5 h-5 ${summary.motionActive ? (uiScheme?.selectedText || 'text-neon-blue') : 'text-white/35'}`} />
                <span className="text-lg md:text-xl font-extrabold tabular-nums">{summary.motionActive}</span>
              </div>
              <div className="inline-flex items-center gap-1 text-white/80">
                <DoorOpen className={`w-5 h-5 ${summary.doorOpen ? (uiScheme?.selectedText || 'text-neon-blue') : 'text-white/35'}`} />
                <span className="text-lg md:text-xl font-extrabold tabular-nums">{summary.doorOpen}</span>
              </div>
              <div className={`text-[10px] uppercase tracking-[0.2em] font-semibold ${connected ? 'text-white/50' : 'text-neon-red'}`}>
                {connected ? 'Live' : 'Offline'}
              </div>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                if (!alertsEnabled) {
                  const ctx = await ensureAudio();
                  if (!ctx) return;
                  // Quick confirmation chirp so users know audio is working.
                  playMotionSound(ctx).catch(() => undefined);
                  setAlertsEnabled(true);
                  return;
                }
                setAlertsEnabled(false);
              }}
              className={`rounded-xl border px-3 py-2 transition-colors active:scale-[0.99] ${alertsEnabled ? (uiScheme?.selectedCard || 'bg-white/10 border-white/20') : 'border-white/10 bg-black/20 hover:bg-white/5'}`}
            >
              <span className="inline-flex items-center gap-2">
                {alertsEnabled ? (
                  <Volume2 className={`w-4 h-4 ${uiScheme?.selectedText || 'text-neon-blue'}`} />
                ) : (
                  <VolumeX className="w-4 h-4 text-white/50" />
                )}
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
                  {alertsEnabled ? 'On' : 'Quiet'}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {rooms.length ? (
          rooms.map((r) => {
            const motionActive = r.devices.filter((d) => d.motion === 'active').length;
            const doorOpen = r.devices.filter((d) => d.contact === 'open').length;

            const headerGlow = (motionActive || doorOpen)
              ? `${uiScheme?.selectedCard || 'border-primary/40'} ${uiScheme?.headerGlow || 'animate-glow-accent'}`
              : 'border-white/10';

            return (
              <section key={String(r.room?.id)} className={`glass-panel p-4 md:p-5 border ${headerGlow}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mt-1 text-base md:text-lg font-extrabold tracking-wide text-white truncate">
                      {String(r.room?.name || r.room?.id)}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    <div className="inline-flex items-center gap-1">
                      <Footprints className={`w-4 h-4 ${motionActive ? (uiScheme?.selectedText || 'text-neon-blue') : 'text-white/30'}`} />
                      <span className="text-sm font-extrabold tabular-nums text-white/80">{motionActive}</span>
                    </div>
                    <div className="inline-flex items-center gap-1">
                      <DoorOpen className={`w-4 h-4 ${doorOpen ? (uiScheme?.selectedText || 'text-neon-blue') : 'text-white/30'}`} />
                      <span className="text-sm font-extrabold tabular-nums text-white/80">{doorOpen}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2">
                  {r.devices
                    .slice()
                    .sort((a, b) => a.label.localeCompare(b.label))
                    .map((d) => {
                      const motionState = d.motion;
                      const contactState = d.contact;

                      const active = motionState === 'active' || contactState === 'open';

                      return (
                        <div
                          key={d.id}
                          className={`rounded-2xl border p-3 bg-black/20 ${active ? (uiScheme?.selectedCard || 'border-white/20 bg-white/10') : 'border-white/10'}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[11px] md:text-xs uppercase tracking-[0.2em] text-white/55 font-semibold truncate">
                                {d.label}
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-3">
                              {motionState ? (
                                <Footprints className={`w-4 h-4 ${motionState === 'active' ? `animate-pulse ${uiScheme?.selectedText || 'text-neon-blue'}` : 'text-white/30'}`} />
                              ) : null}
                              {contactState ? (
                                <DoorOpen className={`w-4 h-4 ${contactState === 'open' ? (uiScheme?.selectedText || 'text-neon-blue') : 'text-white/30'}`} />
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </section>
            );
          })
        ) : (
          <div className="glass-panel p-8 border border-white/10 text-center text-white/50">
            <div className="text-sm uppercase tracking-[0.2em]">No activity</div>
            <div className="mt-2 text-xl font-extrabold text-white">Add motion/contact sensors</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityPanel;
