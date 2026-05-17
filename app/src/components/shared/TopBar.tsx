import { Zap, Bell, ChevronLeft } from 'lucide-react';
import { AMBER, BG, BORDER, SURFACE, SURFACE_2, TEXT, TEXT_MUTED } from '@/lib/constants/colors';

interface TopBarProps {
  showBack?: boolean;
  onBack?: () => void;
}

export default function TopBar({ showBack, onBack }: TopBarProps) {
  return (
    <header
      className="sticky top-0 z-30 backdrop-blur-xl border-b"
      style={{ background: `${BG}cc`, borderColor: BORDER }}
    >
      <div className="flex items-center justify-between px-4 py-3">
        {showBack ? (
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center active:opacity-70"
            style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
          >
            <ChevronLeft size={18} style={{ color: TEXT }} />
          </button>
        ) : (
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: SURFACE_2, border: `1px solid ${BORDER}` }}
            >
              <Zap size={16} style={{ color: AMBER }} fill={AMBER} />
            </div>
            <span className="font-bold tracking-wide text-[15px]" style={{ color: TEXT }}>
              BLACK<span style={{ color: AMBER }}>/</span>STACK
            </span>
          </div>
        )}
        <button
          className="w-10 h-10 rounded-full flex items-center justify-center active:opacity-70 relative"
          style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
        >
          <Bell size={16} style={{ color: TEXT_MUTED }} />
          <span
            className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full"
            style={{ background: AMBER }}
          />
        </button>
      </div>
    </header>
  );
}
