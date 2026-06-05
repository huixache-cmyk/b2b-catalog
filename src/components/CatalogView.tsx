"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useProducts } from "@/hooks/useProducts";
import { MATERIALS, Product } from "@/types";
import { useSettings } from "@/hooks/useSettings";
import { ProductCard } from "./ProductCard";
import { Filter, X, ChevronDown, Gift, Truck, Tag, Percent, Star } from "lucide-react";

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

const renderTriggerIcon = (iconName?: string) => {
  switch (iconName) {
    case "Gift":
      return <Gift className="w-5 h-5 mb-2" />;
    case "Tag":
      return <Tag className="w-5 h-5 mb-2" />;
    case "Percent":
      return <Percent className="w-5 h-5 mb-2" />;
    default:
      return null;
  }
};

const renderTagIcon = (iconName?: string, textColor?: string) => {
  const iconColor = textColor || "#0a6644";
  switch (iconName) {
    case "Truck":
      return <Truck className="w-4 h-4 shrink-0" style={{ color: iconColor }} />;
    case "Tag":
      return <Tag className="w-4 h-4 shrink-0" style={{ color: iconColor }} />;
    case "Gift":
      return <Gift className="w-4 h-4 shrink-0" style={{ color: iconColor }} />;
    case "Percent":
      return <Percent className="w-4 h-4 shrink-0" style={{ color: iconColor }} />;
    case "Star":
      return <Star className="w-4 h-4 shrink-0" style={{ color: iconColor }} />;
    default:
      return null;
  }
};

const parseSideTextLeft = (fullText: string, promoColor: string, promoSize: string) => {
  const match = fullText.match(/(-\d+%|\d+%\s*DTO\.?|\d+%\s*OFF)/i);
  if (match) {
    const promoPart = match[0];
    const index = fullText.indexOf(promoPart);
    const before = fullText.substring(0, index).trim();
    const after = fullText.substring(index + promoPart.length).trim();
    
    const fontSize = promoSize === "Grande" ? "48px" : promoSize === "Muy Grande" ? "56px" : "40px";
    
    return (
      <div className="text-center flex flex-col justify-center items-center">
        {before && (
          <span className="text-[9px] sm:text-[10px] uppercase tracking-wide opacity-90">
            {before}
          </span>
        )}
        <span 
          className="font-black my-0.5 leading-none"
          style={{ color: promoColor, fontSize }}
        >
          {promoPart}
        </span>
        {after && (
          <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wide">
            {after}
          </span>
        )}
      </div>
    );
  }
  
  return (
    <div className="text-center flex flex-col justify-center items-center px-2">
      <span className="text-xs font-bold text-center leading-tight">{fullText}</span>
    </div>
  );
};

const parseSideTextRight = (fullText: string, promoColor: string, promoSize: string) => {
  const matchEnvio = fullText.match(/(ENVÍO\s+GRATIS|ENVIO\s+GRATIS|FREE\s+SHIPPING)/i);
  if (matchEnvio) {
    const promoPart = matchEnvio[0];
    const index = fullText.indexOf(promoPart);
    const after = fullText.substring(index + promoPart.length).trim();
    
    let line1 = after;
    let line2 = "";
    
    const plusIndex = after.search(/\+\$|\+MXN|en\s+su/i);
    if (plusIndex !== -1) {
      line1 = after.substring(0, plusIndex).trim();
      line2 = after.substring(plusIndex).trim();
    }
    
    const fontSize = promoSize === "Grande" ? "30px" : promoSize === "Muy Grande" ? "36px" : "24px";
    
    return (
      <div className="text-center flex flex-col justify-center items-center pl-3">
        <span 
          className="font-black leading-none uppercase"
          style={{ color: promoColor, fontSize }}
        >
          {promoPart.includes(" ") ? (
            <>
              <div>{promoPart.split(/\s+/)[0]}</div>
              <div className="mt-0.5">{promoPart.split(/\s+/)[1]}</div>
            </>
          ) : promoPart}
        </span>
        {line1 && (
          <span className="text-[9px] sm:text-[10px] uppercase tracking-wide mt-1.5 opacity-90">
            {line1}
          </span>
        )}
        {line2 && (
          <span className="text-[10px] sm:text-xs font-bold mt-0.5">
            {line2}
          </span>
        )}
      </div>
    );
  }
  
  return (
    <div className="text-center flex flex-col justify-center items-center pl-3 px-2">
      <span className="text-xs font-bold text-center leading-tight">{fullText}</span>
    </div>
  );
};

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

  const [showSidePromo, setShowSidePromo] = useState(false);
  const [panelWidth, setPanelWidth] = useState(440);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        setPanelWidth(window.innerWidth < 640 ? window.innerWidth - 48 : 440);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
      const alwaysShow = homeSettings?.promotions?.catalogPromoAlwaysShow ?? false;
      const displayPage = homeSettings?.promotions?.catalogPromoPage ?? "Catálogo";

      const shouldShowPage = displayPage === "Catálogo" || displayPage === "Ambos";
      const shouldShowDismissed = !dismissed || alwaysShow;

      if (shouldShowDismissed && isPublished && shouldShowPage && isLoaded) {
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
                {homeSettings?.promotions?.catalogPromoTitle || "Ofertas especiales solo para ti"}
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
                    {homeSettings?.promotions?.catalogPromoBadge || "Nuevo usuario"}
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
                    {homeSettings?.promotions?.catalogPromoBadge || "Nuevo usuario"}
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

      {/* Side Promotion Drawer */}
      {homeSettings?.promotions?.sidePublished !== false && 
       (homeSettings?.promotions?.sidePromoPage === "Catálogo" || 
        homeSettings?.promotions?.sidePromoPage === "Ambos") && (
        <>
          {/* Drawer Overlay */}
          {showSidePromo && (
            <div 
              onClick={() => setShowSidePromo(false)} 
              className="fixed inset-0 bg-black/40 z-40 transition-opacity"
            />
          )}

          {/* Side Drawer Panel Wrapper (Floating Centered on Right Side) */}
          <div 
            className="fixed right-0 top-1/2 z-50 flex shadow-2xl transition-transform duration-300"
            style={{
              height: '420px',
              transform: showSidePromo 
                ? 'translate(0, -50%)' 
                : `translate(${panelWidth}px, -50%)`,
            }}
          >
            {/* Vertical Toggle Trigger Button (Sized to exact height of drawer) */}
            <button 
              onClick={() => setShowSidePromo(!showSidePromo)}
              className="w-12 transition-all duration-200 hover:brightness-110 active:scale-95 flex flex-col items-center py-6 px-1 rounded-l-2xl shadow-md focus:outline-none cursor-pointer select-none"
              style={{ 
                height: '420px',
                backgroundColor: homeSettings?.promotions?.sideButtonBgColor || "#000000",
                color: homeSettings?.promotions?.sideButtonTextColor || "#ffffff"
              }}
            >
              {/* Arrow icon pointing to close (▶) or open (◀) */}
              <div className="mb-4 text-xs font-bold flex flex-col items-center gap-1.5">
                <span>{showSidePromo ? '▶' : '◀'}</span>
                {renderTriggerIcon(homeSettings?.promotions?.sideTriggerIcon)}
              </div>
              
              {/* Vertical text */}
              <span 
                className="tracking-[0.22em] font-extrabold uppercase select-none flex-1 text-center" 
                style={{ 
                  writingMode: 'vertical-lr', 
                  transform: 'rotate(180deg)',
                  fontSize: homeSettings?.promotions?.sideTextSizeTrigger === "Pequeño" 
                    ? "10px" 
                    : homeSettings?.promotions?.sideTextSizeTrigger === "Grande" 
                      ? "14px" 
                      : "12px"
                }}
              >
                {homeSettings?.promotions?.sideTextTrigger || "CONSIGUE 30% DE DTO."}
              </span>
            </button>

            {/* Pink Drawer Panel */}
            <div 
              className="flex flex-col font-sans border-y border-r rounded-r-2xl overflow-hidden shadow-inner"
              style={{ 
                width: `${panelWidth}px`, 
                height: '420px',
                backgroundColor: homeSettings?.promotions?.sideBgColor || "#ffeceb",
                color: homeSettings?.promotions?.sideTextColor || "#222222",
                borderColor: homeSettings?.promotions?.sidePromoTextColor || "#ffd2cc"
              }}
            >
              {/* Content Area */}
              <div className="flex-1 p-6 flex flex-col justify-center space-y-5">
                
                {/* Promo Header Text */}
                <h3 
                  className="text-center font-bold leading-snug px-1 uppercase tracking-wide"
                  style={{
                    color: homeSettings?.promotions?.sideTextColor || "#222222",
                    fontSize: homeSettings?.promotions?.sideTextSizeTitle === "text-xs" 
                      ? "12px" 
                      : homeSettings?.promotions?.sideTextSizeTitle === "text-base" 
                        ? "16px" 
                        : "14px"
                  }}
                >
                  {homeSettings?.promotions?.sideTitle || "Suscribirse para disfrutar los precios de VIP y Ventas Flash"}
                </h3>

                {/* Promo Offer Columns */}
                <div className="grid grid-cols-2 gap-2 items-center relative py-1">
                  {/* Box 1 (Left) */}
                  {parseSideTextLeft(
                    homeSettings?.promotions?.sideTextLeft || "Suscribirse y obtén -30% En Primer Pedido",
                    homeSettings?.promotions?.sidePromoTextColor || "#e1251b",
                    homeSettings?.promotions?.sideTextSizePromo || "Normal"
                  )}

                  {/* Vertical Divider */}
                  <div 
                    className="absolute left-1/2 top-1 bottom-1 border-l" 
                    style={{ borderColor: homeSettings?.promotions?.sidePromoTextColor ? `${homeSettings.promotions.sidePromoTextColor}44` : "#fecaca" }}
                  />

                  {/* Box 2 (Right) */}
                  {parseSideTextRight(
                    homeSettings?.promotions?.sideTextRight || "ENVÍO GRATIS en su primer pedido +$MXN99",
                    homeSettings?.promotions?.sidePromoTextColor || "#e1251b",
                    homeSettings?.promotions?.sideTextSizePromo || "Normal"
                  )}
                </div>

                {/* Registration Form */}
                <div className="flex gap-2 w-full pt-1">
                  <input 
                    type="email" 
                    placeholder="INTRODUCE TU CORREO ELECTRÓNICO"
                    className="flex-1 bg-white border border-gray-300 rounded p-2.5 text-[10px] sm:text-xs focus:ring-[#e1251b] focus:border-[#e1251b] text-center font-semibold placeholder-gray-400 italic"
                  />
                  <button 
                    onClick={() => {
                      alert("¡Gracias por registrarte! Tu código de descuento ha sido enviado a tu correo.");
                      setShowSidePromo(false);
                    }}
                    className="w-24 sm:w-28 font-extrabold py-2.5 px-2 rounded text-[10px] sm:text-xs tracking-wider transition-all hover:brightness-110 active:scale-95 uppercase cursor-pointer"
                    style={{
                      backgroundColor: homeSettings?.promotions?.sideButtonBgColor || "#000000",
                      color: homeSettings?.promotions?.sideButtonTextColor || "#ffffff"
                    }}
                  >
                    REGÍSTRATE
                  </button>
                </div>

                {/* Disclaimers & Checkboxes */}
                <div className="text-[9px] sm:text-[10px] space-y-2.5 leading-relaxed pt-1" style={{ color: homeSettings?.promotions?.sideTextColor ? `${homeSettings.promotions.sideTextColor}cc` : "#6b7280" }}>
                  <p>
                    Al registrarse, acepta nuestra <span className="underline cursor-pointer hover:text-black">Política de privacidad y cookies</span> y nuestros <span className="underline cursor-pointer hover:text-black">Términos y condiciones</span>.
                  </p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" className="mt-0.5 rounded text-black focus:ring-black h-3 w-3 border-gray-300 shrink-0" />
                    <span className="leading-normal">
                      Me gustaría recibir ofertas exclusivas y las últimas noticias de geekystore por correo electrónico. Entiendo que puedo comunicarme con geekystore para cancelar la suscripción en cualquier momento.
                    </span>
                  </label>
                </div>

              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
