import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { Product } from "@/types";
import { formatCurrency } from "@/utils/formatters";

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="group bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full">
      {/* Image container */}
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-2 items-start">
          {product.isNew && (
            <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
              NUEVO
            </div>
          )}
        </div>
        <div className="absolute top-2 right-2 z-10 flex flex-col items-end">
          {product.featured && (
            <div className="text-yellow-400 drop-shadow-md" title="Producto Destacado">
              <Star className="w-7 h-7 fill-current" />
            </div>
          )}
        </div>
        <Image 
          src={product.images?.find(img => !!img) || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e"} 
          alt={product.name} 
          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {/* Quick view overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
          <Link href={`/product/${product.id}`} className="bg-white text-gray-900 font-semibold py-2 px-4 rounded-lg shadow-lg hover:bg-gray-50 transition-colors">
            Vista Rápida
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        <span className="text-xs font-medium text-primary-600 mb-1">{product.category}</span>
        <h3 className="font-semibold text-gray-900 leading-tight mb-2 line-clamp-2">
          {product.name}
        </h3>
        
        <div className="mt-auto pt-4 flex items-end justify-between border-t border-gray-50">
          <div>
            <p className="text-xs text-gray-500 mb-1">Precio base aprox.</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(product.price)}</p>
          </div>
          <Link href={`/product/${product.id}`} className="text-sm font-semibold text-primary-600 hover:text-primary-800 bg-primary-50 px-3 py-1.5 rounded-md hover:bg-primary-100 transition-colors">
            Cotizar
          </Link>
        </div>
      </div>
    </div>
  );
}
