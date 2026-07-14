import Navbar from "@/components/layout/Navbar";
import SoporteChat from "@/components/soporte/SoporteChat";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-brand-black text-brand-white font-sans selection:bg-brand-chartreuse selection:text-brand-black flex flex-col">
      <Navbar />
      <div className="flex-1">{children}</div>
      <SoporteChat />
    </div>
  );
}

