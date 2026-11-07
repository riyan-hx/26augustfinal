/** Calm, colourful tints (bg, ink, ring). Ink on bg is ≥ 4.5:1. */
export const TINTS = {
  green: ['#EAF6E1', '#2F6B1F', '#CFE9BC'],
  sky: ['#E6F0FA', '#24537A', '#C9DDF1'],
  amber: ['#FBF1DE', '#7A4E12', '#F1DDB4'],
  lilac: ['#F0EBFB', '#54408A', '#DCD1F4'],
  rose: ['#FBEAE7', '#8A3B33', '#F2CFC9'],
  teal: ['#E2F3EF', '#1F5F55', '#C3E5DD'],
} as const
export type Tint = keyof typeof TINTS
export const firstName = (displayName: string) => displayName.replace(/^(dr\.?|mr\.?|ms\.?|mrs\.?)\s+/i, '').split(/\s+/)[0] ?? displayName
