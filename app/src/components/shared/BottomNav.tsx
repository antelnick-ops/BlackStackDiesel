import { Home, Wrench, MessageSquare, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AMBER, AMBER_ON_BG, BG, BORDER, TEXT_DIM } from '@/lib/constants/colors';

export type TabId = 'home' | 'parts' | 'diagnose' | 'account';

interface Tab {
  id: TabId;
  label: string;
  Icon: LucideIcon;
}

const TABS: Tab[] = [
  { id: 'home', label: 'Home', Icon: Home },
  { id: 'parts', label: 'Parts', Icon: Wrench },
  { id: 'diagnose', label: 'Diagnose', Icon: MessageSquare },
  { id: 'account', label: 'Account', Icon: User },
];

interface BottomNavProps {
  current: TabId;
  onNavigate: (id: TabId) => void;
  cartCount?: number;
}

export default function BottomNav({ current, onNavigate, cartCount = 0 }: BottomNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t z-30"
      style={{ background: `${BG}f5`, borderColor: BORDER }}
    >
      <div className="flex items-center justify-around px-2 py-2 pb-4">
        {TABS.map(({ id, label, Icon }) => {
          const active = current === id;
          const badge = id === 'parts' ? cartCount : 0;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="flex flex-col items-center gap-1 px-4 py-1.5 min-w-[64px]"
            >
              <div className="relative">
                <Icon
                  size={20}
                  style={{ color: active ? AMBER : TEXT_DIM }}
                  strokeWidth={active ? 2.5 : 2}
                />
                {badge > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center"
                    style={{ background: AMBER, color: AMBER_ON_BG }}
                  >
                    {badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium" style={{ color: active ? AMBER : TEXT_DIM }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
