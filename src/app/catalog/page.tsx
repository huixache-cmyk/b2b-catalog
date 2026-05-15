import { CatalogView } from "@/components/CatalogView";
import { Suspense } from "react";

export default function CatalogPage() {
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
          <CatalogView />
        </Suspense>
      </div>
    </div>
  );
}
