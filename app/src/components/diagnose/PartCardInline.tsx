import { Check, Plus } from 'lucide-react';
import type { Part } from '@/types/part';
import {
  AMBER, AMBER_ON_BG, BORDER, GREEN, PRODUCT_BG, SURFACE_2,
  SVG_STEEL, SVG_STEEL_DARK, SVG_STEEL_LIGHT, TEXT, TEXT_DIM,
} from '@/lib/constants/colors';

interface PartCardInlineProps {
  part: Part;
  onAdd: () => void;
  onView: () => void;
}

export default function PartCardInline({ part, onAdd, onView }: PartCardInlineProps) {
  return (
    <div className="rounded-xl overflow-hidden mt-2" style={{ background: SURFACE_2, border: `1px solid ${BORDER}` }}>
      <div className="flex gap-3 p-3">
        <button
          onClick={onView}
          className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center"
          style={{ background: PRODUCT_BG }}
        >
          <svg viewBox="0 0 100 100" className="w-3/4 h-3/4 opacity-80">
            <rect x="42" y="20" width="16" height="30" rx="2" fill={SVG_STEEL} />
            <rect x="46" y="50" width="8" height="40" fill={SVG_STEEL_LIGHT} />
            <circle cx="50" cy="90" r="4" fill={SVG_STEEL_DARK} />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold tracking-wider uppercase" style={{ color: TEXT_DIM }}>
            {part.brand}
          </p>
          <p className="text-xs font-semibold leading-tight mt-0.5 line-clamp-2" style={{ color: TEXT }}>
            {part.name}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            <Check size={9} style={{ color: GREEN }} />
            <span className="text-[10px]" style={{ color: GREEN }}>Fits your truck</span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <p className="text-sm font-bold" style={{ color: TEXT }}>{part.price}</p>
            <button
              onClick={onAdd}
              className="px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1"
              style={{ background: AMBER, color: AMBER_ON_BG }}
            >
              <Plus size={11} strokeWidth={3} /> Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
