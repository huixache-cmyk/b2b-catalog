"use client";

import { useState } from "react";
import { useCart } from "@/hooks/useCart";
import { useQuotes } from "@/hooks/useQuotes";
import Link from "next/link";
import { Trash2, ShoppingCart, FileText, Send, AlertCircle } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import mexicoData from "@/utils/mexicoStates.json";
import { getColorName } from "@/types";

const MEXICO_STATES = Object.keys(mexicoData);

const getImageElement = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

export function CartView() {
  const { cartItems, isLoaded, updateQuantity, removeFromCart, cartTotal, clearCart } = useCart();
  const { addQuote } = useQuotes();
  
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    state: "",
    city: "",
    comments: ""
  });
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isLoaded) {
    return <div className="text-center py-20 text-gray-500">Cargando carrito...</div>;
  }

  if (cartItems.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingCart className="w-10 h-10 text-gray-300" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tu cotización está vacía</h2>
        <p className="text-gray-500 mb-8">Aún no has agregado productos a tu lista de cotización.</p>
        <Link href="/catalog" className="inline-block bg-primary-600 text-white font-bold py-3 px-8 rounded-full hover:bg-primary-700 transition-colors">
          Explorar Catálogo
        </Link>
      </div>
    );
  }

  const handleSendQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar mínimo 50 en todos los items (ya validado en la UI, pero por si acaso)
    const hasInvalidQuantities = cartItems.some(i => i.quantity < 50);
    if (hasInvalidQuantities) {
      alert("Por favor, asegúrate de que todos los artículos tengan al menos 50 piezas.");
      return;
    }

    let itemsText = cartItems.map(item => 
      `- ${item.quantity}x ${item.productName} (SKU: ${item.sku}) | Color: ${item.color} | Impresión: ${item.printOption}`
    ).join("\n");

    const text = `*SOLICITUD DE COTIZACIÓN B2B*

*Datos del Cliente:*
Empresa: ${formData.company}
Contacto: ${formData.name}
Email: ${formData.email}
Teléfono: ${formData.phone}
Destino: ${formData.city}, ${formData.state}

*Artículos Solicitados:*
${itemsText}

*Subtotal Estimado:* $${cartTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN
*Comentarios:* ${formData.comments || 'Ninguno'}

Quedo en espera de confirmación de existencias.`;

    // Save Quote to DB
    const newQuote = {
      id: `QUOTE-${Date.now()}`,
      date: new Date().toISOString(),
      client: { ...formData },
      items: [...cartItems],
      total: cartTotal,
      status: 'pending' as const
    };
    
    setIsSending(true);
    
    try {
      // 1. Guardar localmente y en Supabase DB
      await addQuote(newQuote);

      const res = await fetch('/api/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuote)
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar cotización');
      }

      // 3. Notificar al usuario y vaciar carrito
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
        clearCart();
      }, 5000);
      
    } catch (error: any) {
      console.error("Error enviando cotización:", error);
      alert(`Hubo un error al procesar la cotización: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Items List */}
      <div className="lg:col-span-2 space-y-4">
        {cartItems.map((item) => (
          <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col sm:flex-row gap-4 relative">
            <button 
              onClick={() => removeFromCart(item.id)}
              className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
              title="Eliminar artículo"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            
            <div className="flex gap-2 shrink-0">
              <div className="w-24 h-24 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 relative group">
                <img src={item.mockupImage || item.image} alt={item.productName} className="w-full h-full object-contain p-1" />
                <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-white font-bold text-center py-0.5">Vista</div>
              </div>
              {item.blueprintImage && (
                <div className="w-24 h-24 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 hidden sm:block relative group">
                  <img src={item.blueprintImage} alt="Plano Mecánico" className="w-full h-full object-contain p-1" />
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 text-[10px] text-white font-bold text-center py-0.5">Plano</div>
                </div>
              )}
            </div>
            
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-lg pr-8">{item.productName}</h3>
                <div className="text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1 mt-1 items-center">
                  <span>SKU: {item.sku}</span>
                  <span className="flex items-center gap-1.5">
                    Color: 
                    {item.color.startsWith('#') ? (
                      <>
                        <span 
                          className="w-4 h-4 rounded-full border border-gray-300 inline-block shadow-sm" 
                          style={{ backgroundColor: item.color }}
                          title={getColorName(item.color)}
                        />
                        <span>{getColorName(item.color)}</span>
                      </>
                    ) : (
                      item.color
                    )}
                  </span>
                  <span>{item.printOption}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-between mt-4 gap-4">
                <div className="flex items-center space-x-2">
                  <label className="text-xs font-bold text-gray-500">CANTIDAD:</label>
                  <input 
                    type="number" 
                    min="50"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                    onBlur={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      if (val > 0 && val < 50) updateQuantity(item.id, 50);
                    }}
                    className="w-20 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded focus:ring-primary-500 focus:border-primary-500 block px-2 py-1 font-bold text-center"
                  />
                  {item.quantity > 0 && item.quantity < 50 && (
                    <span className="text-red-500 text-xs flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" /> Mín. 50
                    </span>
                  )}
                </div>
                
                <div className="text-right">
                  <div className="text-xs text-gray-500">Subtotal</div>
                  <div className="font-black text-primary-700 text-lg">
                    ${item.totalPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        <div className="flex justify-between items-center pt-4">
          <Link href="/catalog" className="text-primary-600 font-bold hover:underline">
            &larr; Seguir comprando
          </Link>
          <button onClick={clearCart} className="text-gray-500 hover:text-red-500 text-sm font-medium">
            Vaciar Carrito
          </button>
        </div>
      </div>

      {/* Summary & Form */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
          <h3 className="text-xl font-bold text-gray-900 mb-6 border-b pb-4">Resumen de Cotización</h3>
          
          <div className="flex justify-between mb-2 text-gray-600">
            <span>Artículos ({cartItems.length})</span>
            <span>-</span>
          </div>
          <div className="flex justify-between mb-6 text-xl font-black text-gray-900">
            <span>Total Estimado</span>
            <span>${cartTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          <p className="text-xs text-gray-500 mb-6 text-center">
            * Precios sujetos a verificación de stock y volumen final. No incluye IVA.
          </p>

          <div className="border-t pt-6">
            <h4 className="font-bold text-gray-900 mb-4 text-sm uppercase flex items-center">
              <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center mr-2 text-xs">1</span>
              DATOS DE CONTACTO PARA COTIZACIÓN FORMAL
            </h4>
            <form onSubmit={handleSendQuote} className="space-y-4">
              <input required type="text" placeholder="Nombre Completo *" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border-gray-300 rounded-lg p-3 text-sm focus:ring-primary-500 focus:border-primary-500" />
              <input required type="text" placeholder="Empresa *" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full border-gray-300 rounded-lg p-3 text-sm focus:ring-primary-500 focus:border-primary-500" />
              <input required type="email" placeholder="Email *" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border-gray-300 rounded-lg p-3 text-sm focus:ring-primary-500 focus:border-primary-500" />
              <input required type="tel" placeholder="Teléfono / WhatsApp *" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full border-gray-300 rounded-lg p-3 text-sm focus:ring-primary-500 focus:border-primary-500" />
              
              <div className="grid grid-cols-2 gap-4">
                <select required value={formData.state} onChange={e => setFormData({...formData, state: e.target.value, city: ""})} className="w-full border-gray-300 rounded-lg p-3 text-sm focus:ring-primary-500 focus:border-primary-500">
                  <option value="" disabled>Estado *</option>
                  {MEXICO_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} disabled={!formData.state} className="w-full border-gray-300 rounded-lg p-3 text-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-400">
                  <option value="" disabled>Ciudad / Municipio *</option>
                  {formData.state && (mexicoData as Record<string, string[]>)[formData.state]?.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <textarea rows={2} placeholder="Comentarios (Opcional)" value={formData.comments} onChange={e => setFormData({...formData, comments: e.target.value})} className="w-full border-gray-300 rounded-lg p-3 text-sm focus:ring-primary-500 focus:border-primary-500"></textarea>
              
              {showSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">¡Cotización enviada con éxito!</h3>
                      <div className="mt-2 text-sm text-green-700">
                        <p>Revisa tu WhatsApp para la confirmación, nuestro equipo te contactará a la brevedad.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSending || showSuccess}
                className="w-full bg-primary-600 text-white font-bold py-4 px-4 rounded-xl shadow-md hover:bg-primary-700 hover:-translate-y-0.5 transition-all flex items-center justify-center disabled:opacity-70 disabled:hover:translate-y-0"
              >
                <Send className="w-5 h-5 mr-2" />
                {isSending ? "Procesando..." : "Enviar Solicitud"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
