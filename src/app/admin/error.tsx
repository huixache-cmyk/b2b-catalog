'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Caught admin page error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full border border-red-200">
        <h2 className="text-2xl font-bold text-red-700 mb-4 flex items-center gap-2">
          <span>⚠️</span> Error en el Panel de Administración
        </h2>
        <p className="text-gray-700 font-semibold mb-2">Mensaje del Error:</p>
        <pre className="bg-red-50 p-4 rounded-lg text-xs text-red-900 overflow-x-auto whitespace-pre-wrap font-mono mb-4">
          {error.name}: {error.message}
        </pre>
        {error.stack && (
          <>
            <p className="text-gray-700 font-semibold mb-2">Detalles técnicos (Stack Trace):</p>
            <pre className="bg-gray-50 p-4 rounded-lg text-[10px] text-gray-600 overflow-x-auto whitespace-pre-wrap font-mono max-h-60 mb-6">
              {error.stack}
            </pre>
          </>
        )}
        <div className="flex gap-4">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors"
          >
            Reintentar Cargar
          </button>
          <a
            href="/"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition-colors"
          >
            Ir al Catálogo
          </a>
        </div>
      </div>
    </div>
  )
}
