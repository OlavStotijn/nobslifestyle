import { useAuth } from "../context/AuthContext";
import {
  displayToKg,
  distanceUnitLabel,
  formatDistanceValue,
  formatPaceValue,
  formatSpeedValue,
  formatWeight,
  kgToDisplay,
  weightUnitLabel,
  type DistanceUnit,
  type WeightUnit,
} from "./units";

// Binds the raw kg/meters conversion helpers to the current user's
// preferred units (Settings → Units), so call sites don't have to thread
// weightUnit/distanceUnit through everywhere themselves.
export function useUnits() {
  const { user } = useAuth();
  const weightUnit: WeightUnit = user?.weightUnit ?? "kg";
  const distanceUnit: DistanceUnit = user?.distanceUnit ?? "km";

  return {
    weightUnit,
    distanceUnit,
    weightLabel: weightUnitLabel(weightUnit),
    distanceLabel: distanceUnitLabel(distanceUnit),
    formatWeight: (kg: number, decimals?: number) => formatWeight(kg, weightUnit, decimals),
    kgToDisplay: (kg: number) => kgToDisplay(kg, weightUnit),
    displayToKg: (value: number) => displayToKg(value, weightUnit),
    formatDistance: (meters: number, decimals?: number) => formatDistanceValue(meters, distanceUnit, decimals),
    formatPace: (meters: number, seconds: number) => formatPaceValue(meters, seconds, distanceUnit),
    formatSpeed: (meters: number, seconds: number) => formatSpeedValue(meters, seconds, distanceUnit),
  };
}
