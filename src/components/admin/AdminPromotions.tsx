"use client";

import { useState } from "react";
import { HomeSettings } from "@/hooks/useSettings";
import { Save, Tag, PanelLeft, Check, Gift } from "lucide-react";

interface AdminPromotionsProps {
  homeSettings: HomeSettings;
  updateHomeSettings: (settings: HomeSettings, immediate?: boolean) => void;
}

export function AdminPromotions({ homeSettings, updateHomeSettings }: AdminPromotionsProps) {
  const currentPromo = homeSettings.promotions || {
    tagText: "Oferta especial de envío gratis",
    tagPublished: true,
    sideTextTrigger: "CONSIGUE 30% DE DTO.",
    sideTitle: "Suscribirse para disfrutar los precios de VIP y Ventas Flash",
    sideTextLeft: "Suscribirse y obtén -30% En Primer Pedido",
    sideTextRight: "ENVÍO GRATIS en su primer pedido +$MXN99",
    sidePublished: true
  };

  const [tagText, setTagText] = useState(currentPromo.tagText);
  const [tagPublished, setTagPublished] = useState(currentPromo.tagPublished);
  const [sideTextTrigger, setSideTextTrigger] = useState(currentPromo.sideTextTrigger);
  const [sideTitle, setSideTitle] = useState(currentPromo.sideTitle);
  const [sideTextLeft, setSideTextLeft] = useState(currentPromo.sideTextLeft);
  const [sideTextRight, setSideTextRight] = useState(currentPromo.sideTextRight);
  const [sidePublished, setSidePublished] = useState(currentPromo.sidePublished);

  // New catalog popup promotion states
  const [catalogPromoPublished, setCatalogPromoPublished] = useState(currentPromo.catalogPromoPublished ?? true);
  const [catalogPromoDelay, setCatalogPromoDelay] = useState(currentPromo.catalogPromoDelay ?? 3);
  const [coupon1Discount, setCoupon1Discount] = useState(currentPromo.coupon1Discount ?? "30% DE DESCUENTO");
  const [coupon1LeftNote, setCoupon1LeftNote] = useState(currentPromo.coupon1LeftNote ?? "Sin mín. de compra");
  const [coupon1RightTitle, setCoupon1RightTitle] = useState(currentPromo.coupon1RightTitle ?? "Cupón válido en todo el sitio");
  const [coupon1RightLimit, setCoupon1RightLimit] = useState(currentPromo.coupon1RightLimit ?? "Límite de $MXN3,000");
  const [coupon2Discount, setCoupon2Discount] = useState(currentPromo.coupon2Discount ?? "65% DE DESCUENTO");
  const [coupon2LeftNote, setCoupon2LeftNote] = useState(currentPromo.coupon2LeftNote ?? "Sin mín. de compra");
  const [coupon2RightTitle, setCoupon2RightTitle] = useState(currentPromo.coupon2RightTitle ?? "Cupón válido en todo el sitio");
  const [coupon2RightLimit, setCoupon2RightLimit] = useState(currentPromo.coupon2RightLimit ?? "Límite de $MXN240");
  const [catalogPromoButtonText, setCatalogPromoButtonText] = useState(currentPromo.catalogPromoButtonText ?? "¡Consíguelos Todos!");
  const [catalogPromoFooterNote, setCatalogPromoFooterNote] = useState(currentPromo.catalogPromoFooterNote ?? "Cupones confirmados después de iniciar sesión");

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const updatedSettings: HomeSettings = {
      ...homeSettings,
      promotions: {
        tagText,
        tagPublished,
        sideTextTrigger,
        sideTitle,
        sideTextLeft,
        sideTextRight,
        sidePublished,
        // Catalog promo fields
        catalogPromoPublished,
        catalogPromoDelay,
        coupon1Discount,
        coupon1LeftNote,
        coupon1RightTitle,
        coupon1RightLimit,
        coupon2Discount,
        coupon2LeftNote,
        coupon2RightTitle,
        coupon2RightLimit,
        catalogPromoButtonText,
        catalogPromoFooterNote
      }
    };

    try {
      await updateHomeSettings(updatedSettings, true);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Error al guardar las promociones.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold text-gray-900">Gestión de Promociones</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configura y publica las promociones visibles en la vista de detalle de producto.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Special Offer Tag */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 text-primary-700 font-bold border-b pb-2">
            <Tag className="w-5 h-5" />
            <h3>Etiqueta de Oferta Especial (Abajo de Ver Carrito)</h3>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="tagPublished"
              type="checkbox"
              checked={tagPublished}
              onChange={(e) => setTagPublished(e.target.checked)}
              className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
            />
            <label htmlFor="tagPublished" className="text-sm font-semibold text-gray-700 cursor-pointer">
              Publicar etiqueta en la página de productos
            </label>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase">Texto de la Etiqueta</label>
            <input
              type="text"
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              placeholder="Ej. Oferta especial de envío gratis"
              disabled={!tagPublished}
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:text-gray-400"
              required
            />
          </div>
        </div>

        {/* Section 2: Side Drawer Discount Panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 text-primary-700 font-bold border-b pb-2">
            <PanelLeft className="w-5 h-5" />
            <h3>Panel Promocional Lateral (Desplegable Izquierdo)</h3>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="sidePublished"
              type="checkbox"
              checked={sidePublished}
              onChange={(e) => setSidePublished(e.target.checked)}
              className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
            />
            <label htmlFor="sidePublished" className="text-sm font-semibold text-gray-700 cursor-pointer">
              Activar panel promocional lateral en la página de productos
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase">Texto del Botón Lateral (Trigger)</label>
              <input
                type="text"
                value={sideTextTrigger}
                onChange={(e) => setSideTextTrigger(e.target.value)}
                placeholder="Ej. CONSIGUE 30% DE DTO."
                disabled={!sidePublished}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase">Título del Panel</label>
              <input
                type="text"
                value={sideTitle}
                onChange={(e) => setSideTitle(e.target.value)}
                placeholder="Ej. Suscribirse para disfrutar los precios de VIP..."
                disabled={!sidePublished}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase">Texto de la Izquierda (Descuento)</label>
              <input
                type="text"
                value={sideTextLeft}
                onChange={(e) => setSideTextLeft(e.target.value)}
                placeholder="Ej. Suscribirse y obtén -30% En Primer Pedido"
                disabled={!sidePublished}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase">Texto de la Derecha (Envío Gratis)</label>
              <input
                type="text"
                value={sideTextRight}
                onChange={(e) => setSideTextRight(e.target.value)}
                placeholder="Ej. ENVÍO GRATIS en su primer pedido +$MXN99"
                disabled={!sidePublished}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                required
              />
            </div>
          </div>
        </div>

        {/* Section 3: Floating Catalog Promo Modal */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 text-primary-700 font-bold border-b pb-2">
            <Gift className="w-5 h-5" />
            <h3>Ventana Flotante de Promociones (Catálogo - Nuevos Usuarios)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 col-span-1 md:col-span-2">
              <input
                id="catalogPromoPublished"
                type="checkbox"
                checked={catalogPromoPublished}
                onChange={(e) => setCatalogPromoPublished(e.target.checked)}
                className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
              />
              <label htmlFor="catalogPromoPublished" className="text-sm font-semibold text-gray-700 cursor-pointer">
                Activar ventana flotante promocional en el catálogo
              </label>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase">Tiempo de Retardo para Mostrar (Segundos)</label>
              <input
                type="number"
                min="0"
                value={catalogPromoDelay}
                onChange={(e) => setCatalogPromoDelay(parseInt(e.target.value) || 0)}
                disabled={!catalogPromoPublished}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase">Texto del Botón Principal</label>
              <input
                type="text"
                value={catalogPromoButtonText}
                onChange={(e) => setCatalogPromoButtonText(e.target.value)}
                disabled={!catalogPromoPublished}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                required
              />
            </div>

            <div className="space-y-1 col-span-1 md:col-span-2">
              <label className="block text-xs font-bold text-gray-700 uppercase">Nota de Pie de Página (Disclaimer)</label>
              <input
                type="text"
                value={catalogPromoFooterNote}
                onChange={(e) => setCatalogPromoFooterNote(e.target.value)}
                disabled={!catalogPromoPublished}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                required
              />
            </div>

            {/* Coupon 1 Config */}
            <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50 space-y-3 col-span-1 md:col-span-2">
              <h4 className="font-bold text-xs text-gray-700 uppercase border-b pb-1">Configuración del Cupón 1</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-550 uppercase">Texto de Descuento (Izquierda)</label>
                  <input
                    type="text"
                    value={coupon1Discount}
                    onChange={(e) => setCoupon1Discount(e.target.value)}
                    disabled={!catalogPromoPublished}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:ring-primary-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-550 uppercase">Nota de Descuento (Izquierda)</label>
                  <input
                    type="text"
                    value={coupon1LeftNote}
                    onChange={(e) => setCoupon1LeftNote(e.target.value)}
                    disabled={!catalogPromoPublished}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:ring-primary-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-550 uppercase">Título del Cupón (Derecha)</label>
                  <input
                    type="text"
                    value={coupon1RightTitle}
                    onChange={(e) => setCoupon1RightTitle(e.target.value)}
                    disabled={!catalogPromoPublished}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:ring-primary-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-550 uppercase">Restricción / Límite (Derecha)</label>
                  <input
                    type="text"
                    value={coupon1RightLimit}
                    onChange={(e) => setCoupon1RightLimit(e.target.value)}
                    disabled={!catalogPromoPublished}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:ring-primary-500"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Coupon 2 Config */}
            <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50 space-y-3 col-span-1 md:col-span-2">
              <h4 className="font-bold text-xs text-gray-700 uppercase border-b pb-1">Configuración del Cupón 2</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-550 uppercase">Texto de Descuento (Izquierda)</label>
                  <input
                    type="text"
                    value={coupon2Discount}
                    onChange={(e) => setCoupon2Discount(e.target.value)}
                    disabled={!catalogPromoPublished}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:ring-primary-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-550 uppercase">Nota de Descuento (Izquierda)</label>
                  <input
                    type="text"
                    value={coupon2LeftNote}
                    onChange={(e) => setCoupon2LeftNote(e.target.value)}
                    disabled={!catalogPromoPublished}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:ring-primary-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-550 uppercase">Título del Cupón (Derecha)</label>
                  <input
                    type="text"
                    value={coupon2RightTitle}
                    onChange={(e) => setCoupon2RightTitle(e.target.value)}
                    disabled={!catalogPromoPublished}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:ring-primary-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-550 uppercase">Restricción / Límite (Derecha)</label>
                  <input
                    type="text"
                    value={coupon2RightLimit}
                    onChange={(e) => setCoupon2RightLimit(e.target.value)}
                    disabled={!catalogPromoPublished}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs focus:ring-primary-500"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end items-center gap-4">
          {saveSuccess && (
            <span className="text-green-650 text-sm font-bold flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              ¡Promociones guardadas!
            </span>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="bg-primary-705 hover:bg-primary-800 text-white font-bold py-2.5 px-6 rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
