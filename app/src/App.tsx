import { useState } from 'react';
import { PreferencesProvider } from '@/lib/context/PreferencesContext';
import { VehicleProvider, useVehicle } from '@/lib/context/VehicleContext';
import { CartProvider, useCart } from '@/lib/context/CartContext';
import { ConversationProvider } from '@/lib/context/ConversationContext';
import BottomNav, { type TabId } from '@/components/shared/BottomNav';
import VehicleSwitcher from '@/components/shared/VehicleSwitcher';
import HomeScreen from '@/screens/HomeScreen';
import PartsScreen from '@/screens/PartsScreen';
import ProductScreen from '@/screens/ProductScreen';
import DiagnoseChatScreen from '@/screens/DiagnoseChatScreen';
import AccountScreen from '@/screens/AccountScreen';
import type { Part } from '@/types/part';
import { BG, TEXT } from '@/lib/constants/colors';

type Screen = TabId | 'product';

function AppShell() {
  const { garage, activeVehicleId, switchVehicle } = useVehicle();
  const { count: cartCount } = useCart();
  const [screen, setScreen] = useState<Screen>('home');
  const [previousScreen, setPreviousScreen] = useState<Screen>('home');
  const [activeProduct, setActiveProduct] = useState<Part | undefined>(undefined);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  const navigate = (next: TabId) => {
    setPreviousScreen(screen);
    setScreen(next);
  };

  const openProduct = (part: Part) => {
    setActiveProduct(part);
    setPreviousScreen(screen);
    setScreen('product');
  };

  const goBack = () => setScreen(previousScreen);

  return (
    <div
      className="min-h-screen"
      style={{ background: BG, color: TEXT, fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {screen === 'home' && (
        <HomeScreen
          onNavigate={navigate}
          onOpenProduct={openProduct}
          onOpenSwitcher={() => setSwitcherOpen(true)}
        />
      )}
      {screen === 'parts' && (
        <PartsScreen onOpenProduct={openProduct} onOpenSwitcher={() => setSwitcherOpen(true)} />
      )}
      {screen === 'product' && <ProductScreen part={activeProduct} onBack={goBack} />}
      {screen === 'diagnose' && (
        <DiagnoseChatScreen
          onOpenSwitcher={() => setSwitcherOpen(true)}
          onOpenProduct={openProduct}
        />
      )}
      {screen === 'account' && <AccountScreen />}

      {screen !== 'product' && (
        <BottomNav current={screen as TabId} onNavigate={navigate} cartCount={cartCount} />
      )}

      <VehicleSwitcher
        open={switcherOpen}
        onClose={() => setSwitcherOpen(false)}
        garage={garage}
        activeId={activeVehicleId}
        onSelect={switchVehicle}
      />
    </div>
  );
}

export default function App() {
  return (
    <PreferencesProvider>
      <VehicleProvider>
        <CartProvider>
          <ConversationProvider>
            <AppShell />
          </ConversationProvider>
        </CartProvider>
      </VehicleProvider>
    </PreferencesProvider>
  );
}
