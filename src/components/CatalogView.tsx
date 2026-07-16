"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useProducts } from "@/hooks/useProducts";
import { MATERIALS, Product } from "@/types";
import { useSettings } from "@/hooks/useSettings";
import { ProductCard } from "./ProductCard";
import { Filter, X, ChevronDown, Gift, Truck, Tag, Percent, Star } from "lucide-react";
import Link from "next/link";
import { useClientAuth } from "@/hooks/useClientAuth";
import { supabase } from "@/lib/supabase";

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

const parsePromotionText = (fullText: string, promoColor: string, promoSize: string, side: 'left' | 'right') => {
  if (!fullText) return null;

  // Split into words, keeping the whitespace in the array
  const parts = fullText.split(/(\s+)/);
  const segments: { text: string; isUpper: boolean }[] = [];

  parts.forEach(part => {
    if (!part) return;
    
    // If it's just spaces, append to the last segment if we have one
    if (/^\s+$/.test(part)) {
      if (segments.length > 0) {
        segments[segments.length - 1].text += part;
      } else {
        segments.push({ text: part, isUpper: false });
      }
      return;
    }

    // Determine if it is uppercase
    // A part is uppercase if it has at least one letter and no lowercase letters
    const hasLetters = /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(part);
    let isUpper = false;
    if (hasLetters) {
      isUpper = !/[a-zñüáéíóú]/.test(part);
    } else {
      isUpper = segments.length > 0 ? segments[segments.length - 1].isUpper : false;
    }

    if (segments.length > 0 && segments[segments.length - 1].isUpper === isUpper) {
      segments[segments.length - 1].text += part;
    } else {
      segments.push({ text: part, isUpper });
    }
  });

  const isLeft = side === 'left';
  const fontSizeUpper = promoSize === "Grande" ? "42px" : promoSize === "Muy Grande" ? "52px" : "32px";
  
  const fontSizeLower = isLeft ? "10px" : "9px";

  return (
    <div className={`text-center flex flex-col justify-center items-center ${isLeft ? 'px-2' : 'pl-3 px-2'}`}>
      {segments.map((seg, idx) => {
        const trimmedText = seg.text.trim();
        if (!trimmedText) return null;

        if (seg.isUpper) {
          const words = trimmedText.split(/\s+/);
          return (
            <div key={idx} className="flex flex-col items-center">
              {words.map((word, wIdx) => (
                <span 
                  key={wIdx} 
                  className="font-black leading-none my-0.5 text-center block tracking-tighter"
                  style={{ color: promoColor, fontSize: fontSizeUpper }}
                >
                  {word}
                </span>
              ))}
            </div>
          );
        } else {
          return (
            <span 
              key={idx} 
              className="font-extrabold uppercase tracking-wide opacity-90 my-1 text-center block leading-tight max-w-full"
              style={{ 
                fontSize: fontSizeLower,
                color: '#4b5563'
              }}
            >
              {trimmedText}
            </span>
          );
        }
      })}
    </div>
  );
};

const parseSideTextLeft = (fullText: string, promoColor: string, promoSize: string) => {
  return parsePromotionText(fullText, promoColor, promoSize, 'left');
};

const parseSideTextRight = (fullText: string, promoColor: string, promoSize: string) => {
  return parsePromotionText(fullText, promoColor, promoSize, 'right');
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
  const { session } = useClientAuth();
  const [acceptsOffers, setAcceptsOffers] = useState(false);
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

  // Promocional Clientes State
  const [showClientPromoPopup, setShowClientPromoPopup] = useState(false);
  const [clientPromoEmail, setClientPromoEmail] = useState("");
  const [clientPromoError, setClientPromoError] = useState("");
  const [isSubmittingClientPromo, setIsSubmittingClientPromo] = useState(false);
  const [clientPromoSuccess, setClientPromoSuccess] = useState(false);

  const hasEnvioSinCosto = useMemo(() => {
    if (session) {
      return session.discounts?.some((d: any) => d.discount_type === 'promotion' && d.category_id === 'ENVIO_SIN_COSTO' && d.active);
    }
    if (typeof window !== "undefined") {
      try {
        const claimed = JSON.parse(localStorage.getItem("geekystore_claimed_coupons") || "[]");
        return claimed.includes("ENVIO_SIN_COSTO");
      } catch (e) {
        return false;
      }
    }
    return false;
  }, [session]);

  const hasMuestraEnvio = useMemo(() => {
    if (session) {
      return session.discounts?.some((d: any) => d.discount_type === 'promotion' && d.category_id === 'MUESTRA_Y_ENVIO_GRATIS' && d.active);
    }
    if (typeof window !== "undefined") {
      try {
        const claimed = JSON.parse(localStorage.getItem("geekystore_claimed_coupons") || "[]");
        return claimed.includes("MUESTRA_Y_ENVIO_GRATIS");
      } catch (e) {
        return false;
      }
    }
    return false;
  }, [session]);

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

  // Signatures for dynamic localStorage keys to reset "first visit" status upon promotion changes
  const catalogPromoSignature = useMemo(() => {
    const p = homeSettings?.promotions;
    return `${p?.catalogPromoTitle || ""}_${p?.coupon1Discount || ""}_${p?.coupon1LeftNote || ""}_${p?.coupon1RightTitle || ""}_${p?.coupon1RightLimit || ""}_${p?.catalogPromoBadge || ""}_${p?.catalogPromoButtonText || ""}_${p?.catalogPromoFooterNote || ""}`.replace(/[^a-zA-Z0-9]/g, "_");
  }, [homeSettings?.promotions]);

  const catalogPromoKey = useMemo(() => {
    return `geekystore_first_visit_done_${catalogPromoSignature}`;
  }, [catalogPromoSignature]);

  const clientPromoSignature = useMemo(() => {
    const p = homeSettings?.promotions;
    return `${p?.clientPromoTitle || ""}_${p?.coupon3Discount || ""}_${p?.coupon3LeftNote || ""}_${p?.coupon3RightTitle || ""}_${p?.coupon3RightLimit || ""}_${p?.clientPromoBadge || ""}_${p?.clientPromoButtonText || ""}_${p?.clientPromoFooterNote || ""}`.replace(/[^a-zA-Z0-9]/g, "_");
  }, [homeSettings?.promotions]);

  const clientPromoKey = useMemo(() => {
    return `geekystore_client_visit_done_${clientPromoSignature}`;
  }, [clientPromoSignature]);

  // Trigger catalog promotion popup for guest users (Nuevos Clientes) on first visit
  useEffect(() => {
    if (typeof window !== "undefined" && isLoaded && !session && !hasEnvioSinCosto) {
      const isPublished = homeSettings?.promotions?.catalogPromoPublished ?? true;
      const alwaysShow = homeSettings?.promotions?.catalogPromoAlwaysShow ?? false;
      const displayPage = homeSettings?.promotions?.catalogPromoPage ?? "Catálogo";

      const shouldShowPage = displayPage === "Catálogo" || displayPage === "Ambos";
      const dismissed = localStorage.getItem(catalogPromoKey) === "true";
      const shouldShowDismissed = !dismissed || alwaysShow;

      if (isPublished && shouldShowPage && shouldShowDismissed) {
        const delaySeconds = homeSettings?.promotions?.catalogPromoDelay ?? 3;
        const timer = setTimeout(() => {
          setShowPromoPopup(true);
        }, delaySeconds * 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [homeSettings, isLoaded, session, hasEnvioSinCosto, catalogPromoKey]);

  // Trigger client promotion popup for registered users (Promocional Clientes) on first visit
  useEffect(() => {
    if (typeof window !== "undefined" && isLoaded && session && !hasEnvioSinCosto) {
      const isPublished = homeSettings?.promotions?.clientPromoPublished ?? true;
      const alwaysShow = homeSettings?.promotions?.clientPromoAlwaysShow ?? false;
      const displayPage = homeSettings?.promotions?.clientPromoPage ?? "Catálogo";

      const shouldShowPage = displayPage === "Catálogo" || displayPage === "Ambos";
      const dismissed = localStorage.getItem(clientPromoKey) === "true";
      const shouldShowDismissed = !dismissed || alwaysShow;

      if (isPublished && shouldShowPage && shouldShowDismissed) {
        const delaySeconds = homeSettings?.promotions?.clientPromoDelay ?? 5;
        const timer = setTimeout(() => {
          setShowClientPromoPopup(true);
        }, delaySeconds * 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [homeSettings, isLoaded, session, hasEnvioSinCosto, clientPromoKey]);

  const handleClosePromoPopup = () => {
    setShowPromoPopup(false);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(catalogPromoKey, "true");
      } catch (e) {
        console.warn("Could not save promo dismissal", e);
      }
    }
  };

  const handleCloseClientPromoPopup = () => {
    setShowClientPromoPopup(false);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(clientPromoKey, "true");
      } catch (e) {
        console.warn("Could not save client promo dismissal", e);
      }
    }
  };

  const handleClaimCoupons = async () => {
    if (session) {
      try {
        const { data: existing } = await supabase
          .from("customer_discounts")
          .select("*")
          .eq("customer_id", session.customer.id)
          .eq("discount_type", "promotion")
          .eq("category_id", "ENVIO_SIN_COSTO")
          .eq("active", true);
          
        if (!existing || existing.length === 0) {
          const res = await fetch("/api/claim-coupon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customer_id: session.customer.id,
              coupon: "ENVIO_SIN_COSTO"
            })
          });
          const resData = await res.json();
          if (!res.ok || !resData.success) {
            throw new Error(resData.error || "Failed to claim coupon");
          }
          
          // Update local storage session
          const updatedDiscounts = [...(session.discounts || []), {
            discount_type: 'promotion',
            category_id: 'ENVIO_SIN_COSTO',
            discount_percent: 0,
            active: true
          }];
          localStorage.setItem("geekystore_b2b_session", JSON.stringify({ ...session, discounts: updatedDiscounts }));
          window.dispatchEvent(new Event("b2b_session_updated"));
          alert("¡Felicidades! El cupón de Envío sin Costo ha sido agregado a tu cuenta B2B.");
        } else {
          alert("Ya tienes este cupón activo.");
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      if (typeof window !== "undefined") {
        try {
          const claimed = JSON.parse(localStorage.getItem("geekystore_claimed_coupons") || "[]");
          if (!claimed.includes("ENVIO_SIN_COSTO")) {
            claimed.push("ENVIO_SIN_COSTO");
            localStorage.setItem("geekystore_claimed_coupons", JSON.stringify(claimed));
          }
          // Dispatch event to open B2B registration modal
          window.dispatchEvent(new CustomEvent("open_b2b_auth", { detail: { register: true } }));
        } catch (e) {
          console.warn(e);
        }
      }
    }
    handleClosePromoPopup();
  };

  const handleClaimSideCoupon = async () => {
    if (session) {
      try {
        const { data: existing } = await supabase
          .from("customer_discounts")
          .select("*")
          .eq("customer_id", session.customer.id)
          .eq("discount_type", "promotion")
          .eq("category_id", "MUESTRA_Y_ENVIO_GRATIS")
          .eq("active", true);
          
        if (!existing || existing.length === 0) {
          const res = await fetch("/api/claim-coupon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customer_id: session.customer.id,
              coupon: "MUESTRA_Y_ENVIO_GRATIS"
            })
          });
          const resData = await res.json();
          if (!res.ok || !resData.success) {
            throw new Error(resData.error || "Failed to claim coupon");
          }
          
          // Update local storage session
          const updatedDiscounts = [...(session.discounts || []), {
            discount_type: 'promotion',
            category_id: 'MUESTRA_Y_ENVIO_GRATIS',
            discount_percent: 0,
            active: true
          }];
          localStorage.setItem("geekystore_b2b_session", JSON.stringify({ ...session, discounts: updatedDiscounts }));
          window.dispatchEvent(new Event("b2b_session_updated"));
          alert("¡Felicidades! El cupón de Muestras ha sido agregado a tu cuenta B2B.");
        } else {
          alert("Ya tienes este cupón activo.");
        }
      } catch (e) {
        console.error(e);
      }
    }
    setShowSidePromo(false);
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
      {showPromoPopup && !session && !hasEnvioSinCosto && (
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
                    {(() => {
                      const fullText = homeSettings?.promotions?.coupon1Discount || "30% DE DESCUENTO";
                      const color = homeSettings?.promotions?.catalogPromoCouponTextColor || "#ff4a5a";
                      const hasAnyLowercase = /[a-zñüáéíóú]/.test(fullText);

                      if (!hasAnyLowercase) {
                        const firstWord = fullText.split(' ')[0] || "";
                        const remaining = fullText.split(' ').slice(1).join(' ') || "";
                        return (
                          <>
                            <span 
                              className="text-xl sm:text-2xl font-black leading-none tracking-tight block text-center"
                              style={{ color }}
                            >
                              {firstWord}
                            </span>
                            {remaining && (
                              <span 
                                className="text-[7.5px] font-bold mt-1 uppercase tracking-tight block text-center"
                                style={{ color }}
                              >
                                {remaining}
                              </span>
                            )}
                          </>
                        );
                      }

                      const words = fullText.split(/\s+/).filter(w => w.length > 0);
                      return (
                        <>
                          {words.map((word, idx) => {
                            const hasLetters = /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(word);
                            const isUpper = hasLetters && !/[a-zñüáéíóú]/.test(word);

                            if (isUpper || !hasLetters) {
                              return (
                                <span 
                                  key={idx}
                                  className="text-xl sm:text-2xl font-black leading-none tracking-tight block text-center uppercase"
                                  style={{ color }}
                                >
                                  {word}
                                </span>
                              );
                            } else {
                              return (
                                <span 
                                  key={idx}
                                  className="text-xs sm:text-sm font-extrabold leading-snug block text-center mt-0.5"
                                  style={{ color }}
                                >
                                  {word}
                                </span>
                              );
                            }
                          })}
                        </>
                      );
                    })()}
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
                <span>{homeSettings?.promotions?.catalogPromoButtonText || "¡Consíguelo!"}</span>
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
       session && 
       !hasMuestraEnvio && 
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
                  <button 
                    onClick={handleClaimSideCoupon}
                    disabled={!acceptsOffers}
                    className={`w-full font-extrabold py-3 px-4 rounded text-xs tracking-wider transition-all uppercase ${
                      !acceptsOffers 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50' 
                        : 'hover:brightness-110 active:scale-95 cursor-pointer'
                    }`}
                    style={{
                      backgroundColor: acceptsOffers ? (homeSettings?.promotions?.sideButtonBgColor || "#000000") : undefined,
                      color: acceptsOffers ? (homeSettings?.promotions?.sideButtonTextColor || "#ffffff") : undefined
                    }}
                  >
                    CONSÍGUELO ¡
                  </button>
                </div>

                {/* Disclaimers & Checkboxes */}
                <div className="text-[9px] sm:text-[10px] space-y-2.5 leading-relaxed pt-1" style={{ color: homeSettings?.promotions?.sideTextColor ? `${homeSettings.promotions.sideTextColor}cc` : "#6b7280" }}>
                  <p>
                    Al continuar, acepta nuestro <Link href="/soporte/aviso-privacidad" className="underline hover:text-black">Aviso de Privacidad</Link> y nuestra <Link href="/soporte/politicas-envio" className="underline hover:text-black">Política de envíos</Link>.
                  </p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={acceptsOffers}
                      onChange={e => setAcceptsOffers(e.target.checked)}
                      className="mt-0.5 rounded text-black focus:ring-black h-3 w-3 border-gray-300 shrink-0 cursor-pointer" 
                    />
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

      {/* Floating Client Promotion Popup (Registered Clients) */}
      {showClientPromoPopup && session && !hasEnvioSinCosto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-[390px] flex flex-col items-center">
            {/* Close Button above the card */}
            <button 
              onClick={handleCloseClientPromoPopup} 
              className="absolute -top-10 right-2 p-1.5 rounded-full border border-white/50 hover:border-white text-white hover:bg-white/10 transition-colors z-50 cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Main Card */}
            <div 
              className="rounded-3xl w-full p-5 pt-7 pb-6 relative shadow-2xl flex flex-col items-center border"
              style={{
                background: `linear-gradient(to bottom, ${homeSettings?.promotions?.clientPromoBgColorStart || "#f0fdf4"}, ${homeSettings?.promotions?.clientPromoBgColorEnd || "#ffffff"})`,
                borderColor: homeSettings?.promotions?.clientPromoCouponBorderColor || "#bbf7d0"
              }}
            >
              {/* Title Section */}
              <h2 
                className="font-bold text-center text-lg mt-1 mb-5"
                style={{ color: homeSettings?.promotions?.clientPromoTextColor || "#15803d" }}
              >
                {homeSettings?.promotions?.clientPromoTitle || "Cupón Especial para Clientes"}
              </h2>

              {/* Coupon Container */}
              <div className="w-full mb-6">
                <div 
                  className="relative flex rounded-2xl overflow-hidden p-4 min-h-[92px] shadow-sm border"
                  style={{
                    backgroundColor: homeSettings?.promotions?.clientPromoCouponBgColor || "#f0fdf4",
                    borderColor: homeSettings?.promotions?.clientPromoCouponBorderColor || "#bbf7d0"
                  }}
                >
                  {/* Left tag badge */}
                  <div 
                    className="absolute top-0 left-0 text-white text-[8px] font-extrabold px-2 py-0.5 rounded-br-xl tracking-wider uppercase"
                    style={{ backgroundColor: homeSettings?.promotions?.clientPromoCouponTextColor || "#166534" }}
                  >
                    {homeSettings?.promotions?.clientPromoBadge || "Clientes"}
                  </div>

                  {/* Left content (discount) */}
                  <div className="w-[38%] flex flex-col justify-center items-center pr-2 pt-2 text-center border-r border-dashed" style={{ borderColor: homeSettings?.promotions?.clientPromoCouponBorderColor || "#bbf7d0" }}>
                    <span 
                      className="text-sm sm:text-base font-black leading-none tracking-tight block text-center uppercase"
                      style={{ color: homeSettings?.promotions?.clientPromoCouponTextColor || "#166534" }}
                    >
                      {homeSettings?.promotions?.coupon3Discount || "ENVÍO SIN COSTO"}
                    </span>
                    <span className="text-[8px] text-gray-500 mt-1 font-medium">
                      {homeSettings?.promotions?.coupon3LeftNote || "Cliente B2B"}
                    </span>
                  </div>

                  {/* Right content */}
                  <div className="flex-1 pl-4 flex flex-col justify-center text-left">
                    <span 
                      className="text-xs sm:text-sm font-extrabold leading-snug"
                      style={{ color: homeSettings?.promotions?.clientPromoCouponTextColor || "#166534" }}
                    >
                      {homeSettings?.promotions?.coupon3RightTitle || "Cupón de envío gratis"}
                    </span>
                    <span className="text-[9px] text-gray-500 mt-1">
                      {homeSettings?.promotions?.coupon3RightLimit || "Sin mínimo de compra"}
                    </span>
                  </div>

                  {/* Scalloped circle cutouts */}
                  <div 
                    className="absolute top-0 left-[38%] -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-b"
                    style={{ 
                      backgroundColor: homeSettings?.promotions?.clientPromoBgColorStart || "#f0fdf4",
                      borderColor: homeSettings?.promotions?.clientPromoCouponBorderColor || "#bbf7d0"
                    }}
                  />
                  <div 
                    className="absolute bottom-0 left-[38%] translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-t"
                    style={{ 
                      backgroundColor: homeSettings?.promotions?.clientPromoBgColorEnd || "#ffffff",
                      borderColor: homeSettings?.promotions?.clientPromoCouponBorderColor || "#bbf7d0"
                    }}
                  />
                </div>
              </div>

              {/* Form Input Email & Button */}
              <div className="w-full space-y-3">
                {clientPromoSuccess ? (
                  <div className="text-center py-2 text-green-600 font-bold text-sm">
                    ¡Cupón aplicado exitosamente!
                  </div>
                ) : (
                  <>
                    <div>
                      <input 
                        type="email" 
                        value={clientPromoEmail}
                        onChange={(e) => {
                          setClientPromoEmail(e.target.value);
                          setClientPromoError("");
                        }}
                        placeholder="Ingresa tu correo registrado"
                        className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 font-medium bg-white text-gray-900 border-gray-300 focus:ring-green-500"
                        disabled={isSubmittingClientPromo}
                      />
                      {clientPromoError && (
                        <p className="text-red-500 text-xs mt-1.5 font-bold pl-1 uppercase tracking-wide">
                          {clientPromoError}
                        </p>
                      )}
                    </div>

                    <button 
                      onClick={async () => {
                        const emailVal = clientPromoEmail.trim().toLowerCase();
                        if (!emailVal) {
                          setClientPromoError("Por favor ingresa tu correo.");
                          return;
                        }
                        
                        setIsSubmittingClientPromo(true);
                        setClientPromoError("");
                        try {
                          // Query matching contact for logged-in customer in database
                          const { data: contacts, error: conErr } = await supabase
                            .from("customer_contacts")
                            .select("*")
                            .eq("customer_id", session.customer.id)
                            .eq("email", emailVal);

                          if (conErr) {
                            throw conErr;
                          }

                          if (!contacts || contacts.length === 0) {
                            setClientPromoError("no encontrado");
                            setIsSubmittingClientPromo(false);
                            return;
                          }

                          // Email registered for this client! Let's claim.
                          const res = await fetch("/api/claim-coupon", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              customer_id: session.customer.id,
                              coupon: "ENVIO_SIN_COSTO"
                            })
                          });
                          const resData = await res.json();
                          if (!res.ok || !resData.success) {
                            throw new Error(resData.error || "Failed to claim coupon");
                          }
                          
                          // Update active local session
                          const updatedDiscounts = [...(session.discounts || []), {
                            discount_type: 'promotion',
                            category_id: 'ENVIO_SIN_COSTO',
                            discount_percent: 0,
                            active: true
                          }];
                          localStorage.setItem("geekystore_b2b_session", JSON.stringify({ ...session, discounts: updatedDiscounts }));
                          window.dispatchEvent(new Event("b2b_session_updated"));
                          
                          setClientPromoSuccess(true);
                          setTimeout(() => {
                            setShowClientPromoPopup(false);
                            setClientPromoSuccess(false);
                            setClientPromoEmail("");
                          }, 2000);
                        } catch (e: any) {
                          console.error(e);
                          setClientPromoError(e.message || "Error al aplicar el cupón.");
                        } finally {
                          setIsSubmittingClientPromo(false);
                        }
                      }}
                      disabled={isSubmittingClientPromo}
                      className="w-full text-sm font-extrabold py-3 px-6 rounded-full shadow-lg hover:shadow-xl hover:brightness-110 active:scale-[0.98] transition-all uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
                      style={{
                        backgroundColor: homeSettings?.promotions?.clientPromoButtonBgColor || "#166534",
                        color: homeSettings?.promotions?.clientPromoButtonTextColor || "#ffffff"
                      }}
                    >
                      {isSubmittingClientPromo ? "Verificando..." : (homeSettings?.promotions?.clientPromoButtonText || "Aplicar Cupón")}
                    </button>
                  </>
                )}
              </div>

              {/* Footer Disclaimer Text */}
              <p className="text-[10px] text-gray-500 text-center mt-3 tracking-wide">
                {homeSettings?.promotions?.clientPromoFooterNote || "Ingresa tu correo registrado para activar"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
