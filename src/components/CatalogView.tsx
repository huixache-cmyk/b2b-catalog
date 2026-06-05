"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useProducts } from "@/hooks/useProducts";
import { MATERIALS, Product } from "@/types";
import { useSettings } from "@/hooks/useSettings";
import { ProductCard } from "./ProductCard";
import { Filter, X, ChevronDown, Gift } from "lucide-react";

function getSearchSimilarity(text: string, query: string): number {
  const textLower = text.toLowerCase();
  const queryLower = query.trim().toLowerCase();
  if (!queryLower) return 0;
  
  if (textLower.includes(queryLower)) {
    return textLower.startsWith(queryLower) ? 1.0 : 0.8;
  }

  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
  const textWords = textLower.split(/\s+/).filter(w => w.length > 0);
  
  let matchingWordsCount = 0;
  queryWords.forEach(qWord => {
    if (textWords.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))) {
      matchingWordsCount++;
    }
  });

  if (matchingWordsCount > 0) {
    return (matchingWordsCount / queryWords.length) * 0.5;
  }

  let charsMatched = 0;
  const queryCharSet = new Set(queryLower);
  queryCharSet.forEach(c => {
    if (textLower.includes(c)) {
      charsMatched++;
    }
  });
  const charOverlap = charsMatched / queryCharSet.size;
  if (charOverlap > 0.75) {
    return charOverlap * 0.2;
  }

  return 0;
}

export function CatalogView({ 
  initialProducts, 
  initialCategories, 
  initialSeasons 
}: { 
  initialProducts?: Product[];
  initialCategories?: string[];
  initialSeasons?: string[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { products, isLoaded: productsLoaded } = useProducts(initialProducts);
  const { categories, seasons, homeSettings, isLoaded: settingsLoaded } = useSettings(initialCategories, initialSeasons);
  const isLoaded = productsLoaded && settingsLoaded;
  
  // States
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("Relevancia");
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [maxPrice, setMaxPrice] = useState<number>(500);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 24;
  
  // Promotion Popup State
  const [showPromoPopup, setShowPromoPopup] = useState(false);

  // Sync state when URL params change
  useEffect(() => {
    if (searchParams && settingsLoaded) {
      const catParam = searchParams.get("category");
      if (catParam) {
        const matched = categories.find(c => c.toLowerCase() === catParam.trim().toLowerCase());
        setSelectedCategory(matched || catParam);
      } else {
        setSelectedCategory(null);
      }

      const seasonParam = searchParams.get("season");
      if (seasonParam) {
        const matched = seasons.find(s => s.toLowerCase() === seasonParam.trim().toLowerCase());
        setSelectedSeason(matched || seasonParam);
      } else {
        setSelectedSeason(null);
      }

      setSearchQuery(searchParams.get("q"));
    }
  }, [searchParams, categories, seasons, settingsLoaded]);

  // Trigger catalog promotion popup for new users
  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem("b2b_catalog_promo_dismissed") === "true";
      const isPublished = homeSettings?.promotions?.catalogPromoPublished ?? true;
      if (!dismissed && isPublished && isLoaded) {
        const delaySeconds = homeSettings?.promotions?.catalogPromoDelay ?? 3;
        const timer = setTimeout(() => {
          setShowPromoPopup(true);
        }, delaySeconds * 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [homeSettings, isLoaded]);

  const handleClosePromoPopup = () => {
    setShowPromoPopup(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("b2b_catalog_promo_dismissed", "true");
    }
  };

  const handleClaimCoupons = () => {
    alert("¡Felicidades! Cupones aplicados correctamente. Inicia sesión o regístrate para disfrutarlos.");
    handleClosePromoPopup();
  };

  const filteredProducts = useMemo(() => {
    if (!isLoaded) return [];
    
    let filtered = products.filter((product) => {
      if (product.published === false) return false;
      if (selectedCategory && product.category.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      if (selectedSeason && !product.seasons?.some(s => s.toLowerCase() === selectedSeason.toLowerCase())) return false;
      if (searchQuery) {
        const searchableText = `${product.name} ${product.category} ${product.material} ${product.description} ${product.sku} ${product.colors?.join(" ") || ""} ${product.seasons?.join(" ") || ""}`;
        const score = getSearchSimilarity(searchableText, searchQuery);
        if (score <= 0.15) return false;
      }
      if (product.price > maxPrice) return false;
      return true;
    });
    
    return filtered.sort((a, b) => {
      if (sortBy === "Precio: Menor a Mayor") return a.price - b.price;
      if (sortBy === "Precio: Mayor a Menor") return b.price - a.price;
      if (sortBy === "Más nuevos") return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
      if (sortBy === "Relevancia" && searchQuery) {
        const textA = `${a.name} ${a.category} ${a.material} ${a.description} ${a.sku} ${a.colors?.join(" ") || ""} ${a.seasons?.join(" ") || ""}`;
        const textB = `${b.name} ${b.category} ${b.material} ${b.description} ${b.sku} ${b.colors?.join(" ") || ""} ${b.seasons?.join(" ") || ""}`;
        const scoreA = getSearchSimilarity(textA, searchQuery);
        const scoreB = getSearchSimilarity(textB, searchQuery);
        return scoreB - scoreA;
      }
      return 0;
    });
  }, [products, isLoaded, selectedCategory, selectedSeason, searchQuery, maxPrice, sortBy]);

  const paginatedProducts = filteredProducts.slice(0, page * itemsPerPage);
  const hasMore = paginatedProducts.length < filteredProducts.length;

  const clearFilters = () => {
    setSelectedCategory(null);
    setSearchQuery(null);
    setSelectedSeason(null);
    setMaxPrice(500);
    router.push('/catalog');
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Mobile filter toggle */}
      <div className="lg:hidden flex items-center justify-between mb-4">
        <span className="text-gray-600 font-medium">{filteredProducts.length} resultados</span>
        <button 
          onClick={() => setIsMobileFiltersOpen(true)}
          className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium"
        >
          <Filter className="w-4 h-4" /> Filtros
        </button>
      </div>

      {/* Sidebar Filters */}
      <aside className={`
        ${isMobileFiltersOpen ? 'fixed inset-0 z-50 bg-white p-6 overflow-y-auto' : 'hidden'} 
        lg:block lg:w-64 lg:flex-shrink-0 lg:bg-transparent lg:p-0
      `}>
        {isMobileFiltersOpen && (
          <div className="flex justify-between items-center mb-6 lg:hidden">
            <h2 className="text-xl font-bold">Filtros</h2>
            <button onClick={() => setIsMobileFiltersOpen(false)}><X className="w-6 h-6" /></button>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-8 sticky top-24">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-900 text-lg">Filtros</h3>
            {(selectedCategory || searchQuery || selectedSeason || maxPrice < 500) && (
              <button onClick={clearFilters} className="text-xs text-primary-600 hover:text-primary-800 font-medium">
                Limpiar
              </button>
            )}
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wider">Categoría</h4>
            <div className="space-y-2">
              {categories.map(cat => (
                <label key={cat} className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="radio" 
                    name="category_or_season"
                    checked={selectedCategory?.toLowerCase() === cat.toLowerCase()}
                    onChange={() => {
                      setSelectedCategory(cat);
                      setSelectedSeason(null);
                    }}
                    className="text-primary-600 focus:ring-primary-500 w-4 h-4 border-gray-300" 
                  />
                  <span className={`text-sm ${selectedCategory?.toLowerCase() === cat.toLowerCase() ? 'font-semibold text-primary-700' : 'text-gray-600 group-hover:text-gray-900'}`}>
                    {cat}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Seasons */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 text-sm uppercase tracking-wider">Temporada</h4>
            <div className="space-y-2">
              {seasons.map(sea => (
                <label key={sea} className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="radio" 
                    name="category_or_season"
                    checked={selectedSeason?.toLowerCase() === sea.toLowerCase()}
                    onChange={() => {
                      setSelectedSeason(sea);
                      setSelectedCategory(null);
                    }}
                    className="text-primary-600 focus:ring-primary-500 w-4 h-4 border-gray-300" 
                  />
                  <span className={`text-sm ${selectedSeason?.toLowerCase() === sea.toLowerCase() ? 'font-semibold text-primary-700' : 'text-gray-600 group-hover:text-gray-900'}`}>
                    {sea}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-700 text-xs uppercase tracking-wider">Precio Max</h4>
              <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2.5 py-1 w-24 shadow-sm focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all">
                <span className="text-sm text-gray-400 font-medium">$</span>
                <input 
                  type="number"
                  min="0"
                  max="10000" 
                  value={maxPrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMaxPrice(val === "" ? 0 : Math.max(0, Number(val)));
                  }}
                  className="w-full text-sm font-bold text-gray-900 bg-transparent border-none outline-none p-0 focus:ring-0 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
            
            <input 
              type="range" 
              min="10" 
              max="500" 
              step="10"
              value={maxPrice > 500 ? 500 : maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              style={{
                background: `linear-gradient(to right, var(--color-primary-600) 0%, var(--color-primary-600) ${((Math.min(500, maxPrice) - 10) / 490) * 100}%, var(--color-gray-200) ${((Math.min(500, maxPrice) - 10) / 490) * 100}%, var(--color-gray-200) 100%)`
              }}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-primary-600 mb-4"
            />

            {/* Quick Filter Presets */}
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {[50, 100, 200, 500].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setMaxPrice(preset)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
                    maxPrice === preset
                      ? 'bg-primary-600 border-primary-600 text-white shadow-sm font-bold'
                      : 'bg-white border-gray-200 text-gray-650 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  Hasta ${preset}
                </button>
              ))}
            </div>
          </div>

          {isMobileFiltersOpen && (
            <button 
              onClick={() => setIsMobileFiltersOpen(false)}
              className="w-full bg-primary-600 text-white py-3 rounded-lg font-bold mt-8"
            >
              Ver {filteredProducts.length} resultados
            </button>
          )}
        </div>
      </aside>

      {/* Product Grid */}
      <main className="flex-1">
        <div className="hidden lg:flex justify-between items-center mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <span className="text-gray-600 font-medium">Mostrando <span className="font-bold text-gray-900">{filteredProducts.length}</span> productos</span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Ordenar por:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500 py-1.5 pl-3 pr-8 bg-gray-50">
              <option>Relevancia</option>
              <option>Precio: Menor a Mayor</option>
              <option>Precio: Mayor a Menor</option>
              <option>Más nuevos</option>
            </select>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No encontramos productos</h3>
            <p className="text-gray-500 mb-6">Intenta ajustando o eliminando algunos filtros.</p>
            <button onClick={clearFilters} className="bg-primary-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-700 transition-colors">
              Limpiar Filtros
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {paginatedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
            
            {hasMore && (
              <div className="mt-12 text-center">
                <button 
                  onClick={() => setPage(p => p + 1)}
                  className="bg-white border-2 border-primary-600 text-primary-700 hover:bg-primary-50 font-bold py-3 px-8 rounded-full transition-colors flex items-center justify-center mx-auto"
                >
                  Cargar más productos <ChevronDown className="ml-2 w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Catalog Promotion Popup (New Users) */}
      {showPromoPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          {/* Modal Container */}
          <div className="relative w-full max-w-[390px] flex flex-col items-center">
            {/* Close Button above the card */}
            <button 
              onClick={handleClosePromoPopup} 
              className="absolute -top-10 right-2 p-1.5 rounded-full border border-white/50 hover:border-white text-white hover:bg-white/10 transition-colors z-50 cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Main White Promo Card */}
            <div 
              className="rounded-3xl w-full p-5 pt-7 pb-6 relative shadow-2xl flex flex-col items-center border"
              style={{
                background: `linear-gradient(to bottom, ${homeSettings?.promotions?.catalogPromoBgColorStart || "#fff6ee"}, ${homeSettings?.promotions?.catalogPromoBgColorEnd || "#ffffff"})`,
                borderColor: homeSettings?.promotions?.catalogPromoCouponBorderColor || "#ffeadd"
              }}
            >

              {/* Title Section */}
              <h2 
                className="font-bold text-center text-lg mt-1 mb-5"
                style={{ color: homeSettings?.promotions?.catalogPromoTextColor || "#a0522d" }}
              >
                Ofertas especiales solo para ti
              </h2>

              {/* Coupon List Container */}
              <div className="w-full space-y-4 mb-6">
                
                {/* Coupon 1 */}
                <div 
                  className="relative flex rounded-2xl overflow-hidden p-4 min-h-[92px] shadow-sm border"
                  style={{
                    backgroundColor: homeSettings?.promotions?.catalogPromoCouponBgColor || "#fff7f6",
                    borderColor: homeSettings?.promotions?.catalogPromoCouponBorderColor || "#ffd2cc"
                  }}
                >
                  {/* Left tag */}
                  <div 
                    className="absolute top-0 left-0 text-white text-[8px] font-extrabold px-2 py-0.5 rounded-br-xl tracking-wider uppercase"
                    style={{ backgroundColor: homeSettings?.promotions?.catalogPromoCouponTextColor || "#ff4a5a" }}
                  >
                    Nuevo usuario
                  </div>
                  
                  {/* Left content */}
                  <div className="w-[38%] flex flex-col justify-center items-center pr-2 pt-2 text-center">
                    <span 
                      className="text-xl sm:text-2xl font-black leading-none tracking-tight"
                      style={{ color: homeSettings?.promotions?.catalogPromoCouponTextColor || "#ff4a5a" }}
                    >
                      {homeSettings?.promotions?.coupon1Discount?.split(' ')[0] || "30%"}
                    </span>
                    <span 
                      className="text-[7.5px] font-bold mt-1 uppercase tracking-tight"
                      style={{ color: homeSettings?.promotions?.catalogPromoCouponTextColor || "#ff4a5a" }}
                    >
                      {homeSettings?.promotions?.coupon1Discount?.split(' ').slice(1).join(' ') || "DE DESCUENTO"}
                    </span>
                    <span className="text-[8px] text-gray-455 mt-1 font-medium">
                      {homeSettings?.promotions?.coupon1LeftNote || "Sin mín. de compra"}
                    </span>
                  </div>

                  {/* Dashed border separator */}
                  <div 
                    className="border-r border-dashed my-1" 
                    style={{ borderColor: homeSettings?.promotions?.catalogPromoCouponBorderColor || "#ffd2cc" }}
                  />

                  {/* Right content */}
                  <div className="flex-1 pl-4 flex flex-col justify-center text-left">
                    <span 
                      className="text-xs sm:text-sm font-extrabold leading-snug"
                      style={{ color: homeSettings?.promotions?.catalogPromoCouponTextColor || "#ff4a5a" }}
                    >
                      {homeSettings?.promotions?.coupon1RightTitle || "Cupón válido en todo el sitio"}
                    </span>
                    <span className="text-[9px] text-gray-500 mt-1">
                      {homeSettings?.promotions?.coupon1RightLimit || "Límite de $MXN3,000"}
                    </span>
                    <div className="flex items-center justify-between mt-2 text-[8px] text-gray-400">
                      <span>Por tiempo limitado</span>
                      <ChevronDown className="w-3 h-3 text-gray-450 shrink-0" />
                    </div>
                  </div>

                  {/* Scalloped circle cutouts */}
                  <div 
                    className="absolute top-0 left-[38%] -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-b"
                    style={{ 
                      backgroundColor: homeSettings?.promotions?.catalogPromoBgColorStart || "#fff6ee",
                      borderColor: homeSettings?.promotions?.catalogPromoCouponBorderColor || "#ffd2cc"
                    }}
                  />
                  <div 
                    className="absolute bottom-0 left-[38%] translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-t"
                    style={{ 
                      backgroundColor: homeSettings?.promotions?.catalogPromoBgColorEnd || "#ffffff",
                      borderColor: homeSettings?.promotions?.catalogPromoCouponBorderColor || "#ffd2cc"
                    }}
                  />
                </div>

                {/* Coupon 2 */}
                <div 
                  className="relative flex rounded-2xl overflow-hidden p-4 min-h-[92px] shadow-sm border"
                  style={{
                    backgroundColor: homeSettings?.promotions?.catalogPromoCouponBgColor || "#fff7f6",
                    borderColor: homeSettings?.promotions?.catalogPromoCouponBorderColor || "#ffd2cc"
                  }}
                >
                  {/* Left tag */}
                  <div 
                    className="absolute top-0 left-0 text-white text-[8px] font-extrabold px-2 py-0.5 rounded-br-xl tracking-wider uppercase"
                    style={{ backgroundColor: homeSettings?.promotions?.catalogPromoCouponTextColor || "#ff4a5a" }}
                  >
                    Nuevo usuario
                  </div>
                  
                  {/* Left content */}
                  <div className="w-[38%] flex flex-col justify-center items-center pr-2 pt-2 text-center">
                    <span 
                      className="text-xl sm:text-2xl font-black leading-none tracking-tight"
                      style={{ color: homeSettings?.promotions?.catalogPromoCouponTextColor || "#ff4a5a" }}
                    >
                      {homeSettings?.promotions?.coupon2Discount?.split(' ')[0] || "65%"}
                    </span>
                    <span 
                      className="text-[7.5px] font-bold mt-1 uppercase tracking-tight"
                      style={{ color: homeSettings?.promotions?.catalogPromoCouponTextColor || "#ff4a5a" }}
                    >
                      {homeSettings?.promotions?.coupon2Discount?.split(' ').slice(1).join(' ') || "DE DESCUENTO"}
                    </span>
                    <span className="text-[8px] text-gray-455 mt-1 font-medium">
                      {homeSettings?.promotions?.coupon2LeftNote || "Sin mín. de compra"}
                    </span>
                  </div>

                  {/* Dashed border separator */}
                  <div 
                    className="border-r border-dashed my-1" 
                    style={{ borderColor: homeSettings?.promotions?.catalogPromoCouponBorderColor || "#ffd2cc" }}
                  />

                  {/* Right content */}
                  <div className="flex-1 pl-4 flex flex-col justify-center text-left">
                    <span 
                      className="text-xs sm:text-sm font-extrabold leading-snug"
                      style={{ color: homeSettings?.promotions?.catalogPromoCouponTextColor || "#ff4a5a" }}
                    >
                      {homeSettings?.promotions?.coupon2RightTitle || "Cupón válido en todo el sitio"}
                    </span>
                    <span className="text-[9px] text-gray-500 mt-1">
                      {homeSettings?.promotions?.coupon2RightLimit || "Límite de $MXN240"}
                    </span>
                    <div className="flex items-center justify-between mt-2 text-[8px] text-gray-400">
                      <span>Por tiempo limitado</span>
                      <ChevronDown className="w-3 h-3 text-gray-450 shrink-0" />
                    </div>
                  </div>

                  {/* Scalloped circle cutouts */}
                  <div 
                    className="absolute top-0 left-[38%] -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-b"
                    style={{ 
                      backgroundColor: homeSettings?.promotions?.catalogPromoBgColorStart || "#fff6ee",
                      borderColor: homeSettings?.promotions?.catalogPromoCouponBorderColor || "#ffd2cc"
                    }}
                  />
                  <div 
                    className="absolute bottom-0 left-[38%] translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-t"
                    style={{ 
                      backgroundColor: homeSettings?.promotions?.catalogPromoBgColorEnd || "#ffffff",
                      borderColor: homeSettings?.promotions?.catalogPromoCouponBorderColor || "#ffd2cc"
                    }}
                  />
                </div>

              </div>

              {/* Action Claim Button */}
              <button 
                onClick={handleClaimCoupons}
                className="w-full text-sm font-extrabold py-3 px-6 rounded-full shadow-lg hover:shadow-xl hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
                style={{
                  backgroundColor: homeSettings?.promotions?.catalogPromoButtonBgColor || "#222222",
                  color: homeSettings?.promotions?.catalogPromoButtonTextColor || "#ffffff"
                }}
              >
                <span>{homeSettings?.promotions?.catalogPromoButtonText || "¡Consíguelos Todos!"}</span>
              </button>

            </div>

            {/* Under-card Footer Disclaimer Text */}
            <p className="text-[10px] text-white/95 text-center mt-3 tracking-wide drop-shadow-xs">
              {homeSettings?.promotions?.catalogPromoFooterNote || "Cupones confirmados después de iniciar sesión"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
