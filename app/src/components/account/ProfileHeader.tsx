import { AMBER, BORDER, SURFACE_2, TEXT, TEXT_MUTED } from '@/lib/constants/colors';

interface ProfileHeaderProps {
  initial: string;
  name: string;
  location: string;
}

export default function ProfileHeader({ initial, name, location }: ProfileHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
        style={{ background: SURFACE_2, color: TEXT, border: `1px solid ${BORDER}` }}
      >
        {initial}
      </div>
      <div>
        <p className="text-lg font-bold" style={{ color: TEXT }}>{name}</p>
        <p className="text-xs" style={{ color: TEXT_MUTED }}>{location}</p>
        <div className="flex items-center gap-1 mt-1">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: AMBER }} />
          <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: AMBER }}>
            BSD Member
          </span>
        </div>
      </div>
    </div>
  );
}
