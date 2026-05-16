import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { Vehicle } from '@/types/vehicle';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage/localStorage';
import { seededGarage } from '@/lib/mock-data/garage';
import { usePreferences } from './PreferencesContext';

interface VehicleContextValue {
  garage: Vehicle[];
  activeVehicleId: number | null;
  vehicle: Vehicle | null;
  switchVehicle: (id: number) => void;
  addVehicle: (v: Omit<Vehicle, 'id'>) => Vehicle;
  setPrimary: (id: number) => void;
}

const VehicleContext = createContext<VehicleContextValue | null>(null);

export function VehicleProvider({ children }: { children: ReactNode }) {
  const { preferences } = usePreferences();

  const [garage, setGarage] = useState<Vehicle[]>(() => {
    if (!preferences.hasOnboarded) return [];
    return getItem<Vehicle[]>(STORAGE_KEYS.garage, seededGarage);
  });

  const [activeVehicleId, setActiveVehicleId] = useState<number | null>(() => {
    if (!preferences.hasOnboarded) return null;
    const fallback = seededGarage.find((v) => v.primary)?.id ?? seededGarage[0]?.id ?? null;
    return getItem<number | null>(STORAGE_KEYS.activeVehicle, fallback);
  });

  useEffect(() => {
    setItem(STORAGE_KEYS.garage, garage);
  }, [garage]);

  useEffect(() => {
    setItem(STORAGE_KEYS.activeVehicle, activeVehicleId);
  }, [activeVehicleId]);

  const vehicle = useMemo(
    () => garage.find((v) => v.id === activeVehicleId) ?? null,
    [garage, activeVehicleId]
  );

  const switchVehicle = (id: number) => setActiveVehicleId(id);

  const addVehicle = (v: Omit<Vehicle, 'id'>): Vehicle => {
    const id = garage.length === 0 ? 1 : Math.max(...garage.map((g) => g.id)) + 1;
    const created: Vehicle = { ...v, id };
    setGarage((prev) => [...prev, created]);
    return created;
  };

  const setPrimary = (id: number) => {
    setGarage((prev) => prev.map((v) => ({ ...v, primary: v.id === id })));
  };

  return (
    <VehicleContext.Provider
      value={{ garage, activeVehicleId, vehicle, switchVehicle, addVehicle, setPrimary }}
    >
      {children}
    </VehicleContext.Provider>
  );
}

export function useVehicle() {
  const ctx = useContext(VehicleContext);
  if (!ctx) throw new Error('useVehicle must be used within VehicleProvider');
  return ctx;
}
