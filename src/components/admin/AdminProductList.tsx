import React, { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, X, Image as ImageIcon } from "lucide-react";
import { Product, MATERIALS } from "@/types";
import { formatCurrency } from "@/utils/formatters";
import { uploadImage } from "@/lib/supabase";

interface AdminProductListProps {
  products: Product[];
  isLoaded: boolean;
  addProduct: (product: Product) => any;
  updateProduct: (product: Product) => any;
  deleteProduct: (id: string) => any;
  categories: string[];
  seasons: string[];
  homeSettings: any;
  productSuppliers: any[];
}

const COLOR_PALETTE = [
  { name: "Rojo", hex: "#FF0000" },
  { name: "Verde", hex: "#00FF00" },
  { name: "Azul", hex: "#0000FF" },
  { name: "Negro", hex: "#000000" },
  { name: "Blanco", hex: "#FFFFFF" },
  { name: "Gris", hex: "#808080" },
  { name: "Amarillo", hex: "#FFFF00" },
  { name: "Naranja", hex: "#FFA500" },
  { name: "Morado", hex: "#800080" },
  { name: "Marrón", hex: "#8B4513" },
  { name: "Cian", hex: "#00FFFF" },
  { name: "Rosa", hex: "#FFC0CB" }
];

const getColorName = (hex: string) => {
  if (!hex.startsWith('#')) return hex;
  const color = COLOR_PALETTE.find(c => c.hex.toLowerCase() === hex.toLowerCase());
  return color ? color.name : hex;
};

const roundToHalf = (num: number): number => {
  return Math.round(num * 2) / 2;
};

export function AdminProductList({
  products,
  isLoaded,
  addProduct,
  updateProduct,
  deleteProduct,
  categories,
  seasons,
  homeSettings,
  productSuppliers
}: AdminProductListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<number | string | null>(null);
  const [hoveredImageKey, setHoveredImageKey] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Paste handler for local image upload
  useEffect(() => {
    if (!isModalOpen) return;

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      let imageFile: File | null = null;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          imageFile = items[i].getAsFile();
          break;
        }
      }

      if (!imageFile) return;

      e.preventDefault();

      let targetKey = hoveredImageKey;
      if (targetKey === null) {
        const currentImages = editingProduct.images || [];
        let firstEmpty = -1;
        for (let idx = 0; idx < 5; idx++) {
          if (!currentImages[idx]) {
            firstEmpty = idx;
            break;
          }
        }
        targetKey = firstEmpty !== -1 ? firstEmpty : 0;
      }

      try {
        setUploadingImage(targetKey);
        const publicUrl = await uploadImage(imageFile);
        if (publicUrl) {
          const newImages = [...(editingProduct.images || [])];
          while (newImages.length <= targetKey) newImages.push("");
          newImages[targetKey] = publicUrl;
          setEditingProduct(prev => ({...prev, images: newImages}));
        } else {
          alert("Error subiendo la imagen pegada.");
        }
      } catch (err) {
        console.error("Error uploading pasted image:", err);
        alert("No se pudo procesar la imagen pegada.");
      } finally {
        setUploadingImage(null);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [isModalOpen, hoveredImageKey, editingProduct.images]);

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteProduct(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const openNewModal = () => {
    setEditingProduct({
      name: "",
      sku: "",
      category: categories[0] || "",
      cost: 0,
      price: 0,
      stock: 0,
      material: MATERIALS[0],
      description: "",
      seasons: [],
      images: [""],
      colors: [],
      isNew: false,
      featured: false,
      discount100: 0,
      discount150: 0,
      published: true,
      minPurchase: 50,
      discountQty1: 100,
      discountQty2: 150
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct({ ...product });
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    const productToSave = {
      ...editingProduct
    } as Product;

    let cleanedImages = [...(productToSave.images || [])];
    while (cleanedImages.length < 5) {
      cleanedImages.push("");
    }
    const hasAnyImage = cleanedImages.some(img => img.trim() !== "");
    if (!hasAnyImage) {
      cleanedImages[0] = "https://picsum.photos/seed/newprod/600/600";
    }
    productToSave.images = cleanedImages;

    if (isEditing && productToSave.id) {
      updateProduct(productToSave);
    } else {
      productToSave.id = `PROD-${Date.now()}`;
      addProduct(productToSave);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative">
      {/* Top Bar */}
      <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <input 
            type="text" 
            placeholder="Buscar por nombre o SKU..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2.5 pl-10"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
        </div>
        <button 
          onClick={openNewModal}
          className="w-full sm:w-auto bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Producto
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto min-h-[400px]">
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
            <tr>
              <th scope="col" className="px-6 py-4">Producto</th>
              <th scope="col" className="px-6 py-4">SKU</th>
              <th scope="col" className="px-6 py-4">Categoría</th>
              <th scope="col" className="px-6 py-4 text-right">Costo</th>
              <th scope="col" className="px-6 py-4 text-right">Precio Base</th>
              <th scope="col" className="px-6 py-4 text-right">Stock Total</th>
              <th scope="col" className="px-6 py-4 text-center">Publicado</th>
              <th scope="col" className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(product => (
              <tr key={product.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap flex items-center gap-3">
                  <div className="w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0 border">
                    <img src={product.images?.find(img => !!img) || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e"} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col">
                    <span className="truncate max-w-[200px] block font-bold" title={product.name}>{product.name}</span>
                    <span className="text-xs text-gray-400">
                      {product.colors?.length || 0} colores
                      {(() => {
                        const assoc = homeSettings?.product_supplier_map?.[product.id];
                        const s = productSuppliers.find(ps => ps.id === assoc?.supplierId);
                        return s ? ` • Prov: ${s.name}` : '';
                      })()}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">{product.sku}</td>
                <td className="px-6 py-4">
                  <span className="bg-primary-50 text-primary-700 text-xs font-semibold px-2.5 py-0.5 rounded">
                    {product.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {typeof product.cost === 'number' ? formatCurrency(product.cost) : "-"}
                </td>
                <td className="px-6 py-4 text-right font-medium text-gray-900">
                  {formatCurrency(product.price)}
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`${product.stock < 500 ? 'text-red-600' : 'text-green-600'} font-semibold`}>
                    {product.stock.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <input
                    type="checkbox"
                    checked={product.published !== false}
                    onChange={(e) => {
                      updateProduct({
                        ...product,
                        published: e.target.checked
                      });
                    }}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                  />
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openEditModal(product)} className="text-gray-400 hover:text-primary-600 transition-colors p-1" title="Editar">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteClick(product.id)} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                  No se encontraron productos con ese término de búsqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 text-center">
        Total en catálogo: {products.length} productos
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full border">
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Eliminar Producto?</h3>
            <p className="text-sm text-gray-500 mb-6">Esta acción es irreversible y removerá el artículo de toda la tienda.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 text-xs">Cancelar</button>
              <button onClick={confirmDelete} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-750 text-xs shadow-sm">Confirmar Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-900">{isEditing ? "Editar Producto" : "Nuevo Producto"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-6 text-left">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Nombre del Producto *</label>
                  <input required type="text" value={editingProduct.name || ""} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-primary-500 focus:border-primary-500" placeholder="Ej. Termo de Acero Inoxidable" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">SKU *</label>
                  <input required type="text" value={editingProduct.sku || ""} onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-primary-500 focus:border-primary-500" placeholder="Ej. TM-500" />
                </div>

                <div className="col-span-2">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                    <h4 className="font-extrabold text-sm text-gray-700 uppercase tracking-wide flex items-center gap-1.5 pb-2 border-b">Precios B2B y Descuentos</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Price Base */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Precio Base ($) *</label>
                        <input required type="number" step="0.01" min="0" value={editingProduct.price || 0} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-bold" />
                      </div>
                      
                      {/* Cost */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Costo Interno ($)</label>
                        <input type="number" step="0.01" min="0" value={editingProduct.cost || 0} onChange={e => {
                          const newCost = parseFloat(e.target.value) || 0;
                          setEditingProduct({
                            ...editingProduct,
                            cost: newCost,
                            price: parseFloat((newCost * 1.7).toFixed(2))
                          });
                        }} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-bold bg-gray-50/50" />
                      </div>

                      {/* Min Purchase */}
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Compra Mínima (Pzas)</label>
                        <input type="number" step="1" min="1" value={editingProduct.minPurchase === undefined ? 50 : editingProduct.minPurchase} onChange={e => {
                          const newMin = parseInt(e.target.value) || 50;
                          setEditingProduct({
                            ...editingProduct,
                            minPurchase: newMin,
                            discountQty1: newMin * 2,
                            discountQty2: newMin * 3
                          });
                        }} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-bold" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                      <div>
                        <label className="block text-xs font-bold text-gray-550 mb-1">Rango 1 (Límite Mínimo)</label>
                        <input type="number" step="1" min="1" value={editingProduct.discountQty1 === undefined ? 100 : editingProduct.discountQty1} onChange={e => setEditingProduct({...editingProduct, discountQty1: parseInt(e.target.value) || 100})} className="w-full border border-gray-300 rounded p-1.5 text-xs font-bold" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-550 mb-1">Rango 2 (Límite Máximo)</label>
                        <input type="number" step="1" min="1" value={editingProduct.discountQty2 === undefined ? 150 : editingProduct.discountQty2} onChange={e => setEditingProduct({...editingProduct, discountQty2: parseInt(e.target.value) || 150})} className="w-full border border-gray-300 rounded p-1.5 text-xs font-bold" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-gray-200">
                      {/* Tier 1 */}
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                          {(editingProduct.minPurchase === undefined ? 50 : editingProduct.minPurchase)} a {(editingProduct.discountQty1 === undefined ? 100 : editingProduct.discountQty1) - 1} piezas
                        </label>
                        <div className="text-sm font-bold text-primary-700 mt-2">
                          = {formatCurrency(editingProduct.price || 0)} c/u
                        </div>
                      </div>

                      {/* Tier 2 */}
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                          {(editingProduct.discountQty1 === undefined ? 100 : editingProduct.discountQty1)} a {(editingProduct.discountQty2 === undefined ? 150 : editingProduct.discountQty2) - 1} piezas
                        </label>
                        <div className="flex items-center gap-2 mb-2">
                          <input type="number" step="1" min="0" max="100" value={editingProduct.discount100 || 0} onChange={e => setEditingProduct({...editingProduct, discount100: parseFloat(e.target.value) || 0})} className="w-20 border border-gray-300 rounded-lg p-1.5 focus:ring-primary-500 focus:border-primary-500 text-sm font-bold" />
                          <span className="text-sm font-bold text-gray-500">% Desc.</span>
                        </div>
                        <div className="text-sm font-bold text-primary-700">
                          = {formatCurrency(roundToHalf((editingProduct.price || 0) * (1 - (editingProduct.discount100 || 0) / 100)))} c/u
                        </div>
                      </div>

                      {/* Tier 3 */}
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                          Más de {(editingProduct.discountQty2 === undefined ? 150 : editingProduct.discountQty2)} piezas
                        </label>
                        <div className="flex items-center gap-2 mb-2">
                          <input type="number" step="1" min="0" max="100" value={editingProduct.discount150 || 0} onChange={e => setEditingProduct({...editingProduct, discount150: parseFloat(e.target.value) || 0})} className="w-20 border border-gray-300 rounded-lg p-1.5 focus:ring-primary-500 focus:border-primary-500 text-sm font-bold" />
                          <span className="text-sm font-bold text-gray-500">% Desc.</span>
                        </div>
                        <div className="text-sm font-bold text-primary-700">
                          = {formatCurrency(roundToHalf((editingProduct.price || 0) * (1 - (editingProduct.discount150 || 0) / 100)))} c/u
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Categoría *</label>
                  <select required value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-primary-500 focus:border-primary-500 bg-white">
                    {editingProduct.category && !categories.includes(editingProduct.category) && (
                      <option value={editingProduct.category}>{editingProduct.category} (Sugerido por IA)</option>
                    )}
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Material Principal *</label>
                  <select required value={editingProduct.material} onChange={e => setEditingProduct({...editingProduct, material: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-primary-500 focus:border-primary-500 bg-white">
                    {editingProduct.material && !MATERIALS.includes(editingProduct.material) && (
                      <option value={editingProduct.material}>{editingProduct.material} (Sugerido por IA)</option>
                    )}
                    {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Temporadas</label>
                  <div className="flex flex-wrap gap-2">
                    {seasons.map(sea => {
                      const isSelected = (editingProduct.seasons || []).includes(sea);
                      return (
                        <label key={sea} className={`cursor-pointer px-3 py-1.5 rounded-full border text-sm flex items-center gap-2 transition-colors ${isSelected ? 'bg-primary-50 border-primary-500 text-primary-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                          <input 
                            type="checkbox" 
                            className="hidden"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSeasons = e.target.checked 
                                ? [...(editingProduct.seasons || []), sea]
                                : (editingProduct.seasons || []).filter(s => s !== sea);
                              setEditingProduct({...editingProduct, seasons: newSeasons});
                            }}
                          />
                          {sea}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Descripción</label>
                  <textarea rows={3} value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-primary-500 focus:border-primary-500"></textarea>
                </div>

                <div className="col-span-2">
                  <h4 className="block text-sm font-bold text-gray-700 mb-2">Galería de Imágenes</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    {[
                      { label: "Foto Principal *", key: 0 },
                      { label: "Foto Individual 1", key: 1 },
                      { label: "Foto Individual 2", key: 2 },
                      { label: "Foto Individual 3", key: 3 },
                      { label: "Plano Mecánico", key: 4 }
                    ].map(imgField => {
                       const isHovered = hoveredImageKey === imgField.key;
                       return (
                         <div 
                           key={imgField.key}
                           onMouseEnter={() => setHoveredImageKey(imgField.key)}
                           onMouseLeave={() => setHoveredImageKey(null)}
                           className={`p-3.5 rounded-xl border-2 transition-all duration-300 ${
                             isHovered 
                               ? "border-primary-500 bg-white shadow-sm ring-4 ring-primary-500/5" 
                               : "border-transparent bg-transparent"
                           }`}
                         >
                           <div className="flex justify-between items-center mb-1.5">
                             <label className="block text-xs font-bold text-gray-500 uppercase">{imgField.label}</label>
                             <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono transition-colors duration-300 ${
                               isHovered 
                                 ? "bg-primary-50 border-primary-200 text-primary-700 font-semibold" 
                                 : "bg-gray-100 border-gray-200 text-gray-400"
                             }`}>
                               Ctrl + V
                             </span>
                           </div>
                           <div className="relative">
                             <input 
                               type="file"
                               accept="image/*"
                               onChange={async (e) => {
                                 const file = e.target.files?.[0];
                                 if (!file) return;
                                 setUploadingImage(imgField.key);
                                 const publicUrl = await uploadImage(file);
                                 if (publicUrl) {
                                   const newImages = [...(editingProduct.images || [])];
                                   while (newImages.length <= imgField.key) newImages.push("");
                                   newImages[imgField.key] = publicUrl;
                                   setEditingProduct({...editingProduct, images: newImages});
                                 } else {
                                   alert("Error subiendo la imagen.");
                                 }
                                 setUploadingImage(null);
                               }}
                               className="w-full border border-gray-300 rounded-lg p-2 focus:ring-primary-500 focus:border-primary-500 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" 
                             />
                           </div>
                           {uploadingImage === imgField.key && <p className="text-xs text-blue-500 mt-1 font-bold animate-pulse">Subiendo imagen...</p>}
                           {editingProduct.images?.[imgField.key] && (
                             <div className="mt-2.5 flex items-center gap-3">
                               <img src={editingProduct.images[imgField.key]} className="h-12 w-12 object-cover rounded-lg shadow-sm border border-gray-200" alt="Preview" />
                               <div className="flex flex-col gap-0.5">
                                 <button type="button" onClick={() => {
                                    const newImages = [...(editingProduct.images || [])];
                                    newImages[imgField.key] = "";
                                    setEditingProduct({...editingProduct, images: newImages});
                                 }} className="text-xs text-red-550 hover:text-red-700 font-bold self-start">Quitar</button>
                                 <span className="text-[10px] text-gray-400">Ctrl+V para reemplazar</span>
                                </div>
                             </div>
                           )}
                         </div>
                       );
                     })}
                  </div>
                </div>

              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <div className="flex flex-wrap gap-6 p-4 bg-gray-50 rounded-lg border border-gray-200 mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editingProduct.isNew || false} onChange={e => setEditingProduct({...editingProduct, isNew: e.target.checked})} className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                      <span className="text-sm font-bold text-gray-700">Etiqueta "NUEVO"</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editingProduct.featured || false} onChange={e => setEditingProduct({...editingProduct, featured: e.target.checked})} className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                      <span className="text-sm font-bold text-gray-700">Producto Destacado</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={editingProduct.published !== false} onChange={e => setEditingProduct({...editingProduct, published: e.target.checked})} className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                      <span className="text-sm font-bold text-gray-700">Publicado en Catálogo</span>
                    </label>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Stock Total *</label>
                  <input required type="number" min="0" value={editingProduct.stock || 0} onChange={e => setEditingProduct({...editingProduct, stock: parseInt(e.target.value) || 0})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-primary-500 focus:border-primary-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Colores Disponibles</label>
                  <div className="flex flex-wrap gap-3">
                    {COLOR_PALETTE.map(c => {
                      const isSelected = (editingProduct.colors || []).includes(c.hex);
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => {
                            const newColors = isSelected
                              ? (editingProduct.colors || []).filter(color => color !== c.hex)
                              : [...(editingProduct.colors || []), c.hex];
                            setEditingProduct({...editingProduct, colors: newColors});
                          }}
                          title={c.name}
                          className={`w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center shadow-sm ${isSelected ? 'border-primary-600 ring-2 ring-primary-200 ring-offset-2' : 'border-gray-200 hover:border-gray-300'}`}
                          style={{ backgroundColor: c.hex }}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2.5 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 transition-colors shadow-sm">
                  {isEditing ? "Guardar Cambios" : "Crear Producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
