"use client";

import { useState } from "react";
import { ChevronDown, MessageCircleQuestion } from "lucide-react";

const faqs = [
  {
    q: "¿Venden al público o solo a empresas?",
    a: "Vendemos principalmente a empresas, negocios, escuelas, instituciones y clientes que buscan artículos promocionales o productos por volumen."
  },
  {
    q: "¿Tienen compra mínima?",
    a: "Algunos productos pueden requerir compra mínima dependiendo del proveedor, disponibilidad o tipo de personalización."
  },
  {
    q: "¿Puedo personalizar los productos con mi logo?",
    a: "Sí. Podemos cotizar personalización con logotipo, marca, frase o diseño, dependiendo del producto."
  },
  {
    q: "¿Qué necesito para cotizar?",
    a: "Cantidad requerida, producto de interés, logotipo o diseño, fecha estimada de entrega y ciudad de destino."
  },
  {
    q: "¿Los precios incluyen personalización?",
    a: "No siempre. Algunos precios son solo del producto base. La personalización se cotiza según técnica, cantidad y complejidad."
  },
  {
    q: "¿Cuánto tarda un pedido?",
    a: "El tiempo depende de disponibilidad, volumen, personalización y destino. Cada cotización indicará un tiempo estimado."
  },
  {
    q: "¿Puedo pedir una muestra?",
    a: "En algunos productos sí es posible solicitar muestra, sujeta a disponibilidad y costo."
  },
  {
    q: "¿Cómo puedo contactarlos?",
    a: "Por WhatsApp, teléfono o correo a ventas@geekystore.mx."
  }
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-50 text-cyan-600 mb-6 border border-cyan-100">
          <MessageCircleQuestion className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">Preguntas Frecuentes</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Resolvemos las dudas más comunes sobre pedidos, personalización, tiempos de entrega y compras por volumen.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div 
              key={index} 
              className={`bg-white rounded-xl border transition-all duration-300 overflow-hidden ${isOpen ? 'border-cyan-500 bg-cyan-50/30 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}
            >
              <button
                className="w-full text-left px-6 py-5 flex items-center justify-between focus:outline-none"
                onClick={() => setOpenIndex(isOpen ? null : index)}
              >
                <span className={`font-bold text-lg pr-8 ${isOpen ? 'text-cyan-700' : 'text-gray-900'}`}>
                  {faq.q}
                </span>
                <ChevronDown className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-cyan-600' : 'text-gray-400'}`} />
              </button>
              
              <div 
                className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-40 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}
              >
                <p className="text-gray-600 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
