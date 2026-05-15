"use client";

import { use } from "react";
import { useProducts } from "@/hooks/useProducts";
import { ProductDetailView } from "@/components/ProductDetailView";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { products, isLoaded } = useProducts();

  if (!isLoaded) {
    return (
      <div className="bg-gray-50 min-h-screen py-20 text-center">
        <p className="text-gray-500">Cargando producto...</p>
      </div>
    );
  }

  const product = products.find(p => p.id === resolvedParams.id);

  if (!product) {
    return (
      <div className="bg-gray-50 min-h-screen py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Producto no encontrado</h1>
        <p className="text-gray-500">Es posible que el producto haya sido eliminado o el enlace sea incorrecto.</p>
      </div>
    );
  }

  // Find related products
  const relatedProducts = products.filter(
    p => p.category === product.category && p.id !== product.id
  ).slice(0, 4);

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ProductDetailView product={product} relatedProducts={relatedProducts} />
      </div>
    </div>
  );
}
