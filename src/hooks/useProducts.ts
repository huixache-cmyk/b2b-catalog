"use client";

import { useState, useEffect } from "react";
import { Product } from "@/types";
import { supabase } from "@/lib/supabase";

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]); // Start clean if error
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const addProduct = async (product: Product) => {
    try {
      // Remove the client-generated ID so Supabase can generate a valid UUID
      const { id, ...productData } = product;
      
      const { data, error } = await supabase
        .from("products")
        .insert([productData])
        .select()
        .single();
        
      if (error) throw error;
      setProducts([data as Product, ...products]);
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
      setProducts(products.map(p => (p.id === updated.id ? updated : p)));
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Error actualizando el producto en Supabase.");
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      setProducts(products.filter(p => p.id !== id));
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Error eliminando el producto en Supabase.");
    }
  };

  return {
    products,
    isLoaded,
    addProduct,
    updateProduct,
    deleteProduct,
    refreshProducts: fetchProducts
  };
}
