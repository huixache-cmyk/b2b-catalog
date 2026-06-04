import { CatalogView } from "@/components/CatalogView";
import { Suspense } from "react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_CATEGORIES, DEFAULT_SEASONS } from "@/types";

export const revalidate = 60; // Next.js ISR: Revalidate page every 60 seconds

async function getInitialData() {
  try {
    const [productsRes, settingsRes] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("settings").select("*").eq("id", 1).single()
    ]);

    const products = productsRes.data || [];
    let categories = DEFAULT_CATEGORIES;
    let seasons = DEFAULT_SEASONS;

    if (!settingsRes.error && settingsRes.data) {
      categories = settingsRes.data.categories || DEFAULT_CATEGORIES;
      seasons = settingsRes.data.seasons || DEFAULT_SEASONS;
    }

    return { products, categories, seasons };
  } catch (error) {
    console.error("Error pre-fetching initial catalog data:", error);
    return { products: [], categories: DEFAULT_CATEGORIES, seasons: DEFAULT_SEASONS };
  }
}

export default async function CatalogPage() {
  const initialData = await getInitialData();

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Catálogo de Productos</h1>
          <p className="text-gray-500 mt-2">Explora nuestra extensa selección de artículos promocionales para tu empresa.</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<div className="text-center py-20">Cargando catálogo...</div>}>
          <CatalogView 
            initialProducts={initialData.products} 
            initialCategories={initialData.categories} 
            initialSeasons={initialData.seasons} 
          />
        </Suspense>
      </div>
    </div>
  );
}
