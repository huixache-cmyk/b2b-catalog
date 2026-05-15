"use client";

import Link from "next/link";
import { Globe, Share2, Mail, MapPin, Phone } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

export function Footer() {
  const { featuredSeason, isLoaded } = useSettings();

  return (
    <footer id="footer" className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="text-3xl font-bold tracking-tight flex items-center gap-0.5" style={{ fontFamily: 'Museo, sans-serif' }}>
              <span className="text-secondary-500">{'</'}</span>
              <span className="text-primary-500">geeky</span>
              <span className="text-secondary-500">store</span>
              <span className="text-secondary-500">{'>'}</span>
            </Link>
            <p className="text-sm">
              Potencia tu marca con nuestros artículos promocionales de alta calidad. Ventas exclusivas por volumen para empresas.
            </p>
            <div className="flex space-x-4 pt-2">
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><Globe className="w-5 h-5" /></a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors"><Share2 className="w-5 h-5" /></a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Catálogo</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/catalog" className="hover:text-primary-400 transition-colors">Todos los productos</Link></li>
              <li><Link href="/catalog?category=Tecnología" className="hover:text-primary-400 transition-colors">Tecnología</Link></li>
              <li><Link href="/catalog?category=Ecológicos" className="hover:text-primary-400 transition-colors">Ecológicos</Link></li>
              {isLoaded && featuredSeason && (
                <li><Link href={`/catalog?season=${encodeURIComponent(featuredSeason)}`} className="hover:text-primary-400 transition-colors">✨ Especial {featuredSeason}</Link></li>
              )}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Soporte</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/soporte/preguntas-frecuentes" className="hover:text-primary-400 transition-colors">Preguntas Frecuentes</Link></li>
              <li><Link href="/soporte/politicas-envio" className="hover:text-primary-400 transition-colors">Políticas de Envío</Link></li>
              <li><Link href="/soporte/devoluciones" className="hover:text-primary-400 transition-colors">Devoluciones</Link></li>
              <li><Link href="/soporte/aviso-privacidad" className="hover:text-primary-400 transition-colors">Aviso de Privacidad</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Contacto</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start">
                <MapPin className="w-5 h-5 mr-2 text-primary-500 flex-shrink-0" />
                <span>VillaTeresa, Ags, México</span>
              </li>
              <li className="flex items-center">
                <Phone className="w-5 h-5 mr-2 text-primary-500 flex-shrink-0" />
                <span>(449) 1170951</span>
              </li>
              <li className="flex items-center">
                <Mail className="w-5 h-5 mr-2 text-primary-500 flex-shrink-0" />
                <span>ventas@geekystore.mx</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-12 pt-8 text-sm text-center">
          <p>&copy; {new Date().getFullYear()} geekystore. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
