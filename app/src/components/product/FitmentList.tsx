import { Check } from 'lucide-react';
import type { Fitment } from '@/types/fitment';
import { BORDER, GREEN, SURFACE, SURFACE_2, TEXT, TEXT_MUTED } from '@/lib/constants/colors';

interface FitmentListProps {
  fitment: Fitment[];
}

export default function FitmentList({ fitment }: FitmentListProps) {
  return (
    <div className="mx-4 mt-4">
      <div className="flex items-center justify-between mb-2.5">
        <h3 className="text-sm font-bold" style={{ color: TEXT }}>Fitment</h3>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded"
          style={{ color: TEXT_MUTED, background: SURFACE_2, border: `1px solid ${BORDER}` }}
        >
          {fitment.length} MODELS
        </span>
      </div>
      <div className="space-y-2">
        {fitment.map((f, i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3 rounded-xl"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: TEXT }}>{f.model}</p>
              <p className="text-[11px] mt-0.5" style={{ color: TEXT_MUTED }}>
                {f.years} · {f.drivetrain}
              </p>
            </div>
            <Check size={14} style={{ color: GREEN }} />
          </div>
        ))}
      </div>
    </div>
  );
}
