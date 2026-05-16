import TopBar from '@/components/shared/TopBar';
import ProfileHeader from '@/components/account/ProfileHeader';
import GarageList from '@/components/account/GarageList';
import OrderList from '@/components/account/OrderList';
import SettingsList from '@/components/account/SettingsList';
import { useVehicle } from '@/lib/context/VehicleContext';
import { recentOrders } from '@/lib/mock-data/orders';

export default function AccountScreen() {
  const { garage, activeVehicleId } = useVehicle();

  return (
    <>
      <TopBar />
      <div className="pb-28">
        <div className="px-4 pt-4">
          <ProfileHeader initial="N" name="Nantel" location="Winona, MO" />
        </div>

        <div className="px-4 mt-6">
          <GarageList garage={garage} activeVehicleId={activeVehicleId} />
        </div>

        <div className="px-4 mt-6">
          <OrderList orders={recentOrders} />
        </div>

        <div className="px-4 mt-6">
          <SettingsList />
        </div>
      </div>
    </>
  );
}
