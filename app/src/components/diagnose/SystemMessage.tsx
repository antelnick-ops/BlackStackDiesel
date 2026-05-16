import { Check } from 'lucide-react';
import { GREEN, GREEN_BG } from '@/lib/constants/colors';

interface SystemMessageProps {
  text: string;
}

export default function SystemMessage({ text }: SystemMessageProps) {
  return (
    <div className="flex justify-center">
      <div
        className="px-3 py-1.5 rounded-full flex items-center gap-1.5"
        style={{ background: GREEN_BG, border: `1px solid ${GREEN}33` }}
      >
        <Check size={11} style={{ color: GREEN }} />
        <span className="text-[11px] font-semibold" style={{ color: GREEN }}>{text}</span>
      </div>
    </div>
  );
}
