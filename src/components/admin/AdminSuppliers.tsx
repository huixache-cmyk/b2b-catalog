import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, CheckCircle } from "lucide-react";
import { Product } from "@/types";
import { formatCurrency } from "@/utils/formatters";

interface AdminSuppliersProps {
  homeSettings: any;
  updateHomeSettings: (settings: any) => any;
  products: Product[];
  updateProduct: (p: Product) => any;
}

export function AdminSuppliers({
  homeSettings,
  updateHomeSettings,
  products,
  updateProduct
}: AdminSuppliersProps) {
  const [supplierTab, setSupplierTab] = useState<'print' | 'product'>('print');
  
  const [printSuppliers, setPrintSuppliers] = useState<any[]>([]);
  const [editingPrintSupplierId, setEditingPrintSupplierId] = useState<string | null>(null);
  const [printForm, setPrintForm] = useState({
    name: "",
    contact: "",
    phone1: "",
    phone2: "",
    address: "",
    grabado_chico: 0,
    grabado_grande: 0,
    dtf: 0,
    seri_1_tinta: 0,
    seri_2_tintas: 0,
    seri_3_tintas: 0,
    seri_4_tintas: 0
  });

  const [productSuppliers, setProductSuppliers] = useState<any[]>([]);
  const [editingProductSupplierId, setEditingProductSupplierId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    contact: "",
    phone1: "",
    phone2: "",
    address: ""
  });

  const [selectedAssocProductId, setSelectedAssocProductId] = useState<string>("");
  const [selectedAssocSupplierId, setSelectedAssocSupplierId] = useState<string>("");
  const [assocPrice, setAssocPrice] = useState<number>(0);
  const [assocPiecesPerBox, setAssocPiecesPerBox] = useState<number>(50);
  const [productSupplierSearch, setProductSupplierSearch] = useState<string>("");
  const [filterSupplierId, setFilterSupplierId] = useState<string>("all");

  // Sync settings when loaded
  useEffect(() => {
    if (homeSettings) {
      setPrintSuppliers(homeSettings.print_suppliers || []);
      setProductSuppliers(homeSettings.product_suppliers || []);
    }
  }, [homeSettings]);

  const activePrintPrices = {
    "Sin Impresión": 0,
    "Grabado Chico": 15,
    "Grabado Grande": 25,
    "DTF": 12,
    "Impresión 1 tinta": 10,
    "Impresión 2 tintas": 18,
    "Impresión 3 tintas": 25,
    "Impresión 4 tintas": 30,
    ...(homeSettings?.print_prices || {})
  };

  const handleSavePrintSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!printForm.name.trim()) return;

    let updatedSuppliers = [...printSuppliers];
    if (editingPrintSupplierId) {
      updatedSuppliers = updatedSuppliers.map(s => s.id === editingPrintSupplierId ? { ...printForm, id: editingPrintSupplierId } : s);
      setEditingPrintSupplierId(null);
    } else {
      updatedSuppliers.push({
        ...printForm,
        id: `PS-${Date.now()}`
      });
    }

    setPrintSuppliers(updatedSuppliers);
    await updateHomeSettings({
      ...homeSettings,
      print_suppliers: updatedSuppliers
    });

    setPrintForm({
      name: "", contact: "", phone1: "", phone2: "", address: "",
      grabado_chico: 0, grabado_grande: 0, dtf: 0,
      seri_1_tinta: 0, seri_2_tintas: 0, seri_3_tintas: 0, seri_4_tintas: 0
    });
    alert("Proveedor de impresión guardado.");
  };

  const handleEditPrintSupplier = (supplier: any) => {
    setEditingPrintSupplierId(supplier.id);
    setPrintForm({
      name: supplier.name || "",
      contact: supplier.contact || "",
      phone1: supplier.phone1 || "",
      phone2: supplier.phone2 || "",
      address: supplier.address || "",
      grabado_chico: supplier.grabado_chico || 0,
      grabado_grande: supplier.grabado_grande || 0,
      dtf: supplier.dtf || 0,
      seri_1_tinta: supplier.seri_1_tinta || 0,
      seri_2_tintas: supplier.seri_2_tintas || 0,
      seri_3_tintas: supplier.seri_3_tintas || 0,
      seri_4_tintas: supplier.seri_4_tintas || 0
    });
  };

  const handleDeletePrintSupplier = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este proveedor de impresión?")) return;
    const updated = printSuppliers.filter(s => s.id !== id);
    setPrintSuppliers(updated);
    await updateHomeSettings({
      ...homeSettings,
      print_suppliers: updated
    });
  };

  const handleSaveProductSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim()) return;

    let updatedSuppliers = [...productSuppliers];
    if (editingProductSupplierId) {
      updatedSuppliers = updatedSuppliers.map(s => s.id === editingProductSupplierId ? { ...productForm, id: editingProductSupplierId } : s);
      setEditingProductSupplierId(null);
    } else {
      updatedSuppliers.push({
        ...productForm,
        id: `PROD-S-${Date.now()}`
      });
    }

    setProductSuppliers(updatedSuppliers);
    await updateHomeSettings({
      ...homeSettings,
      product_suppliers: updatedSuppliers
    });

    setProductForm({
      name: "", contact: "", phone1: "", phone2: "", address: ""
    });
    alert("Proveedor de producto guardado.");
  };

  const handleEditProductSupplier = (supplier: any) => {
    setEditingProductSupplierId(supplier.id);
    setProductForm({
      name: supplier.name || "",
      contact: supplier.contact || "",
      phone1: supplier.phone1 || "",
      phone2: supplier.phone2 || "",
      address: supplier.address || ""
    });
  };

  const handleDeleteProductSupplier = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar este proveedor de producto?")) return;
    const updated = productSuppliers.filter(s => s.id !== id);
    setProductSuppliers(updated);
    
    const map = { ...(homeSettings?.product_supplier_map || {}) };
    Object.keys(map).forEach(prodId => {
      if (map[prodId]?.supplierId === id) {
        delete map[prodId];
      }
    });

    await updateHomeSettings({
      ...homeSettings,
      product_suppliers: updated,
      product_supplier_map: map
    });
  };

  const handleSaveProductAssociation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssocProductId || !selectedAssocSupplierId) {
      alert("Por favor selecciona un producto y un proveedor.");
      return;
    }

    const prod = products.find(p => p.id === selectedAssocProductId);
    if (!prod) return;

    const updatedProduct = {
      ...prod,
      cost: assocPrice,
      price: parseFloat((assocPrice * 1.7).toFixed(2)),
      minPurchase: assocPiecesPerBox,
      discountQty1: assocPiecesPerBox * 2,
      discountQty2: assocPiecesPerBox * 3
    };
    await updateProduct(updatedProduct);

    const map = { ...(homeSettings?.product_supplier_map || {}) };
    map[selectedAssocProductId] = {
      supplierId: selectedAssocSupplierId,
      price: assocPrice,
      piecesPerBox: assocPiecesPerBox
    };

    await updateHomeSettings({
      ...homeSettings,
      product_supplier_map: map
    });

    alert("Producto asociado exitosamente. Se actualizaron el Costo y Compra Mínima.");
  };

  const handleUnlinkProduct = async (productId: string) => {
    if (!confirm("¿Seguro que deseas desvincular este producto del proveedor?")) return;
    
    const map = { ...(homeSettings?.product_supplier_map || {}) };
    delete map[productId];

    await updateHomeSettings({
      ...homeSettings,
      product_supplier_map: map
    });
    
    alert("Producto desvinculado.");
  };

  const printTechniques = [
    { key: 'grabado_chico', name: 'Grabado Chico' },
    { key: 'grabado_grande', name: 'Grabado Grande' },
    { key: 'dtf', name: 'DTF' },
    { key: 'seri_1_tinta', name: 'Seri 1 Tinta' },
    { key: 'seri_2_tintas', name: 'Seri 2 Tintas' },
    { key: 'seri_3_tintas', name: 'Seri 3 Tintas' },
    { key: 'seri_4_tintas', name: 'Seri 4 Tintas' }
  ];

  const getMinMaxPrices = () => {
    const minPrices: Record<string, number> = {};
    const maxPrices: Record<string, number> = {};

    printTechniques.forEach(tech => {
      const activePrices = printSuppliers
        .map(s => Number(s[tech.key]) || 0)
        .filter(price => price > 0);

      if (activePrices.length > 0) {
        minPrices[tech.key] = Math.min(...activePrices);
        maxPrices[tech.key] = Math.max(...activePrices);
      }
    });

    return { minPrices, maxPrices };
  };

  const { minPrices, maxPrices } = getMinMaxPrices();

  const handleSyncPrintPrices = async () => {
    if (printSuppliers.length === 0) {
      alert("No hay proveedores de impresión registrados.");
      return;
    }

    const mapping: Record<string, string> = {
      'grabado_chico': 'Grabado Chico',
      'grabado_grande': 'Grabado Grande',
      'dtf': 'DTF',
      'seri_1_tinta': 'Impresión 1 tinta',
      'seri_2_tintas': 'Impresión 2 tintas',
      'seri_3_tintas': 'Impresión 3 tintas',
      'seri_4_tintas': 'Impresión 4 tintas'
    };

    const newPrintPrices = { ...activePrintPrices };

    printTechniques.forEach(tech => {
      const mappedKey = mapping[tech.key];
      if (mappedKey && minPrices[tech.key] !== undefined) {
        newPrintPrices[mappedKey] = minPrices[tech.key];
      }
    });

    await updateHomeSettings({
      ...homeSettings,
      print_prices: newPrintPrices
    });

    alert("¡Tarifas B2B actualizadas con los precios más bajos de los proveedores!");
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-300">
      <div className="bg-[#0f766e] rounded-2xl p-6 text-white shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black">Gestión de Proveedores y Tarifas</h2>
          <p className="text-primary-100 text-sm mt-1">Control de costos de impresión, proveedores de producto y vinculación de catálogo.</p>
        </div>
        <div className="flex gap-2 bg-primary-900/40 p-1.5 rounded-xl border border-white/10">
          <button 
            onClick={() => setSupplierTab('print')} 
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${supplierTab === 'print' ? 'bg-white text-primary-850 shadow-sm' : 'text-white hover:bg-white/10'}`}
          >
            Imprentas / Impresión
          </button>
          <button 
            onClick={() => setSupplierTab('product')} 
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${supplierTab === 'product' ? 'bg-white text-primary-850 shadow-sm' : 'text-white hover:bg-white/10'}`}
          >
            Proveedores de Producto
          </button>
        </div>
      </div>

      {supplierTab === 'print' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Form Col */}
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-255 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary-600" />
                {editingPrintSupplierId ? "Editar Proveedor de Impresión" : "Nuevo Proveedor de Impresión"}
              </h3>
              <form onSubmit={handleSavePrintSupplier} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre del Proveedor *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej. Impresiones Monterrey" 
                    value={printForm.name} 
                    onChange={e => setPrintForm({...printForm, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Contacto</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Ing. Carlos" 
                      value={printForm.contact} 
                      onChange={e => setPrintForm({...printForm, contact: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Dirección</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Calle Juárez #10" 
                      value={printForm.address} 
                      onChange={e => setPrintForm({...printForm, address: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-55 focus:bg-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Teléfono 1</label>
                    <input 
                      type="text" 
                      placeholder="Ej. 8112345678" 
                      value={printForm.phone1} 
                      onChange={e => setPrintForm({...printForm, phone1: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-55 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Teléfono 2</label>
                    <input 
                      type="text" 
                      placeholder="Ej. 8118765432" 
                      value={printForm.phone2} 
                      onChange={e => setPrintForm({...printForm, phone2: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-55 focus:bg-white"
                    />
                  </div>
                </div>

                <h4 className="font-bold text-xs text-gray-400 uppercase tracking-wider pt-4 border-t border-gray-150 mb-2">Costos de Técnicas de Impresión ($)</h4>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-bold text-gray-600 mb-1">Grabado Chico</label>
                    <input type="number" step="0.01" value={printForm.grabado_chico} onChange={e => setPrintForm({...printForm, grabado_chico: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 rounded p-1.5 bg-gray-50" />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-600 mb-1">Grabado Grande</label>
                    <input type="number" step="0.01" value={printForm.grabado_grande} onChange={e => setPrintForm({...printForm, grabado_grande: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 rounded p-1.5 bg-gray-50" />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-600 mb-1">DTF</label>
                    <input type="number" step="0.01" value={printForm.dtf} onChange={e => setPrintForm({...printForm, dtf: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 rounded p-1.5 bg-gray-50" />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-600 mb-1">Seri 1 Tinta</label>
                    <input type="number" step="0.01" value={printForm.seri_1_tinta} onChange={e => setPrintForm({...printForm, seri_1_tinta: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 rounded p-1.5 bg-gray-50" />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-600 mb-1">Seri 2 Tintas</label>
                    <input type="number" step="0.01" value={printForm.seri_2_tintas} onChange={e => setPrintForm({...printForm, seri_2_tintas: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 rounded p-1.5 bg-gray-50" />
                  </div>
                  <div>
                    <label className="block font-bold text-gray-600 mb-1">Seri 3 Tintas</label>
                    <input type="number" step="0.01" value={printForm.seri_3_tintas} onChange={e => setPrintForm({...printForm, seri_3_tintas: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 rounded p-1.5 bg-gray-50" />
                  </div>
                  <div className="col-span-2">
                    <label className="block font-bold text-gray-600 mb-1">Seri 4 Tintas</label>
                    <input type="number" step="0.01" value={printForm.seri_4_tintas} onChange={e => setPrintForm({...printForm, seri_4_tintas: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 rounded p-1.5 bg-gray-50" />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    type="submit" 
                    className="flex-1 bg-primary-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm hover:bg-primary-700 transition-colors text-sm"
                  >
                    {editingPrintSupplierId ? "Guardar Cambios" : "Agregar Proveedor"}
                  </button>
                  {editingPrintSupplierId && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingPrintSupplierId(null);
                        setPrintForm({
                          name: "", contact: "", phone1: "", phone2: "", address: "",
                          grabado_chico: 0, grabado_grande: 0, dtf: 0,
                          seri_1_tinta: 0, seri_2_tintas: 0, seri_3_tintas: 0, seri_4_tintas: 0
                        });
                      }}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 font-bold hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Suppliers List Col */}
          <div className="xl:col-span-2 space-y-6">
            {/* Sync Card */}
            {printSuppliers.length > 0 && (
              <div className="bg-primary-50 rounded-xl border border-primary-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="text-left">
                  <h3 className="font-bold text-primary-900 text-base">Sincronización Tarifaria B2B</h3>
                  <p className="text-primary-700 text-xs mt-0.5">Analiza y sincroniza las tarifas cobradas al cliente con el precio más competitivo del mercado.</p>
                </div>
                <button 
                  onClick={handleSyncPrintPrices}
                  className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold py-2.5 px-4 rounded-lg shadow-sm transition-colors flex items-center"
                >
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                  Sincronizar Costos B2B al Más Bajo
                </button>
              </div>
            )}

            {/* Print Suppliers Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-250 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-900">Directorio de Proveedores de Impresión</h3>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{printSuppliers.length} registrados</span>
              </div>
              {printSuppliers.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-sm">No hay proveedores de impresión registrados. Agrega uno a la izquierda.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left text-gray-500">
                    <thead className="text-[10px] text-gray-700 uppercase bg-gray-50 border-b border-gray-250">
                      <tr>
                        <th className="px-4 py-3 font-bold">Proveedor</th>
                        <th className="px-3 py-3 font-bold text-center">G. Chico</th>
                        <th className="px-3 py-3 font-bold text-center">G. Grande</th>
                        <th className="px-3 py-3 font-bold text-center">DTF</th>
                        <th className="px-3 py-3 font-bold text-center">Seri 1 T</th>
                        <th className="px-3 py-3 font-bold text-center">Seri 2 T</th>
                        <th className="px-3 py-3 font-bold text-center">Seri 3 T</th>
                        <th className="px-3 py-3 font-bold text-center">Seri 4 T</th>
                        <th className="px-4 py-3 font-bold text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {printSuppliers.map((supplier: any) => (
                        <tr key={supplier.id} className="bg-white border-b hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-bold text-gray-900">
                            <div>{supplier.name}</div>
                            <div className="text-[9px] text-gray-450 font-normal">Cont: {supplier.contact || '-'} | Tel: {supplier.phone1 || '-'}</div>
                          </td>
                          {printTechniques.map(tech => {
                            const price = Number(supplier[tech.key]) || 0;
                            const isMin = price === minPrices[tech.key] && printSuppliers.length > 1;
                            const isMax = price === maxPrices[tech.key] && printSuppliers.length > 1;
                            return (
                              <td key={tech.key} className="px-3 py-3 text-center">
                                <span className={isMin ? 'bg-green-100 text-green-800 font-bold px-1.5 py-0.5 rounded border border-green-200' : isMax ? 'bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded border border-red-200' : 'text-gray-900'}>
                                  {formatCurrency(price)}
                                </span>
                              </td>
                            );
                          })}
                          <td className="px-4 py-3 text-center">
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => handleEditPrintSupplier(supplier)} className="text-primary-600 hover:text-primary-800" title="Editar"><Edit className="w-4 h-4" /></button>
                              <button onClick={() => handleDeletePrintSupplier(supplier.id)} className="text-red-500 hover:text-red-700" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* B2B Live comparison reference panel */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-250 p-6">
              <h3 className="font-bold text-gray-900 mb-4 border-b pb-2">Referencia de Costos de Cotización B2B</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {printTechniques.map(tech => {
                  const mapping: Record<string, string> = {
                    'grabado_chico': 'Grabado Chico',
                    'grabado_grande': 'Grabado Grande',
                    'dtf': 'DTF',
                    'seri_1_tinta': 'Impresión 1 tinta',
                    'seri_2_tintas': 'Impresión 2 tintas',
                    'seri_3_tintas': 'Impresión 3 tintas',
                    'seri_4_tintas': 'Impresión 4 tintas'
                  };
                  const b2bName = mapping[tech.key];
                  const b2bPrice = activePrintPrices[b2bName] || 0;
                  const bestPrice = minPrices[tech.key] || 0;
                  const bestSupplier = printSuppliers.find(s => Number(s[tech.key]) === bestPrice);

                  return (
                    <div key={tech.key} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <span className="text-[10px] text-gray-500 font-bold block uppercase">{tech.name}</span>
                      <div className="flex justify-between items-baseline mt-1">
                        <span className="text-xs text-gray-700">B2B: <strong>{formatCurrency(b2bPrice)}</strong></span>
                        <span className="text-xs text-green-750 font-bold">Mín: {formatCurrency(bestPrice)}</span>
                      </div>
                      {bestSupplier && (
                        <span className="text-[9px] text-gray-400 block mt-1 truncate">Mín: {bestSupplier.name}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Product Supplier Forms */}
          <div className="xl:col-span-1 space-y-6">
            {/* CRUD Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-255 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary-600" />
                {editingProductSupplierId ? "Editar Proveedor de Producto" : "Nuevo Proveedor de Producto"}
              </h3>
              <form onSubmit={handleSaveProductSupplier} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nombre del Proveedor *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej. Promocionales de Occidente" 
                    value={productForm.name} 
                    onChange={e => setProductForm({...productForm, name: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Contacto</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Lic. Fernando" 
                    value={productForm.contact} 
                    onChange={e => setProductForm({...productForm, contact: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 focus:bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Teléfono 1</label>
                    <input 
                      type="text" 
                      placeholder="Ej. 3312345678" 
                      value={productForm.phone1} 
                      onChange={e => setProductForm({...productForm, phone1: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Teléfono 2</label>
                    <input 
                      type="text" 
                      placeholder="Ej. 3318765432" 
                      value={productForm.phone2} 
                      onChange={e => setProductForm({...productForm, phone2: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 focus:bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Domicilio</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Av. Vallarta #100" 
                    value={productForm.address} 
                    onChange={e => setProductForm({...productForm, address: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 focus:bg-white"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 bg-primary-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm hover:bg-primary-700 text-sm">
                    {editingProductSupplierId ? "Guardar Cambios" : "Agregar Proveedor"}
                  </button>
                  {editingProductSupplierId && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setEditingProductSupplierId(null);
                        setProductForm({ name: "", contact: "", phone1: "", phone2: "", address: "" });
                      }}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 font-bold hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Association Form */}
            {productSuppliers.length > 0 && products.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-250 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary-600" />
                  Asociar Producto a Proveedor
                </h3>
                <form onSubmit={handleSaveProductAssociation} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Proveedor de Producto</label>
                    <select 
                      required 
                      value={selectedAssocSupplierId} 
                      onChange={e => setSelectedAssocSupplierId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white"
                    >
                      <option value="" disabled>Selecciona un proveedor...</option>
                      {productSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Producto del Catálogo</label>
                    <select 
                      required 
                      value={selectedAssocProductId} 
                      onChange={e => {
                        setSelectedAssocProductId(e.target.value);
                        const p = products.find(prod => prod.id === e.target.value);
                        if (p) {
                          setAssocPrice(p.cost || 0);
                          setAssocPiecesPerBox(p.minPurchase || 50);
                        }
                      }}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white"
                    >
                      <option value="" disabled>Selecciona un producto...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-750 uppercase mb-1">Costo Proveedor ($)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0" 
                        value={assocPrice} 
                        onChange={e => setAssocPrice(parseFloat(e.target.value) || 0)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-755 uppercase mb-1">Piezas por Caja</label>
                      <input 
                        type="number" 
                        min="1" 
                        value={assocPiecesPerBox} 
                        onChange={e => setAssocPiecesPerBox(parseInt(e.target.value) || 1)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-primary-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm hover:bg-primary-700 text-sm mt-2">
                    Vincular y Actualizar Producto
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Product Supplier List & Directory */}
          <div className="xl:col-span-2 space-y-6">
            {/* Product Suppliers Directory */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-250 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-900">Directorio de Proveedores de Producto</h3>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{productSuppliers.length} registrados</span>
              </div>
              {productSuppliers.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-sm">No hay proveedores de producto registrados. Agrega uno a la izquierda.</div>
              ) : (
                <div className="divide-y divide-gray-100 text-xs">
                  {productSuppliers.map((supplier: any) => (
                    <div key={supplier.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white hover:bg-gray-50/50 transition-colors">
                      <div className="text-left space-y-1">
                        <h4 className="font-bold text-gray-900 text-sm">{supplier.name}</h4>
                        <div className="text-xs text-gray-500 space-y-0.5">
                          <div>Contacto: <strong className="text-gray-700">{supplier.contact || '-'}</strong></div>
                          <div>Tel: <span className="font-mono">{supplier.phone1 || '-'}</span> {supplier.phone2 ? " / " + supplier.phone2 : ""}</div>
                          <div>Domicilio: <span>{supplier.address || '-'}</span></div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditProductSupplier(supplier)} className="px-3 py-1.5 text-xs border border-gray-200 rounded font-bold hover:bg-gray-50 flex items-center text-gray-700" title="Editar"><Edit className="w-3.5 h-3.5 mr-1" /> Editar</button>
                        <button onClick={() => handleDeleteProductSupplier(supplier.id)} className="px-3 py-1.5 text-xs bg-red-50 border border-red-200 text-red-600 rounded font-bold hover:bg-red-100 flex items-center" title="Eliminar"><Trash2 className="w-3.5 h-3.5 mr-1" /> Borrar</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Linked Products Table with search and filter */}
            {productSuppliers.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-250 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50">
                  <div>
                    <h3 className="font-bold text-gray-900">Productos Vinculados</h3>
                    <p className="text-xs text-gray-400">Listado de productos del catálogo y sus costos de proveedor asignados.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <input 
                      type="text" 
                      placeholder="Buscar por nombre/SKU..." 
                      value={productSupplierSearch}
                      onChange={e => setProductSupplierSearch(e.target.value)}
                      className="border border-gray-305 rounded p-1.5 text-xs bg-white flex-1 md:flex-none w-36"
                    />
                    <select 
                      value={filterSupplierId} 
                      onChange={e => setFilterSupplierId(e.target.value)}
                      className="border border-gray-305 rounded p-1.5 text-xs bg-white w-40"
                    >
                      <option value="all">Todos los proveedores</option>
                      {productSuppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                {(() => {
                  const associations = homeSettings?.product_supplier_map || {};
                  const assocList = Object.keys(associations).map(prodId => {
                    const prod = products.find(p => p.id === prodId);
                    const assoc = associations[prodId];
                    const supplier = productSuppliers.find(s => s.id === assoc.supplierId);
                    return {
                      productId: prodId,
                      product: prod,
                      supplierId: assoc.supplierId,
                      supplierName: supplier ? supplier.name : 'Desconocido',
                      price: assoc.price,
                      piecesPerBox: assoc.piecesPerBox
                    };
                  }).filter(item => {
                    if (!item.product) return false;
                    const matchSearch = item.product.name.toLowerCase().includes(productSupplierSearch.toLowerCase()) || item.product.sku.toLowerCase().includes(productSupplierSearch.toLowerCase());
                    const matchSupplier = filterSupplierId === 'all' || item.supplierId === filterSupplierId;
                    return matchSearch && matchSupplier;
                  });

                  if (assocList.length === 0) {
                    return <div className="p-12 text-center text-gray-400 text-sm">No hay productos vinculados que coincidan con la búsqueda.</div>;
                  }

                  return (
                    <div className="overflow-x-auto text-xs">
                      <table className="w-full text-xs text-left text-gray-500">
                        <thead className="text-[10px] text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-6 py-3">Producto</th>
                            <th className="px-6 py-3">SKU</th>
                            <th className="px-6 py-3">Proveedor</th>
                            <th className="px-6 py-3 text-right">Costo ($)</th>
                            <th className="px-6 py-3 text-right">Piezas x Caja</th>
                            <th className="px-6 py-3 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assocList.map(item => (
                            <tr key={item.productId} className="bg-white border-b hover:bg-gray-50/50">
                              <td className="px-6 py-3 font-bold text-gray-900 flex items-center gap-2">
                                <div className="w-8 h-8 rounded bg-gray-100 overflow-hidden shrink-0 border">
                                  <img src={item.product?.images?.[0]} alt="" className="w-full h-full object-cover" />
                                </div>
                                <span className="truncate max-w-[150px]">{item.product?.name}</span>
                              </td>
                              <td className="px-6 py-3">{item.product?.sku}</td>
                              <td className="px-6 py-3 font-medium text-gray-800">{item.supplierName}</td>
                              <td className="px-6 py-3 text-right font-bold text-gray-900">{formatCurrency(item.price)}</td>
                              <td className="px-6 py-3 text-right font-medium">{item.piecesPerBox} pz</td>
                              <td className="px-6 py-3 text-center">
                                <button 
                                  onClick={() => handleUnlinkProduct(item.productId)}
                                  className="text-red-500 hover:text-red-700 font-bold hover:underline"
                                >
                                  Desvincular
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
