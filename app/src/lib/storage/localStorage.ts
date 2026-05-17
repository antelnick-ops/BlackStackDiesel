const PREFIX = 'bsd:';

export function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // quota exceeded or storage disabled — silently ignore
  }
}

export function removeItem(key: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PREFIX + key);
}

export const STORAGE_KEYS = {
  garage: 'garage',
  activeVehicle: 'active_vehicle',
  cart: 'cart',
  preferences: 'preferences',
  conversations: 'conversations',
  conversationIndex: 'conversation_index',
  partReferences: 'part_references',
  analyticsEvents: 'analytics_events',
} as const;
