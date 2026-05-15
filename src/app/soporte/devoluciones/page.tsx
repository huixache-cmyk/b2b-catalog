import { RefreshCcw, FileWarning, ShieldX, Image as ImageIcon } from "lucide-react";

export default function ReturnsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-50 text-cyan-600 mb-6 border border-cyan-100">
          <RefreshCcw className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">Devoluciones y Garantías</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Conoce los lineamientos y condiciones bajo las cuales proceden las reclamaciones y devoluciones de mercancía promocional.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-cyan-300 transition-colors shadow-sm">
          <FileWarning className="w-8 h-8 text-cyan-600 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-3">Condiciones de Reporte</h3>
          <ul className="space-y-3 text-gray-600">
            <li className="flex gap-2"><span className="text-cyan-600 font-bold">•</span> Aceptamos reportes exclusivamente por producto dañado de fábrica, defectuoso o modelo/color diferente al solicitado formalmente.</li>
            <li className="flex gap-2"><span className="text-cyan-600 font-bold">•</span> El reporte debe realizarse dentro de los primeros <strong className="text-gray-900">5 días hábiles</strong> posteriores a la recepción confirmada por la paquetería.</li>
            <li className="flex gap-2"><span className="text-cyan-600 font-bold">•</span> Para que proceda, el producto debe conservar su empaque original, accesorios completos y no mostrar señales de uso o manipulación indebida.</li>
          </ul>
        </div>

        <div className="bg-white rounded-2xl p-8 border border-gray-200 hover:border-orange-300 transition-colors shadow-sm">
          <ShieldX className="w-8 h-8 text-orange-500 mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-3">Excepciones (No aplica)</h3>
          <ul className="space-y-3 text-gray-600">
            <li className="flex gap-2"><span className="text-orange-500 font-bold">•</span> En <strong className="text-gray-900">productos personalizados</strong> NO aplican devoluciones por errores en la información enviada, ortografía, colores de diseño o tamaños, si el render/mockup fue previamente aprobado por el cliente.</li>
            <li className="flex gap-2"><span className="text-orange-500 font-bold">•</span> No se aceptan devoluciones por simple "cambio de opinión" en productos impresos o personalizados.</li>
            <li className="flex gap-2"><span className="text-orange-500 font-bold">•</span> Artículos usados, maltratados por el cliente o devueltos sin empaque original.</li>
          </ul>
        </div>
      </div>

      <div className="bg-cyan-50/50 rounded-2xl border border-cyan-100 p-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <ImageIcon className="w-6 h-6 text-cyan-600" />
          ¿Cómo iniciar un reporte?
        </h3>
        
        <div className="space-y-4 text-gray-600">
          <p>
            Si detectas un error que consideras atribuible a GeekyStore o a nuestro proveedor autorizado (ej. error evidente de impresión fuera de especificación, o producto dañado en trayecto), evaluaremos inmediatamente la situación para ofrecerte la reposición, un cambio físico o una solución equivalente.
          </p>
          <div className="bg-white rounded-lg p-6 border border-gray-200 mt-4 shadow-sm">
            <p className="font-medium text-gray-900 mb-2">Pasos a seguir:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Reúne tu número de pedido o cotización.</li>
              <li>Toma fotografías claras y con buena iluminación del daño o defecto (incluyendo fotos de la caja si llegó golpeada).</li>
              <li>Redacta una breve descripción del problema detectado.</li>
              <li>Envía todo por correo electrónico a <a href="mailto:ventas@geekystore.mx" className="text-cyan-600 hover:text-cyan-700 font-medium">ventas@geekystore.mx</a>.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
