import { Sparkles } from 'lucide-react';
import { AMBER, BORDER, SURFACE, TEXT_MUTED } from '@/lib/constants/colors';

export default function ThinkingIndicator() {
  return (
    <div className="flex justify-start">
      <div
        className="p-3 rounded-2xl flex items-center gap-2"
        style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderBottomLeftRadius: '0.5rem' }}
      >
        <Sparkles size={14} style={{ color: AMBER }} className="animate-pulse" />
        <span className="text-xs" style={{ color: TEXT_MUTED }}>Diagnosing...</span>
      </div>
    </div>
  );
}
