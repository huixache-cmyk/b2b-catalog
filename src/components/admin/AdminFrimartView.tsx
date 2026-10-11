"use client";

import React, { useState, useMemo } from "react";
import {
  Snowflake,
  TrendingUp,
  Store,
  Users,
  Target,
  QrCode,
  Layers,
  Database,
  Search,
  Filter,
  DollarSign,
  Package,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  Copy,
  ExternalLink,
  Shield,
  FileSpreadsheet,
  MapPin,
  ChevronRight,
  Printer,
  Sparkles,
  BarChart3,
  Calendar,
  Sliders,
  Check,
  Eye
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export function AdminFrimartView() {
  const [activeSubTab, setActiveSubTab] = useState<
    "ventas" | "qr_lotes" | "usuarios" | "metas" | "rutas_clientes" | "congeladores" | "catalogo" | "db_sync"
  >("ventas");

  // Notification Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // ==========================================
  // 1. DATA STATE: VENTAS MULTIDIMENSIONALES
  // ==========================================
  const [filterCedis, setFilterCedis] = useState<string>("ALL");
  const [filterSupervisor, setFilterSupervisor] = useState<string>("ALL");
  const [filterRuta, setFilterRuta] = useState<string>("ALL");
  const [filterVendedor, setFilterVendedor] = useState<string>("ALL");
  const [filterCategoria, setFilterCategoria] = useState<string>("ALL");
  const [filterSearch, setFilterSearch] = useState<string>("");

  // Transacciones de ventas enriquecidas para cruces multidimensionales
  const [salesRecords, setSalesRecords] = useState([
    {
      id: "VTA-001",
      folio: "FOL-AGS-8901",
      fecha: "2026-10-10",
      cedis: "Aguascalientes (1205)",
      cedisCode: "CEDIS-AGS",
      supervisor: "Roberto Garza",
      ruta: "Ruta AGS-01 Norte",
      vendedor: "Carlos Mendoza",
      cliente: "Carnicería y Cremería Tepeyac",
      sku: "LH-FRESA-1KG",
      producto: "Fresa Congelada Entera La Huerta 1kg",
      categoria: "Frutas",
      cajas: 4,
      precioUnitario: 98.50,
      costoUnitario: 62.00,
      totalVenta: 3940.00,
      utilidadBruta: 1460.00,
      rentabilidadPct: 37.1,
      metodoPago: "Contado",
      estatus: "Completada"
    },
    {
      id: "VTA-002",
      folio: "FOL-AGS-8902",
      fecha: "2026-10-10",
      cedis: "Aguascalientes (1205)",
      cedisCode: "CEDIS-AGS",
      supervisor: "Roberto Garza",
      ruta: "Ruta AGS-01 Norte",
      vendedor: "Carlos Mendoza",
      cliente: "Cremería Nueva Benjamín de Alba",
      sku: "LH-BROCOLI-500G",
      producto: "Floretes de Brócoli La Huerta 500g",
      categoria: "Verduras Congeladas",
      cajas: 6,
      precioUnitario: 42.00,
      costoUnitario: 24.50,
      totalVenta: 3780.00,
      utilidadBruta: 1575.00,
      rentabilidadPct: 41.7,
      metodoPago: "Crédito 8 días",
      estatus: "Completada"
    },
    {
      id: "VTA-003",
      folio: "FOL-AGS-8903",
      fecha: "2026-10-09",
      cedis: "Aguascalientes (1205)",
      cedisCode: "CEDIS-AGS",
      supervisor: "Roberto Garza",
      ruta: "Ruta AGS-01 Norte",
      vendedor: "Carlos Mendoza",
      cliente: "Cadena Comercial OXXO - Bara San Lorenzo",
      sku: "FRM-HEL-CHOCO-1L",
      producto: "Helado Premium Frimart Chocolate Belga 1L",
      categoria: "Helados",
      cajas: 5,
      precioUnitario: 74.00,
      costoUnitario: 42.00,
      totalVenta: 2960.00,
      utilidadBruta: 1280.00,
      rentabilidadPct: 43.2,
      metodoPago: "Contado",
      estatus: "Completada"
    },
    {
      id: "VTA-004",
      folio: "FOL-CUN-4101",
      fecha: "2026-10-09",
      cedis: "Cancún (01)",
      cedisCode: "CEDIS-CUN",
      supervisor: "Elena Rostova",
      ruta: "Ruta CUN-02 Zona Hotelera",
      vendedor: "Arturo Villalobos",
      cliente: "OXXO Nichupté Mz 12 CUN",
      sku: "FRM-PAL-FRESA-CREMA",
      producto: "Paleta Artesanal Fresa con Crema Frimart",
      categoria: "Paletas",
      cajas: 8,
      precioUnitario: 24.00,
      costoUnitario: 11.50,
      totalVenta: 4608.00,
      utilidadBruta: 2400.00,
      rentabilidadPct: 52.1,
      metodoPago: "Contado",
      estatus: "Completada"
    },
    {
      id: "VTA-005",
      folio: "FOL-CUN-4102",
      fecha: "2026-10-08",
      cedis: "Cancún (01)",
      cedisCode: "CEDIS-CUN",
      supervisor: "Elena Rostova",
      ruta: "Ruta CUN-01 Centro",
      vendedor: "Arturo Villalobos",
      cliente: "Soriana Híper Kabah CUN",
      sku: "LH-MANGO-CUBO-1KG",
      producto: "Mango en Cubos Selección La Huerta 1kg",
      categoria: "Frutas",
      cajas: 7,
      precioUnitario: 89.00,
      costoUnitario: 54.00,
      totalVenta: 6230.00,
      utilidadBruta: 2450.00,
      rentabilidadPct: 39.3,
      metodoPago: "Crédito 15 días",
      estatus: "Completada"
    }
  ]);

  // Filtrado reactivo de ventas
  const filteredSales = useMemo(() => {
    return salesRecords.filter((s) => {
      if (filterCedis !== "ALL" && s.cedisCode !== filterCedis) return false;
      if (filterSupervisor !== "ALL" && s.supervisor !== filterSupervisor) return false;
      if (filterRuta !== "ALL" && s.ruta !== filterRuta) return false;
      if (filterVendedor !== "ALL" && s.vendedor !== filterVendedor) return false;
      if (filterCategoria !== "ALL" && s.categoria !== filterCategoria) return false;
      if (
        filterSearch &&
        !s.cliente.toLowerCase().includes(filterSearch.toLowerCase()) &&
        !s.producto.toLowerCase().includes(filterSearch.toLowerCase()) &&
        !s.folio.toLowerCase().includes(filterSearch.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [salesRecords, filterCedis, filterSupervisor, filterRuta, filterVendedor, filterCategoria, filterSearch]);

  // KPIs calculados
  const kpiTotalVenta = useMemo(() => filteredSales.reduce((acc, s) => acc + s.totalVenta, 0), [filteredSales]);
  const kpiTotalUtilidad = useMemo(() => filteredSales.reduce((acc, s) => acc + s.utilidadBruta, 0), [filteredSales]);
  const kpiTotalCajas = useMemo(() => filteredSales.reduce((acc, s) => acc + s.cajas, 0), [filteredSales]);
  const kpiMargenPromedio = useMemo(
    () => (kpiTotalVenta > 0 ? ((kpiTotalUtilidad / kpiTotalVenta) * 100).toFixed(1) : "0.0"),
    [kpiTotalVenta, kpiTotalUtilidad]
  );

  // ==========================================
  // 2. DATA STATE: USUARIOS Y PERMISOS
  // ==========================================
  interface UserPermisos {
    ventas: boolean;
    rutas: boolean;
    congeladores: boolean;
    auditorias: boolean;
    reportes: boolean;
    admin: boolean;
    master?: boolean;
    [key: string]: boolean | undefined;
  }

  interface FrimartUser {
    id: string;
    nombre: string;
    rol: string;
    pin: string;
    cedis: string;
    permisos: UserPermisos;
  }

  const [usersList, setUsersList] = useState<FrimartUser[]>([
    {
      id: "USR-104",
      nombre: "Carlos Mendoza",
      rol: "vendedor",
      pin: "1041",
      cedis: "CEDIS Aguascalientes",
      permisos: { ventas: true, rutas: true, congeladores: true, auditorias: true, reportes: false, admin: false, master: false }
    },
    {
      id: "USR-002",
      nombre: "Roberto Garza",
      rol: "supervisor",
      pin: "2022",
      cedis: "CEDIS Aguascalientes",
      permisos: { ventas: true, rutas: true, congeladores: true, auditorias: true, reportes: true, admin: false, master: false }
    },
    {
      id: "USR-003",
      nombre: "Ing. Fernando Valenzuela",
      rol: "gerente_cedis",
      pin: "3033",
      cedis: "CEDIS Aguascalientes",
      permisos: { ventas: true, rutas: true, congeladores: true, auditorias: true, reportes: true, admin: true, master: false }
    },
    {
      id: "USR-004",
      nombre: "Lic. Valeria Morales",
      rol: "director_comercial",
      pin: "4044",
      cedis: "Nacional (Todos)",
      permisos: { ventas: true, rutas: true, congeladores: true, auditorias: true, reportes: true, admin: true, master: false }
    },
    {
      id: "USR-005",
      nombre: "Gerardo Rodríguez",
      rol: "propietario",
      pin: "9999",
      cedis: "Corporativo Frimart",
      permisos: { ventas: true, rutas: true, congeladores: true, auditorias: true, reportes: true, admin: true, master: true }
    }
  ]);

  const toggleUserPermission = (userId: string, permKey: string) => {
    setUsersList(prev =>
      prev.map(u => {
        if (u.id === userId) {
          const current = !!u.permisos[permKey];
          return {
            ...u,
            permisos: { ...u.permisos, [permKey]: !current }
          };
        }
        return u;
      })
    );
    showToast("Permiso de usuario actualizado");
  };

  // ==========================================
  // 3. DATA STATE: LOTES Y CÓDIGOS QR
  // ==========================================
  const [qrPrefix, setQrPrefix] = useState("FRM");
  const [qrStart, setQrStart] = useState(520);
  const [qrQuantity, setQrQuantity] = useState(12);

  // Generador de etiquetas QR virtuales
  const generatedQrList = useMemo(() => {
    const list = [];
    for (let i = 0; i < qrQuantity; i++) {
      const codeNum = (qrStart + i).toString().padStart(4, "0");
      list.push({
        code: `${qrPrefix}-${codeNum}`,
        modeloRecomendado: i % 2 === 0 ? "Torrey Horizontal 1.5m" : "Criotec Vertical 2 Puertas",
        temp: "-18.4°C"
      });
    }
    return list;
  }, [qrPrefix, qrStart, qrQuantity]);

  // ==========================================
  // 4. DATA STATE: PLANOGRAMAS MAESTROS
  // ==========================================
  const [selectedPlanogramModel, setSelectedPlanogramModel] = useState("Torrey-15");
  const planogramModels: Record<string, any> = {
    "Torrey-15": {
      name: "Torrey Horizontal Tapa Cristal 1.5m",
      tipo: "Horizontal",
      capacidadCajas: 40,
      niveles: [
        { nivel: 1, nombre: "Nivel Superior Frontal", skus: ["LH-FRESA-1KG", "LH-MANGO-CUBO-1KG", "FRM-HEL-CHOCO-1L", "FRM-HEL-VAIN-1L"] },
        { nivel: 2, nombre: "Nivel Medio", skus: ["LH-BROCOLI-500G", "LH-VERD-CAMP-500G", "LH-BROCOLI-500G", "LH-VERD-CAMP-500G"] },
        { nivel: 3, nombre: "Nivel Fondo / Base", skus: ["FRM-PAL-FRESA-CREMA", "FRM-PAL-FRESA-CREMA", "FRM-PAL-FRESA-CREMA", "FRM-PAL-FRESA-CREMA"] }
      ]
    },
    "Criotec-Vert": {
      name: "Criotec Vertical Exhibidor 2 Puertas",
      tipo: "Vertical",
      capacidadCajas: 65,
      niveles: [
        { nivel: 1, nombre: "Nivel Ojos (Superior)", skus: ["FRM-HEL-CHOCO-1L", "FRM-HEL-VAIN-1L", "FRM-PAL-FRESA-CREMA"] },
        { nivel: 2, nombre: "Nivel Medio Alto", skus: ["LH-FRESA-1KG", "LH-MANGO-CUBO-1KG", "LH-FRESA-1KG"] },
        { nivel: 3, nombre: "Nivel Medio Bajo", skus: ["LH-BROCOLI-500G", "LH-VERD-CAMP-500G", "LH-BROCOLI-500G"] },
        { nivel: 4, nombre: "Nivel Base", skus: ["FRM-PAL-FRESA-CREMA", "FRM-PAL-FRESA-CREMA", "FRM-PAL-FRESA-CREMA"] }
      ]
    }
  };

  // ==========================================
  // 5. DATA STATE: CATÁLOGO DE PRODUCTOS E IMÁGENES
  // ==========================================
  const [productList, setProductList] = useState([
    { id: "PROD-01", sku: "LH-FRESA-1KG", nombre: "Fresa Congelada Entera La Huerta 1kg", categoria: "Frutas", precio: 98.50, costo: 62.00, stockCedis: 350, imagen: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=200&auto=format&fit=crop&q=80" },
    { id: "PROD-02", sku: "LH-BROCOLI-500G", nombre: "Floretes de Brócoli La Huerta 500g", categoria: "Verduras Congeladas", precio: 42.00, costo: 24.50, stockCedis: 480, imagen: "https://images.unsplash.com/photo-1584270354949-c26b0d5b4a0c?w=200&auto=format&fit=crop&q=80" },
    { id: "PROD-03", sku: "LH-VERD-CAMP-500G", nombre: "Verduras Campestres La Huerta 500g", categoria: "Verduras Congeladas", precio: 38.00, costo: 21.00, stockCedis: 420, imagen: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=200&auto=format&fit=crop&q=80" },
    { id: "PROD-04", sku: "LH-MANGO-CUBO-1KG", nombre: "Mango en Cubos Selección La Huerta 1kg", categoria: "Frutas", precio: 89.00, costo: 54.00, stockCedis: 290, imagen: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=200&auto=format&fit=crop&q=80" },
    { id: "PROD-05", sku: "FRM-HEL-CHOCO-1L", nombre: "Helado Premium Frimart Chocolate Belga 1L", categoria: "Helados", precio: 74.00, costo: 42.00, stockCedis: 210, imagen: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=200&auto=format&fit=crop&q=80" },
    { id: "PROD-06", sku: "FRM-HEL-VAIN-1L", nombre: "Helado Cremoso Vainilla Papantla Frimart 1L", categoria: "Helados", precio: 68.00, costo: 38.00, stockCedis: 195, imagen: "https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=200&auto=format&fit=crop&q=80" },
    { id: "PROD-07", sku: "FRM-PAL-FRESA-CREMA", nombre: "Paleta Artesanal Fresa con Crema Frimart", categoria: "Paletas", precio: 24.00, costo: 11.50, stockCedis: 520, imagen: "https://images.unsplash.com/photo-1505394033641-40c6ad1178d7?w=200&auto=format&fit=crop&q=80" }
  ]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-emerald-500/50 flex items-center gap-2 text-xs font-bold animate-bounce-subtle">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Banner Frimart OS */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white shadow-lg border border-emerald-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
              Módulo Maestro Oficial
            </span>
          </div>
          <h2 className="text-2xl font-black font-['Outfit'] tracking-tight flex items-center gap-2">
            <Snowflake className="w-6 h-6 text-emerald-400" />
            <span>Frimart OS • Control de Congeladores y Rutas La Huerta</span>
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Centro de administración global: cruces analíticos de ventas, control de lotes QR, asignación de permisos, metas comerciales, planogramas maestros y catálogo sincronizado en tiempo real a todos los dispositivos móviles.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <div className="px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-left">
            <span className="text-[10px] text-slate-400 block font-semibold">Estado Nube</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Supabase Conectado
            </span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-gray-200">
        {[
          { id: "ventas", label: "📊 Ventas & Rentabilidad", icon: BarChart3 },
          { id: "qr_lotes", label: "🏷️ Lotes Códigos QR", icon: QrCode },
          { id: "usuarios", label: "👥 Usuarios & Permisos", icon: Users },
          { id: "metas", label: "🎯 Metas Comerciales", icon: Target },
          { id: "congeladores", label: "🧊 Planogramas Maestros", icon: Snowflake },
          { id: "catalogo", label: "📦 Catálogo & Imágenes", icon: Package },
          { id: "rutas_clientes", label: "🗺️ Rutas & Clientes", icon: Store },
          { id: "db_sync", label: "⚡ Migración Supabase", icon: Database }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`tap-effect px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeSubTab === tab.id
                ? "bg-slate-900 text-white shadow-sm ring-2 ring-emerald-500/20"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-transparent"
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ============================================================== */}
      {/* 1. SUB-TAB: VENTAS & RENTABILIDAD MULTIDIMENSIONAL */}
      {/* ============================================================== */}
      {activeSubTab === "ventas" && (
        <div className="space-y-5 animate-fade-in">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Venta Total Filtrada</span>
              <div className="text-2xl font-black text-gray-900 mt-1 font-['Outfit']">
                ${kpiTotalVenta.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">Facturación bruta en ruta</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 shadow-2xs">
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">Utilidad Bruta ($)</span>
              <div className="text-2xl font-black text-emerald-800 mt-1 font-['Outfit']">
                +${kpiTotalUtilidad.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">Margen $ sobre costo base</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Rentabilidad Promedio</span>
              <div className="text-2xl font-black text-indigo-700 mt-1 font-['Outfit']">
                {kpiMargenPromedio}%
              </div>
              <span className="text-[10px] text-gray-500 font-semibold mt-1 block">Margen porcentual promedio</span>
            </div>

            <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-2xs">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Volumen Desplazado</span>
              <div className="text-2xl font-black text-gray-900 mt-1 font-['Outfit']">
                {kpiTotalCajas} cajas
              </div>
              <span className="text-[10px] text-gray-500 font-semibold mt-1 block">{filteredSales.length} transacciones</span>
            </div>
          </div>

          {/* Filtros Multidimensionales */}
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-emerald-600" /> Cruces Analíticos Multidimensionales
              </span>
              <button
                onClick={() => {
                  setFilterCedis("ALL");
                  setFilterSupervisor("ALL");
                  setFilterRuta("ALL");
                  setFilterVendedor("ALL");
                  setFilterCategoria("ALL");
                  setFilterSearch("");
                }}
                className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
              >
                Limpiar Filtros
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              {/* 1. CEDIS */}
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">CEDIS</label>
                <select
                  value={filterCedis}
                  onChange={e => setFilterCedis(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-gray-300 font-medium"
                >
                  <option value="ALL">Todos los CEDIS</option>
                  <option value="CEDIS-AGS">Aguascalientes (1205)</option>
                  <option value="CEDIS-CUN">Cancún (01)</option>
                </select>
              </div>

              {/* 2. Supervisor */}
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Supervisor</label>
                <select
                  value={filterSupervisor}
                  onChange={e => setFilterSupervisor(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-gray-300 font-medium"
                >
                  <option value="ALL">Todos los Supervisores</option>
                  <option value="Roberto Garza">Roberto Garza</option>
                  <option value="Elena Rostova">Elena Rostova</option>
                </select>
              </div>

              {/* 3. Ruta */}
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Ruta</label>
                <select
                  value={filterRuta}
                  onChange={e => setFilterRuta(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-gray-300 font-medium"
                >
                  <option value="ALL">Todas las Rutas</option>
                  <option value="Ruta AGS-01 Norte">Ruta AGS-01 Norte</option>
                  <option value="Ruta CUN-01 Centro">Ruta CUN-01 Centro</option>
                  <option value="Ruta CUN-02 Zona Hotelera">Ruta CUN-02 Hotelera</option>
                </select>
              </div>

              {/* 4. Vendedor */}
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Vendedor</label>
                <select
                  value={filterVendedor}
                  onChange={e => setFilterVendedor(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-gray-300 font-medium"
                >
                  <option value="ALL">Todos los Vendedores</option>
                  <option value="Carlos Mendoza">Carlos Mendoza</option>
                  <option value="Arturo Villalobos">Arturo Villalobos</option>
                </select>
              </div>

              {/* 5. Categoría */}
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Categoría</label>
                <select
                  value={filterCategoria}
                  onChange={e => setFilterCategoria(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-gray-300 font-medium"
                >
                  <option value="ALL">Todas las Categorías</option>
                  <option value="Frutas">Frutas Congeladas</option>
                  <option value="Verduras Congeladas">Verduras Congeladas</option>
                  <option value="Helados">Helados</option>
                  <option value="Paletas">Paletas</option>
                </select>
              </div>

              {/* 6. Búsqueda */}
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Buscar</label>
                <div className="relative">
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={e => setFilterSearch(e.target.value)}
                    placeholder="Cliente, SKU..."
                    className="w-full text-xs pl-7 pr-2 py-2 rounded-lg bg-white border border-gray-300"
                  />
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2 top-2.5 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Ventas y Partidas */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
            <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700">
                Detalle de Ventas Registradas ({filteredSales.length} registros)
              </span>
              <button
                onClick={() => showToast("Exportando a Excel / CSV...")}
                className="text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1 rounded-lg flex items-center gap-1 transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar Análisis
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 text-gray-600 uppercase text-[10px] font-bold tracking-wider">
                  <tr>
                    <th className="p-3">Folio / Fecha</th>
                    <th className="p-3">CEDIS / Ruta</th>
                    <th className="p-3">Vendedor / Supervisor</th>
                    <th className="p-3">Cliente (Punto de Venta)</th>
                    <th className="p-3">Producto / Categoría</th>
                    <th className="p-3 text-right">Cajas</th>
                    <th className="p-3 text-right">Precio Vta.</th>
                    <th className="p-3 text-right">Total Vta.</th>
                    <th className="p-3 text-right">Utilidad $</th>
                    <th className="p-3 text-center">Rentabilidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSales.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-gray-900 block">{item.folio}</span>
                        <span className="text-[10px] text-gray-500">{item.fecha}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-gray-800 block">{item.cedis}</span>
                        <span className="text-[10px] text-gray-500">{item.ruta}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-gray-800 block">{item.vendedor}</span>
                        <span className="text-[10px] text-gray-500">Sup: {item.supervisor}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-gray-900 block max-w-[160px] truncate">{item.cliente}</span>
                        <span className="text-[10px] text-emerald-700 font-medium">{item.metodoPago}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-gray-800 block max-w-[200px] truncate">{item.producto}</span>
                        <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-bold">
                          {item.categoria}
                        </span>
                      </td>
                      <td className="p-3 text-right font-black text-gray-900">{item.cajas}</td>
                      <td className="p-3 text-right font-mono">${item.precioUnitario.toFixed(2)}</td>
                      <td className="p-3 text-right font-black text-gray-900 font-mono">
                        ${item.totalVenta.toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-700 font-mono">
                        +${item.utilidadBruta.toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {item.rentabilidadPct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. SUB-TAB: LOTES Y CÓDIGOS QR */}
      {/* ============================================================== */}
      {activeSubTab === "qr_lotes" && (
        <div className="space-y-5 animate-fade-in">
          <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-600" />
                  Generador de Lotes de Códigos QR para Congeladores
                </h3>
                <p className="text-xs text-gray-500">
                  Crea e imprime paquetes de etiquetas para pegar en los congeladores de clientes en ruta.
                </p>
              </div>

              <button
                onClick={() => window.print()}
                className="tap-effect h-9 px-4 rounded-xl bg-slate-900 text-white text-xs font-black flex items-center gap-1.5 shadow-md hover:bg-slate-800 transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Etiquetas (Formato A4)</span>
              </button>
            </div>

            {/* Controles de Lote */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-xl">
              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Prefijo de Empresa</label>
                <input
                  type="text"
                  value={qrPrefix}
                  onChange={e => setQrPrefix(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-gray-300 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Número Inicial</label>
                <input
                  type="number"
                  value={qrStart}
                  onChange={e => setQrStart(parseInt(e.target.value) || 0)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-gray-300 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Cantidad a Generar</label>
                <input
                  type="number"
                  value={qrQuantity}
                  onChange={e => setQrQuantity(parseInt(e.target.value) || 1)}
                  className="w-full text-xs p-2 rounded-lg bg-white border border-gray-300 font-bold"
                />
              </div>
            </div>

            {/* Grid de Etiquetas QR para Imprimir */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
              {generatedQrList.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-white border-2 border-dashed border-gray-300 flex flex-col items-center text-center space-y-2 shadow-2xs hover:border-emerald-500 transition"
                >
                  <div className="w-24 h-24 bg-gray-100 rounded-lg border border-gray-200 flex flex-col items-center justify-center p-1">
                    {/* QR Code Simulado SVG */}
                    <QrCode className="w-16 h-16 text-slate-900" />
                  </div>
                  <div>
                    <span className="font-mono text-sm font-black text-slate-900 block">{item.code}</span>
                    <span className="text-[10px] text-gray-500 block">Congelador Oficial La Huerta</span>
                    <span className="text-[9.5px] text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 mt-1 inline-block">
                      {item.temp}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. SUB-TAB: USUARIOS & PERMISOS */}
      {/* ============================================================== */}
      {activeSubTab === "usuarios" && (
        <div className="space-y-5 animate-fade-in">
          <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600" />
                  Control de Usuarios, PINs y Asignación de Permisos
                </h3>
                <p className="text-xs text-gray-500">
                  Administra las claves numéricas de 4 dígitos y los permisos asignados a cada dispositivo.
                </p>
              </div>

              <button
                onClick={() => showToast("Formulario de alta de usuario activado")}
                className="tap-effect h-8 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-emerald-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Usuario
              </button>
            </div>

            <div className="space-y-3">
              {usersList.map(user => (
                <div
                  key={user.id}
                  className="p-4 rounded-xl border border-gray-200 hover:border-emerald-400 transition bg-white shadow-2xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                        {user.nombre.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-gray-900 leading-snug">{user.nombre}</h4>
                        <span className="text-[11px] text-gray-500">{user.cedis} • Rol: <strong className="text-slate-800 uppercase">{user.rol}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300">
                        PIN: {user.pin}
                      </span>
                    </div>
                  </div>

                  {/* Recuadro de Asignación de Permisos */}
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                      Recuadro de Permisos Habilitados en Dispositivo:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                      {Object.entries(user.permisos).map(([permKey, isEnabled]) => (
                        <button
                          key={permKey}
                          onClick={() => toggleUserPermission(user.id, permKey)}
                          className={`tap-effect px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between border transition cursor-pointer ${
                            isEnabled
                              ? "bg-emerald-100 text-emerald-900 border-emerald-400"
                              : "bg-white text-gray-400 border-gray-200"
                          }`}
                        >
                          <span className="capitalize text-[11px]">{permKey}</span>
                          <span className="text-[10px]">{isEnabled ? "✓" : "✗"}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. SUB-TAB: PLANOGRAMAS MAESTROS */}
      {/* ============================================================== */}
      {activeSubTab === "congeladores" && (
        <div className="space-y-5 animate-fade-in">
          <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                  <Snowflake className="w-4 h-4 text-emerald-600" />
                  Planogramas Maestros Oficiales La Huerta
                </h3>
                <p className="text-xs text-gray-500">
                  Alineación obligatoria de productos por nivel y frente que todos los vendedores deben auditar.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedPlanogramModel("Torrey-15")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    selectedPlanogramModel === "Torrey-15" ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  Torrey 1.5m
                </button>
                <button
                  onClick={() => setSelectedPlanogramModel("Criotec-Vert")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                    selectedPlanogramModel === "Criotec-Vert" ? "bg-slate-900 text-white" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  Criotec Vertical
                </button>
              </div>
            </div>

            {/* Matriz Visual de Planograma */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div>
                  <h4 className="font-black text-base text-emerald-400 font-['Outfit']">
                    {planogramModels[selectedPlanogramModel].name}
                  </h4>
                  <span className="text-xs text-slate-400">
                    Tipo: {planogramModels[selectedPlanogramModel].tipo} • Capacidad: {planogramModels[selectedPlanogramModel].capacidadCajas} Cajas
                  </span>
                </div>
                <button
                  onClick={() => showToast("Planograma maestro propagado a toda la flota")}
                  className="tap-effect h-8 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Sincronizar a Flota
                </button>
              </div>

              {/* Niveles del Congelador */}
              <div className="space-y-3">
                {planogramModels[selectedPlanogramModel].niveles.map((nivel: any) => (
                  <div key={nivel.nivel} className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span>Nivel {nivel.nivel}: {nivel.nombre}</span>
                      <span className="text-[10px] text-emerald-400">{nivel.skus.length} Frentes Obligatorios</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {nivel.skus.map((sku: string, idx: number) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-slate-900 border border-emerald-500/30 text-center space-y-1 hover:border-emerald-400 transition"
                        >
                          <span className="font-mono text-[10px] text-emerald-400 font-bold block">{sku}</span>
                          <span className="text-xs font-extrabold text-white block">Posición #{idx + 1}</span>
                          <span className="text-[9px] text-slate-400 block">✓ 100% Obligatorio</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. SUB-TAB: CATÁLOGO & IMÁGENES */}
      {/* ============================================================== */}
      {activeSubTab === "catalogo" && (
        <div className="space-y-5 animate-fade-in">
          <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-600" />
                  Catálogo Maestro de Productos e Imágenes La Huerta
                </h3>
                <p className="text-xs text-gray-500">
                  Cualquier imagen o precio actualizado aquí se sincroniza al instante en la app de todos los vendedores.
                </p>
              </div>

              <button
                onClick={() => showToast("Cargador de imagen oficial listo")}
                className="tap-effect h-8 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shadow-sm hover:bg-emerald-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Nuevo Producto
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {productList.map(prod => (
                <div
                  key={prod.id}
                  className="p-3.5 rounded-xl border border-gray-200 bg-white shadow-2xs space-y-3 flex flex-col justify-between"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={prod.imagen}
                      alt={prod.nombre}
                      className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] font-bold text-emerald-700 block">{prod.sku}</span>
                      <h4 className="font-bold text-xs text-gray-900 line-clamp-2 leading-snug">{prod.nombre}</h4>
                      <span className="text-[10px] text-gray-500 block mt-1">{prod.categoria}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block">Precio Vta.</span>
                      <span className="font-bold text-gray-900 font-mono">${prod.precio.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Costo Base</span>
                      <span className="font-bold text-gray-600 font-mono">${prod.costo.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block">Stock CEDIS</span>
                      <span className="font-black text-emerald-700">{prod.stockCedis} cjs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 6. SUB-TAB: MIGRACIÓN SUPABASE */}
      {/* ============================================================== */}
      {activeSubTab === "db_sync" && (
        <div className="space-y-5 animate-fade-in">
          <div className="p-5 rounded-2xl bg-white border border-gray-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-gray-900">Script de Migración SQL para Supabase</h3>
                <p className="text-xs text-gray-500">
                  Tablas relacionales: frimart_ventas, frimart_detalle_ventas, frimart_usuarios, frimart_congeladores, frimart_planogramas e inventarios.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2 border border-slate-800">
              <div className="flex justify-between items-center text-slate-400 border-b border-slate-800 pb-2">
                <span>supabase_frimart_setup.sql</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText("-- Archivo supabase_frimart_setup.sql disponible en la raiz de b2b-catalog");
                    showToast("Ruta copiada al portapapeles");
                  }}
                  className="hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar referencia
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                El archivo SQL completo se encuentra generado en la raíz de tu proyecto:
                <br />
                <code className="text-emerald-400 font-bold">b2b-catalog/supabase_frimart_setup.sql</code>
              </p>
              <p className="text-[11px] text-slate-400">
                Solo cópialo y pégalo en el <strong>SQL Editor</strong> de tu panel de Supabase para activar las 10 tablas relacionales en la nube con un solo clic.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
