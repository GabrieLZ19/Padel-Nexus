import Navbar from "@/components/layout/Navbar";
import SoporteChat from "@/components/soporte/SoporteChat";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full max-w-[100vw] flex-col overflow-x-clip bg-brand-black font-sans text-brand-white selection:bg-brand-chartreuse selection:text-brand-black">
      <Navbar />
      <div className="public-content-soporte-fab-safe min-h-0 min-w-0 flex-1">
        {children}
      </div>
      <SoporteChat />
    </div>
  );
}

