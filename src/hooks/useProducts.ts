"use client";

import { useState, useEffect, useCallback } from "react";
import { Product } from "@/types";
import { supabase } from "@/lib/supabase";

// Global in-memory cache to persist data across client-side page transitions
let globalProductsCache: Product[] | null = null;
let globalProductsLoaded = false;
let globalProductsPromise: Promise<Product[]> | null = null;
const productListeners = new Set<(products: Product[]) => void>();

export function useProducts(initialProducts?: Product[]) {
  const [products, setProducts] = useState<Product[]>(globalProductsCache || initialProducts || []);
  const [isLoaded, setIsLoaded] = useState(globalProductsLoaded);

  // Prime cache with server-rendered initial data if cache is empty
  if (!globalProductsCache && initialProducts && initialProducts.length > 0) {
    globalProductsCache = initialProducts;
    globalProductsLoaded = true;
  }

  // Sync state with listeners
  useEffect(() => {
    const listener = (newProducts: Product[]) => {
      setProducts(newProducts);
      setIsLoaded(true);
    };
    productListeners.add(listener);
    return () => {
      productListeners.delete(listener);
    };
  }, []);

  const fetchProducts = useCallback(async (force = false): Promise<Product[]> => {
    // If there is already a fetch in progress, reuse the same promise to avoid concurrent redundant requests
    if (globalProductsPromise && !force) {
      return globalProductsPromise;
    }

    const fetchPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        const productsList = data || [];
        
        // Update caches
        globalProductsCache = productsList;
        globalProductsLoaded = true;
        
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("b2b_products_cache", JSON.stringify(productsList));
          } catch (e) {
            console.warn("Failed to write products to localStorage:", e);
          }
        }

        // Notify all hook instances
        productListeners.forEach(listener => listener(productsList));
        return productsList;
      } catch (error) {
        console.error("Error fetching products:", error);
        return globalProductsCache || [];
      } finally {
        globalProductsPromise = null;
      }
    })();

    globalProductsPromise = fetchPromise;
    return fetchPromise;
  }, []);

  useEffect(() => {
    // 1. Try to load from in-memory cache first
    if (globalProductsCache) {
      setProducts(globalProductsCache);
      setIsLoaded(true);
    } else {
      // 2. Try to load from LocalStorage cache (fast client-side recovery)
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("b2b_products_cache");
          if (stored) {
            const parsed = JSON.parse(stored) as Product[];
            globalProductsCache = parsed;
            globalProductsLoaded = true;
            setProducts(parsed);
            setIsLoaded(true);
          }
        } catch (e) {
          console.warn("Failed to read products from localStorage:", e);
        }
      }
    }

    // 3. Trigger background fetch (stale-while-revalidate)
    fetchProducts();
  }, [fetchProducts]);

  const addProduct = async (product: Product) => {
    try {
      const { id, ...productData } = product;
      const { data, error } = await supabase
        .from("products")
        .insert([productData])
        .select()
        .single();
        
      if (error) throw error;
      const newProduct = data as Product;
      
      const updatedProducts = [newProduct, ...(globalProductsCache || [])];
      globalProductsCache = updatedProducts;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("b2b_products_cache", JSON.stringify(updatedProducts));
        } catch (e) {
          console.warn("Failed to write products to localStorage:", e);
        }
      }
      productListeners.forEach(listener => listener(updatedProducts));
    } catch (error) {
      console.error("Error adding product:", error);
      alert("Error guardando el producto en Supabase. Revisa la consola.");
    }
  };

  const updateProduct = async (updated: Product) => {
    try {
      const { error } = await supabase
        .from("products")
        .update(updated)
        .eq("id", updated.id);
      
      if (error) throw error;
      
      const updatedProducts = (globalProductsCache || []).map(p => (p.id === updated.id ? updated : p));
      globalProductsCache = updatedProducts;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("b2b_products_cache", JSON.stringify(updatedProducts));
        } catch (e) {
          console.warn("Failed to write products to localStorage:", e);
        }
      }
      productListeners.forEach(listener => listener(updatedProducts));
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Error actualizando el producto en Supabase.");
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      
      const updatedProducts = (globalProductsCache || []).filter(p => p.id !== id);
      globalProductsCache = updatedProducts;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("b2b_products_cache", JSON.stringify(updatedProducts));
        } catch (e) {
          console.warn("Failed to write products to localStorage:", e);
        }
      }
      productListeners.forEach(listener => listener(updatedProducts));
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Error eliminando el producto en Supabase.");
    }
  };

  return {
    products,
    isLoaded: isLoaded || globalProductsLoaded,
    addProduct,
    updateProduct,
    deleteProduct,
    refreshProducts: () => fetchProducts(true)
  };
}
