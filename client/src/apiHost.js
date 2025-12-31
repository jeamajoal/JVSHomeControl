// Central API base URL.
// - In production (served by the backend), this resolves to https://<host>:3000 or http://<host>:3000.
// - In dev (vite on :5173), this points at the backend on :3000.

const stripTrailingSlash = (s) => String(s || '').replace(/\/+$/, '');

const envHost = stripTrailingSlash(import.meta.env.VITE_API_HOST);
const envPort = String(import.meta.env.VITE_API_PORT || '3000').trim();

export const API_HOST = envHost
  ? envHost
  : `${window.location.protocol}//${window.location.hostname}:${envPort}`;
