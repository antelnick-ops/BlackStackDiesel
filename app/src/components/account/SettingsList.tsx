import { MapPin, Bell, Settings, LogOut, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BORDER, DANGER, SURFACE, TEXT, TEXT_DIM, TEXT_MUTED } from '@/lib/constants/colors';

interface SettingItem {
  label: string;
  Icon: LucideIcon;
  danger?: boolean;
}

const ITEMS: SettingItem[] = [
  { label: 'Shipping address', Icon: MapPin },
  { label: 'Notifications', Icon: Bell },
  { label: 'Preferences', Icon: Settings },
  { label: 'Sign out', Icon: LogOut, danger: true },
];

export default function SettingsList() {
  return (
    <div>
      <h2 className="text-sm font-bold mb-2.5" style={{ color: TEXT }}>Settings</h2>
      <div className="rounded-2xl overflow-hidden" style={{ background: SURFACE, border: `1px solid ${BORDER}` }}>
        {ITEMS.map((s, i) => (
          <button
            key={s.label}
            className="w-full flex items-center gap-3 px-4 py-3 active:opacity-70"
            style={{ borderTop: i > 0 ? `1px solid ${BORDER}` : 'none' }}
          >
            <s.Icon size={16} style={{ color: s.danger ? DANGER : TEXT_MUTED }} />
            <span
              className="text-sm flex-1 text-left"
              style={{ color: s.danger ? DANGER : TEXT }}
            >
              {s.label}
            </span>
            {!s.danger && <ChevronRight size={14} style={{ color: TEXT_DIM }} />}
          </button>
        ))}
      </div>
    </div>
  );
}
