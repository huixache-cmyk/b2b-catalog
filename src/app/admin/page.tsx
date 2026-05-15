import { AdminView } from "@/components/AdminView";

export default function AdminPage() {
  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-gray-500 mt-2">Gestión de productos y catálogo (Simulación Front-end)</p>
        </div>
        <AdminView />
      </div>
    </div>
  );
}
