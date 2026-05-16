import { Sparkles, ArrowRight } from 'lucide-react';
import { AMBER, SURFACE, TEXT, TEXT_MUTED } from '@/lib/constants/colors';

interface AIHeroCardProps {
  vehicleName: string;
  onPress: () => void;
}

export default function AIHeroCard({ vehicleName, onPress }: AIHeroCardProps) {
  return (
    <button
      onClick={onPress}
      className="mx-4 mt-4 p-4 rounded-2xl w-[calc(100%-2rem)] text-left active:scale-[0.99] transition-transform"
      style={{ background: SURFACE, border: `1px solid ${AMBER}33` }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${AMBER}1a`, border: `1px solid ${AMBER}33` }}
        >
          <Sparkles size={18} style={{ color: AMBER }} />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: AMBER }}>
            AI Diagnostics
          </p>
          <p className="font-semibold text-[17px] leading-tight mt-1" style={{ color: TEXT }}>
            {vehicleName} acting up?
          </p>
          <p className="text-xs mt-1.5 leading-relaxed" style={{ color: TEXT_MUTED }}>
            Describe the symptoms. Get likely causes, repair steps, and the exact parts you'll need.
          </p>
        </div>
        <ArrowRight size={18} style={{ color: AMBER }} className="mt-2" />
      </div>
    </button>
  );
}
