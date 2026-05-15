"use client";

import React from "react";
import { Mail, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <div className="bg-gray-50 min-h-screen text-gray-600 selection:bg-cyan-500/30 font-sans">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Botón de Regreso */}
        <div className="mb-8">
          <button 
            onClick={() => {
              router.back();
              setTimeout(() => {
                document.getElementById('footer')?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg text-gray-600 hover:text-cyan-700 font-medium transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Regresar
          </button>
        </div>

        {children}
        
        <div className="mt-20 text-center border-t border-gray-200 pt-16 pb-8">
          <div className="bg-white rounded-2xl p-8 border border-gray-200 max-w-2xl mx-auto shadow-sm">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">¿Tienes dudas adicionales?</h3>
            <p className="text-gray-600 mb-8">
              Nuestro equipo de atención B2B está listo para ayudarte con tu cotización, pedido o dudas sobre personalización.
            </p>
            <a 
              href="mailto:ventas@geekystore.mx" 
              className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-md hover:-translate-y-0.5"
            >
              <Mail className="w-5 h-5" />
              Escríbenos a ventas@geekystore.mx
            </a>
          </div>
        </div>
        
      </div>
    </div>
  );
}
