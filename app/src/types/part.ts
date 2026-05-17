export interface Part {
  id: string;
  brand: string;
  name: string;
  price: string;       // display string from mockup, e.g. "$899.95"
  rating?: number;
  reviews?: number;
  stock?: string;
  tag?: string;        // e.g. "BEST SELLER", "NEW"
  fits?: boolean;
  image?: string;      // future-proof; mockup uses placeholder SVGs
}
