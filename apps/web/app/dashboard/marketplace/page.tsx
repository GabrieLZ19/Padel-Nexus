"use client";

import MarketplaceCrmPanel from "@/components/marketplace/MarketplaceCrmPanel";
import { useProfileStore } from "@/store/useProfileStore";

export default function DashboardMarketplacePage() {
  const { profile } = useProfileStore();
  const esSuperadmin = profile?.rol === "superadmin";

  return (
    <div className="w-full min-w-0 px-4 py-6 md:px-8 lg:px-10 md:py-10">
      <MarketplaceCrmPanel mostrarModeracion={esSuperadmin} />
    </div>
  );
}
