import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sileo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Modificamos el título y la descripción para el SEO y la pestaña del navegador
export const metadata: Metadata = {
  title: "Padel Nexus",
  description:
    "Sistema integral para gestión de torneos, rankings y reservas de pádel.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Cambiamos el idioma de "en" a "es"
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                if (theme === 'light') {
                  document.documentElement.classList.add('light');
                } else {
                  document.documentElement.classList.remove('light');
                }
              } catch (e) {}
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster
          position="top-right"
          options={{
            fill: "#0b0b0b",
            roundness: 14,
            styles: {
              title: "!text-white !font-bold",
              description: "!text-gray-300",
              badge: "!bg-[#cbfe01] !text-black",
            },
          }}
        />
      </body>
    </html>
  );
}
