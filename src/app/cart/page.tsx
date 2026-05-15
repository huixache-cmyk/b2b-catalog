import { CartView } from "@/components/CartView";

export default function CartPage() {
  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Tu Cotización B2B</h1>
        <CartView />
      </div>
    </div>
  );
}
