import { ArrowRight } from 'lucide-react';
import TopBar from '@/components/shared/TopBar';
import VehicleBar from '@/components/shared/VehicleBar';
import AIHeroCard from '@/components/home/AIHeroCard';
import CategoryGrid from '@/components/home/CategoryGrid';
import TrendingList from '@/components/home/TrendingList';
import RecentlyViewed from '@/components/home/RecentlyViewed';
import type { TabId } from '@/components/shared/BottomNav';
import type { Part } from '@/types/part';
import { useVehicle } from '@/lib/context/VehicleContext';
import { AMBER, TEXT } from '@/lib/constants/colors';

interface HomeScreenProps {
  onNavigate: (id: TabId) => void;
  onOpenProduct: (part: Part) => void;
  onOpenSwitcher: () => void;
}

export default function HomeScreen({ onNavigate, onOpenProduct, onOpenSwitcher }: HomeScreenProps) {
  const { vehicle } = useVehicle();
  if (!vehicle) return null;

  return (
    <>
      <TopBar />
      <VehicleBar vehicle={vehicle} onOpenSwitcher={onOpenSwitcher} />
      <div className="pb-32">
        <AIHeroCard vehicleName={vehicle.name} onPress={() => onNavigate('diagnose')} />

        <div className="mt-6 px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold" style={{ color: TEXT }}>Shop by category</h2>
            <button
              onClick={() => onNavigate('parts')}
              className="text-xs font-semibold flex items-center gap-1"
              style={{ color: AMBER }}
            >
              SEE ALL <ArrowRight size={12} />
            </button>
          </div>
          <CategoryGrid onSelect={() => onNavigate('parts')} />
        </div>

        <div className="mt-6 px-4">
          <TrendingList
            vehicleYear={vehicle.year}
            vehicleModel={vehicle.model}
            onSelectProduct={onOpenProduct}
          />
        </div>

        <div className="mt-6 px-4">
          <RecentlyViewed onSelectProduct={onOpenProduct} />
        </div>
      </div>
    </>
  );
}
