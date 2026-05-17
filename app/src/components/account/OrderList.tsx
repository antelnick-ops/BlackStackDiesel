import { Package } from 'lucide-react';
import type { Order } from '@/types/order';
import { BORDER, GREEN, GREEN_BG, GREEN_BORDER, SURFACE, SURFACE_2, TEXT, TEXT_MUTED } from '@/lib/constants/colors';

interface OrderListProps {
  orders: Order[];
}

export default function OrderList({ orders }: OrderListProps) {
  return (
    <div>
      <h2 className="text-sm font-bold mb-2.5" style={{ color: TEXT }}>Recent orders</h2>
      <div className="space-y-2">
        {orders.map((o) => (
          <div
            key={o.id}
            className="p-3 rounded-2xl flex items-center gap-3"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: SURFACE_2 }}>
              <Package size={16} style={{ color: TEXT_MUTED }} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ color: TEXT }}>{o.id}</p>
              <p className="text-[11px]" style={{ color: TEXT_MUTED }}>{o.date} · {o.total}</p>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded"
              style={{ color: GREEN, background: GREEN_BG, border: `1px solid ${GREEN_BORDER}` }}
            >
              {o.status.toUpperCase()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
