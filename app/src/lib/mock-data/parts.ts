import type { Part } from '@/types/part';

// "Popular for the 7.3L" — trending list on HomeScreen
export const trendingParts: Part[] = [
  { id: 'sb-cold-air-intake', brand: 'S&B FILTERS', tag: 'BEST SELLER', name: 'S&B Cold Air Intake Kit', rating: 4.9, reviews: 1284, price: '$450', stock: 'In stock' },
  { id: 'bd-diesel-tuner', brand: 'BD DIESEL', name: 'BD Diesel Performance Tuner', rating: 4.8, reviews: 612, price: '$799', stock: 'In stock' },
  { id: 'magnaflow-5in-turbo-back', brand: 'MAGNAFLOW', tag: 'NEW', name: 'MagnaFlow 5" Turbo-Back Exhaust', rating: 4.7, reviews: 421, price: '$1290', stock: 'In stock' },
];

// Full catalog — PartsScreen grid
export const allParts: Part[] = [
  { id: 'rough-country-vertex-25', brand: 'ROUGH COUNTRY', name: 'Vertex 2.5 Reservoir Front Shocks 4.5–8" Lift', price: '$899.95', rating: 4.8, reviews: 234, fits: true },
  { id: 'bd-diesel-tuner', brand: 'BD DIESEL', name: 'BD Diesel Performance Tuner', price: '$799.00', rating: 4.8, reviews: 612, fits: true },
  { id: 'sb-cold-air-intake', brand: 'S&B FILTERS', name: 'S&B Cold Air Intake Kit', price: '$450.00', rating: 4.9, reviews: 1284, fits: true },
  { id: 'magnaflow-5in-turbo-back', brand: 'MAGNAFLOW', name: 'MagnaFlow 5" Turbo-Back Exhaust', price: '$1,290.00', rating: 4.7, reviews: 421, fits: false },
  { id: 'bully-dog-gt-platinum', brand: 'BULLY DOG', name: 'GT Platinum Gauge Tuner', price: '$549.00', rating: 4.6, reviews: 893, fits: true },
  { id: 'edge-cts3', brand: 'EDGE PRODUCTS', name: 'Insight CTS3 Monitor', price: '$429.00', rating: 4.7, reviews: 567, fits: true },
];

// "Pick up where you left off" — recentlyViewed on HomeScreen
export const recentlyViewed: Part[] = [
  { id: 'rough-country-vertex-25', brand: 'ROUGH COUNTRY', name: 'Rough Country Vertex 2.5', price: '$899.95' },
  { id: 'js-320a-alternator', brand: 'JS ALTERNATORS', name: 'JS 320A Alternator', price: '$649.00' },
  { id: 'bully-dog-gt-platinum', brand: 'BULLY DOG', name: 'Bully Dog GT Tuner', price: '$549.00' },
];

// Recommended in the Diagnose flow
export const diagnoseRecommendedParts: Part[] = [
  { id: 'ipr-valve-73l', brand: 'INTERNATIONAL', name: 'IPR Valve OEM Replacement 7.3L Power Stroke', price: '$189.95', fits: true },
  { id: 'edge-cts3', brand: 'EDGE PRODUCTS', name: 'Insight CTS3 — diagnostic monitor', price: '$429.00', fits: true },
  { id: 'motorcraft-icp-sensor', brand: 'MOTORCRAFT', name: 'Fuel Pressure Sensor (ICP) — diagnostic part', price: '$92.50', fits: true },
];

// Default product for ProductScreen (mockup hardcodes the Rough Country Vertex)
export const featuredProduct: Part = {
  id: 'rough-country-vertex-25',
  brand: 'ROUGH COUNTRY',
  name: 'Vertex 2.5 Reservoir Front Shocks',
  price: '$899.95',
  rating: 4.8,
  reviews: 234,
  fits: true,
};

// Category data for HomeScreen grid
export interface CategoryEntry {
  name: string;
  fits: number;
  total: number;
}

export const categories: CategoryEntry[] = [
  { name: 'Engine', fits: 142, total: 180 },
  { name: 'Fuel System', fits: 89, total: 124 },
  { name: 'Exhaust', fits: 54, total: 78 },
  { name: 'Cooling', fits: 38, total: 51 },
  { name: 'Air Intake', fits: 27, total: 39 },
  { name: 'Tuning', fits: 19, total: 28 },
];

// Chip labels for PartsScreen category filter row
export const partsCategoryChips = ['All', 'Engine', 'Fuel', 'Exhaust', 'Cooling', 'Intake', 'Tuning'];
