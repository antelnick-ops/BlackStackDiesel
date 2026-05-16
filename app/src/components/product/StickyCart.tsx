import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { AMBER, AMBER_DEEP, AMBER_ON_BG, BG, BORDER, SURFACE, TEXT } from '@/lib/constants/colors';

interface StickyCartProps {
  price: string;
  onAddToCart: (qty: number) => void;
}

export default function StickyCart({ price, onAddToCart }: StickyCartProps) {
  const [qty, setQty] = useState(1);
  return (
    <div
      className="fixed bottom-[72px] left-0 right-0 px-4 pb-3 pt-3 z-20"
      style={{ background: `linear-gradient(to top, ${BG} 60%, ${BG}00 100%)` }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex items-center rounded-2xl overflow-hidden"
          style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
        >
          <button
            onClick={() => setQty(Math.max(1, qty - 1))}
            className="w-10 h-12 flex items-center justify-center"
          >
            <Minus size={14} style={{ color: TEXT }} />
          </button>
          <span className="w-8 text-center text-sm font-bold" style={{ color: TEXT }}>{qty}</span>
          <button
            onClick={() => setQty(qty + 1)}
            className="w-10 h-12 flex items-center justify-center"
          >
            <Plus size={14} style={{ color: TEXT }} />
          </button>
        </div>
        <button
          onClick={() => onAddToCart(qty)}
          className="flex-1 h-12 rounded-2xl font-bold"
          style={{
            background: `linear-gradient(135deg, ${AMBER} 0%, ${AMBER_DEEP} 100%)`,
            color: AMBER_ON_BG,
          }}
        >
          Add to cart · {price}
        </button>
      </div>
    </div>
  );
}
