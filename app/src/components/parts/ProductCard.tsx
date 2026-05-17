import { Check, Star } from 'lucide-react';
import type { Part } from '@/types/part';
import {
  BG, BORDER, GREEN, PRODUCT_BG, SURFACE,
  SVG_STEEL, SVG_STEEL_DARK, SVG_STEEL_LIGHT,
  TEXT, TEXT_DIM, TEXT_MUTED,
} from '@/lib/constants/colors';

interface ProductCardProps {
  part: Part;
  onPress: () => void;
}

export default function ProductCard({ part, onPress }: ProductCardProps) {
  return (
    <button
      onClick={onPress}
      className="rounded-2xl overflow-hidden text-left active:opacity-80"
      style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
    >
      <div className="aspect-square relative" style={{ background: PRODUCT_BG }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 100 100" className="w-2/3 h-2/3 opacity-80">
            <rect x="42" y="20" width="16" height="30" rx="2" fill={SVG_STEEL} />
            <rect x="46" y="50" width="8" height="40" fill={SVG_STEEL_LIGHT} />
            <circle cx="50" cy="90" r="4" fill={SVG_STEEL_DARK} />
          </svg>
        </div>
        {part.fits && (
          <div
            className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-0.5"
            style={{ background: BG, color: TEXT }}
          >
            <Check size={9} style={{ color: GREEN }} /> FITS
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[9px] font-bold tracking-wider uppercase" style={{ color: TEXT_DIM }}>
          {part.brand}
        </p>
        <p className="text-xs font-semibold leading-tight mt-1 line-clamp-2 min-h-[2.5rem]" style={{ color: TEXT }}>
          {part.name}
        </p>
        <div className="flex items-center gap-1 mt-1.5">
          <Star size={9} style={{ color: TEXT_MUTED }} fill={TEXT_MUTED} />
          <span className="text-[10px]" style={{ color: TEXT_MUTED }}>
            {part.rating} · {part.reviews}
          </span>
        </div>
        <p className="text-sm font-bold mt-1.5" style={{ color: TEXT }}>{part.price}</p>
      </div>
    </button>
  );
}
