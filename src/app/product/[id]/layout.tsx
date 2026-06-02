import { Metadata } from 'next';
import { supabase } from '@/lib/supabase';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  
  try {
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', resolvedParams.id)
      .single();

    if (!product) {
      return {
        title: 'Producto no encontrado | geekystore',
      };
    }

    const title = `${product.name} | Catálogo B2B geekystore`;
    const description = product.description.substring(0, 150) + (product.description.length > 150 ? '...' : '');
    const imageUrl = product.images && product.images.length > 0 ? product.images[0] : 'https://www.geekystore.mx/default-og.png';

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [imageUrl],
        type: 'website',
        url: `https://www.geekystore.mx/product/${resolvedParams.id}`,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [imageUrl],
      }
    };
  } catch (error) {
    return {
      title: 'Catálogo B2B geekystore',
    };
  }
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
