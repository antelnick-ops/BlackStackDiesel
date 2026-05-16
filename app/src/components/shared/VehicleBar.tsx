import { Truck, ChevronDown } from 'lucide-react';
import type { Vehicle } from '@/types/vehicle';
import { AMBER, BORDER, SURFACE, SURFACE_2, TEXT, TEXT_DIM, TEXT_MUTED } from '@/lib/constants/colors';

interface VehicleBarProps {
  vehicle: Vehicle;
  onOpenSwitcher: () => void;
}

export default function VehicleBar({ vehicle, onOpenSwitcher }: VehicleBarProps) {
  return (
    <button
      onClick={onOpenSwitcher}
      className="w-full px-4 py-2.5 flex items-center gap-2.5 border-b active:opacity-70"
      style={{ background: SURFACE, borderColor: BORDER }}
    >
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: SURFACE_2 }}>
        <Truck size={13} style={{ color: AMBER }} />
      </div>
      <div className="flex-1 text-left flex items-baseline gap-1.5 min-w-0">
        <span className="text-[10px] font-medium tracking-wider uppercase" style={{ color: TEXT_DIM }}>
          Shopping for
        </span>
        <span className="text-xs font-semibold truncate" style={{ color: TEXT }}>
          {vehicle.year} {vehicle.make} {vehicle.model}
        </span>
        <span className="text-[10px] flex-shrink-0" style={{ color: TEXT_MUTED }}>
          · {vehicle.engine.split(' ')[0]}
        </span>
      </div>
      <span className="text-[10px] font-semibold flex items-center gap-0.5" style={{ color: AMBER }}>
        SWITCH <ChevronDown size={11} />
      </span>
    </button>
  );
}
