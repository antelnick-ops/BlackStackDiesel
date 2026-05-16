import { Truck, ChevronRight } from 'lucide-react';
import type { Vehicle } from '@/types/vehicle';
import { AMBER, BORDER, SURFACE, SURFACE_2, TEXT, TEXT_DIM, TEXT_MUTED } from '@/lib/constants/colors';

interface GarageListProps {
  garage: Vehicle[];
  activeVehicleId: number | null;
}

export default function GarageList({ garage, activeVehicleId }: GarageListProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-sm font-bold" style={{ color: TEXT }}>My Garage</h2>
        <button className="text-xs font-semibold" style={{ color: AMBER }}>+ Add truck</button>
      </div>
      <div className="space-y-2">
        {garage.map((t) => {
          const active = t.id === activeVehicleId;
          return (
            <div
              key={t.id}
              className="p-3 rounded-2xl flex items-center gap-3"
              style={{ background: SURFACE, border: `1px solid ${active ? AMBER : BORDER}` }}
            >
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: SURFACE_2 }}>
                <Truck size={18} style={{ color: active ? AMBER : TEXT_MUTED }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold" style={{ color: TEXT }}>{t.name}</p>
                  {active && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{ color: AMBER, background: `${AMBER}15`, border: `1px solid ${AMBER}30` }}
                    >
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-[11px]" style={{ color: TEXT_MUTED }}>
                  {t.year} {t.make} {t.model}
                </p>
                <p className="text-[11px]" style={{ color: TEXT_DIM }}>{t.engine}</p>
              </div>
              <ChevronRight size={16} style={{ color: TEXT_DIM }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
