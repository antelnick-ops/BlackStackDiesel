import { Wrench } from 'lucide-react';
import { AMBER, BORDER, SURFACE, SURFACE_2, TEXT } from '@/lib/constants/colors';

interface DiagnosticStepsProps {
  title?: string;
  steps: string[];
}

export default function DiagnosticSteps({ title = 'Diagnostic steps', steps }: DiagnosticStepsProps) {
  return (
    <div className="flex justify-start">
      <div
        className="max-w-[90%] rounded-2xl overflow-hidden"
        style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderBottomLeftRadius: '0.5rem' }}
      >
        <div className="px-3 pt-3 pb-2 flex items-center gap-2">
          <Wrench size={13} style={{ color: AMBER }} />
          <p className="text-[11px] font-bold tracking-wider uppercase" style={{ color: AMBER }}>{title}</p>
        </div>
        <div className="px-3 pb-3 space-y-2">
          {steps.map((s, j) => (
            <div key={j} className="flex gap-2.5">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: SURFACE_2, border: `1px solid ${BORDER}` }}
              >
                <span className="text-[10px] font-bold" style={{ color: AMBER }}>{j + 1}</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: TEXT }}>{s}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
