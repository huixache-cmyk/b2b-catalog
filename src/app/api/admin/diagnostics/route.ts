import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyUser } from '@/lib/auth';
import { Resend } from 'resend';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Helper to calculate execution time
async function measureTime<T>(promise: Promise<T>): Promise<{ result: T; latency: number }> {
  const start = Date.now();
  const result = await promise;
  const latency = Date.now() - start;
  return { result, latency };
}

export async function GET(request: Request) {
  try {
    // 1. Authentication
    const urlObj = new URL(request.url);
    const cronKey = urlObj.searchParams.get('cron_key');
    const systemPin = process.env.NEXT_PUBLIC_ADMIN_PIN || process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    let isAuthorized = false;
    
    // Allow access if cron_key matches our admin PIN / secret key
    if (cronKey && systemPin && cronKey === systemPin) {
      isAuthorized = true;
    } else {
      // Or check user session
      const user = await verifyUser(request);
      if (user) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Resolve credentials (check Supabase settings first, fallback to process.env)
    let apiCredentials: any = {};
    try {
      const { data: settingsData } = await supabase
        .from('settings')
        .select('home_settings')
        .eq('id', 1)
        .single();
      
      if (settingsData?.home_settings?.api_credentials) {
        apiCredentials = settingsData.home_settings.api_credentials;
      }
    } catch (dbErr) {
      console.warn("Could not read dynamic credentials from Supabase settings table:", dbErr);
    }

    const resendKey = apiCredentials.RESEND_API_KEY || process.env.RESEND_API_KEY;
    const waToken = apiCredentials.WA_TOKEN || process.env.WA_TOKEN;
    const waPhoneId = apiCredentials.WA_PHONE_NUMBER_ID || process.env.WA_PHONE_NUMBER_ID;
    const geminiKey = apiCredentials.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    const hunterKey = apiCredentials.HUNTER_API_KEY || process.env.HUNTER_API_KEY;
    const vercelToken = apiCredentials.VERCEL_TOKEN || process.env.VERCEL_TOKEN;
    const facturapiKey = apiCredentials.FACTURAPI_KEY || process.env.FACTURAPI_KEY;

    const results: Record<string, { status: 'OK' | 'WARNING' | 'ERROR'; latency: number; message: string }> = {};

    // ----------------------------------------------------
    // CHECK 1: SUPABASE
    // ----------------------------------------------------
    try {
      const { latency } = await measureTime(
        (async () => await supabase.from('products').select('id').limit(1))()
      );
      results['supabase'] = { status: 'OK', latency, message: 'Conexión a base de datos exitosa' };
    } catch (err: any) {
      results['supabase'] = { status: 'ERROR', latency: 0, message: `Error en base de datos: ${err.message || err}` };
    }

    // ----------------------------------------------------
    // CHECK 2: RESEND (EMAIL)
    // ----------------------------------------------------
    if (resendKey && resendKey !== 're_dummy') {
      try {
        const resendInstance = new Resend(resendKey);
        const { latency, result } = await measureTime(resendInstance.emails.send({
          from: 'GeekyStore B2B <ventas@geekystore.mx>',
          to: 'ventas@geekystore.mx',
          subject: 'Ping Diagnóstico',
          html: '<p>Ping</p>'
          // Note: In some SDK versions or keys, a dry-run check is not available, 
          // but we can query domains to verify API key validity without sending email.
        }).catch(async (err) => {
          // Fallback to checking domains if send email fails due to sandbox restriction
          return await resendInstance.domains.list();
        }));
        
        results['resend'] = { status: 'OK', latency, message: 'API Key válida y activa' };
      } catch (err: any) {
        results['resend'] = { status: 'ERROR', latency: 0, message: `Error en Resend: ${err.message || err}` };
      }
    } else {
      results['resend'] = { status: 'WARNING', latency: 0, message: 'RESEND_API_KEY no configurada o es dummy' };
    }

    // ----------------------------------------------------
    // CHECK 3: WHATSAPP CLOUD API
    // ----------------------------------------------------
    if (waToken && waPhoneId) {
      try {
        const { result: response, latency } = await measureTime(
          fetch(`https://graph.facebook.com/v19.0/${waPhoneId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${waToken}`
            }
          })
        );
        
        const data = await response.json();
        if (response.ok) {
          results['whatsapp'] = { status: 'OK', latency, message: `Línea activa. Teléfono ID: ${data.id || waPhoneId}` };
        } else {
          results['whatsapp'] = { 
            status: 'ERROR', 
            latency, 
            message: `Error de Meta API: [${response.status}] ${data.error?.message || 'Error desconocido'}` 
          };
        }
      } catch (err: any) {
        results['whatsapp'] = { status: 'ERROR', latency: 0, message: `Error de conexión a Meta: ${err.message || err}` };
      }
    } else {
      results['whatsapp'] = { status: 'WARNING', latency: 0, message: 'WA_TOKEN o WA_PHONE_NUMBER_ID no configurados' };
    }

    // ----------------------------------------------------
    // CHECK 4: GEMINI (GOOGLE AI STUDIO)
    // ----------------------------------------------------
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const { latency } = await measureTime(
          model.generateContent({
            contents: [{ role: 'user', parts: [{ text: 'Responde únicamente con la palabra OK.' }] }],
            generationConfig: { maxOutputTokens: 5 }
          })
        );
        results['gemini'] = { status: 'OK', latency, message: 'API Key activa y Gemini respondiendo' };
      } catch (err: any) {
        results['gemini'] = { status: 'ERROR', latency: 0, message: `Error en Gemini API: ${err.message || err}` };
      }
    } else {
      results['gemini'] = { status: 'WARNING', latency: 0, message: 'GEMINI_API_KEY no configurada' };
    }

    // ----------------------------------------------------
    // CHECK 5: HUNTER.IO
    // ----------------------------------------------------
    if (hunterKey) {
      try {
        const { result: response, latency } = await measureTime(
          fetch(`https://api.hunter.io/v2/account?api_key=${hunterKey}`)
        );
        const data = await response.json();
        if (response.ok) {
          const searchesLeft = data.data?.calls?.left ?? 0;
          const statusName = searchesLeft < 10 ? 'WARNING' : 'OK';
          results['hunter'] = { 
            status: statusName as any, 
            latency, 
            message: `Plan: ${data.data?.plan_name || 'Desconocido'}. Consultas restantes: ${searchesLeft}` 
          };
        } else {
          results['hunter'] = { 
            status: 'ERROR', 
            latency, 
            message: `Error de Hunter API: [${response.status}] ${data.errors?.[0]?.details || 'Error desconocido'}` 
          };
        }
      } catch (err: any) {
        results['hunter'] = { status: 'ERROR', latency: 0, message: `Error de conexión a Hunter: ${err.message || err}` };
      }
    } else {
      results['hunter'] = { status: 'WARNING', latency: 0, message: 'HUNTER_API_KEY no configurada' };
    }

    // ----------------------------------------------------
    // CHECK 6: VERCEL HOSTING
    // ----------------------------------------------------
    if (vercelToken && vercelToken !== 'dummy_token') {
      try {
        const { result: userRes, latency } = await measureTime(
          fetch('https://api.vercel.com/v2/user', {
            headers: { 'Authorization': `Bearer ${vercelToken}` }
          })
        );
        if (userRes.ok) {
          const userData = await userRes.json();
          let plan = userData.user?.billing?.plan || userData.user?.plan || 'hobby';
          let ownerName = userData.user?.name || userData.user?.username || 'Usuario';
          
          // Check teams if user is hobby (since they might have upgraded a team instead)
          if (plan.toLowerCase() === 'hobby') {
            try {
              const teamsRes = await fetch('https://api.vercel.com/v2/teams', {
                headers: { 'Authorization': `Bearer ${vercelToken}` }
              });
              if (teamsRes.ok) {
                const teamsData = await teamsRes.json();
                const firstTeam = teamsData.teams?.[0];
                if (firstTeam) {
                  const teamPlan = firstTeam.billing?.plan || firstTeam.plan;
                  if (teamPlan) {
                    plan = teamPlan;
                    ownerName = `${firstTeam.name || firstTeam.slug}`;
                  }
                }
              }
            } catch (teamErr) {
              console.warn("Could not fetch Vercel teams:", teamErr);
            }
          }

          const isPro = plan.toLowerCase() === 'pro' || plan.toLowerCase() === 'enterprise';
          results['vercel'] = {
            status: isPro ? 'OK' : 'WARNING',
            latency,
            message: isPro 
              ? `Plan actual: Pro (${ownerName}). ¡Servidores estables y sin límites de Hobby!`
              : `Plan actual: Hobby (${ownerName}). Límite de transferencia de 10GB activo (Alerta: Excedido o cercano al límite).`
          };
        } else {
          results['vercel'] = { 
            status: 'WARNING', 
            latency, 
            message: `Token de Vercel inválido (Código HTTP ${userRes.status}).` 
          };
        }
      } catch (err: any) {
        results['vercel'] = { 
          status: 'WARNING', 
          latency: 0, 
          message: `Error de red consultando cuenta: ${err.message}` 
        };
      }
    } else {
      // Fallback: Global Vercel status page check
      try {
        const { result: response, latency } = await measureTime(
          fetch('https://www.vercel-status.com/api/v2/status.json')
        );
        const text = await response.text();
        let data: any = {};
        try {
          data = JSON.parse(text);
        } catch (pErr) {
          throw new Error("Respuesta de estado no es JSON válido");
        }

        if (response.ok) {
          const isOk = data.status?.indicator === 'none';
          results['vercel'] = {
            status: isOk ? 'OK' : 'WARNING',
            latency,
            message: isOk 
              ? 'Servidores globales estables. (Ingresa tu Token de Vercel para monitorear tu plan).' 
              : `Incidencia global: ${data.status?.description || 'Alerta minor'}`
          };
        } else {
          results['vercel'] = { status: 'WARNING', latency, message: 'No se pudo consultar estado' };
        }
      } catch (err: any) {
        results['vercel'] = { status: 'WARNING', latency: 0, message: `Error: ${err.message}` };
      }
    }

    // ----------------------------------------------------
    // CHECK 7: FACTURAPI
    // ----------------------------------------------------
    if (facturapiKey) {
      try {
        const { result: response, latency } = await measureTime(
          fetch('https://www.facturapi.io/v2/organizations/me', {
            headers: {
              'Authorization': `Bearer ${facturapiKey}`
            }
          })
        );
        if (response.ok) {
          const data = await response.json();
          const orgName = data.name || data.data?.[0]?.name || 'GeekyStore';
          const isSandbox = facturapiKey.startsWith('sk_test_');
          const envName = isSandbox ? 'Sandbox' : 'Producción';
          results['facturapi'] = {
            status: 'OK',
            latency,
            message: `Llave activa (${envName}). Org: ${orgName}`
          };
        } else {
          const errData = await response.json().catch(() => ({}));
          results['facturapi'] = {
            status: 'ERROR',
            latency,
            message: `Error: [${response.status}] ${errData.message || 'Clave inválida'} (Key: ${facturapiKey.substring(0, 12)}...)`
          };
        }
      } catch (err: any) {
        results['facturapi'] = { status: 'ERROR', latency: 0, message: `Error de red: ${err.message}` };
      }
    } else {
      results['facturapi'] = { status: 'WARNING', latency: 0, message: 'FACTURAPI_KEY no configurada' };
    }


    // 3. Write results to Supabase `service_health` table to store status history
    try {
      const upsertRows = Object.entries(results).map(([id, check]) => ({
        id,
        status: check.status,
        latency: check.latency,
        message: check.message,
        updated_at: new Date().toISOString()
      }));

      await supabase.from('service_health').upsert(upsertRows);
    } catch (saveErr) {
      console.error("Error saving health checks to database:", saveErr);
    }

    // 4. Trigger proactive alerts if a service failed
    // Case A: WhatsApp works but Resend (Email) is down
    if (results['resend']?.status === 'ERROR' && results['whatsapp']?.status === 'OK') {
      try {
        const waPayload = {
          messaging_product: "whatsapp",
          to: "524492601779", // Ventas2 admin
          type: "template",
          template: {
            name: "alerta_nuevo_mensaje", // Reuse an existing active template or send simple text alert if conversation active
            language: { code: "es_MX" },
            components: [
              {
                type: "body",
                parameters: [
                  { type: "text", text: "ALERTA DE INTEGRACIÓN" },
                  { type: "text", text: "Resend Email Service" },
                  { type: "text", text: `Fallo detectado: ${results['resend'].message.substring(0, 450)}` },
                  { type: "text", text: "Soporte GeekyStore" }
                ]
              }
            ]
          }
        };

        await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${waToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(waPayload)
        });
      } catch (alertErr) {
        console.error("Failed sending WhatsApp fallback alert for Resend failure:", alertErr);
      }
    }

    // Case B: Resend (Email) works but WhatsApp is down
    if (results['whatsapp']?.status === 'ERROR' && results['resend']?.status === 'OK' && resendKey && resendKey !== 're_dummy') {
      try {
        const resendInstance = new Resend(resendKey);
        await resendInstance.emails.send({
          from: 'GeekyStore Diagnósticos <ventas@geekystore.mx>',
          to: 'ventas@geekystore.mx',
          subject: '⚠️ ALERTA: Falla en Conexión de WhatsApp B2B',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; border: 1px solid #f87171; border-radius: 8px;">
              <h2 style="color: #ef4444;">Fallo Crítico en WhatsApp API</h2>
              <p>El sistema de diagnósticos automáticos ha detectado que la integración con WhatsApp no está funcionando.</p>
              <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
                <p><strong>Detalle del Error:</strong></p>
                <p style="font-family: monospace;">${results['whatsapp'].message}</p>
              </div>
              <p><strong>Impacto:</strong> Los clientes no están recibiendo las claves de acceso B2B ni las alertas de cotización por WhatsApp.</p>
              <p><strong>Acción requerida:</strong> Ingresa al panel de administración de GeekyStore para actualizar el token <code>WA_TOKEN</code> o verifica el estado de tu cuenta de Meta Developers.</p>
            </div>
          `
        });
      } catch (alertErr) {
        console.error("Failed sending Email fallback alert for WhatsApp failure:", alertErr);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Error in diagnostics API:', error);
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 });
  }
}
