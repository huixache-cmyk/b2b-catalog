"use client";

import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { Product } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { useClientAuth } from "@/hooks/useClientAuth";

export function ProductCard({ product }: { product: Product }) {
  const { session } = useClientAuth();

  const b2bPrice = (() => {
    if (!session) return null;
    const base = product.price;
    
    let levelFactor = 1;
    if (session.customer.price_level === "wholesale") levelFactor = 0.90;
    else if (session.customer.price_level === "distributor") levelFactor = 0.80;
    else if (session.customer.price_level === "special") levelFactor = 0.75;
    
    const priceAfterLevel = base * levelFactor;
    
    let bestDiscount = 0;
    const activeDiscounts = session.discounts || [];
    
    const prodDisc = activeDiscounts.find(d => d.active && d.discount_type === "product" && d.product_id === product.id);
    const catDisc = activeDiscounts.find(d => d.active && d.discount_type === "category" && d.category_id?.toLowerCase() === product.category?.toLowerCase());
    const globDisc = activeDiscounts.find(d => d.active && d.discount_type === "global");
    
    if (prodDisc) {
      bestDiscount = prodDisc.discount_percent;
    } else if (catDisc) {
      bestDiscount = catDisc.discount_percent;
    } else if (globDisc) {
      bestDiscount = globDisc.discount_percent;
    } else {
      bestDiscount = session.customer.assigned_discount_percent || 0;
    }
    
    return priceAfterLevel * (1 - bestDiscount / 100);
  })();

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
          <div className="text-left">
            {b2bPrice !== null ? (
              <>
                <p className="text-[9px] text-green-600 font-bold uppercase tracking-wider">Precio B2B Especial</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400 line-through">{formatCurrency(product.price)}</span>
                  <span className="text-base font-black text-green-600">{formatCurrency(b2bPrice)}</span>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-1">Precio base aprox.</p>
                <p className="text-base font-bold text-gray-900">{formatCurrency(product.price)}</p>
              </>
            )}
          </div>
          <Link href={`/product/${product.id}`} className="text-sm font-semibold text-primary-600 hover:text-primary-800 bg-primary-50 px-3 py-1.5 rounded-md hover:bg-primary-100 transition-colors">
            Cotizar
          </Link>
        </div>
      </div>
    </div>
  );
}
