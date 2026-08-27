"use client";

import React, { useState, useEffect } from 'react';
import { Coins, Activity, AlertTriangle, CheckCircle, XCircle, RefreshCw, MessageSquare } from 'lucide-react';

interface CapitalHorizon {
  id: string;
  horizon: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual';
  allocated_percentage: number;
  suggested_percentage_ai: number | null;
  target_roi: number;
  current_balance: number;
}

interface TradeProposal {
  id: string;
  operation_code: string;
  asset: string;
  trade_type: 'BUY' | 'SELL';
  suggested_amount: number;
  current_price: number;
  horizon: string;
  justification: string;
  status: 'pending_auto_exec' | 'executed' | 'rejected' | 'failed';
  expires_at: string;
  created_at: string;
}

interface TradeHistory {
  id: string;
  asset: string;
  trade_type: 'BUY' | 'SELL';
  horizon: string;
  executed_amount: number;
  execution_price: number;
  fees: number;
  status: 'executed' | 'rejected' | 'failed' | 'simulated';
  created_at: string;
}

export function CryptoExchangeTab() {
  const [horizons, setHorizons] = useState<CapitalHorizon[]>([]);
  const [proposals, setProposals] = useState<TradeProposal[]>([]);
  const [history, setHistory] = useState<TradeHistory[]>([]);
  const [whatsappStatus, setWhatsappStatus] = useState<string>('disconnected');
  const [whatsappQr, setWhatsappQr] = useState<string | null>(null);
  const [botActive, setBotActive] = useState<boolean>(true);
  const [exchangeMode, setExchangeMode] = useState<string>('simulation');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // URL base de la API del bot (configurable mediante variable de entorno)
  const API_BASE = process.env.NEXT_PUBLIC_CRYPTO_BOT_API_URL || 'http://localhost:3005/api';

  const fetchData = async () => {
    try {
      // 1. Obtener estado general
      const statusRes = await fetch(`${API_BASE}/status`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setBotActive(statusData.botActive);
        setExchangeMode(statusData.exchangeMode);
        setWhatsappStatus(statusData.whatsapp.status);
        setWhatsappQr(statusData.whatsapp.qr);
      }

      // 2. Obtener horizontes de capital
      const horizonsRes = await fetch(`${API_BASE}/config/horizons`);
      if (horizonsRes.ok) {
        const horizonsData = await horizonsRes.json();
        setHorizons(horizonsData);
      }

      // 3. Obtener propuestas activas
      const proposalsRes = await fetch(`${API_BASE}/proposals`);
      if (proposalsRes.ok) {
        const proposalsData = await proposalsRes.json();
        setProposals(proposalsData);
      }

      // 4. Obtener historial
      const historyRes = await fetch(`${API_BASE}/history`);
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistory(historyData);
      }
      setErrorMsg(null);
    } catch (e: any) {
      console.warn('Error al conectar con la API del bot de trading:', e.message);
      setErrorMsg('No se pudo establecer conexión con el backend de Exchange Trade en ' + API_BASE + '. Asegúrate de que el bot esté en ejecución.');
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000); // Refrescar cada 8 segundos
    return () => clearInterval(interval);
  }, []);

  const handleConnectWhatsApp = async () => {
    try {
      await fetch(`${API_BASE}/whatsapp/connect`, { method: 'POST' });
      fetchData();
    } catch (e: any) {
      alert('Error al enviar la petición de conexión de WhatsApp.');
    }
  };

  const handleSavePercentages = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const sum = horizons.reduce((acc, curr) => acc + Number(curr.allocated_percentage), 0);
      if (sum !== 100) {
        throw new Error(`La suma de los porcentajes de asignación debe ser exactamente 100% (Suma actual: ${sum}%).`);
      }

      const res = await fetch(`${API_BASE}/config/horizons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(horizons)
      });

      if (!res.ok) throw new Error('Fallo en la base de datos al guardar porcentajes.');
      alert('Configuración de capital guardada exitosamente.');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePercentageChange = (index: number, val: number) => {
    const updated = [...horizons];
    updated[index].allocated_percentage = val;
    setHorizons(updated);
  };

  const handleApplyAISuggestion = () => {
    const updated = horizons.map(h => ({
      ...h,
      allocated_percentage: h.suggested_percentage_ai !== null ? h.suggested_percentage_ai : h.allocated_percentage
    }));
    setHorizons(updated);
  };

  const handleCancelProposal = async (id: string) => {
    if (!confirm('¿Rechazar esta operación programada e impedir su auto-ejecución?')) return;
    try {
      const res = await fetch(`${API_BASE}/proposals/${id}/cancel`, { method: 'POST' });
      if (res.ok) {
        alert('Operación rechazada con éxito.');
        fetchData();
      }
    } catch (e) {
      alert('Error al rechazar propuesta.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Error */}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-2.5 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
          <div>
            <strong className="font-semibold">Backend desconectado:</strong> {errorMsg}
          </div>
        </div>
      )}

      {/* Info Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Estado General</p>
            <h3 className="text-lg font-bold text-gray-900 mt-1">
              {botActive ? '🟢 Bot de Monitoreo Activo' : '🔴 Bot Desactivado'}
            </h3>
          </div>
          <Activity className={`w-8 h-8 ${botActive ? 'text-emerald-500 animate-pulse' : 'text-gray-400'}`} />
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">Modo de Operación</p>
            <h3 className="text-lg font-bold text-gray-900 mt-1 capitalize">
              {exchangeMode === 'simulation' ? '⚡ Simulación / Sandbox' : '💰 Producción Real'}
            </h3>
          </div>
          <Coins className="w-8 h-8 text-amber-500" />
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase">WhatsApp (Baileys)</p>
            <h3 className="text-lg font-bold text-gray-900 mt-1 uppercase">
              {whatsappStatus}
            </h3>
          </div>
          <MessageSquare className={`w-8 h-8 ${whatsappStatus === 'connected' ? 'text-emerald-500' : 'text-amber-500'}`} />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Card: Horizon Config */}
        <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Distribución de Capital por Plazos</h2>
            <p className="text-sm text-gray-500 mt-1">
              Asigna qué porcentaje (%) de tus fondos totales opera en cada horizonte de tiempo.
            </p>
          </div>

          <div className="space-y-4">
            {horizons.map((hz, idx) => (
              <div key={hz.id} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <div className="flex justify-between items-center text-sm mb-1.5">
                  <span className="font-bold text-primary-900 uppercase tracking-wide">{hz.horizon}</span>
                  <span className="text-gray-500 font-medium">
                    Balance: <strong className="text-gray-800">${hz.current_balance.toFixed(2)} USD</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative rounded-md shadow-sm w-28">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={hz.allocated_percentage}
                      onChange={(e) => handlePercentageChange(idx, parseFloat(e.target.value) || 0)}
                      className="block w-full rounded-md border border-gray-300 px-3 py-1.5 pr-8 text-sm focus:border-primary-500 focus:ring-primary-500 text-gray-900"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-gray-500 text-sm">%</span>
                    </div>
                  </div>
                  {hz.suggested_percentage_ai !== null && (
                    <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      ✨ IA Sugiere: {hz.suggested_percentage_ai}%
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-3">
            <button
              onClick={handleSavePercentages}
              disabled={isSaving}
              className="bg-primary-700 hover:bg-primary-850 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar Configuración'}
            </button>
            <button
              onClick={handleApplyAISuggestion}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold px-4 py-2 rounded-lg transition-colors"
            >
              Aplicar Sugerencia IA
            </button>
          </div>
        </div>

        {/* Right Card: WhatsApp Connector */}
        <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Enlace de Mensajería WhatsApp</h2>
            <p className="text-sm text-gray-500 mt-1">
              Conecta una línea móvil mediante Baileys para recibir notificaciones y tener la opción de cancelar órdenes en un plazo de 15 minutos.
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Estado de Conexión:</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                whatsappStatus === 'connected' ? 'bg-emerald-100 text-emerald-800' :
                whatsappStatus === 'qr_ready' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
              }`}>
                {whatsappStatus}
              </span>
            </div>

            {whatsappStatus === 'disconnected' && (
              <button
                onClick={handleConnectWhatsApp}
                className="w-full bg-primary-700 hover:bg-primary-850 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
              >
                Generar Código QR
              </button>
            )}

            {whatsappStatus === 'qr_ready' && whatsappQr && (
              <div className="space-y-3 text-center">
                <p className="text-xs text-gray-500">Escanea el código QR desde tu celular utilizando WhatsApp Web:</p>
                <div className="bg-white p-3 rounded-lg border border-gray-200 inline-block">
                  {whatsappQr.startsWith('data:image') ? (
                    <img src={whatsappQr} alt="QR Code" className="w-48 h-48 mx-auto" />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-xs text-gray-500">
                      QR activo en el servidor. Revisa el log de consola.
                    </div>
                  )}
                </div>
              </div>
            )}

            {whatsappStatus === 'connected' && (
              <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-lg text-emerald-800 text-xs leading-relaxed">
                <strong>✔ Enlace activo con éxito.</strong> El bot enviará notificaciones previas de trading a tu número. Si no deseas que se ejecuten, responde <strong>"RECHAZAR [CÓDIGO]"</strong> dentro de los primeros 15 minutos.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Proposals */}
      <div className="bg-white p-6 rounded-xl border border-gray-150 shadow-sm space-y-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Operaciones en Cuenta Regresiva de Aprobación Pasiva</h2>
          <p className="text-sm text-gray-500 mt-1">
            Estas operaciones se realizarán en el Exchange automáticamente al expirar el tiempo, a menos que las rechaces.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 font-semibold">
                <th className="py-3 px-2">Código</th>
                <th className="py-3 px-2">Activo</th>
                <th className="py-3 px-2">Tipo</th>
                <th className="py-3 px-2">Monto</th>
                <th className="py-3 px-2">Precio sugerido</th>
                <th className="py-3 px-2">Horizonte</th>
                <th className="py-3 px-2">Expira a las</th>
                <th className="py-3 px-2">Estatus</th>
                <th className="py-3 px-2 text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {proposals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400 font-medium">
                    No hay propuestas pendientes de ejecución en este momento.
                  </td>
                </tr>
              ) : (
                proposals.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="py-3.5 px-2 font-bold text-gray-800">{p.operation_code}</td>
                    <td className="py-3.5 px-2 font-medium">{p.asset}</td>
                    <td className="py-3.5 px-2">
                      <span className={`font-bold ${p.trade_type === 'BUY' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {p.trade_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 font-medium">${p.suggested_amount.toFixed(2)} USD</td>
                    <td className="py-3.5 px-2 text-gray-600">${p.current_price.toFixed(2)}</td>
                    <td className="py-3.5 px-2 uppercase font-semibold text-xs text-gray-500">{p.horizon}</td>
                    <td className="py-3.5 px-2 text-gray-500">{new Date(p.expires_at).toLocaleTimeString()}</td>
                    <td className="py-3.5 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-3xs font-bold uppercase ${
                        p.status === 'pending_auto_exec' ? 'bg-amber-100 text-amber-800' :
                        p.status === 'executed' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-2 text-right">
                      {p.status === 'pending_auto_exec' && (
                        <button
                          onClick={() => handleCancelProposal(p.id)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/50 text-xs font-bold py-1 px-3 rounded-lg transition-colors shadow-sm"
                        >
                          Rechazar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
