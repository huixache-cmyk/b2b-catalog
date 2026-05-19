"use client";

import { useState } from "react";
import { Search, Building2, User, FileText, Target, Mail, BrainCircuit, TrendingUp, CheckCircle, BarChart3, Clock, AlertCircle, Wand2, Trash2 } from "lucide-react";

import { useB2BAgent, B2BOpportunity } from "@/hooks/useB2BAgent";

const STAGES = [
  "Lead Detectado",
  "Contacto Identificado",
  "Hook Generado",
  "Mensaje Enviado",
  "Respuesta Recibida",
  "Reunión Agendada",
  "Cotización Enviada",
  "Negociación",
  "Venta Cerrada"
];

export function B2BAgentCRM() {
  const { opportunities, updateOpportunityStage, deleteOpportunity, isLoaded, scraperConfig, updateScraperConfig, refresh } = useB2BAgent();
  const [activeTab, setActiveTab] = useState<'pipeline' | 'signals' | 'analytics'>('pipeline');
  const [searchTerm, setSearchTerm] = useState("");
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [loadingContactId, setLoadingContactId] = useState<string | null>(null);
  const [loadingHookId, setLoadingHookId] = useState<string | null>(null);
  const [loadingSendId, setLoadingSendId] = useState<string | null>(null);

  const handleFindContact = async (opp: B2BOpportunity) => {
    if (!opp.company) return;
    setLoadingContactId(opp.id);
    try {
      const res = await fetch('/api/find-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: opp.company_id,
          company_name: opp.company.name,
          opp_id: opp.id
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(`¡Contacto encontrado! ${data.contact.email}`);
      refresh(); // Reload data
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoadingContactId(null);
    }
  };

  const handleGenerateHook = async (opp: B2BOpportunity) => {
    if (!opp.company) return;
    setLoadingHookId(opp.id);
    try {
      const res = await fetch('/api/generate-hook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opp_id: opp.id,
          company_name: opp.company.name,
          contact_name: opp.contacts?.[0]?.full_name,
          contact_title: opp.contacts?.[0]?.job_title,
          signal_desc: opp.signals?.[0]?.description
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      refresh(); // Reload data
    } catch (error: any) {
      alert(`Error generando hook: ${error.message}`);
    } finally {
      setLoadingHookId(null);
    }
  };

  const handleSendHook = async (opp: B2BOpportunity) => {
    if (!opp.company || !opp.hook_text || !opp.contacts?.[0]?.email) {
      alert("Faltan datos de contacto o no se ha generado el texto aún.");
      return;
    }
    setLoadingSendId(opp.id);
    try {
      const res = await fetch('/api/send-hook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opp_id: opp.id,
          email: opp.contacts[0].email,
          phone: opp.contacts[0].phone,
          contact_name: opp.contacts[0].full_name,
          company_name: opp.company.name,
          signal_desc: opp.signals?.[0]?.signal_type || opp.signals?.[0]?.description || 'sus recientes noticias',
          hook_text: opp.hook_text
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      let msg = 'Correo enviado exitosamente.';
      if (data.waSent) msg += ' También se disparó el WhatsApp.';
      alert(msg);
      
      refresh(); // Reload data
    } catch (error: any) {
      alert(`Error al enviar: ${error.message}`);
    } finally {
      setLoadingSendId(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "bg-red-100 text-red-800 border-red-200";
    if (score >= 70) return "bg-orange-100 text-orange-800 border-orange-200";
    if (score >= 50) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Muy Alta";
    if (score >= 70) return "Alta";
    if (score >= 50) return "Media";
    return "Baja";
  };

  return (
    <div className="p-6 h-full flex flex-col bg-gray-50/50">
      
      {/* Header & Metrics */}
      <div className="mb-8">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
              <BrainCircuit className="w-8 h-8 text-primary-600" />
              Inteligencia Comercial B2B
            </h1>
            <p className="text-gray-500 mt-1">
              Agente autónomo de prospección y cualificación de leads corporativos.
            </p>
          </div>
          <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
            <button 
              onClick={() => setActiveTab('pipeline')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'pipeline' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Pipeline CRM
            </button>
            <button 
              onClick={() => setActiveTab('signals')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'signals' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Monitor de Señales
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'analytics' ? 'bg-primary-50 text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Métricas y ROI
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Leads Detectados</p>
                <h3 className="text-2xl font-black text-gray-900">{opportunities.length}</h3>
              </div>
              <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Target className="w-5 h-5" /></div>
            </div>
            <p className="text-xs text-green-600 font-bold mt-2 flex items-center"><TrendingUp className="w-3 h-3 mr-1"/> Al día de hoy</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Hooks Generados</p>
                <h3 className="text-2xl font-black text-gray-900">{opportunities.filter(o => o.stage === 'Hook Generado').length}</h3>
              </div>
              <div className="bg-purple-50 p-2 rounded-lg text-purple-600"><Wand2 className="w-5 h-5" /></div>
            </div>
            <p className="text-xs text-gray-500 font-bold mt-2 flex items-center">Listos para enviar</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Tasa de Respuesta</p>
                <h3 className="text-2xl font-black text-gray-900">0.0%</h3>
              </div>
              <div className="bg-orange-50 p-2 rounded-lg text-orange-600"><Mail className="w-5 h-5" /></div>
            </div>
            <p className="text-xs text-gray-500 font-bold mt-2 flex items-center">Esperando envíos</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Pipeline Estimado</p>
                <h3 className="text-2xl font-black text-primary-700">${(opportunities.length * 45).toLocaleString()}K</h3>
              </div>
              <div className="bg-primary-50 p-2 rounded-lg text-primary-600"><BarChart3 className="w-5 h-5" /></div>
            </div>
            <p className="text-xs text-gray-500 font-bold mt-2 flex items-center">En {opportunities.length} oportunidades activas</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'pipeline' && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <div className="relative w-72">
              <input 
                type="text" 
                placeholder="Buscar empresa, contacto o señal..." 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-primary-500 focus:border-primary-500"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </div>
            <button className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary-700">
              <Search className="w-4 h-4" />
              Escanear Nuevas Señales
            </button>
          </div>

          {/* Kanban Board */}
          <div className="flex-1 overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max h-full">
              {STAGES.slice(0, 5).map(stage => (
                <div key={stage} className="w-80 flex flex-col bg-gray-100/50 rounded-xl border border-gray-200/60 p-3 h-full">
                  <div className="flex justify-between items-center mb-3 px-1">
                    <h4 className="font-bold text-gray-700 text-sm">{stage}</h4>
                    <span className="bg-white text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full border border-gray-200">
                      {opportunities.filter(o => o.stage === stage).length}
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                    {opportunities.filter(o => o.stage === stage).map(opp => (
                      <div key={opp.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-grab hover:border-primary-300 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${getScoreColor(opp.total_score)}`}>
                            Score: {opp.total_score} ({getScoreLabel(opp.total_score)})
                          </span>
                          <div className="flex items-center gap-1">
                            <select 
                              value={opp.stage}
                              onChange={(e) => updateOpportunityStage(opp.id, e.target.value)}
                              className="text-[10px] border border-gray-200 rounded px-1 py-0.5 text-gray-500 bg-white"
                            >
                              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button 
                              onClick={() => {
                                if(confirm('¿Eliminar esta oportunidad permanentemente?')) {
                                  deleteOpportunity(opp.id);
                                }
                              }}
                              className="text-gray-300 hover:text-red-500 transition-colors p-1"
                              title="Eliminar prospecto"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        
                        <h3 className="font-black text-gray-900 text-sm mb-1">{opp.company?.name || 'Empresa Desconocida'}</h3>
                        <p className="text-xs text-gray-500 mb-3 flex items-center gap-1"><Building2 className="w-3 h-3" /> {opp.company?.industry || '-'} • {opp.company?.city || '-'}</p>
                        
                        <div className="bg-blue-50/50 border border-blue-100 rounded-md p-2 mb-3">
                          <p className="text-xs font-bold text-blue-800 flex items-center gap-1 mb-1">
                            <Target className="w-3 h-3" /> {opp.signals?.[0]?.signal_type || 'Señal no definida'}
                          </p>
                          <p className="text-[10px] text-gray-600 line-clamp-2">{opp.signals?.[0]?.description || 'Sin descripción'}</p>
                        </div>
                        
                        <div className="pt-3 border-t border-gray-100 flex justify-between items-end">
                          <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Decision Maker</p>
                            <p className="text-xs text-gray-900 font-medium flex items-center gap-1"><User className="w-3 h-3 text-gray-400" /> {opp.contacts?.[0]?.full_name || 'Desconocido'}</p>
                            <p className="text-[10px] text-gray-500 ml-4">{opp.contacts?.[0]?.job_title || '-'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-0.5">Budget Est.</p>
                            <p className="text-xs font-black text-primary-700">${((opp.estimated_budget || 0)/1000).toFixed(0)}k</p>
                          </div>
                        </div>

                        {opp.hook_text && (
                          <div className="mt-3 bg-gray-50 rounded p-2 border border-gray-200">
                            <p className="text-[10px] font-bold text-gray-500 uppercase mb-1 flex items-center justify-between">
                              Borrador IA
                              <button 
                                onClick={() => {
                                  navigator.clipboard.writeText(opp.hook_text || '');
                                  alert('Copiado al portapapeles');
                                }}
                                className="text-primary-600 hover:text-primary-800 bg-primary-50 px-2 py-0.5 rounded"
                              >
                                Copiar
                              </button>
                            </p>
                            <p className="text-xs text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">
                              {opp.hook_text}
                            </p>
                          </div>
                        )}
                        
                        {/* Hover Actions */}
                        <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {stage === 'Lead Detectado' && (
                             <button 
                               onClick={() => handleFindContact(opp)}
                               disabled={loadingContactId === opp.id}
                               className="flex-1 bg-white border border-gray-200 text-xs font-bold text-gray-700 py-1.5 rounded hover:bg-gray-50 disabled:opacity-50"
                             >
                               {loadingContactId === opp.id ? 'Buscando...' : 'Buscar Contacto'}
                             </button>
                          )}
                          {stage === 'Contacto Identificado' && (
                             <button 
                               onClick={() => handleGenerateHook(opp)}
                               disabled={loadingHookId === opp.id}
                               className="flex-1 bg-primary-50 border border-primary-100 text-xs font-bold text-primary-700 py-1.5 rounded hover:bg-primary-100 flex items-center justify-center gap-1 disabled:opacity-50"
                             >
                               {loadingHookId === opp.id ? 'Escribiendo...' : <><Wand2 className="w-3 h-3"/> Generar Hook</>}
                             </button>
                          )}
                          {stage === 'Hook Generado' && (
                             <button 
                               onClick={() => handleSendHook(opp)}
                               disabled={loadingSendId === opp.id}
                               className="flex-1 bg-primary-600 border border-primary-600 text-xs font-bold text-white py-1.5 rounded hover:bg-primary-700 flex items-center justify-center gap-1 disabled:opacity-50"
                             >
                               {loadingSendId === opp.id ? 'Enviando...' : <><Mail className="w-3 h-3"/> Enviar Hook</>}
                             </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {opportunities.filter(o => o.stage === stage).length === 0 && (
                      <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                        <p className="text-xs text-gray-400 font-medium">Sin oportunidades</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'signals' && (
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                <Search className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">Configuración del Motor IA</h2>
                <p className="text-gray-500 text-sm">Controla cómo y cuándo el agente busca nuevos prospectos.</p>
              </div>
            </div>

            {scraperConfig ? (
              <div className="space-y-6">
                {/* Switch On/Off */}
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div>
                    <h3 className="font-bold text-gray-900">Estado del Motor</h3>
                    <p className="text-sm text-gray-500">Enciende o apaga el escaneo automático.</p>
                  </div>
                  <button 
                    onClick={() => updateScraperConfig({ is_active: !scraperConfig.is_active })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${scraperConfig.is_active ? 'bg-primary-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${scraperConfig.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Keywords */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Palabras Clave (Búsqueda de Eventos)</label>
                  <p className="text-xs text-gray-500 mb-2">Separa por comas. El agente buscará noticias de aperturas o expansiones con estos términos.</p>
                  <textarea 
                    value={scraperConfig.search_keywords || ''}
                    onChange={(e) => updateScraperConfig({ search_keywords: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-primary-500 focus:border-primary-500"
                    rows={2}
                  />
                </div>

                {/* Target Companies */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Empresas Objetivo (Prospección Directa)</label>
                  <p className="text-xs text-gray-500 mb-2">Separa por comas (Ej. Bimbo, Cemex). La IA buscará contactos clave directamente sin requerir noticias.</p>
                  <textarea 
                    value={scraperConfig.target_companies || ''}
                    onChange={(e) => updateScraperConfig({ target_companies: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-primary-500 focus:border-primary-500"
                    rows={2}
                  />
                </div>

                {/* Target Sectors */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Sectores de Interés (Descubrimiento)</label>
                  <p className="text-xs text-gray-500 mb-2">Separa por comas (Ej. Automotriz, Logística). La IA sugerirá empresas top en México para este sector.</p>
                  <textarea 
                    value={scraperConfig.target_sectors || ''}
                    onChange={(e) => updateScraperConfig({ target_sectors: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-primary-500 focus:border-primary-500"
                    rows={2}
                  />
                </div>

                {/* Schedule Info */}
                <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                  <h3 className="font-bold text-blue-900 text-sm mb-2 flex items-center gap-2"><Clock className="w-4 h-4"/> Programación Diaria</h3>
                  <p className="text-sm text-blue-800">El motor está configurado en el servidor para despertar <strong>todos los días a las 09:00 AM</strong>.</p>
                  <p className="text-xs text-blue-600 mt-2">
                    Última ejecución: {scraperConfig.last_run_at ? new Date(scraperConfig.last_run_at).toLocaleString() : 'Nunca'}
                  </p>
                </div>

                {/* Manual Trigger */}
                <div className="pt-4 border-t border-gray-100">
                  <button
                    onClick={async () => {
                      setIsTriggering(true);
                      setTriggerMessage(null);
                      try {
                        const res = await fetch('/api/run-scraper', { method: 'POST' });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || 'Error desconocido');
                        setTriggerMessage({ type: 'success', text: '¡Motor iniciado! Revisa la pestaña Pipeline en un par de minutos.' });
                      } catch (error: any) {
                        setTriggerMessage({ type: 'error', text: error.message });
                      } finally {
                        setIsTriggering(false);
                      }
                    }}
                    disabled={isTriggering || !scraperConfig.is_active}
                    className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTriggering ? (
                      <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span> Iniciando...</>
                    ) : (
                      <><Search className="w-4 h-4" /> Ejecutar Búsqueda Ahora</>
                    )}
                  </button>
                  {!scraperConfig.is_active && (
                    <p className="text-xs text-red-500 mt-2 text-center">Debes encender el motor primero para poder ejecutarlo.</p>
                  )}
                  {triggerMessage && (
                    <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${triggerMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                      {triggerMessage.text}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500 animate-pulse">Cargando configuración...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center">
          <div className="text-center max-w-md p-6">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Reportes y Machine Learning</h2>
            <p className="text-gray-500 text-sm mb-6">El modelo aprenderá de los leads cerrados para priorizar automáticamente los sectores y hooks más rentables (Ej. Manufactura &gt; 100 empleados en el Bajío).</p>
            <button className="bg-white border border-gray-300 text-gray-700 font-bold py-2 px-6 rounded-lg hover:bg-gray-50 transition-colors">
              Ver Historial de Aprendizaje
            </button>
          </div>
        </div>
      )}

      {/* Reusable Icon Component */}
      <div className="hidden">
         <Wand2 />
      </div>
    </div>
  );
}
