import type { ProductSpec } from '@/lib/mock-data/fitment';
import { BORDER, SURFACE, TEXT, TEXT_MUTED } from '@/lib/constants/colors';

interface SpecsListProps {
  specs: ProductSpec[];
}

export default function SpecsList({ specs }: SpecsListProps) {
  return (
    <div className="mx-4 mt-4">
      <h3 className="text-sm font-bold mb-2.5" style={{ color: TEXT }}>Details</h3>
      <div className="rounded-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        {specs.map((s, i) => (
          <div
            key={s.label}
            className="flex justify-between items-center px-4 py-2.5"
            style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : 'none' }}
          >
            <span className="text-xs" style={{ color: TEXT_MUTED }}>{s.label}</span>
            <span className="text-sm font-semibold" style={{ color: TEXT }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
