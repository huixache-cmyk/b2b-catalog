"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useProducts } from "@/hooks/useProducts";
import { MATERIALS } from "@/types";
import { useSettings } from "@/hooks/useSettings";
import { ProductCard } from "./ProductCard";
import { Filter, X, ChevronDown } from "lucide-react";

export function CatalogView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { products, isLoaded: productsLoaded } = useProducts();
  const { categories, seasons, isLoaded: settingsLoaded } = useSettings();
  const isLoaded = productsLoaded && settingsLoaded;
  
  // States
  const [selectedCategory, setSelectedCategory] = useState<string | null>(searchParams?.get("category") || null);
  const [searchQuery, setSearchQuery] = useState<string | null>(searchParams?.get("q") || null);
  const [sortBy, setSortBy] = useState<string>("Relevancia");
  const [selectedSeason, setSelectedSeason] = useState<string | null>(searchParams?.get("season") || null);
  const [maxPrice, setMaxPrice] = useState<number>(500);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 24;

  // Sync state when URL params change
  useEffect(() => {
    if (searchParams) {
      setSelectedCategory(searchParams.get("category"));
      setSelectedSeason(searchParams.get("season"));
      setSearchQuery(searchParams.get("q"));
    }
  }, [searchParams]);

  const filteredProducts = useMemo(() => {
    if (!isLoaded) return [];
    
    let filtered = products.filter((product) => {
      if (selectedCategory && product.category !== selectedCategory) return false;
      if (selectedSeason && !product.seasons?.includes(selectedSeason)) return false;
      if (searchQuery) {
        const queryTerms = searchQuery.toLowerCase().split(" ").filter(t => t.length > 0);
        const searchableText = `${product.name} ${product.category} ${product.material} ${product.description} ${product.sku} ${product.colors?.join(" ") || ""} ${product.seasons?.join(" ") || ""}`.toLowerCase();
        const matchesAllTerms = queryTerms.every(term => searchableText.includes(term));
        if (!matchesAllTerms) return false;
      }
      if (product.price > maxPrice) return false;
      return true;
    });
    
    return filtered.sort((a, b) => {
      if (sortBy === "Precio: Menor a Mayor") return a.price - b.price;
      if (sortBy === "Precio: Mayor a Menor") return b.price - a.price;
      if (sortBy === "Más nuevos") return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0);
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
                    checked={selectedCategory === cat}
                    onChange={() => {
                      setSelectedCategory(cat);
                      setSelectedSeason(null);
                    }}
                    className="text-primary-600 focus:ring-primary-500 w-4 h-4 border-gray-300" 
                  />
                  <span className={`text-sm ${selectedCategory === cat ? 'font-semibold text-primary-700' : 'text-gray-600 group-hover:text-gray-900'}`}>
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
                    checked={selectedSeason === sea}
                    onChange={() => {
                      setSelectedSeason(sea);
                      setSelectedCategory(null);
                    }}
                    className="text-primary-600 focus:ring-primary-500 w-4 h-4 border-gray-300" 
                  />
                  <span className={`text-sm ${selectedSeason === sea ? 'font-semibold text-primary-700' : 'text-gray-600 group-hover:text-gray-900'}`}>
                    {sea}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-gray-900 text-sm uppercase tracking-wider">Precio Max</h4>
              <span className="text-sm font-bold text-primary-600">${maxPrice}</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="500" 
              step="10"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
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
    </div>
  );
}
