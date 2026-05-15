import { ShieldCheck, FileText, CheckCircle, HelpCircle } from "lucide-react";

export default function PrivacyPolicyPage() {
  const currentDate = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-50 text-cyan-600 mb-6 border border-cyan-100">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">Aviso de Privacidad</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Protegemos la confidencialidad de la información de tu empresa, asegurando el manejo ético y seguro de todos tus datos.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 md:p-10 shadow-sm space-y-10 text-gray-600">
        
        <section>
          <p className="leading-relaxed">
            <strong className="text-gray-900">GeekyStore</strong>, con domicilio en Villa Teresa, Aguascalientes, México, es responsable del tratamiento y resguardo de los datos personales que recaba a través de este catálogo web, formularios de cotización, correo electrónico, WhatsApp y otros medios de contacto comercial.
          </p>
        </section>

        <section>
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-600" />
            Datos que podemos recabar
          </h3>
          <p className="mb-4">Para poder brindar nuestros servicios B2B, recolectamos la siguiente información:</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              "Nombre completo o contacto",
              "Razón social o Empresa",
              "Número de teléfono o celular",
              "Correo electrónico corporativo",
              "Ciudad y dirección física de entrega",
              "Datos fiscales (únicamente cuando requieras facturación)",
              "Información relacionada con logotipos, pedidos, cotizaciones y diseños"
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-cyan-600/70 flex-shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-cyan-600" />
            Finalidades del tratamiento
          </h3>
          <p className="mb-4">Tus datos serán utilizados única y exclusivamente para los siguientes fines empresariales:</p>
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <ul className="space-y-3">
              <li className="flex gap-3"><span className="text-cyan-600">•</span> Atender solicitudes de cotización formal.</li>
              <li className="flex gap-3"><span className="text-cyan-600">•</span> Procesar y dar de alta pedidos en nuestro sistema.</li>
              <li className="flex gap-3"><span className="text-cyan-600">•</span> Dar seguimiento comercial e informar sobre el estatus de la producción.</li>
              <li className="flex gap-3"><span className="text-cyan-600">•</span> Coordinar logística y entregas con paqueterías autorizadas.</li>
              <li className="flex gap-3"><span className="text-cyan-600">•</span> Emitir facturas y cumplir con obligaciones fiscales (CFDI).</li>
              <li className="flex gap-3"><span className="text-cyan-600">•</span> Enviar de forma ocasional información relacionada con nuevos catálogos, promociones o servicios.</li>
              <li className="flex gap-3"><span className="text-cyan-600">•</span> Cumplir con obligaciones legales y comerciales derivadas de nuestra relación contigo.</li>
            </ul>
          </div>
        </section>

        <section>
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-600" />
            Protección y Derechos ARCO
          </h3>
          <p className="leading-relaxed mb-4">
            GeekyStore <strong className="text-gray-900">NO venderá ni compartirá tus datos personales</strong> con terceros ajenos. Únicamente transferiremos la información mínima indispensable cuando sea estrictamente necesario para procesar pedidos, coordinar envíos con paqueterías, procesar facturación o cumplir con un requerimiento legal justificado.
          </p>
          <p className="leading-relaxed">
            Como usuario o representante legal, puedes solicitar en cualquier momento el acceso, rectificación, cancelación u oposición (Derechos ARCO) respecto al uso de tus datos personales, enviando tu solicitud formal al correo electrónico <a href="mailto:ventas@geekystore.mx" className="text-cyan-600 hover:underline">ventas@geekystore.mx</a>.
          </p>
        </section>

        <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500">
            Última actualización: <span className="font-medium text-gray-900">{currentDate}</span>
          </p>
          <a href="mailto:ventas@geekystore.mx" className="text-sm flex items-center gap-2 text-gray-500 hover:text-cyan-700 transition-colors">
            <HelpCircle className="w-4 h-4" />
            ¿Dudas sobre privacidad?
          </a>
        </div>

      </div>
    </div>
  );
}
