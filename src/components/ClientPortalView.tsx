"use client";

import { useState, useEffect } from "react";
import { B2BClientSession, useClientAuth } from "@/hooks/useClientAuth";
import { supabase } from "@/lib/supabase";
import { QuoteRequest } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { FileText, ArrowLeft, LogOut, Building2, User, MapPin, Percent, ShoppingBag, Eye, EyeOff, X, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export function ClientPortalView({ onBack }: { onBack?: () => void }) {
  const { session, logoutClient } = useClientAuth();
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [orders, setOrders] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingQuote, setViewingQuote] = useState<QuoteRequest | null>(null);

  // States for changing access key
  const [newAccessKey, setNewAccessKey] = useState("");
  const [confirmAccessKey, setConfirmAccessKey] = useState("");
  const [keyChangeError, setKeyChangeError] = useState("");
  const [keyChangeSuccess, setKeyChangeSuccess] = useState("");
  const [isChangingKey, setIsChangingKey] = useState(false);

  // States for password visibility toggle
  const [showNewKey, setShowNewKey] = useState(false);
  const [showConfirmKey, setShowConfirmKey] = useState(false);

  const handleChangeAccessKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyChangeError("");
    setKeyChangeSuccess("");

    const keyTrimmed = newAccessKey.trim();
    const confirmTrimmed = confirmAccessKey.trim();

    if (keyTrimmed.length < 4) {
      setKeyChangeError("La clave debe tener al menos 4 caracteres.");
      return;
    }

    if (keyTrimmed !== confirmTrimmed) {
      setKeyChangeError("Las claves ingresadas no coinciden.");
      return;
    }

    setIsChangingKey(true);
    try {
      // 1. Check if key is already taken by another customer
      const { data: existing, error: checkErr } = await supabase
        .from("customers")
        .select("id")
        .eq("access_key", keyTrimmed);

      if (checkErr) throw checkErr;
      if (existing && existing.length > 0 && existing[0].id !== customer.id) {
        setKeyChangeError("Esta clave ya está en uso por otro cliente. Elige otra.");
        setIsChangingKey(false);
        return;
      }

      // 2. Update key
      const { error: updateErr } = await supabase
        .from("customers")
        .update({ access_key: keyTrimmed })
        .eq("id", customer.id);

      if (updateErr) throw updateErr;

      // 3. Log activity in CRM
      await supabase
        .from("customer_activity")
        .insert([{
          customer_id: customer.id,
          activity_type: "note",
          title: "Cambio de Clave",
          description: `El cliente cambió su clave de acceso B2B desde el portal.`,
          created_by: "Cliente"
        }]);

      // 4. Update local session storage
      const saved = localStorage.getItem("geekystore_b2b_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.customer.access_key = keyTrimmed;
        localStorage.setItem("geekystore_b2b_session", JSON.stringify(parsed));
      }

      setKeyChangeSuccess("¡Clave actualizada con éxito!");
      setNewAccessKey("");
      setConfirmAccessKey("");
    } catch (err: any) {
      console.error(err);
      setKeyChangeError(err.message || "Error al actualizar la clave.");
    } finally {
      setIsChangingKey(false);
    }
  };

  useEffect(() => {
    if (session?.customer?.id) {
      fetchHistory();
    }
  }, [session]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .order("date", { ascending: false });

      if (!error && data) {
        const primaryEmail = session?.contact?.email?.toLowerCase();
        const customerQuotes = (data as QuoteRequest[]).filter(q => {
          const qCustId = (q.client as any).customerId;
          if (qCustId === session?.customer.id) return true;
          if (primaryEmail && q.client.email?.toLowerCase() === primaryEmail) return true;
          return false;
        });

        setQuotes(customerQuotes.filter(q => q.status !== "completed"));
        setOrders(customerQuotes.filter(q => q.status === "completed"));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6">
        <Building2 className="w-16 h-16 text-gray-300 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-gray-900">Sesión Expirada</h2>
        <p className="text-gray-500 mt-2 mb-6">Por favor inicia sesión desde el menú de B2B.</p>
        {onBack && (
          <button onClick={onBack} className="bg-primary-600 text-white font-bold py-2.5 px-6 rounded-lg shadow hover:bg-primary-700 transition-colors">
            Volver al Inicio
          </button>
        )}
      </div>
    );
  }

  const { customer, contact, addresses, discounts } = session;
  const defaultAddress = addresses.find(a => a.is_default) || addresses[0];

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-150 text-green-800 border-green-200";
      case "reviewed": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Completado / Pedido";
      case "reviewed": return "Revisado por Ventas";
      default: return "Pendiente";
    }
  };

  const handleDownloadPdf = async (quote: QuoteRequest) => {
    try {
      const doc = new jsPDF();
      const primaryColor: [number, number, number] = [11, 80, 77];

      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, 210, 25, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("COTIZACIÓN B2B - GEEKYSTORE", 14, 17);

      doc.setTextColor(50, 50, 50);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text("DATOS DE FACTURACIÓN Y ENVÍO", 14, 35);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Razón Social: ${customer.business_name}`, 14, 41);
      doc.text(`Contacto: ${quote.client.name}`, 14, 46);
      doc.text(`RFC: ${customer.rfc || "No registrado"}`, 14, 51);
      doc.text(`Términos de Pago: ${customer.payment_terms || "Contado"}`, 14, 56);

      doc.text(`Email: ${quote.client.email}`, 110, 41);
      doc.text(`Teléfono: ${quote.client.phone}`, 110, 46);
      doc.text(`Dirección de Envío: ${quote.client.address || "No especificada"}`, 110, 51);
      doc.text(`Código Postal: ${quote.client.zip || "No especificado"}`, 110, 56);

      const tableData = quote.items.map(item => {
        const itemSubtotal = item.totalPrice;
        return [
          item.sku,
          item.productName,
          item.color.startsWith("#") ? "Especial" : item.color,
          item.printOption,
          item.quantity.toString(),
          formatCurrency(item.unitPrice),
          formatCurrency(itemSubtotal)
        ];
      });

      autoTable(doc, {
        startY: 65,
        head: [["SKU", "Producto", "Color", "Impresión", "Cant.", "P. Unitario", "Subtotal"]],
        body: tableData,
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: "bold" },
        styles: { font: "helvetica", fontSize: 9, valign: "middle" },
      });

      const finalY = (doc as any).lastAutoTable.finalY || 70;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`Total Cotizado: ${formatCurrency(quote.total)} MXN`, 14, finalY + 15);

      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.text("* Esta es una copia digital de su solicitud de cotización.", 14, finalY + 25);

      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Cotizacion_${quote.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF generation failed:", e);
      alert("Error al descargar PDF.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
      
      {/* Top Bar / Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-6 mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Building2 className="w-4 h-4 text-primary-600" />
            <span>Portal de Clientes B2B</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900">{customer.commercial_name || customer.business_name}</h1>
          <p className="text-xs text-gray-400 mt-0.5">Clave Cliente: {customer.access_key}</p>
        </div>
        <div className="flex gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold px-4 py-2 rounded-lg text-sm transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Seguir Navegando
            </button>
          )}
          <button 
            onClick={logoutClient}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold px-4 py-2 rounded-lg text-sm border border-red-200 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Cerrar Sesión B2B
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Column 1: Commercial Data & Contact Info */}
        <div className="space-y-6 lg:col-span-1">
          {/* Card: Commercial Status */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4 text-left">
            <h3 className="font-bold text-gray-900 border-b pb-2 text-sm uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-600" /> Datos Comerciales
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-400 block text-xs uppercase font-semibold">Razón Social</span>
                <span className="font-bold text-gray-800">{customer.business_name}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 block text-xs uppercase font-semibold">RFC</span>
                  <span className="font-bold text-gray-800">{customer.rfc || "-"}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs uppercase font-semibold">Nivel de Cliente</span>
                  <span className="font-bold text-primary-700 uppercase">{customer.customer_type}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400 block text-xs uppercase font-semibold">Nivel de Precios</span>
                  <span className="font-bold text-gray-800 uppercase">{customer.price_level}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-xs uppercase font-semibold">Términos Pago</span>
                  <span className="font-bold text-gray-800">{customer.payment_terms}</span>
                </div>
              </div>
              
              {/* Credit details */}
              {customer.credit_enabled && (
                <div className="bg-primary-50 p-3 rounded-lg border border-primary-100">
                  <span className="text-primary-800 block text-xs uppercase font-bold mb-1">Crédito Comercial Autorizado</span>
                  <span className="font-extrabold text-primary-900 text-lg">{formatCurrency(customer.credit_limit)} MXN</span>
                </div>
              )}
            </div>
          </div>

          {/* Card: Primary Contact & Addresses */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4 text-left">
            <h3 className="font-bold text-gray-900 border-b pb-2 text-sm uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-primary-600" /> Contacto Principal
            </h3>
            <div className="text-sm space-y-1">
              <p className="font-bold text-gray-800">{contact.name}</p>
              {contact.position && <p className="text-xs text-gray-500">{contact.position}</p>}
              <p className="text-gray-600 text-xs mt-1">{contact.email}</p>
              <p className="text-gray-600 text-xs">{contact.phone}</p>
            </div>

            <h3 className="font-bold text-gray-900 border-b pb-2 pt-2 text-sm uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-600" /> Dirección de Envío Default
            </h3>
            {defaultAddress ? (
              <div className="text-sm text-gray-600 space-y-1">
                <p className="font-bold text-gray-800">{defaultAddress.street} #{defaultAddress.exterior_number} {defaultAddress.interior_number ? `Int. ${defaultAddress.interior_number}` : ''}</p>
                <p>{defaultAddress.neighborhood}, CP {defaultAddress.postal_code}</p>
                <p>{defaultAddress.city}, {defaultAddress.state}</p>
                {defaultAddress.reference && (
                  <p className="text-xs text-gray-400 italic mt-1.5">Ref: {defaultAddress.reference}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">No hay direcciones registradas.</p>
            )}
          </div>
        </div>

        {/* Column 2: Quote & Order History */}
        <div className="space-y-6 lg:col-span-1">
          {/* Active Quotes History */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-left">
            <h3 className="font-bold text-gray-900 border-b pb-3 text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-700" /> Historial de Cotizaciones
            </h3>
            
            {loading ? (
              <div className="text-center py-6 text-gray-400">Cargando cotizaciones...</div>
            ) : quotes.length === 0 ? (
              <div className="text-center py-8 text-gray-400 italic">No tienes cotizaciones activas.</div>
            ) : (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-xs text-left text-gray-500">
                  <thead className="text-[10px] text-gray-750 uppercase bg-gray-50/80 border-b border-gray-100">
                    <tr>
                      <th scope="col" className="px-2 py-2">ID / Fecha</th>
                      <th scope="col" className="px-2 py-2 text-right">Monto</th>
                      <th scope="col" className="px-2 py-2 text-center">Estado</th>
                      <th scope="col" className="px-2 py-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map(q => (
                      <tr key={q.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                        <td className="px-2 py-2.5">
                          <div className="font-bold text-gray-900 truncate max-w-[70px]">{q.id}</div>
                          <div className="text-[10px] text-gray-400">{new Date(q.date).toLocaleDateString()}</div>
                        </td>
                        <td className="px-2 py-2.5 text-right font-bold text-gray-900">{formatCurrency(q.total)}</td>
                        <td className="px-2 py-2.5 text-center">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${getStatusBadgeClass(q.status)}`}>
                            {getStatusLabel(q.status)}
                          </span>
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => setViewingQuote(q)} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-primary-750">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDownloadPdf(q)} className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-green-700" title="PDF">
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Orders History (Completed quotes) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm text-left">
            <h3 className="font-bold text-gray-900 border-b pb-3 text-base flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-primary-700" /> Pedidos Confirmados
            </h3>
            
            {loading ? (
              <div className="text-center py-6 text-gray-400">Cargando pedidos...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-gray-400 italic">Sin pedidos finalizados.</div>
            ) : (
              <div className="overflow-x-auto mt-3">
                <table className="w-full text-xs text-left text-gray-500">
                  <thead className="text-[10px] text-gray-750 uppercase bg-gray-50/80 border-b border-gray-100">
                    <tr>
                      <th scope="col" className="px-2 py-2">ID / Fecha</th>
                      <th scope="col" className="px-2 py-2 text-right">Total</th>
                      <th scope="col" className="px-2 py-2 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                        <td className="px-2 py-2.5">
                          <div className="font-bold text-gray-900 truncate max-w-[70px]">{o.id}</div>
                          <div className="text-[10px] text-gray-400">{new Date(o.date).toLocaleDateString()}</div>
                        </td>
                        <td className="px-2 py-2.5 text-right font-black text-primary-700">{formatCurrency(o.total)}</td>
                        <td className="px-2 py-2.5 text-center">
                          <button onClick={() => handleDownloadPdf(o)} className="inline-flex items-center gap-0.5 text-[10px] text-primary-600 hover:text-primary-800 font-bold">
                            <Download className="w-3 h-3" /> PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Discounts & Change Access Key */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Card: Active Discounts */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4 text-left">
            <h3 className="font-bold text-gray-900 border-b pb-2 text-sm uppercase tracking-wider flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary-600" /> Descuentos B2B Activos
            </h3>
            {discounts.filter(d => d.active).length > 0 ? (
              <div className="space-y-3">
                {discounts.filter(d => d.active).map(d => (
                  <div key={d.id} className="flex justify-between items-center bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                    <div>
                      <p className="text-xs font-bold text-gray-800 uppercase">
                        {d.discount_type === "product" ? "Descuento Producto" :
                         d.discount_type === "category" ? `Sección: ${d.category_id}` :
                         "Descuento Global"}
                      </p>
                      {d.valid_until && (
                        <p className="text-[10px] text-gray-400">Vence: {new Date(d.valid_until).toLocaleDateString()}</p>
                      )}
                    </div>
                    <span className="text-sm font-black text-green-700">-{d.discount_percent}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic text-center py-2">No tienes descuentos especiales asignados actualmente.</p>
            )}
          </div>

          {/* Card: Change Access Key */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4 text-left">
            <h3 className="font-bold text-gray-900 border-b pb-2 text-sm uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary-600" /> Cambiar Clave de Acceso
            </h3>
            <form onSubmit={handleChangeAccessKey} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nueva Clave de Acceso</label>
                <div className="relative">
                  <input
                    type={showNewKey ? "text" : "password"}
                    required
                    value={newAccessKey}
                    onChange={e => setNewAccessKey(e.target.value)}
                    placeholder="Mínimo 4 caracteres"
                    className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2.5 text-sm outline-none focus:ring-primary-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewKey(!showNewKey)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-650 cursor-pointer bg-transparent border-0"
                  >
                    {showNewKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Confirmar Nueva Clave</label>
                <div className="relative">
                  <input
                    type={showConfirmKey ? "text" : "password"}
                    required
                    value={confirmAccessKey}
                    onChange={e => setConfirmAccessKey(e.target.value)}
                    placeholder="Confirmar clave"
                    className="w-full border border-gray-300 rounded-lg pl-3 pr-10 py-2.5 text-sm outline-none focus:ring-primary-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmKey(!showConfirmKey)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-650 cursor-pointer bg-transparent border-0"
                  >
                    {showConfirmKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {keyChangeError && <p className="text-red-500 text-xs">{keyChangeError}</p>}
              {keyChangeSuccess && <p className="text-green-600 text-xs font-semibold">{keyChangeSuccess}</p>}
              <button
                type="submit"
                disabled={isChangingKey}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 rounded-lg text-xs transition-colors disabled:bg-gray-300"
              >
                {isChangingKey ? "Actualizando..." : "Actualizar Clave"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* View Quote Details Modal */}
      {viewingQuote && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-gray-150 flex justify-between items-center bg-gray-50 rounded-t-2xl">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Detalles de Cotización: {viewingQuote.id}</h3>
                <p className="text-xs text-gray-500">{new Date(viewingQuote.date).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setViewingQuote(null)} className="text-gray-400 hover:text-gray-900">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 text-left space-y-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-250 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block font-bold uppercase mb-0.5">Destino de entrega</span>
                  <p className="font-bold text-gray-800">{viewingQuote.client.address}</p>
                  <p className="text-gray-700">{viewingQuote.client.city}, {viewingQuote.client.state} - CP {viewingQuote.client.zip}</p>
                </div>
                <div>
                  <span className="text-gray-400 block font-bold uppercase mb-0.5">Comentarios</span>
                  <p className="italic text-gray-650">{viewingQuote.client.comments || "Ninguno"}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 text-sm">Artículos</h4>
                {viewingQuote.items.map(item => (
                  <div key={item.id} className="flex gap-4 p-3 border border-gray-200 rounded-xl bg-white shadow-xs">
                    <div className="w-12 h-12 bg-gray-50 border rounded-lg overflow-hidden shrink-0">
                      <img src={item.image} alt="" className="w-full h-full object-contain p-0.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm truncate">{item.productName}</p>
                      <p className="text-xs text-gray-500">Color: {item.color.startsWith('#') ? "Especial" : item.color} | Técnica: {item.printOption}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900 text-sm">{item.quantity} pz</p>
                      <p className="text-xs font-semibold text-primary-700">{formatCurrency(item.totalPrice)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 border-t border-gray-150 bg-gray-50 rounded-b-2xl flex justify-between items-center">
              <div className="text-left">
                <span className="text-xs text-gray-500">Total Cotizado</span>
                <p className="text-xl font-black text-primary-900">{formatCurrency(viewingQuote.total)}</p>
              </div>
              <button 
                onClick={() => {
                  handleDownloadPdf(viewingQuote);
                  setViewingQuote(null);
                }} 
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Descargar PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
