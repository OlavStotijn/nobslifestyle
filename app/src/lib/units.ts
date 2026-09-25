export type WeightUnit = "kg" | "lb";
export type DistanceUnit = "km" | "mi";

const KG_PER_LB = 0.45359237;
const KM_PER_MI = 1.609344;

// Weight is always stored/sent to the API in kg — these only affect display
// and input, converting at the UI boundary.
export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return unit === "lb" ? kg / KG_PER_LB : kg;
}

export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === "lb" ? value * KG_PER_LB : value;
}

export function formatWeight(kg: number, unit: WeightUnit, decimals = 1): string {
  const value = kgToDisplay(kg, unit);
  return `${Number(value.toFixed(decimals))}`;
}

export function weightUnitLabel(unit: WeightUnit): string {
  return unit === "lb" ? "lbs" : "kg";
}

// Distance is always stored/sent to the API in meters.
export function metersToDisplayDistance(meters: number, unit: DistanceUnit): number {
  const km = meters / 1000;
  return unit === "mi" ? km / KM_PER_MI : km;
}

export function formatDistanceValue(meters: number, unit: DistanceUnit, decimals = 2): string {
  return metersToDisplayDistance(meters, unit).toFixed(decimals);
}

export function distanceUnitLabel(unit: DistanceUnit): string {
  return unit === "mi" ? "mi" : "km";
}

// min per km or per mile, whichever the user's unit is.
export function formatPaceValue(meters: number, seconds: number, unit: DistanceUnit): string {
  const distance = metersToDisplayDistance(meters, unit);
  if (distance <= 0) return "—";
  const paceSecPerUnit = seconds / distance;
  const m = Math.floor(paceSecPerUnit / 60);
  const s = Math.round(paceSecPerUnit % 60);
  return `${m}:${String(s).padStart(2, "0")}/${distanceUnitLabel(unit)}`;
}

export function formatSpeedValue(meters: number, seconds: number, unit: DistanceUnit): string {
  if (seconds <= 0) return "—";
  const distance = metersToDisplayDistance(meters, unit);
  const perHour = distance / (seconds / 3600);
  return `${perHour.toFixed(1)} ${distanceUnitLabel(unit)}/h`;
}
