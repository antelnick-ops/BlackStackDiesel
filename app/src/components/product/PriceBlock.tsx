import { Check } from 'lucide-react';
import type { Vehicle } from '@/types/vehicle';
import { BORDER, GREEN, GREEN_BG, SURFACE, SURFACE_2, TEXT, TEXT_MUTED } from '@/lib/constants/colors';

interface PriceBlockProps {
  price: string;
  vehicle: Vehicle | null;
}

function splitPrice(price: string): { dollars: string; cents: string } {
  const dot = price.indexOf('.');
  if (dot === -1) return { dollars: price, cents: '' };
  return { dollars: price.slice(0, dot), cents: price.slice(dot) };
}

export default function PriceBlock({ price, vehicle }: PriceBlockProps) {
  const { dollars, cents } = splitPrice(price);
  return (
    <div className="mx-4 mt-5 p-4 rounded-2xl" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold" style={{ color: TEXT }}>{dollars}</span>
        {cents && <span className="text-xl font-bold" style={{ color: TEXT_MUTED }}>{cents}</span>}
      </div>
      {vehicle && (
        <div
          className="mt-3 p-3 rounded-xl flex items-center gap-2.5"
          style={{ background: SURFACE_2, border: `1px solid ${BORDER}` }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: GREEN_BG }}
          >
            <Check size={14} style={{ color: GREEN }} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold" style={{ color: TEXT }}>
              Fits your {vehicle.year} {vehicle.model}
            </p>
            <p className="text-[11px]" style={{ color: TEXT_MUTED }}>Verified by BSD fitment data</p>
          </div>
        </div>
      )}
    </div>
  );
}
