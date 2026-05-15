"use client";

import Link from "next/link";
import { Search, Menu, Phone, Mail, ShoppingCart, User, Download, FileText } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSettings } from "@/hooks/useSettings";
import { useCart } from "@/hooks/useCart";

export function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const { featuredSeason, isLoaded } = useSettings();
  const { cartItems, isLoaded: cartLoaded } = useCart();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      
      const { supabase } = await import("@/lib/supabase");
      const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
      
      if (error) throw error;
      
      const products = data || [];
      
      const { generatePdfCatalog } = await import("@/utils/pdfGenerator");
      await generatePdfCatalog(products);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Hubo un error al generar el PDF.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/catalog?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      {/* Top bar */}
      <div className="bg-primary-900 text-white text-xs py-2 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <p>Expertos en promocionales corporativos</p>
        <div className="flex space-x-4">
          <a href="tel:+524491170951" className="flex items-center hover:text-primary-100 transition-colors">
            <Phone className="w-3 h-3 mr-1" /> 449-117-0951
          </a>
          <a href="mailto:ventas@geekystore.mx" className="flex items-center hover:text-primary-100 transition-colors hidden sm:flex">
            <Mail className="w-3 h-3 mr-1" /> ventas@geekystore.mx
          </a>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="text-3xl font-bold tracking-tight flex items-center gap-0.5" style={{ fontFamily: 'Museo, sans-serif' }}>
              <span className="text-secondary-500">{'</'}</span>
              <span className="text-primary-500">geeky</span>
              <span className="text-secondary-500">store</span>
              <span className="text-secondary-500">{'>'}</span>
            </Link>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8 hidden md:block">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Busca tazas, termos, mochilas..."
                className="w-full bg-gray-100 border border-transparent text-gray-900 text-sm rounded-md focus:ring-primary-500 focus:border-primary-500 block p-2.5 pl-10 transition-all shadow-sm"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-gray-500" />
              </div>
              <button type="submit" className="absolute inset-y-0 right-0 bg-primary-600 text-white px-4 rounded-r-md hover:bg-primary-700 transition-colors text-sm font-medium">
                Buscar
              </button>
            </form>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button 
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 text-gray-600 hover:text-primary-600 font-medium text-sm transition-colors hidden lg:flex"
              title="Descargar Catálogo PDF"
            >
              <FileText className="w-5 h-5 text-primary-900" />
              <span>{isGeneratingPdf ? 'Generando...' : 'Catálogo PDF'}</span>
            </button>
            <Link href="/catalog" className="text-gray-600 hover:text-primary-600 font-medium text-sm hidden lg:block">
              Ver todo
            </Link>
            <Link href="/cart" className="bg-primary-50 text-primary-700 hover:bg-primary-100 p-2 rounded-full relative transition-colors">
              <ShoppingCart className="w-5 h-5" />
              {cartLoaded && cartItems.length > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full shadow-sm">
                  {cartItems.length}
                </span>
              )}
            </Link>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden text-gray-500 hover:text-gray-900 p-2">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      {/* Navigation */}
      <nav className={`bg-white border-t ${isMobileMenuOpen ? 'block' : 'hidden'} md:block`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ul className="flex flex-col md:flex-row md:space-x-8 py-3 text-sm font-medium text-gray-600 gap-4 md:gap-0">
            <li><Link href="/catalog?category=Tazas+y+Cilindros" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-primary-600 block py-2 md:py-0">Tazas y Cilindros</Link></li>
            <li><Link href="/catalog?category=Tecnología" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-primary-600 block py-2 md:py-0">Tecnología</Link></li>
            <li><Link href="/catalog?category=Oficina" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-primary-600 block py-2 md:py-0">Oficina</Link></li>
            <li><Link href="/catalog?category=Hogar" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-primary-600 block py-2 md:py-0">Hogar</Link></li>
            <li><Link href="/catalog?category=Ecológicos" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-primary-600 text-green-600 block py-2 md:py-0">🌿 Ecológicos</Link></li>
            
            {/* Mobile-only menu items */}
            <li className="md:hidden border-t pt-4 mt-2">
              <button 
                onClick={() => { handleDownloadPdf(); setIsMobileMenuOpen(false); }} 
                disabled={isGeneratingPdf} 
                className="flex items-center gap-2 text-gray-600 hover:text-primary-600 w-full text-left py-2"
              >
                <FileText className="w-5 h-5 text-primary-900" />
                <span>{isGeneratingPdf ? 'Generando...' : 'Descargar Catálogo PDF'}</span>
              </button>
            </li>
            <li className="md:hidden">
              <Link href="/catalog" onClick={() => setIsMobileMenuOpen(false)} className="text-gray-600 hover:text-primary-600 block py-2 font-bold">Ver todo el catálogo</Link>
            </li>

            <li className="flex-grow hidden md:block"></li>
            {isLoaded && featuredSeason && (
              <li><Link href={`/catalog?season=${encodeURIComponent(featuredSeason)}`} onClick={() => setIsMobileMenuOpen(false)} className="hover:text-red-600 text-red-500 block py-2 md:py-0">✨ Especial {featuredSeason}</Link></li>
            )}
          </ul>
        </div>
      </nav>
    </header>
  );
}
