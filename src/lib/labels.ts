export const SLOT_LABELS: Record<string, string> = {
  shortest: '最短',
  popular: '人気',
  afterwork: '仕事終わり',
};

export function getSlotLabelDisplay(label: string): string {
  return SLOT_LABELS[label] ?? label;
}
