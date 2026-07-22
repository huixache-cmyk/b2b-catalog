"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useSettings } from "@/hooks/useSettings";
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Key, 
  Mail, 
  MessageSquare, 
  BrainCircuit, 
  Search, 
  Eye, 
  EyeOff, 
  Check, 
  Trash2, 
  ShieldAlert, 
  Lock,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Database,
  Globe,
  FileText
} from "lucide-react";

type ServiceHealth = {
  id: string;
  status: 'OK' | 'WARNING' | 'ERROR';
  latency: number;
  message: string;
  updated_at: string;
};

type VendorNotification = {
  id: string;
  provider: string;
  subject: string;
  summary: string;
  severity: 'low' | 'medium' | 'critical';
  action_required: string;
  raw_content: string;
  resolved: boolean;
  created_at: string;
};

export function AdminDiagnostics() {
  const { homeSettings, updateHomeSettings } = useSettings();
  
  // States
  const [healthStatus, setHealthStatus] = useState<Record<string, ServiceHealth>>({});
  const [vendorAlerts, setVendorAlerts] = useState<VendorNotification[]>([]);
  const [isLoadingChecks, setIsLoadingChecks] = useState(false);
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState({ text: "", type: "" });
  
  // Credentials Inputs
  const [waToken, setWaToken] = useState("");
  const [waPhoneId, setWaPhoneId] = useState("");
  const [resendKey, setResendKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [hunterKey, setHunterKey] = useState("");
  const [vercelToken, setVercelToken] = useState("");
  const [facturapiStateKey, setFacturapiStateKey] = useState("");
  
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({
    waToken: false,
    resendKey: false,
    geminiKey: false,
    hunterKey: false,
    vercelToken: false,
    facturapiStateKey: false
  });

  // Table Filters
  const [filterProvider, setFilterProvider] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterResolved, setFilterResolved] = useState<string>("unresolved");
  const [searchQuery, setSearchQuery] = useState("");

  // Load existing data
  useEffect(() => {
    fetchHealthFromDB();
    fetchVendorAlerts();
    
    // Set dynamic credentials from settings
    const creds = (homeSettings as any)?.api_credentials || {};
    setWaToken(creds.WA_TOKEN || "");
    setWaPhoneId(creds.WA_PHONE_NUMBER_ID || "");
    setResendKey(creds.RESEND_API_KEY || "");
    setGeminiKey(creds.GEMINI_API_KEY || "");
    setHunterKey(creds.HUNTER_API_KEY || "");
    setVercelToken(creds.VERCEL_TOKEN || "");
    setFacturapiStateKey(creds.FACTURAPI_KEY || "");
  }, [homeSettings]);

  const fetchHealthFromDB = async () => {
    try {
      const { data, error } = await supabase
        .from('service_health')
        .select('*');
      
      if (!error && data) {
        const mapping = data.reduce((acc, curr) => {
          acc[curr.id] = curr;
          return acc;
        }, {} as Record<string, ServiceHealth>);
        setHealthStatus(mapping);
      }
    } catch (err) {
      console.error("Error loading health logs:", err);
    }
  };

  const fetchVendorAlerts = async () => {
    setIsLoadingAlerts(true);
    try {
      const { data, error } = await supabase
        .from('vendor_notifications')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setVendorAlerts(data);
      }
    } catch (err) {
      console.error("Error loading vendor notifications:", err);
    } finally {
      setIsLoadingAlerts(false);
    }
  };

  const runActiveDiagnostics = async () => {
    setIsLoadingChecks(true);
    setFeedbackMsg({ text: "Ejecutando diagnóstico de integraciones...", type: "info" });
    
    try {
      const sessionRes = await supabase.auth.getSession();
      const token = sessionRes.data.session?.access_token;
      
      if (!token) {
        setFeedbackMsg({ text: "Sesión expirada. Por favor vuelve a iniciar sesión.", type: "error" });
        setIsLoadingChecks(false);
        return;
      }

      const res = await fetch('/api/admin/diagnostics', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setHealthStatus(data.results);
        setFeedbackMsg({ text: "Diagnóstico completado con éxito. Estados actualizados.", type: "success" });
        // Refresh alert list too (if diagnostic triggered fallback notifications)
        fetchVendorAlerts();
      } else {
        setFeedbackMsg({ text: `Fallo en el diagnóstico: ${data.error || 'Respuesta inválida'}`, type: "error" });
      }
    } catch (err: any) {
      setFeedbackMsg({ text: `Error de conexión al ejecutar diagnóstico: ${err.message}`, type: "error" });
    } finally {
      setIsLoadingChecks(false);
    }
  };

  const saveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg({ text: "Guardando credenciales en base de datos...", type: "info" });
    
    try {
      const currentCreds = (homeSettings as any)?.api_credentials || {};
      const newCreds = {
        ...currentCreds,
        WA_TOKEN: waToken.trim(),
        WA_PHONE_NUMBER_ID: waPhoneId.trim(),
        RESEND_API_KEY: resendKey.trim(),
        GEMINI_API_KEY: geminiKey.trim(),
        HUNTER_API_KEY: hunterKey.trim(),
        VERCEL_TOKEN: vercelToken.trim(),
        FACTURAPI_KEY: facturapiStateKey.trim()
      };

      const updatedSettings = {
        ...homeSettings,
        api_credentials: newCreds
      };

      // updateHomeSettings handles database save
      updateHomeSettings(updatedSettings as any, true);
      setFeedbackMsg({ text: "Credenciales guardadas con éxito en settings.home_settings.api_credentials.", type: "success" });
    } catch (err: any) {
      setFeedbackMsg({ text: `Error al guardar credenciales: ${err.message}`, type: "error" });
    }
  };

  const toggleResolveAlert = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('vendor_notifications')
        .update({ resolved: !currentStatus })
        .eq('id', id);

      if (!error) {
        setVendorAlerts(prev => 
          prev.map(a => a.id === id ? { ...a, resolved: !currentStatus } : a)
        );
        setFeedbackMsg({ text: `Alerta marcada como ${!currentStatus ? 'resuelta' : 'pendiente'}.`, type: "success" });
      }
    } catch (err: any) {
      setFeedbackMsg({ text: `Error al actualizar alerta: ${err.message}`, type: "error" });
    }
  };

  const deleteAlert = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar permanentemente esta alerta de proveedor?")) return;
    try {
      const { error } = await supabase
        .from('vendor_notifications')
        .delete()
        .eq('id', id);

      if (!error) {
        setVendorAlerts(prev => prev.filter(a => a.id !== id));
        setFeedbackMsg({ text: "Alerta eliminada.", type: "success" });
      }
    } catch (err: any) {
      setFeedbackMsg({ text: `Error al eliminar: ${err.message}`, type: "error" });
    }
  };

  // Filter Alerts
  const filteredAlerts = vendorAlerts.filter(a => {
    const matchesProvider = filterProvider === "all" || a.provider === filterProvider;
    const matchesSeverity = filterSeverity === "all" || a.severity === filterSeverity;
    const matchesResolved = 
      filterResolved === "all" || 
      (filterResolved === "resolved" && a.resolved) ||
      (filterResolved === "unresolved" && !a.resolved);
      
    const searchString = `${a.subject} ${a.summary} ${a.action_required} ${a.provider}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase());
    
    return matchesProvider && matchesSeverity && matchesResolved && matchesSearch;
  });

  const getServiceStatusIcon = (status?: string) => {
    switch (status) {
      case 'OK':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'WARNING':
        return <AlertTriangle className="w-6 h-6 text-amber-500" />;
      case 'ERROR':
        return <XCircle className="w-6 h-6 text-red-500" />;
      default:
        return <Activity className="w-6 h-6 text-gray-400 animate-pulse" />;
    }
  };

  const getServiceStatusClass = (status?: string) => {
    switch (status) {
      case 'OK':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'WARNING':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'ERROR':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const serviceList = [
    { id: 'vercel', name: 'Vercel Hosting', icon: Globe, providerUrl: 'https://vercel.com' },
    { id: 'supabase', name: 'Supabase DB', icon: Database, providerUrl: 'https://supabase.com' },
    { id: 'resend', name: 'Resend Email', icon: Mail, providerUrl: 'https://resend.com' },
    { id: 'whatsapp', name: 'WhatsApp Cloud API', icon: MessageSquare, providerUrl: 'https://developers.facebook.com' },
    { id: 'gemini', name: 'Google AI Studio', icon: BrainCircuit, providerUrl: 'https://aistudio.google.com' },
    { id: 'hunter', name: 'Hunter.io API', icon: ShieldAlert, providerUrl: 'https://hunter.io' },
    { id: 'facturapi', name: 'Facturapi API', icon: FileText, providerUrl: 'https://facturapi.io' }
  ];

  return (
    <div className="space-y-8">
      {/* Toast Alert Feedback */}
      {feedbackMsg.text && (
        <div className={`p-4 rounded-xl border flex items-center justify-between transition-all duration-300 ${
          feedbackMsg.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          feedbackMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-semibold">{feedbackMsg.text}</span>
          </div>
          <button 
            onClick={() => setFeedbackMsg({ text: "", type: "" })} 
            className="text-xs font-bold hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* 1. Health Status Grid */}
      <div>
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-700" />
              Estado del Sistema e Integraciones
            </h3>
            <p className="text-xs text-gray-500">Pruebas en tiempo real de los servicios y dependencias de la plataforma.</p>
          </div>
          <button
            onClick={runActiveDiagnostics}
            disabled={isLoadingChecks}
            className="bg-primary-700 hover:bg-primary-800 disabled:opacity-50 text-white text-xs font-bold py-2.5 px-4 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingChecks ? 'animate-spin' : ''}`} />
            Ejecutar Diagnóstico Activo
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {serviceList.map((service) => {
            const check = healthStatus[service.id];
            const Icon = service.icon;
            
            return (
              <div 
                key={service.id} 
                className={`border rounded-xl p-4 flex flex-col justify-between min-h-[140px] transition-all shadow-sm ${getServiceStatusClass(check?.status)}`}
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-white/80 rounded-lg shadow-sm">
                      <Icon className="w-5 h-5 text-gray-700" />
                    </div>
                    {getServiceStatusIcon(check?.status)}
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 mt-1">{service.name}</h4>
                  <p className="text-[10px] text-gray-500 font-semibold mt-1 truncate" title={check?.message}>
                    {check ? check.message : 'Sin diagnosticar'}
                  </p>
                </div>
                
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200/50 text-[10px] font-semibold text-gray-500">
                  <span>{check ? `${check.latency} ms` : '-- ms'}</span>
                  <a 
                    href={service.providerUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center gap-0.5 hover:text-primary-700"
                  >
                    Consola <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid: Alerts and Credentials Form */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* 2. Vendor Alerts Panel (Span 2) */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary-700" />
                  Alertas del Buzón de Soporte (Hostinger Webhook)
                </h3>
                <p className="text-xs text-gray-500">Avisos técnicos clasificados por el agente inteligente de Gemini.</p>
              </div>
              <button 
                onClick={fetchVendorAlerts}
                disabled={isLoadingAlerts}
                className="text-primary-700 hover:text-primary-800 text-xs font-bold flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAlerts ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>

            {/* Filter Section */}
            <div className="flex flex-wrap gap-2 items-center bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs">
              <div className="flex items-center gap-1.5 flex-grow max-w-xs bg-white border border-gray-300 rounded-md px-2 py-1.5">
                <Search className="w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar avisos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent focus:outline-none text-xs"
                />
              </div>

              <select 
                value={filterProvider}
                onChange={(e) => setFilterProvider(e.target.value)}
                className="bg-white border border-gray-300 rounded-md p-1.5 text-xs font-semibold focus:outline-none"
              >
                <option value="all">Todos los Proveedores</option>
                <option value="vercel">Vercel</option>
                <option value="resend">Resend</option>
                <option value="whatsapp">WhatsApp / Meta</option>
                <option value="supabase">Supabase</option>
                <option value="hunter">Hunter.io</option>
                <option value="hostinger">Hostinger</option>
              </select>

              <select 
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="bg-white border border-gray-300 rounded-md p-1.5 text-xs font-semibold focus:outline-none"
              >
                <option value="all">Todas las Gravedades</option>
                <option value="critical">🔴 Crítico</option>
                <option value="medium">🟡 Medio</option>
                <option value="low">🔵 Bajo</option>
              </select>

              <select 
                value={filterResolved}
                onChange={(e) => setFilterResolved(e.target.value)}
                className="bg-white border border-gray-300 rounded-md p-1.5 text-xs font-semibold focus:outline-none"
              >
                <option value="unresolved">Pendientes</option>
                <option value="resolved">Resueltas</option>
                <option value="all">Todas las Alertas</option>
              </select>
            </div>

            {/* List */}
            {isLoadingAlerts ? (
              <div className="p-8 text-center text-xs text-gray-400 flex justify-center items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-primary-700" />
                Cargando historial de alertas del agente...
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 border border-dashed rounded-lg border-gray-200">
                No se encontraron alertas en el buzón que coincidan con los filtros.
              </div>
            ) : (
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {filteredAlerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`border rounded-lg p-4 transition-all duration-150 ${
                      alert.resolved ? 'bg-gray-50/70 border-gray-200' : 'bg-white border-gray-300/80 shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${getSeverityBadgeClass(alert.severity)}`}>
                            {alert.severity}
                          </span>
                          <span className="text-[10px] text-gray-500 font-semibold uppercase">
                            Proveedor: {alert.provider}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {new Date(alert.created_at).toLocaleString('es-MX')}
                          </span>
                        </div>
                        <h4 className={`text-sm font-bold ${alert.resolved ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                          {alert.subject}
                        </h4>
                      </div>

                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => toggleResolveAlert(alert.id, alert.resolved)}
                          title={alert.resolved ? "Marcar como pendiente" : "Marcar como resuelta"}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            alert.resolved 
                              ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700' 
                              : 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700'
                          }`}
                        >
                          {alert.resolved ? <RefreshCw className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => deleteAlert(alert.id)}
                          title="Eliminar registro"
                          className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-gray-700 leading-relaxed bg-gray-50 p-2.5 rounded-md border border-gray-150">
                      <p className="font-semibold text-gray-800">Resumen del Agente:</p>
                      <p className="mt-0.5">{alert.summary}</p>
                      
                      {alert.action_required && alert.action_required !== 'Ninguna' && (
                        <div className="mt-2 text-primary-900 font-bold flex items-start gap-1">
                          <ChevronRight className="w-4 h-4 flex-shrink-0 text-primary-700" />
                          <span>Acción Sugerida: {alert.action_required}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. Dynamic Credentials Management Form (Span 1) */}
        <div>
          <form onSubmit={saveCredentials} className="bg-white border border-gray-150 rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-primary-700" />
                Hot-Swap Credenciales (Supabase)
              </h3>
              <p className="text-xs text-gray-500">Actualiza tokens de inmediato sin redesplegar. Los tokens de base de datos toman prioridad.</p>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-[11px] text-gray-600 flex gap-2">
              <Lock className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <span>
                Las claves se almacenarán de forma encriptada en el campo <code>settings.home_settings.api_credentials</code> de tu base de datos Supabase.
              </span>
            </div>

            {/* Inputs */}
            <div className="space-y-3.5">
              {/* WhatsApp Token */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">WhatsApp Token (WA_TOKEN)</label>
                <div className="relative">
                  <input
                    type={showKeys.waToken ? "text" : "password"}
                    value={waToken}
                    onChange={(e) => setWaToken(e.target.value)}
                    placeholder="Token permanente de Meta o Temporal..."
                    className="w-full border border-gray-300 rounded-lg py-2 px-3 text-xs pr-10 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys(prev => ({ ...prev, waToken: !prev.waToken }))}
                    className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
                  >
                    {showKeys.waToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* WhatsApp Phone ID */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">WhatsApp Phone ID</label>
                <input
                  type="text"
                  value={waPhoneId}
                  onChange={(e) => setWaPhoneId(e.target.value)}
                  placeholder="ID del número de teléfono en Meta..."
                  className="w-full border border-gray-300 rounded-lg py-2 px-3 text-xs focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {/* Resend Key */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Resend API Key</label>
                <div className="relative">
                  <input
                    type={showKeys.resendKey ? "text" : "password"}
                    value={resendKey}
                    onChange={(e) => setResendKey(e.target.value)}
                    placeholder="re_xxxxxxxxxxxxxx"
                    className="w-full border border-gray-300 rounded-lg py-2 px-3 text-xs pr-10 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys(prev => ({ ...prev, resendKey: !prev.resendKey }))}
                    className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
                  >
                    {showKeys.resendKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Gemini Key */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Gemini API Key</label>
                <div className="relative">
                  <input
                    type={showKeys.geminiKey ? "text" : "password"}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full border border-gray-300 rounded-lg py-2 px-3 text-xs pr-10 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys(prev => ({ ...prev, geminiKey: !prev.geminiKey }))}
                    className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
                  >
                    {showKeys.geminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Hunter Key */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Hunter.io Key</label>
                <div className="relative">
                  <input
                    type={showKeys.hunterKey ? "text" : "password"}
                    value={hunterKey}
                    onChange={(e) => setHunterKey(e.target.value)}
                    placeholder="c111..."
                    className="w-full border border-gray-300 rounded-lg py-2 px-3 text-xs pr-10 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys(prev => ({ ...prev, hunterKey: !prev.hunterKey }))}
                    className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
                  >
                    {showKeys.hunterKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Vercel Token */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Vercel API Token</label>
                <div className="relative">
                  <input
                    type={showKeys.vercelToken ? "text" : "password"}
                    value={vercelToken}
                    onChange={(e) => setVercelToken(e.target.value)}
                    placeholder="lpv_..."
                    className="w-full border border-gray-300 rounded-lg py-2 px-3 text-xs pr-10 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys(prev => ({ ...prev, vercelToken: !prev.vercelToken }))}
                    className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
                  >
                    {showKeys.vercelToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Facturapi Key */}
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase mb-1">Facturapi Test Key</label>
                <div className="relative">
                  <input
                    type={showKeys.facturapiStateKey ? "text" : "password"}
                    value={facturapiStateKey}
                    onChange={(e) => setFacturapiStateKey(e.target.value)}
                    placeholder="sk_test_..."
                    className="w-full border border-gray-300 rounded-lg py-2 px-3 text-xs pr-10 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeys(prev => ({ ...prev, facturapiStateKey: !prev.facturapiStateKey }))}
                    className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
                  >
                    {showKeys.facturapiStateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-primary-700 hover:bg-primary-800 text-white rounded-lg py-2.5 text-xs font-bold transition-colors shadow-sm flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              Guardar Credenciales Seguras
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
