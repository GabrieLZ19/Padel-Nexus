import Navbar from "@/components/layout/Navbar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Movemos las clases globales de fondo y color de selección acá
    <div className="min-h-screen bg-padel-1 text-white font-sans selection:bg-padel-4 selection:text-padel-1 flex flex-col">
      <Navbar />
      <div className="flex-1">{children}</div>
    </div>
  );
}
