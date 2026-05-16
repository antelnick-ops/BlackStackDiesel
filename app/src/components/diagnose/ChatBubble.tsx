import { Sparkles } from 'lucide-react';
import type { Confidence } from '@/lib/mock-data/diagnoses';
import { AMBER, AMBER_ON_BG, BORDER, SURFACE, TEXT } from '@/lib/constants/colors';

interface ChatBubbleProps {
  role: 'user' | 'ai';
  text: string;
  confidence?: Confidence;
}

export default function ChatBubble({ role, text, confidence }: ChatBubbleProps) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[85%] p-3 rounded-2xl"
          style={{ background: AMBER, color: AMBER_ON_BG, borderBottomRightRadius: '0.5rem' }}
        >
          <p className="text-sm leading-relaxed">{text}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div
        className="max-w-[85%] p-3 rounded-2xl"
        style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderBottomLeftRadius: '0.5rem' }}
      >
        {confidence && (
          <div className="flex items-center gap-1 mb-2">
            <Sparkles size={10} style={{ color: AMBER }} />
            <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: AMBER }}>
              {confidence}
            </span>
          </div>
        )}
        <p className="text-sm leading-relaxed" style={{ color: TEXT }}>{text}</p>
      </div>
    </div>
  );
}
