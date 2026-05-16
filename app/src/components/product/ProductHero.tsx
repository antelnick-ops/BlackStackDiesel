import { Heart } from 'lucide-react';
import {
  AMBER, BG, PRODUCT_BG, SVG_RED_ACCENT, SVG_STEEL, SVG_STEEL_DARK, SVG_STEEL_LIGHT, TEXT,
} from '@/lib/constants/colors';

interface ProductHeroProps {
  brand: string;
}

export default function ProductHero({ brand }: ProductHeroProps) {
  return (
    <div className="mx-4 mt-4 rounded-2xl aspect-square relative overflow-hidden" style={{ background: PRODUCT_BG }}>
      <div className="absolute inset-0 flex items-center justify-center">
        <svg viewBox="0 0 200 200" className="w-3/5 h-3/5">
          <rect x="85" y="30" width="30" height="60" rx="4" fill={SVG_STEEL} />
          <rect x="92" y="90" width="16" height="80" fill={SVG_STEEL_LIGHT} />
          <circle cx="100" cy="180" r="8" fill={SVG_STEEL_DARK} stroke={AMBER} strokeWidth="2" />
          <rect x="80" y="50" width="40" height="6" fill={SVG_RED_ACCENT} />
        </svg>
      </div>
      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg backdrop-blur" style={{ background: `${BG}d0` }}>
        <span className="text-[10px] font-bold tracking-widest" style={{ color: TEXT }}>{brand}</span>
      </div>
      <button
        className="absolute top-3 right-3 w-9 h-9 rounded-full backdrop-blur flex items-center justify-center"
        style={{ background: `${BG}d0` }}
      >
        <Heart size={14} style={{ color: TEXT }} />
      </button>
    </div>
  );
}
