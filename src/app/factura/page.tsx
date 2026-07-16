"use client";

import { AdminFacturacion } from "@/components/admin/AdminFacturacion";

export default function FacturaPage() {
  return (
    <div className="bg-gray-50 min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <AdminFacturacion showBackButton={true} />
      </div>
    </div>
  );
}
