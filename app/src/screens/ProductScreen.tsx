import TopBar from '@/components/shared/TopBar';
import ProductHero from '@/components/product/ProductHero';
import PriceBlock from '@/components/product/PriceBlock';
import FitmentList from '@/components/product/FitmentList';
import SpecsList from '@/components/product/SpecsList';
import StickyCart from '@/components/product/StickyCart';
import type { Part } from '@/types/part';
import { useVehicle } from '@/lib/context/VehicleContext';
import { useCart } from '@/lib/context/CartContext';
import { featuredProduct } from '@/lib/mock-data/parts';
import { featuredProductFitment, featuredProductSpecs } from '@/lib/mock-data/fitment';
import { TEXT, TEXT_DIM, TEXT_MUTED } from '@/lib/constants/colors';

interface ProductScreenProps {
  part?: Part;
  onBack: () => void;
}

export default function ProductScreen({ part, onBack }: ProductScreenProps) {
  const { vehicle } = useVehicle();
  const { addItem } = useCart();
  const product = part ?? featuredProduct;

  const handleAddToCart = (qty: number) => {
    addItem(product, qty);
    onBack();
  };

  return (
    <>
      <TopBar showBack onBack={onBack} />
      <div className="pb-44">
        <ProductHero brand={product.brand} />

        <div className="px-4 pt-5">
          <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: TEXT_DIM }}>
            Suspension · Shocks & Struts
          </p>
          <h1 className="text-2xl font-bold leading-tight mt-1.5" style={{ color: TEXT }}>
            {product.name}
          </h1>
          <p className="text-sm mt-1" style={{ color: TEXT_MUTED }}>
            F-250 Super Duty 4WD · 4.5"–8" Lift
          </p>
        </div>

        <PriceBlock price={product.price} vehicle={vehicle} />
        <FitmentList fitment={featuredProductFitment} />
        <SpecsList specs={featuredProductSpecs} />
      </div>

      <StickyCart price={product.price} onAddToCart={handleAddToCart} />
    </>
  );
}
