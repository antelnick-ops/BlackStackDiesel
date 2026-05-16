import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage/localStorage';

interface Preferences {
  hasOnboarded: boolean;
  shareAnonymizedData: boolean;
}

// Phase 2 defaults: hasOnboarded=true so the seeded garage loads on first launch.
// Phase 3 flips this to false to gate behind the onboarding flow.
const DEFAULT_PREFERENCES: Preferences = {
  hasOnboarded: true,
  shareAnonymizedData: true,
};

interface PreferencesContextValue {
  preferences: Preferences;
  setHasOnboarded: (v: boolean) => void;
  setShareAnonymizedData: (v: boolean) => void;
  reset: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<Preferences>(() =>
    getItem<Preferences>(STORAGE_KEYS.preferences, DEFAULT_PREFERENCES)
  );

  useEffect(() => {
    setItem(STORAGE_KEYS.preferences, preferences);
  }, [preferences]);

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        setHasOnboarded: (v) => setPreferences((p) => ({ ...p, hasOnboarded: v })),
        setShareAnonymizedData: (v) => setPreferences((p) => ({ ...p, shareAnonymizedData: v })),
        reset: () => setPreferences(DEFAULT_PREFERENCES),
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
