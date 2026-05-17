import { X, Truck, Check, Plus } from 'lucide-react';
import type { Vehicle } from '@/types/vehicle';
import {
  AMBER, AMBER_ON_BG, BG, BORDER, OVERLAY, SURFACE, SURFACE_2, TEXT, TEXT_DIM, TEXT_MUTED,
} from '@/lib/constants/colors';

interface VehicleSwitcherProps {
  open: boolean;
  onClose: () => void;
  garage: Vehicle[];
  activeId: number | null;
  onSelect: (id: number) => void;
}

export default function VehicleSwitcher({ open, onClose, garage, activeId, onSelect }: VehicleSwitcherProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: OVERLAY }} onClick={onClose}>
      <div
        className="w-full rounded-t-3xl p-5 pb-8"
        style={{ background: BG, borderTop: `1px solid ${BORDER}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: TEXT }}>Switch vehicle</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: SURFACE }}
          >
            <X size={16} style={{ color: TEXT_MUTED }} />
          </button>
        </div>
        <div className="space-y-2">
          {garage.map((t) => {
            const active = t.id === activeId;
            return (
              <button
                key={t.id}
                onClick={() => {
                  onSelect(t.id);
                  onClose();
                }}
                className="w-full p-3 rounded-2xl flex items-center gap-3 text-left active:opacity-70"
                style={{ background: SURFACE, border: `1px solid ${active ? AMBER : BORDER}` }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: SURFACE_2 }}
                >
                  <Truck size={18} style={{ color: active ? AMBER : TEXT_MUTED }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold" style={{ color: TEXT }}>{t.name}</p>
                    {t.primary && (
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ color: AMBER, background: `${AMBER}15`, border: `1px solid ${AMBER}30` }}
                      >
                        PRIMARY
                      </span>
                    )}
                  </div>
                  <p className="text-[11px]" style={{ color: TEXT_MUTED }}>
                    {t.year} {t.make} {t.model}
                  </p>
                  <p className="text-[11px]" style={{ color: TEXT_DIM }}>{t.engine}</p>
                </div>
                {active && (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: AMBER }}
                  >
                    <Check size={12} style={{ color: AMBER_ON_BG }} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
          <button
            className="w-full p-3 rounded-2xl flex items-center justify-center gap-2 mt-3"
            style={{ background: SURFACE_2, border: `1px dashed ${BORDER}` }}
          >
            <Plus size={16} style={{ color: AMBER }} />
            <span className="text-sm font-semibold" style={{ color: AMBER }}>Add a truck</span>
          </button>
        </div>
      </div>
    </div>
  );
}
