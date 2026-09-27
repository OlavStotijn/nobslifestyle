export interface AmountPreset {
  label: string;
  grams: number;
}

export function amountPresets(servingSizeG: number | null | undefined): AmountPreset[] {
  const presets: AmountPreset[] = [
    { label: "1 tsp", grams: 5 },
    { label: "1 tbsp", grams: 15 },
  ];
  if (servingSizeG) presets.push({ label: "1 portion", grams: Math.round(servingSizeG) });
  presets.push({ label: "50g", grams: 50 }, { label: "100g", grams: 100 }, { label: "150g", grams: 150 }, { label: "200g", grams: 200 });
  return presets;
}
