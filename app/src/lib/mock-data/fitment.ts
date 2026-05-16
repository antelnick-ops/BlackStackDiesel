import type { Fitment } from '@/types/fitment';

export const featuredProductFitment: Fitment[] = [
  { model: 'Ford F-250 Super Duty', years: '2005–2026', drivetrain: '4WD' },
  { model: 'Ford F-350 Super Duty', years: '2005–2026', drivetrain: '4WD' },
];

export interface ProductSpec {
  label: string;
  value: string;
}

export const featuredProductSpecs: ProductSpec[] = [
  { label: 'Brand', value: 'Rough Country' },
  { label: 'MFG Part #', value: '699004' },
  { label: 'UPC', value: '843030147501' },
  { label: 'Category', value: 'Suspension' },
  { label: 'Type', value: 'Shock Absorber' },
  { label: 'Lift Range', value: '4.5"–8"' },
];
