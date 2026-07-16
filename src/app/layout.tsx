import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CanonicalLink } from "@/components/CanonicalLink";
import { FloatingAdminButton } from "@/components/FloatingAdminButton";

export const metadata: Metadata = {
  metadataBase: new URL('https://www.geekystore.mx'),
  title: {
    default: "geekystore | Catálogo B2B de Artículos Promocionales",
    template: "%s | geekystore"
  },
  description: "Encuentra los mejores productos promocionales para tu empresa. Cotiza al por mayor tazas, tecnología, ecológicos y más. Especialistas en B2B.",
  keywords: ["artículos promocionales", "regalos corporativos", "b2b", "merchandising empresarial", "promocionales personalizados", "regalos para clientes"],
  openGraph: {
    type: "website",
    locale: "es_MX",
    url: "https://www.geekystore.mx",
    title: "geekystore | Catálogo B2B de Artículos Promocionales",
    description: "Encuentra los mejores productos promocionales para tu empresa. Cotiza al por mayor tazas, tecnología, ecológicos y más.",
    siteName: "geekystore"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="flex flex-col min-h-screen bg-gray-50">
        <CanonicalLink />
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
        <FloatingAdminButton />
      </body>
    </html>
  );
}
