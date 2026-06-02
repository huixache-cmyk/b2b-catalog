import { supabase } from "@/lib/supabase";
import { ProductDetailView } from "@/components/ProductDetailView";
import { notFound } from "next/navigation";
import { Product } from "@/types";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  // Fetch product from Supabase on the server
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", resolvedParams.id)
    .single();

  if (!product) {
    notFound();
  }

  // Fetch related products of the same category (published/active)
  const { data: relatedProductsData } = await supabase
    .from("products")
    .select("*")
    .eq("category", product.category)
    .not("id", "eq", product.id)
    .eq("published", true)
    .limit(4);

  const relatedProducts = (relatedProductsData || []) as Product[];

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ProductDetailView product={product as Product} relatedProducts={relatedProducts} />
      </div>
    </div>
  );
}
