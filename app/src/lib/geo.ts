export interface RoutePoint {
  lat: number;
  lng: number;
  t: number; // ms since epoch
}

const EARTH_RADIUS_M = 6371000;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

// Haversine distance between two points, in meters.
export function distanceBetween(a: RoutePoint, b: RoutePoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function totalDistance(points: RoutePoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distanceBetween(points[i - 1], points[i]);
  return total;
}

export function formatDistance(meters: number): string {
  return (meters / 1000).toFixed(2);
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// min/km, only meaningful for running.
export function formatPace(meters: number, seconds: number): string {
  if (meters <= 0) return "—";
  const paceSecPerKm = seconds / (meters / 1000);
  const m = Math.floor(paceSecPerKm / 60);
  const s = Math.round(paceSecPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

// km/h, only meaningful for cycling.
export function formatSpeed(meters: number, seconds: number): string {
  if (seconds <= 0) return "—";
  const kmh = meters / 1000 / (seconds / 3600);
  return `${kmh.toFixed(1)} km/h`;
}
