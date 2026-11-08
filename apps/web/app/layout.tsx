import type { Metadata } from "next";
import { Toaster } from "sileo";
import { sileoToastStyles } from "@/utils/sileoStyles";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Padel Nexus",
    template: "%s · Padel Nexus",
  },
  description:
    "Torneos, ranking oficial, reservas de canchas y marketplace de pádel en un solo lugar.",
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
      className="h-full antialiased"
      suppressHydrationWarning
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
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <Toaster
          position="top-right"
          theme="dark"
          options={{
            fill: "#0b0b0b",
            roundness: 14,
            styles: sileoToastStyles,
          }}
        />
      </body>
    </html>
  );
}
