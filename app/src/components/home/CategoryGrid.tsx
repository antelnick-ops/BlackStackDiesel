import { Cog, Fuel, Wind, Snowflake, Filter, Gauge } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BORDER, GREEN, GREEN_BG, SURFACE, SURFACE_2, TEXT, TEXT_DIM, TEXT_MUTED } from '@/lib/constants/colors';
import { categories } from '@/lib/mock-data/parts';

const ICON_MAP: Record<string, LucideIcon> = {
  Engine: Cog,
  'Fuel System': Fuel,
  Exhaust: Wind,
  Cooling: Snowflake,
  'Air Intake': Filter,
  Tuning: Gauge,
};

interface CategoryGridProps {
  onSelect: () => void;
}

export default function CategoryGrid({ onSelect }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {categories.map(({ name, fits, total }) => {
        const Icon = ICON_MAP[name] ?? Cog;
        return (
          <button
            key={name}
            onClick={onSelect}
            className="rounded-2xl p-3 text-left active:opacity-70"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            <div className="flex items-start justify-between mb-2">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: SURFACE_2 }}
              >
                <Icon size={16} style={{ color: TEXT_MUTED }} />
              </div>
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ color: GREEN, background: GREEN_BG }}
              >
                {fits} FIT
              </span>
            </div>
            <p className="text-sm font-semibold leading-tight" style={{ color: TEXT }}>{name}</p>
            <p className="text-[10px] mt-0.5" style={{ color: TEXT_DIM }}>
              {fits} of {total} parts
            </p>
          </button>
        );
      })}
    </div>
  );
}
