import { useState, useMemo } from 'react';
import TopBar from '@/components/shared/TopBar';
import VehicleBar from '@/components/shared/VehicleBar';
import SearchBar from '@/components/parts/SearchBar';
import CategoryChips from '@/components/parts/CategoryChips';
import FitmentToggle from '@/components/parts/FitmentToggle';
import ProductCard from '@/components/parts/ProductCard';
import type { Part } from '@/types/part';
import { useVehicle } from '@/lib/context/VehicleContext';
import { allParts, partsCategoryChips } from '@/lib/mock-data/parts';
import { TEXT_DIM } from '@/lib/constants/colors';

interface PartsScreenProps {
  onOpenProduct: (part: Part) => void;
  onOpenSwitcher: () => void;
}

export default function PartsScreen({ onOpenProduct, onOpenSwitcher }: PartsScreenProps) {
  const { vehicle } = useVehicle();
  const [activeCategory, setActiveCategory] = useState('All');
  const [fitsOnly, setFitsOnly] = useState(true);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = allParts;
    if (fitsOnly) result = result.filter((p) => p.fits);
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(needle) || p.brand.toLowerCase().includes(needle)
      );
    }
    return result;
  }, [fitsOnly, search]);

  if (!vehicle) return null;

  return (
    <>
      <TopBar />
      <VehicleBar vehicle={vehicle} onOpenSwitcher={onOpenSwitcher} />
      <div className="pb-28">
        <div className="px-4 pt-4">
          <SearchBar value={search} onChange={setSearch} />
        </div>

        <div className="mt-4">
          <CategoryChips
            categories={partsCategoryChips}
            active={activeCategory}
            onSelect={setActiveCategory}
          />
        </div>

        <div className="mx-4 mt-4">
          <FitmentToggle fitsOnly={fitsOnly} onToggle={() => setFitsOnly(!fitsOnly)} />
        </div>

        <div className="px-4 mt-3 mb-3">
          <p className="text-xs" style={{ color: TEXT_DIM }}>
            {filtered.length} of {allParts.length} parts
          </p>
        </div>

        <div className="px-4 grid grid-cols-2 gap-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} part={p} onPress={() => onOpenProduct(p)} />
          ))}
        </div>
      </div>
    </>
  );
}
