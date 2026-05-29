"use client";

import Link from "next/link";
import { ArrowRight, Star, TrendingUp, ShieldCheck, Clock } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { useSettings } from "@/hooks/useSettings";
import { ProductCard } from "@/components/ProductCard";

export default function Home() {
  const { products, isLoaded: productsLoaded } = useProducts();
  const { homeSettings, seasons, isLoaded: settingsLoaded } = useSettings();
  
  const featuredProducts = productsLoaded ? products.filter(p => p.featured && p.published !== false).slice(0, 8) : [];
  const isLoaded = productsLoaded && settingsLoaded;

  // Derive campaigns from top 3 active seasons
  const campaigns = (seasons || []).slice(0, 3).map((season, idx) => {
    // Merge with saved color/image from settings if available
    const savedConfig = homeSettings?.campaigns?.[idx] || {};
    return {
      title: season,
      img: savedConfig.img || "https://images.unsplash.com/photo-1518605368461-1ee71165920f?auto=format&fit=crop&w=600&q=80",
      color: savedConfig.color || "from-green-900/80 to-green-600/40"
    };
  });

  if (!isLoaded) {
    return <div className="h-screen flex items-center justify-center text-gray-500">Cargando...</div>;
  }

  const { hero } = homeSettings;

  return (
    <div className="bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-primary-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-20" style={{ backgroundImage: `url('${hero.bgImage}')` }}></div>
        <div className="absolute inset-0 bg-gradient-to-r from-primary-900 to-transparent"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative z-10">
          <div className="max-w-2xl">
            <span className="inline-block py-1 px-3 rounded-full bg-primary-500/30 border border-primary-400 text-primary-100 text-sm font-semibold tracking-wider mb-6 uppercase">
              {hero.label}
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              {hero.titleMain} <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-200 to-white">{hero.titleHighlight}</span>
            </h1>
            <p className="text-xl text-primary-100 mb-10 max-w-xl">
              {hero.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/catalog" className="bg-white text-primary-900 px-8 py-4 rounded-lg font-bold hover:bg-gray-100 transition-colors flex items-center justify-center">
                {hero.ctaPrimary}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
              <a href="https://wa.me/524492601779?text=Hola,%20quisiera%20una%20asesor%C3%ADa" target="_blank" rel="noopener noreferrer" className="border border-white/30 hover:bg-white/10 px-8 py-4 rounded-lg font-bold transition-colors flex items-center justify-center">
                {hero.ctaSecondary}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Precios por volumen</h3>
                <p className="text-sm text-gray-500">Cotizaciones preferenciales B2B</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Calidad garantizada</h3>
                <p className="text-sm text-gray-500">Muestras físicas disponibles</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Tiempos de entrega</h3>
                <p className="text-sm text-gray-500">Producción express disponible</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Seasonal Promos */}
      {campaigns.length > 0 && (
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Temporadas y Campañas</h2>
              <p className="text-gray-500 mt-2">Prepárate para las fechas más importantes del año</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {campaigns.map((promo, idx) => (
              <Link href={`/catalog?season=${encodeURIComponent(promo.title)}`} key={idx} className="group relative h-64 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all block">
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url('${promo.img}')` }}
                ></div>
                <div className={`absolute inset-0 bg-gradient-to-t ${promo.color}`}></div>
                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                  <h3 className="text-2xl font-bold text-white mb-2">{promo.title}</h3>
                  <span className="text-white/80 text-sm font-medium flex items-center group-hover:text-white transition-colors">
                    Ver productos <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center">
                <Star className="w-6 h-6 text-yellow-400 mr-2 fill-current" />
                Productos Destacados
              </h2>
              <p className="text-gray-500 mt-2">Los favoritos de nuestros clientes corporativos</p>
            </div>
            <Link href="/catalog" className="text-primary-600 font-semibold hover:text-primary-800 hidden sm:block">
              Ver todos
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {featuredProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
            {featuredProducts.length === 0 && (
              <p className="col-span-full text-center text-gray-500 py-10">No hay productos destacados por el momento.</p>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden bg-primary-900">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            {homeSettings.cta?.title || "¿Tienes un proyecto en mente?"}
          </h2>
          <p className="text-xl text-primary-100 mb-10">
            {homeSettings.cta?.description || "Nuestro equipo de asesores está listo para ayudarte a encontrar el promocional perfecto para tu campaña, ajustado a tu presupuesto."}
          </p>
          <a href="https://wa.me/524492601779?text=Hola,%20quisiera%20una%20cotizaci%C3%B3n" target="_blank" rel="noopener noreferrer" className="inline-block bg-white text-primary-900 px-10 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors shadow-xl hover:shadow-2xl hover:-translate-y-1 transform duration-200">
            {homeSettings.cta?.buttonText || "Cotiza Ahora"}
          </a>
        </div>
      </section>
    </div>
  );
}
