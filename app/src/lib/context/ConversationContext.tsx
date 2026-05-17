import { createContext, useContext, type ReactNode } from 'react';

// Phase 2 stub. Phase 4 builds out the full multi-conversation persistence layer
// (conversations[], helpers, image storage, symptom tag extraction, resolution flow).
interface ConversationContextValue {
  conversations: unknown[];
}

const ConversationContext = createContext<ConversationContextValue>({ conversations: [] });

export function ConversationProvider({ children }: { children: ReactNode }) {
  return (
    <ConversationContext.Provider value={{ conversations: [] }}>
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversations() {
  return useContext(ConversationContext);
}
