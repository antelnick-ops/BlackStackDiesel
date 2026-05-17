import { Check, Filter } from 'lucide-react';
import { BORDER, GREEN, GREEN_BG, SURFACE, TEXT_MUTED } from '@/lib/constants/colors';

interface FitmentToggleProps {
  fitsOnly: boolean;
  onToggle: () => void;
}

export default function FitmentToggle({ fitsOnly, onToggle }: FitmentToggleProps) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{
          background: fitsOnly ? GREEN_BG : SURFACE,
          border: `1px solid ${fitsOnly ? GREEN : BORDER}`,
        }}
      >
        <div
          className="w-3.5 h-3.5 rounded-sm flex items-center justify-center"
          style={{
            background: fitsOnly ? GREEN : 'transparent',
            border: fitsOnly ? 'none' : `1px solid ${TEXT_MUTED}`,
          }}
        >
          {fitsOnly && <Check size={10} style={{ color: GREEN_BG }} strokeWidth={3} />}
        </div>
        <span className="text-xs font-semibold" style={{ color: fitsOnly ? GREEN : TEXT_MUTED }}>
          Fits my truck only
        </span>
      </button>
      <button className="text-xs font-semibold flex items-center gap-1" style={{ color: TEXT_MUTED }}>
        <Filter size={12} /> Sort
      </button>
    </div>
  );
}
