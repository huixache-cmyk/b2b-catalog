"use client";

import { useState, useEffect } from "react";
import { HomeSettings } from "@/hooks/useSettings";
import { Save, Tag, PanelLeft, Check, Gift, Palette, Sliders } from "lucide-react";

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

  // Styling states for Special Offer Tag
  const [tagBgColor, setTagBgColor] = useState(currentPromo.tagBgColor ?? "#eefcf7");
  const [tagBorderColor, setTagBorderColor] = useState(currentPromo.tagBorderColor ?? "#cbf2e3");
  const [tagTextColor, setTagTextColor] = useState(currentPromo.tagTextColor ?? "#0a6644");
  const [tagTextSize, setTagTextSize] = useState(currentPromo.tagTextSize ?? "text-xs");
  const [tagIcon, setTagIcon] = useState(currentPromo.tagIcon ?? "Truck");
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
  const [catalogPromoButtonText, setCatalogPromoButtonText] = useState(currentPromo.catalogPromoButtonText ?? "¡Consíguelo!");
  const [catalogPromoFooterNote, setCatalogPromoFooterNote] = useState(currentPromo.catalogPromoFooterNote ?? "Cupones confirmados después de iniciar sesión");

  // Styling states for Side Drawer Promo
  const [sideBgColor, setSideBgColor] = useState(currentPromo.sideBgColor ?? "#ffeceb");
  const [sideTextColor, setSideTextColor] = useState(currentPromo.sideTextColor ?? "#222222");
  const [sidePromoTextColor, setSidePromoTextColor] = useState(currentPromo.sidePromoTextColor ?? "#e1251b");
  const [sideButtonBgColor, setSideButtonBgColor] = useState(currentPromo.sideButtonBgColor ?? "#000000");
  const [sideButtonTextColor, setSideButtonTextColor] = useState(currentPromo.sideButtonTextColor ?? "#ffffff");
  const [sideTextSizeTitle, setSideTextSizeTitle] = useState(currentPromo.sideTextSizeTitle ?? "Mediano");
  const [sideTextSizePromo, setSideTextSizePromo] = useState(currentPromo.sideTextSizePromo ?? "Normal");
  const [sideTriggerIcon, setSideTriggerIcon] = useState(currentPromo.sideTriggerIcon ?? "Arrow");

  // Styling states for Catalog Promo
  const [catalogPromoBgColorStart, setCatalogPromoBgColorStart] = useState(currentPromo.catalogPromoBgColorStart ?? "#fff6ee");
  const [catalogPromoBgColorEnd, setCatalogPromoBgColorEnd] = useState(currentPromo.catalogPromoBgColorEnd ?? "#ffffff");
  const [catalogPromoTextColor, setCatalogPromoTextColor] = useState(currentPromo.catalogPromoTextColor ?? "#a0522d");
  const [catalogPromoCouponBgColor, setCatalogPromoCouponBgColor] = useState(currentPromo.catalogPromoCouponBgColor ?? "#fff7f6");
  const [catalogPromoCouponBorderColor, setCatalogPromoCouponBorderColor] = useState(currentPromo.catalogPromoCouponBorderColor ?? "#ffd2cc");
  const [catalogPromoCouponTextColor, setCatalogPromoCouponTextColor] = useState(currentPromo.catalogPromoCouponTextColor ?? "#ff4a5a");
  const [catalogPromoButtonBgColor, setCatalogPromoButtonBgColor] = useState(currentPromo.catalogPromoButtonBgColor ?? "#222222");
  const [catalogPromoButtonTextColor, setCatalogPromoButtonTextColor] = useState(currentPromo.catalogPromoButtonTextColor ?? "#ffffff");
  const [catalogPromoIcon, setCatalogPromoIcon] = useState(currentPromo.catalogPromoIcon ?? "GiftBow");
  const [catalogPromoAlwaysShow, setCatalogPromoAlwaysShow] = useState(currentPromo.catalogPromoAlwaysShow ?? false);
  const [catalogPromoPage, setCatalogPromoPage] = useState(currentPromo.catalogPromoPage ?? "Catálogo");
  const [catalogPromoTitle, setCatalogPromoTitle] = useState(currentPromo.catalogPromoTitle ?? "Ofertas especiales solo para ti");
  const [catalogPromoBadge, setCatalogPromoBadge] = useState(currentPromo.catalogPromoBadge ?? "Nuevo usuario");
  const [catalogPromoTargetAudience, setCatalogPromoTargetAudience] = useState(currentPromo.catalogPromoTargetAudience ?? "new_clients");
  const [sideTextSizeTrigger, setSideTextSizeTrigger] = useState(currentPromo.sideTextSizeTrigger ?? "Mediano");
  const [sidePromoPage, setSidePromoPage] = useState(currentPromo.sidePromoPage ?? "Detalle de Producto");
  const [sidePromoTargetAudience, setSidePromoTargetAudience] = useState(currentPromo.sidePromoTargetAudience ?? "new_clients");

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (homeSettings && homeSettings.promotions && !isInitialized) {
      const p = homeSettings.promotions;
      setTagText(p.tagText ?? "Oferta especial de envío gratis");
      setTagPublished(p.tagPublished ?? true);
      setTagBgColor(p.tagBgColor ?? "#eefcf7");
      setTagBorderColor(p.tagBorderColor ?? "#cbf2e3");
      setTagTextColor(p.tagTextColor ?? "#0a6644");
      setTagTextSize(p.tagTextSize ?? "text-xs");
      setTagIcon(p.tagIcon ?? "Truck");
      
      setSideTextTrigger(p.sideTextTrigger ?? "CONSIGUE 30% DE DTO.");
      setSideTitle(p.sideTitle ?? "Suscribirse para disfrutar los precios de VIP y Ventas Flash");
      setSideTextLeft(p.sideTextLeft ?? "Suscribirse y obtén -30% En Primer Pedido");
      setSideTextRight(p.sideTextRight ?? "ENVÍO GRATIS en su primer pedido +$MXN99");
      setSidePublished(p.sidePublished ?? true);
      
      setCatalogPromoPublished(p.catalogPromoPublished ?? true);
      setCatalogPromoDelay(p.catalogPromoDelay ?? 3);
      setCoupon1Discount(p.coupon1Discount ?? "30% DE DESCUENTO");
      setCoupon1LeftNote(p.coupon1LeftNote ?? "Sin mín. de compra");
      setCoupon1RightTitle(p.coupon1RightTitle ?? "Cupón válido en todo el sitio");
      setCoupon1RightLimit(p.coupon1RightLimit ?? "Límite de $MXN3,000");
      setCoupon2Discount(p.coupon2Discount ?? "65% DE DESCUENTO");
      setCoupon2LeftNote(p.coupon2LeftNote ?? "Sin mín. de compra");
      setCoupon2RightTitle(p.coupon2RightTitle ?? "Cupón válido en todo el sitio");
      setCoupon2RightLimit(p.coupon2RightLimit ?? "Límite de $MXN240");
      setCatalogPromoButtonText(p.catalogPromoButtonText ?? "¡Consíguelo!");
      setCatalogPromoFooterNote(p.catalogPromoFooterNote ?? "Cupones confirmados después de iniciar sesión");
      
      setSideBgColor(p.sideBgColor ?? "#ffeceb");
      setSideTextColor(p.sideTextColor ?? "#222222");
      setSidePromoTextColor(p.sidePromoTextColor ?? "#e1251b");
      setSideButtonBgColor(p.sideButtonBgColor ?? "#000000");
      setSideButtonTextColor(p.sideButtonTextColor ?? "#ffffff");
      setSideTextSizeTitle(p.sideTextSizeTitle ?? "Mediano");
      setSideTextSizePromo(p.sideTextSizePromo ?? "Normal");
      setSideTriggerIcon(p.sideTriggerIcon ?? "Arrow");
      
      setCatalogPromoBgColorStart(p.catalogPromoBgColorStart ?? "#fff6ee");
      setCatalogPromoBgColorEnd(p.catalogPromoBgColorEnd ?? "#ffffff");
      setCatalogPromoTextColor(p.catalogPromoTextColor ?? "#a0522d");
      setCatalogPromoCouponBgColor(p.catalogPromoCouponBgColor ?? "#fff7f6");
      setCatalogPromoCouponBorderColor(p.catalogPromoCouponBorderColor ?? "#ffd2cc");
      setCatalogPromoCouponTextColor(p.catalogPromoCouponTextColor ?? "#ff4a5a");
      setCatalogPromoButtonBgColor(p.catalogPromoButtonBgColor ?? "#222222");
      setCatalogPromoButtonTextColor(p.catalogPromoButtonTextColor ?? "#ffffff");
      setCatalogPromoIcon(p.catalogPromoIcon ?? "GiftBow");
      setCatalogPromoAlwaysShow(p.catalogPromoAlwaysShow ?? false);
      setCatalogPromoPage(p.catalogPromoPage ?? "Catálogo");
      setCatalogPromoTitle(p.catalogPromoTitle ?? "Ofertas especiales solo para ti");
      setCatalogPromoBadge(p.catalogPromoBadge ?? "Nuevo usuario");
      setCatalogPromoTargetAudience(p.catalogPromoTargetAudience ?? "new_clients");
      setSideTextSizeTrigger(p.sideTextSizeTrigger ?? "Mediano");
      setSidePromoPage(p.sidePromoPage ?? "Detalle de Producto");
      setSidePromoTargetAudience(p.sidePromoTargetAudience ?? "new_clients");
      setIsInitialized(true);
    }
  }, [homeSettings, isInitialized]);

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
        catalogPromoFooterNote,
        // Side promo styles
        sideBgColor,
        sideTextColor,
        sidePromoTextColor,
        sideButtonBgColor,
        sideButtonTextColor,
        sideTextSizeTitle,
        sideTextSizePromo,
        sideTriggerIcon,
        // Catalog promo styles
        catalogPromoBgColorStart,
        catalogPromoBgColorEnd,
        catalogPromoTextColor,
        catalogPromoCouponBgColor,
        catalogPromoCouponBorderColor,
        catalogPromoCouponTextColor,
        catalogPromoButtonBgColor,
        catalogPromoButtonTextColor,
        catalogPromoIcon,
        catalogPromoAlwaysShow,
        catalogPromoPage,
        catalogPromoTitle,
        catalogPromoBadge,
        catalogPromoTargetAudience,
        sideTextSizeTrigger,
        sidePromoPage,
        sidePromoTargetAudience,
        // Tag promo styles
        tagBgColor,
        tagBorderColor,
        tagTextColor,
        tagTextSize,
        tagIcon
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
          <div className="flex justify-between items-center border-b pb-2">
            <div className="flex items-center gap-2 text-primary-700 font-bold">
              <Tag className="w-5 h-5" />
              <h3>Etiqueta de Oferta Especial (Abajo de Ver Carrito)</h3>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? "Guardando..." : "Actualizar"}
            </button>
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

          {/* Customizer Sub-section for Section 1 */}
          <div className="border-t border-gray-150 pt-4 mt-4 space-y-4">
            <div className="flex items-center gap-1.5 text-gray-700 font-bold text-xs uppercase tracking-wider">
              <Palette className="w-4 h-4 text-primary-600" />
              <h4>Diseño, Colores e Iconos (Etiqueta Especial)</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-550 uppercase">Color de Fondo</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tagBgColor}
                    onChange={(e) => setTagBgColor(e.target.value)}
                    disabled={!tagPublished}
                    className="w-10 h-10 border border-gray-300 rounded cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={tagBgColor}
                    onChange={(e) => setTagBgColor(e.target.value)}
                    disabled={!tagPublished}
                    className="w-full border border-gray-300 rounded p-1.5 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-550 uppercase">Color de Borde</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tagBorderColor}
                    onChange={(e) => setTagBorderColor(e.target.value)}
                    disabled={!tagPublished}
                    className="w-10 h-10 border border-gray-300 rounded cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={tagBorderColor}
                    onChange={(e) => setTagBorderColor(e.target.value)}
                    disabled={!tagPublished}
                    className="w-full border border-gray-300 rounded p-1.5 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-550 uppercase">Color Texto/Icono</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={tagTextColor}
                    onChange={(e) => setTagTextColor(e.target.value)}
                    disabled={!tagPublished}
                    className="w-10 h-10 border border-gray-300 rounded cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={tagTextColor}
                    onChange={(e) => setTagTextColor(e.target.value)}
                    disabled={!tagPublished}
                    className="w-full border border-gray-300 rounded p-1.5 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-550 uppercase">Tamaño del Texto</label>
                <select
                  value={tagTextSize}
                  onChange={(e) => setTagTextSize(e.target.value)}
                  disabled={!tagPublished}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold focus:ring-primary-500"
                >
                  <option value="text-xs">Pequeño (12px)</option>
                  <option value="text-sm">Mediano (14px)</option>
                  <option value="text-base">Grande (16px)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-550 uppercase">Icono de la Etiqueta</label>
                <select
                  value={tagIcon}
                  onChange={(e) => setTagIcon(e.target.value)}
                  disabled={!tagPublished}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold focus:ring-primary-500"
                >
                  <option value="None">Ninguno</option>
                  <option value="Truck">Camión (Truck)</option>
                  <option value="Tag">Etiqueta (Tag)</option>
                  <option value="Gift">Regalo (Gift)</option>
                  <option value="Percent">Porcentaje (%)</option>
                  <option value="Star">Estrella (Star)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Side Drawer Discount Panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <div className="flex items-center gap-2 text-primary-700 font-bold">
              <PanelLeft className="w-5 h-5" />
              <h3>Panel Promocional Lateral (Desplegable Derecho)</h3>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? "Guardando..." : "Actualizar"}
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center border-b pb-3 border-gray-100">
            <div className="flex items-center gap-2">
              <input
                id="sidePublished"
                type="checkbox"
                checked={sidePublished}
                onChange={(e) => setSidePublished(e.target.checked)}
                className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 cursor-pointer"
              />
              <label htmlFor="sidePublished" className="text-sm font-semibold text-gray-700 cursor-pointer">
                Activar panel promocional lateral
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="sidePromoPage" className="block text-xs font-bold text-gray-700 uppercase">Página de Visualización</label>
              <select
                id="sidePromoPage"
                value={sidePromoPage}
                onChange={(e) => setSidePromoPage(e.target.value)}
                disabled={!sidePublished}
                className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm font-semibold focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
              >
                <option value="Detalle de Producto">Solo Detalle de Producto</option>
                <option value="Catálogo">Solo Catálogo</option>
                <option value="Ambos">Ambos (Catálogo y Detalle de Producto)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="sidePromoTargetAudience" className="block text-xs font-bold text-gray-700 uppercase">Público Objetivo (Aplicar a)</label>
              <select
                id="sidePromoTargetAudience"
                value={sidePromoTargetAudience}
                onChange={(e) => setSidePromoTargetAudience(e.target.value)}
                disabled={!sidePublished}
                className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm font-semibold focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
              >
                <option value="new_clients">Solo nuevos clientes (ocultar si ya se reclamó)</option>
                <option value="all_clients">Todos los clientes (mostrar siempre, incluso si ya tienen el cupón)</option>
              </select>
            </div>
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

          {/* Customizer Sub-section for Section 2 */}
          <div className="border-t border-gray-150 pt-4 mt-4 space-y-4">
            <div className="flex items-center gap-1.5 text-gray-700 font-bold text-xs uppercase tracking-wider">
              <Palette className="w-4 h-4 text-primary-600" />
              <h4>Diseño y Colores (Panel Lateral)</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-550 uppercase">Color de Fondo (Panel)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={sideBgColor}
                    onChange={(e) => setSideBgColor(e.target.value)}
                    disabled={!sidePublished}
                    className="w-10 h-10 border border-gray-300 rounded cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={sideBgColor}
                    onChange={(e) => setSideBgColor(e.target.value)}
                    disabled={!sidePublished}
                    className="w-full border border-gray-300 rounded p-1.5 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-550 uppercase">Color de Texto (Base)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={sideTextColor}
                    onChange={(e) => setSideTextColor(e.target.value)}
                    disabled={!sidePublished}
                    className="w-10 h-10 border border-gray-300 rounded cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={sideTextColor}
                    onChange={(e) => setSideTextColor(e.target.value)}
                    disabled={!sidePublished}
                    className="w-full border border-gray-300 rounded p-1.5 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-550 uppercase">Color Texto Promocional</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={sidePromoTextColor}
                    onChange={(e) => setSidePromoTextColor(e.target.value)}
                    disabled={!sidePublished}
                    className="w-10 h-10 border border-gray-300 rounded cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={sidePromoTextColor}
                    onChange={(e) => setSidePromoTextColor(e.target.value)}
                    disabled={!sidePublished}
                    className="w-full border border-gray-300 rounded p-1.5 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-550 uppercase">Fondo Tirador / Botón</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={sideButtonBgColor}
                    onChange={(e) => setSideButtonBgColor(e.target.value)}
                    disabled={!sidePublished}
                    className="w-10 h-10 border border-gray-300 rounded cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={sideButtonBgColor}
                    onChange={(e) => setSideButtonBgColor(e.target.value)}
                    disabled={!sidePublished}
                    className="w-full border border-gray-300 rounded p-1.5 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-550 uppercase">Texto Tirador / Botón</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={sideButtonTextColor}
                    onChange={(e) => setSideButtonTextColor(e.target.value)}
                    disabled={!sidePublished}
                    className="w-10 h-10 border border-gray-300 rounded cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={sideButtonTextColor}
                    onChange={(e) => setSideButtonTextColor(e.target.value)}
                    disabled={!sidePublished}
                    className="w-full border border-gray-300 rounded p-1.5 text-xs font-mono uppercase"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-550 uppercase">Tamaño Texto Título</label>
                <select
                  value={sideTextSizeTitle}
                  onChange={(e) => setSideTextSizeTitle(e.target.value)}
                  disabled={!sidePublished}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold focus:ring-primary-500"
                >
                  <option value="text-xs">Pequeño (12px)</option>
                  <option value="text-sm">Mediano (14px)</option>
                  <option value="text-base">Grande (16px)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-550 uppercase">Tamaño Texto Descuentos</label>
                <select
                  value={sideTextSizePromo}
                  onChange={(e) => setSideTextSizePromo(e.target.value)}
                  disabled={!sidePublished}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold focus:ring-primary-500"
                >
                  <option value="Normal">Normal</option>
                  <option value="Grande">Grande</option>
                  <option value="Muy Grande">Muy Grande</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-550 uppercase">Icono del Tirador</label>
                <select
                  value={sideTriggerIcon}
                  onChange={(e) => setSideTriggerIcon(e.target.value)}
                  disabled={!sidePublished}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold focus:ring-primary-500"
                >
                  <option value="Arrow">Flecha (◀/▶)</option>
                  <option value="Gift">Regalo (Gift)</option>
                  <option value="Tag">Etiqueta (Tag)</option>
                  <option value="Percent">Porcentaje (%)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-550 uppercase">Tamaño Texto Tirador</label>
                <select
                  value={sideTextSizeTrigger}
                  onChange={(e) => setSideTextSizeTrigger(e.target.value)}
                  disabled={!sidePublished}
                  className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold focus:ring-primary-500"
                >
                  <option value="Pequeño">Pequeño (10px)</option>
                  <option value="Mediano">Mediano (12px)</option>
                  <option value="Grande">Grande (14px)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Floating Catalog Promo Modal */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b pb-2">
            <div className="flex items-center gap-2 text-primary-700 font-bold">
              <Gift className="w-5 h-5" />
              <h3>Ventana Flotante de Promociones (Catálogo - Nuevos Usuarios)</h3>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? "Guardando..." : "Actualizar"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center col-span-1 md:col-span-2 border-b pb-3 border-gray-100">
              <div className="flex items-center gap-2">
                <input
                  id="catalogPromoPublished"
                  type="checkbox"
                  checked={catalogPromoPublished}
                  onChange={(e) => setCatalogPromoPublished(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
                />
                <label htmlFor="catalogPromoPublished" className="text-sm font-semibold text-gray-700 cursor-pointer">
                  Activar ventana flotante promocional
                </label>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  id="catalogPromoAlwaysShow"
                  type="checkbox"
                  checked={catalogPromoAlwaysShow}
                  onChange={(e) => setCatalogPromoAlwaysShow(e.target.checked)}
                  disabled={!catalogPromoPublished}
                  className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4"
                />
                <label htmlFor="catalogPromoAlwaysShow" className="text-sm font-semibold text-gray-700 cursor-pointer disabled:text-gray-400">
                  Mostrar siempre (ignorar descarte del usuario)
                </label>
              </div>
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
              <label className="block text-xs font-bold text-gray-700 uppercase">Página de Visualización</label>
              <select
                value={catalogPromoPage}
                onChange={(e) => setCatalogPromoPage(e.target.value)}
                disabled={!catalogPromoPublished}
                className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm font-semibold focus:ring-primary-500"
              >
                <option value="Catálogo">Solo Catálogo</option>
                <option value="Detalle de Producto">Solo Detalle de Producto</option>
                <option value="Ambos">Ambos (Catálogo y Detalle de Producto)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase">Público Objetivo (Aplicar a):</label>
              <select
                value={catalogPromoTargetAudience}
                onChange={(e) => setCatalogPromoTargetAudience(e.target.value)}
                disabled={!catalogPromoPublished}
                className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-sm font-semibold focus:ring-primary-500"
              >
                <option value="new_clients">Solo nuevos clientes (ocultar si ya se reclamó el cupón)</option>
                <option value="all_clients">Todos los clientes (mostrar siempre, incluso si ya tienen el cupón)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase">Título de la Ventana Flotante</label>
              <input
                type="text"
                value={catalogPromoTitle}
                onChange={(e) => setCatalogPromoTitle(e.target.value)}
                disabled={!catalogPromoPublished}
                placeholder="Ej. Ofertas especiales solo para ti"
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700 uppercase">Etiqueta de Cupón (Badge)</label>
              <input
                type="text"
                value={catalogPromoBadge}
                onChange={(e) => setCatalogPromoBadge(e.target.value)}
                disabled={!catalogPromoPublished}
                placeholder="Ej. Nuevo usuario"
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

            {/* Coupon 2 Config removed */}

            {/* Customizer Sub-section for Section 3 */}
            <div className="border-t border-gray-150 pt-4 mt-4 space-y-4 col-span-1 md:col-span-2">
              <div className="flex items-center gap-1.5 text-gray-700 font-bold text-xs uppercase tracking-wider">
                <Sliders className="w-4 h-4 text-primary-600" />
                <h4>Diseño, Colores e Iconos (Modal Catálogo)</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-550 uppercase">Fondo Gradiente Inicio</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={catalogPromoBgColorStart}
                      onChange={(e) => setCatalogPromoBgColorStart(e.target.value)}
                      disabled={!catalogPromoPublished}
                      className="w-10 h-10 border border-gray-300 rounded cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={catalogPromoBgColorStart}
                      onChange={(e) => setCatalogPromoBgColorStart(e.target.value)}
                      disabled={!catalogPromoPublished}
                      className="w-full border border-gray-300 rounded p-1.5 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-550 uppercase">Fondo Gradiente Fin</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={catalogPromoBgColorEnd}
                      onChange={(e) => setCatalogPromoBgColorEnd(e.target.value)}
                      disabled={!catalogPromoPublished}
                      className="w-10 h-10 border border-gray-300 rounded cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={catalogPromoBgColorEnd}
                      onChange={(e) => setCatalogPromoBgColorEnd(e.target.value)}
                      disabled={!catalogPromoPublished}
                      className="w-full border border-gray-300 rounded p-1.5 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-550 uppercase">Color Texto Título</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={catalogPromoTextColor}
                      onChange={(e) => setCatalogPromoTextColor(e.target.value)}
                      disabled={!catalogPromoPublished}
                      className="w-10 h-10 border border-gray-300 rounded cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={catalogPromoTextColor}
                      onChange={(e) => setCatalogPromoTextColor(e.target.value)}
                      disabled={!catalogPromoPublished}
                      className="w-full border border-gray-300 rounded p-1.5 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-550 uppercase">Fondo del Cupón</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={catalogPromoCouponBgColor}
                      onChange={(e) => setCatalogPromoCouponBgColor(e.target.value)}
                      disabled={!catalogPromoPublished}
                      className="w-10 h-10 border border-gray-300 rounded cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={catalogPromoCouponBgColor}
                      onChange={(e) => setCatalogPromoCouponBgColor(e.target.value)}
                      disabled={!catalogPromoPublished}
                      className="w-full border border-gray-300 rounded p-1.5 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-550 uppercase">Borde del Cupón</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={catalogPromoCouponBorderColor}
                      onChange={(e) => setCatalogPromoCouponBorderColor(e.target.value)}
                      disabled={!catalogPromoPublished}
                      className="w-10 h-10 border border-gray-300 rounded cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={catalogPromoCouponBorderColor}
                      onChange={(e) => setCatalogPromoCouponBorderColor(e.target.value)}
                      disabled={!catalogPromoPublished}
                      className="w-full border border-gray-300 rounded p-1.5 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-550 uppercase">Color Descuento Cupón</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={catalogPromoCouponTextColor}
                      onChange={(e) => setCatalogPromoCouponTextColor(e.target.value)}
                      disabled={!catalogPromoPublished}
                      className="w-10 h-10 border border-gray-300 rounded cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={catalogPromoCouponTextColor}
                      onChange={(e) => setCatalogPromoCouponTextColor(e.target.value)}
                      disabled={!catalogPromoPublished}
                      className="w-full border border-gray-300 rounded p-1.5 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-550 uppercase">Fondo Botón Acción</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={catalogPromoButtonBgColor}
                      onChange={(e) => setCatalogPromoButtonBgColor(e.target.value)}
                      disabled={!catalogPromoPublished}
                      className="w-10 h-10 border border-gray-300 rounded cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={catalogPromoButtonBgColor}
                      onChange={(e) => setCatalogPromoButtonBgColor(e.target.value)}
                      disabled={!catalogPromoPublished}
                      className="w-full border border-gray-300 rounded p-1.5 text-xs font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-550 uppercase">Texto Botón Acción</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={catalogPromoButtonTextColor}
                      onChange={(e) => setCatalogPromoButtonTextColor(e.target.value)}
                      disabled={!catalogPromoPublished}
                      className="w-10 h-10 border border-gray-300 rounded cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={catalogPromoButtonTextColor}
                      onChange={(e) => setCatalogPromoButtonTextColor(e.target.value)}
                      disabled={!catalogPromoPublished}
                      className="w-full border border-gray-300 rounded p-1.5 text-xs font-mono uppercase"
                    />
                  </div>
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
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
