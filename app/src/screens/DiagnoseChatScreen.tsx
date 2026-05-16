import { useState } from 'react';
import { Send, Sparkles, ShoppingCart } from 'lucide-react';
import TopBar from '@/components/shared/TopBar';
import VehicleBar from '@/components/shared/VehicleBar';
import ChatBubble from '@/components/diagnose/ChatBubble';
import DiagnosticSteps from '@/components/diagnose/DiagnosticSteps';
import PartCardInline from '@/components/diagnose/PartCardInline';
import SystemMessage from '@/components/diagnose/SystemMessage';
import ThinkingIndicator from '@/components/diagnose/ThinkingIndicator';
import type { Part } from '@/types/part';
import { useVehicle } from '@/lib/context/VehicleContext';
import { useCart } from '@/lib/context/CartContext';
import { useDiagnose } from '@/lib/hooks/useDiagnose';
import {
  initialAIMessage, diagnoseSuggestionChips, type Confidence,
} from '@/lib/mock-data/diagnoses';
import {
  AMBER, AMBER_DEEP, AMBER_ON_BG, BG, BORDER, SURFACE, TEXT, TEXT_DIM,
} from '@/lib/constants/colors';

interface ChatMessage {
  role: 'user' | 'ai' | 'ai-steps' | 'ai-parts' | 'system';
  text?: string;
  confidence?: Confidence;
  steps?: string[];
  parts?: Part[];
}

interface DiagnoseChatScreenProps {
  onOpenSwitcher: () => void;
  onOpenProduct: (part: Part) => void;
}

export default function DiagnoseChatScreen({ onOpenSwitcher, onOpenProduct }: DiagnoseChatScreenProps) {
  const { vehicle } = useVehicle();
  const { addItem } = useCart();
  const { diagnose } = useDiagnose();
  const [input, setInput] = useState('');
  const [stage, setStage] = useState<'initial' | 'thinking' | 'diagnosed'>('initial');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { role: 'ai', text: initialAIMessage(vehicle?.name ?? 'your truck') },
  ]);

  if (!vehicle) return null;

  const send = async (text: string) => {
    if (!text.trim() || stage !== 'initial') return;
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setInput('');
    setStage('thinking');

    const response = await diagnose(vehicle, text);

    setMessages((prev) => [
      ...prev,
      { role: 'ai', text: response.text, confidence: response.confidence },
      { role: 'ai-steps', steps: response.steps },
      {
        role: 'ai-parts',
        text: `Here's what you'll likely need. All confirmed to fit your ${vehicle.year} ${vehicle.model} ${vehicle.engine.split(' ')[0]}:`,
        parts: response.parts,
      },
    ]);
    setStage('diagnosed');
  };

  const lastPartsMessage = messages.find((m) => m.role === 'ai-parts');
  const lastParts = lastPartsMessage?.parts ?? [];
  const addAll = () => {
    lastParts.forEach((p) => addItem(p, 1));
    setMessages((prev) => [...prev, { role: 'system', text: `Added ${lastParts.length} parts to cart.` }]);
  };

  return (
    <>
      <TopBar />
      <VehicleBar vehicle={vehicle} onOpenSwitcher={onOpenSwitcher} />
      <div className="pb-40">
        <div className="px-4 pt-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: SURFACE, border: `1px solid ${AMBER}33` }}
            >
              <Sparkles size={20} style={{ color: AMBER }} />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: AMBER }}>
                AI Diagnostics
              </p>
              <h1 className="text-xl font-bold" style={{ color: TEXT }}>
                Diagnose {vehicle.name}
              </h1>
            </div>
          </div>
        </div>

        <div className="px-4 mt-5 space-y-3">
          {messages.map((m, i) => {
            if (m.role === 'user' || m.role === 'ai') {
              return <ChatBubble key={i} role={m.role} text={m.text ?? ''} confidence={m.confidence} />;
            }
            if (m.role === 'system') {
              return <SystemMessage key={i} text={m.text ?? ''} />;
            }
            if (m.role === 'ai-steps') {
              return <DiagnosticSteps key={i} steps={m.steps ?? []} />;
            }
            if (m.role === 'ai-parts') {
              return (
                <div key={i} className="flex justify-start">
                  <div
                    className="max-w-[90%] w-full p-3 rounded-2xl"
                    style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderBottomLeftRadius: '0.5rem' }}
                  >
                    <p className="text-sm leading-relaxed" style={{ color: TEXT }}>{m.text}</p>
                    {(m.parts ?? []).map((p) => (
                      <PartCardInline
                        key={p.id}
                        part={p}
                        onAdd={() => addItem(p, 1)}
                        onView={() => onOpenProduct(p)}
                      />
                    ))}
                    <button
                      onClick={addAll}
                      className="w-full mt-3 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
                      style={{
                        background: `linear-gradient(135deg, ${AMBER} 0%, ${AMBER_DEEP} 100%)`,
                        color: AMBER_ON_BG,
                      }}
                    >
                      <ShoppingCart size={14} /> Add all {(m.parts ?? []).length} parts
                    </button>
                  </div>
                </div>
              );
            }
            return null;
          })}
          {stage === 'thinking' && <ThinkingIndicator />}
        </div>

        {stage === 'initial' && (
          <div className="px-4 mt-5">
            <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: TEXT_DIM }}>
              Common 7.3L issues
            </p>
            <div className="flex flex-wrap gap-2">
              {diagnoseSuggestionChips.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="px-3 py-2 rounded-full text-xs font-medium"
                  style={{ background: SURFACE, color: TEXT_DIM, border: `1px solid ${BORDER}` }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        className="fixed bottom-[72px] left-0 right-0 px-4 pb-3 pt-3 z-20"
        style={{ background: `linear-gradient(to top, ${BG} 60%, ${BG}00 100%)` }}
      >
        <div
          className="flex items-center gap-2 rounded-2xl px-4 py-2.5"
          style={{ background: SURFACE, border: `1px solid ${BORDER}` }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send(input)}
            placeholder={stage === 'diagnosed' ? 'Ask a follow-up...' : 'Describe the issue...'}
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: TEXT }}
          />
          <button
            onClick={() => send(input)}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${AMBER} 0%, ${AMBER_DEEP} 100%)` }}
          >
            <Send size={14} style={{ color: AMBER_ON_BG }} />
          </button>
        </div>
      </div>
    </>
  );
}
