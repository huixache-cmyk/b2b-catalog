import { Truck, CheckCircle2, AlertTriangle, MapPin } from "lucide-react";

export default function ShippingPoliciesPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-50 text-cyan-600 mb-6 border border-cyan-100">
          <Truck className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">Políticas de Envío</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Información detallada sobre nuestra cobertura, tiempos de entrega y condiciones de transporte para todos tus pedidos corporativos.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-8 md:p-10">
          <div className="grid gap-6">
            
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 mt-1">
                <MapPin className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Cobertura Nacional</h3>
                <p className="text-gray-600 leading-relaxed">Realizamos envíos a diferentes ciudades y estados de la República Mexicana mediante convenios con las principales paqueterías del país.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 mt-1">
                <CheckCircle2 className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Cálculo de Costos</h3>
                <p className="text-gray-600 leading-relaxed">El costo de envío se calcula de forma personalizada según el destino, peso volumétrico de la mercancía y la paquetería disponible o elegida por el cliente en el momento de la cotización final.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 mt-1">
                <CheckCircle2 className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Tiempos de Entrega y Producción</h3>
                <ul className="space-y-3 mt-3">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 mt-2 flex-shrink-0"></span>
                    <span className="text-gray-600">Los tiempos de entrega pueden variar según disponibilidad del producto, complejidad de personalización, temporada alta y ubicación geográfica del cliente.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-600 mt-2 flex-shrink-0"></span>
                    <span className="text-gray-600">En <strong className="text-gray-900">pedidos personalizados</strong>, el tiempo de producción inicia oficialmente un día hábil después de haber aprobado el diseño final, realizado el anticipo y confirmado formalmente el pedido.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 mt-1">
                <CheckCircle2 className="w-6 h-6 text-cyan-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Responsabilidad del Cliente</h3>
                <p className="text-gray-600 leading-relaxed">El cliente debe revisar detalladamente que sus datos de entrega (dirección, código postal, referencias y teléfonos de contacto) sean 100% correctos antes de confirmar el pedido y liberar la guía de envío.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 mt-1">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Incidencias y Retrasos</h3>
                <ul className="space-y-3 mt-3">
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0"></span>
                    <span className="text-gray-600">GeekyStore no se hace responsable por retrasos causados por logística de paqueterías, condiciones climáticas adversas, zonas extendidas o causas de fuerza mayor ajenas a la empresa.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-2 flex-shrink-0"></span>
                    <span className="text-gray-600">Si el paquete llega dañado o muestra signos de haber sido abierto, debe reportarse <strong className="text-gray-900">el mismo día de la recepción</strong>, anexando fotografías legibles del empaque exterior, interior y producto afectado.</span>
                  </li>
                </ul>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
