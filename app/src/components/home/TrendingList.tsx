import { ShieldCheck, Star, ArrowRight } from 'lucide-react';
import type { Part } from '@/types/part';
import { AMBER, BORDER, GREEN, SURFACE, SURFACE_2, TEXT, TEXT_DIM, TEXT_MUTED } from '@/lib/constants/colors';
import { trendingParts } from '@/lib/mock-data/parts';

interface TrendingListProps {
  vehicleYear: number;
  vehicleModel: string;
  onSelectProduct: (part: Part) => void;
}

export default function TrendingList({ vehicleYear, vehicleModel, onSelectProduct }: TrendingListProps) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h2 className="text-base font-bold" style={{ color: TEXT }}>Popular for the 7.3L</h2>
          <p className="text-[11px] mt-0.5" style={{ color: TEXT_DIM }}>
            What other {vehicleYear} {vehicleModel} owners buy
          </p>
        </div>
        <button className="text-xs font-semibold flex items-center gap-1" style={{ color: AMBER }}>
          SEE ALL <ArrowRight size={12} />
        </button>
      </div>
      <div className="space-y-2">
        {trendingParts.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelectProduct(p)}
            className="w-full p-3 rounded-2xl flex items-center gap-3 active:opacity-70"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: SURFACE_2 }}
            >
              <ShieldCheck size={16} style={{ color: TEXT_MUTED }} />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: TEXT_DIM }}>
                  {p.brand}
                </span>
                {p.tag && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                    style={{ color: AMBER, background: `${AMBER}15`, border: `1px solid ${AMBER}30` }}
                  >
                    {p.tag}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold truncate" style={{ color: TEXT }}>{p.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Star size={10} style={{ color: TEXT_MUTED }} fill={TEXT_MUTED} />
                <span className="text-[11px]" style={{ color: TEXT_MUTED }}>
                  {p.rating} · {p.reviews}
                </span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold" style={{ color: TEXT }}>{p.price}</p>
              <p className="text-[10px]" style={{ color: GREEN }}>{p.stock}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
