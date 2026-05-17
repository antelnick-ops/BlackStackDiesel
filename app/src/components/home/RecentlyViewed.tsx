import type { Part } from '@/types/part';
import { BORDER, PRODUCT_BG, SURFACE, TEXT } from '@/lib/constants/colors';
import { recentlyViewed } from '@/lib/mock-data/parts';

interface RecentlyViewedProps {
  onSelectProduct: (part: Part) => void;
}

export default function RecentlyViewed({ onSelectProduct }: RecentlyViewedProps) {
  return (
    <div>
      <h2 className="text-base font-bold mb-3" style={{ color: TEXT }}>Pick up where you left off</h2>
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
        <div className="flex gap-2">
          {recentlyViewed.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelectProduct(p)}
              className="flex-shrink-0 w-32 rounded-xl overflow-hidden text-left active:opacity-80"
              style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
            >
              <div className="aspect-square" style={{ background: PRODUCT_BG }} />
              <div className="p-2">
                <p className="text-[11px] font-semibold leading-tight line-clamp-2 min-h-[2rem]" style={{ color: TEXT }}>
                  {p.name}
                </p>
                <p className="text-xs font-bold mt-1" style={{ color: TEXT }}>{p.price}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
