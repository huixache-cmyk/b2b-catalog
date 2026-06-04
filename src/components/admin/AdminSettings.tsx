import React, { useState, useEffect } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { uploadImage } from "@/lib/supabase";

interface AdminSettingsProps {
  categories: string[];
  seasons: string[];
  featuredSeason: string | null;
  updateFeaturedSeason: (season: string | null) => any;
  addCategory: (cat: string) => any;
  removeCategory: (cat: string) => any;
  addSeason: (sea: string) => any;
  removeSeason: (sea: string) => any;
  updateCategories: (cats: string[]) => any;
  updateSeasons: (seas: string[]) => any;
  homeSettings: any;
  updateHomeSettings: (settings: any, immediate?: boolean) => any;
  viewType?: 'settings' | 'home';
}

const GRADIENT_OPTIONS = [
  { label: "Verde", value: "from-green-900/80 to-green-600/40" },
  { label: "Rosa/Rojo", value: "from-pink-900/80 to-pink-600/40" },
  { label: "Rojo Oscuro", value: "from-red-900/80 to-red-600/40" },
  { label: "Azul", value: "from-blue-900/80 to-blue-600/40" },
  { label: "Púrpura", value: "from-purple-900/80 to-purple-600/40" },
  { label: "Naranja", value: "from-orange-900/80 to-orange-600/40" },
  { label: "Oscuro", value: "from-gray-900/90 to-gray-800/50" }
];

export function AdminSettings({
  categories,
  seasons,
  featuredSeason,
  updateFeaturedSeason,
  addCategory,
  removeCategory,
  addSeason,
  removeSeason,
  updateCategories,
  updateSeasons,
  homeSettings,
  updateHomeSettings,
  viewType
}: AdminSettingsProps) {
  const [newCategory, setNewCategory] = useState("");
  const [newSeason, setNewSeason] = useState("");
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingCamp, setUploadingCamp] = useState<Record<number, boolean>>({});

  // Local states for home page editing
  const [localHero, setLocalHero] = useState<any>(null);
  const [localCampaigns, setLocalCampaigns] = useState<any[]>([]);
  const [localCta, setLocalCta] = useState<any>(null);

  // Loading/Saving states
  const [isSavingHero, setIsSavingHero] = useState(false);
  const [isSavingCampaigns, setIsSavingCampaigns] = useState(false);
  const [isSavingCta, setIsSavingCta] = useState(false);

  const [heroSaved, setHeroSaved] = useState(false);
  const [campaignsSaved, setCampaignsSaved] = useState(false);
  const [ctaSaved, setCtaSaved] = useState(false);

  // Sync with prop when loaded
  useEffect(() => {
    if (homeSettings) {
      if (!localHero) {
        setLocalHero(homeSettings.hero || {
          label: "",
          titleMain: "",
          titleHighlight: "",
          description: "",
          ctaPrimary: "",
          ctaSecondary: "",
          bgImage: ""
        });
      }
      if (localCampaigns.length === 0 && homeSettings.campaigns) {
        setLocalCampaigns(homeSettings.campaigns);
      }
      if (!localCta) {
        setLocalCta(homeSettings.cta || {
          title: "",
          description: "",
          buttonText: ""
        });
      }
    }
  }, [homeSettings]);

  const handleSaveHero = async () => {
    if (!localHero || !homeSettings) return;
    setIsSavingHero(true);
    try {
      await updateHomeSettings({ ...homeSettings, hero: localHero }, true);
      setHeroSaved(true);
      setTimeout(() => setHeroSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Error al guardar el banner principal.");
    } finally {
      setIsSavingHero(false);
    }
  };

  const handleSaveCampaigns = async () => {
    if (!homeSettings) return;
    setIsSavingCampaigns(true);
    try {
      await updateHomeSettings({ ...homeSettings, campaigns: localCampaigns }, true);
      setCampaignsSaved(true);
      setTimeout(() => setCampaignsSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Error al guardar las campañas.");
    } finally {
      setIsSavingCampaigns(false);
    }
  };

  const handleSaveCta = async () => {
    if (!localCta || !homeSettings) return;
    setIsSavingCta(true);
    try {
      await updateHomeSettings({ ...homeSettings, cta: localCta }, true);
      setCtaSaved(true);
      setTimeout(() => setCtaSaved(false), 3000);
    } catch (err) {
      console.error(err);
      alert("Error al guardar el banner inferior.");
    } finally {
      setIsSavingCta(false);
    }
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newCategories = [...categories];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newCategories.length) {
      const temp = newCategories[index];
      newCategories[index] = newCategories[targetIndex];
      newCategories[targetIndex] = temp;
      updateCategories(newCategories);
    }
  };

  const moveSeason = (index: number, direction: 'up' | 'down') => {
    const newSeasons = [...seasons];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newSeasons.length) {
      const temp = newSeasons[index];
      newSeasons[index] = newSeasons[targetIndex];
      newSeasons[targetIndex] = temp;
      updateSeasons(newSeasons);
    }
  };
  return (
    <div className="p-6 space-y-12 animate-in fade-in duration-300">
      {viewType !== "home" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Categories */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-255 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Categorías de Producto</h3>
            <div className="flex gap-2 mb-6">
              <input 
                type="text" 
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                placeholder="Nueva categoría..."
                className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2.5"
                onKeyDown={e => {
                  if (e.key === 'Enter' && newCategory.trim()) {
                    addCategory(newCategory.trim());
                    setNewCategory("");
                  }
                }}
              />
              <button 
                onClick={() => {
                  if (newCategory.trim()) {
                    addCategory(newCategory.trim());
                    setNewCategory("");
                  }
                }}
                className="bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <ul className="space-y-2">
              {categories.map((cat, idx) => (
                <li key={cat} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 hover:bg-gray-100/50 transition-colors duration-200 group">
                  <span className="font-medium text-gray-700">{cat}</span>
                  <div className="flex items-center gap-1">
                    <button 
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveCategory(idx, 'up')}
                      className="text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors p-1" 
                      title="Mover arriba"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button 
                      type="button"
                      disabled={idx === categories.length - 1}
                      onClick={() => moveCategory(idx, 'down')}
                      className="text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors p-1" 
                      title="Mover abajo"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <div className="h-4 w-[1px] bg-gray-250 mx-1"></div>
                    <button onClick={() => removeCategory(cat)} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
              {categories.length === 0 && <li className="text-gray-500 text-sm italic">No hay categorías.</li>}
            </ul>
          </div>

          {/* Seasons */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-255 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Temporadas</h3>
            <div className="flex gap-2 mb-6">
              <input 
                type="text" 
                value={newSeason}
                onChange={e => setNewSeason(e.target.value)}
                placeholder="Nueva temporada..."
                className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2.5"
                onKeyDown={e => {
                  if (e.key === 'Enter' && newSeason.trim()) {
                    addSeason(newSeason.trim());
                    setNewSeason("");
                  }
                }}
              />
              <button 
                onClick={() => {
                  if (newSeason.trim()) {
                    addSeason(newSeason.trim());
                    setNewSeason("");
                  }
                }}
                className="bg-primary-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors flex items-center justify-center"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <ul className="space-y-2">
              {seasons.map((sea, idx) => (
                <li key={sea} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100 hover:bg-gray-100/50 transition-colors duration-200 group">
                  <span className="font-medium text-gray-700">{sea}</span>
                  <div className="flex items-center gap-1">
                    <button 
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveSeason(idx, 'up')}
                      className="text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors p-1" 
                      title="Mover arriba"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button 
                      type="button"
                      disabled={idx === seasons.length - 1}
                      onClick={() => moveSeason(idx, 'down')}
                      className="text-gray-400 hover:text-primary-600 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors p-1" 
                      title="Mover abajo"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <div className="h-4 w-[1px] bg-gray-250 mx-1"></div>
                    <button onClick={() => removeSeason(sea)} className="text-gray-400 hover:text-red-600 transition-colors p-1" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
              {seasons.length === 0 && <li className="text-gray-500 text-sm italic">No hay temporadas.</li>}
            </ul>
          </div>

          {/* Featured Season */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-255 p-6 md:col-span-2">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Temporada Destacada en Menú Superior</h3>
            <div className="flex gap-4 items-center">
              <select 
                value={featuredSeason || "none"}
                onChange={e => updateFeaturedSeason(e.target.value === "none" ? null : e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2.5 min-w-[200px]"
              >
                <option value="none">Ninguna (Ocultar botón)</option>
                {seasons.map(sea => (
                  <option key={sea} value={sea}>{sea}</option>
                ))}
              </select>
              {featuredSeason && (
                <span className="text-sm text-gray-500 ml-4 flex items-center">
                  Previsualización: <span className="text-red-500 font-medium ml-2">⭐ Especial {featuredSeason}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {viewType !== "settings" && homeSettings && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Hero Banner Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:col-span-2">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Banner Principal (Hero)</h3>
            {localHero && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Etiqueta Superior</label>
                  <input type="text" value={localHero.label || ""} onChange={e => setLocalHero({...localHero, label: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Imagen de Fondo</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingHero(true);
                      const publicUrl = await uploadImage(file);
                      if (publicUrl) {
                        setLocalHero({...localHero, bgImage: publicUrl});
                      } else {
                        alert("Error subiendo la imagen.");
                      }
                      setUploadingHero(false);
                    }} 
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm" 
                  />
                  {uploadingHero && <p className="text-xs text-blue-500 mt-1 font-bold animate-pulse">Subiendo imagen...</p>}
                  {localHero.bgImage && (
                    <img src={localHero.bgImage} className="mt-2 h-16 w-32 object-cover rounded shadow" alt="Hero Preview" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Título Principal (Texto Blanco)</label>
                  <input type="text" value={localHero.titleMain || ""} onChange={e => setLocalHero({...localHero, titleMain: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Título Destacado (Texto Gradiente)</label>
                  <input type="text" value={localHero.titleHighlight || ""} onChange={e => setLocalHero({...localHero, titleHighlight: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Descripción</label>
                  <textarea rows={2} value={localHero.description || ""} onChange={e => setLocalHero({...localHero, description: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Botón Primario</label>
                  <input type="text" value={localHero.ctaPrimary || ""} onChange={e => setLocalHero({...localHero, ctaPrimary: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Botón Secundario</label>
                  <input type="text" value={localHero.ctaSecondary || ""} onChange={e => setLocalHero({...localHero, ctaSecondary: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                </div>
                <div className="md:col-span-2 flex justify-end items-center gap-4 border-t border-gray-100 pt-4 mt-2">
                  {heroSaved && (
                    <span className="text-sm text-green-600 font-bold animate-fade-in">
                      ✓ Banner principal guardado con éxito
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveHero}
                    disabled={isSavingHero}
                    className="bg-primary-600 text-white font-bold px-6 py-2.5 rounded-lg hover:bg-primary-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center min-w-[150px] shadow"
                  >
                    {isSavingHero ? "Guardando..." : "Guardar Banner"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Campaigns */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:col-span-2">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Tarjetas de Campañas</h3>
            <p className="text-sm text-gray-500 mb-6">Configura las imágenes y colores de las primeras 3 temporadas activas.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((idx) => {
                const seasonName = seasons[idx];
                if (!seasonName) return null;
                const campaignConfig = localCampaigns[idx] || { img: "", color: GRADIENT_OPTIONS[0].value };
                
                return (
                  <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                    <h4 className="font-bold text-primary-700 mb-4 pb-2 border-b border-gray-200">{seasonName}</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Imagen</label>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setUploadingCamp(prev => ({...prev, [idx]: true}));
                            const publicUrl = await uploadImage(file);
                            if (publicUrl) {
                              const newCampaigns = [...localCampaigns];
                              for (let i = 0; i <= idx; i++) {
                                if (!newCampaigns[i]) {
                                  newCampaigns[i] = { img: "", color: GRADIENT_OPTIONS[0].value };
                                }
                              }
                              newCampaigns[idx] = { ...campaignConfig, img: publicUrl };
                              setLocalCampaigns(newCampaigns);
                            } else {
                              alert("Error subiendo la imagen.");
                            }
                            setUploadingCamp(prev => ({...prev, [idx]: false}));
                          }} 
                          className="w-full border border-gray-300 rounded-md p-1.5 text-xs" 
                        />
                        {uploadingCamp[idx] && <p className="text-xs text-blue-500 mt-1 font-bold animate-pulse">Subiendo...</p>}
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Tinte de Color</label>
                        <select 
                          value={campaignConfig.color}
                          onChange={e => {
                            const newCampaigns = [...localCampaigns];
                            for (let i = 0; i <= idx; i++) {
                              if (!newCampaigns[i]) {
                                newCampaigns[i] = { img: "", color: GRADIENT_OPTIONS[0].value };
                              }
                            }
                            newCampaigns[idx] = { ...campaignConfig, color: e.target.value };
                            setLocalCampaigns(newCampaigns);
                          }}
                          className="w-full border border-gray-300 rounded-md p-2 text-xs"
                        >
                          {GRADIENT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="h-20 rounded-lg relative overflow-hidden mt-2">
                        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${campaignConfig.img}')` }}></div>
                        <div className={`absolute inset-0 bg-gradient-to-t ${campaignConfig.color}`}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex justify-end items-center gap-4 border-t border-gray-100 pt-4 mt-6">
              {campaignsSaved && (
                <span className="text-sm text-green-600 font-bold animate-fade-in">
                  ✓ Campañas guardadas con éxito
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveCampaigns}
                disabled={isSavingCampaigns}
                className="bg-primary-600 text-white font-bold px-6 py-2.5 rounded-lg hover:bg-primary-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center min-w-[160px] shadow"
              >
                {isSavingCampaigns ? "Guardando..." : "Guardar Campañas"}
              </button>
            </div>
          </div>

          {/* CTA Banner Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:col-span-2">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Banner Inferior (Llamado a la acción)</h3>
            {localCta && (
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Título Principal</label>
                  <input type="text" value={localCta.title || ""} onChange={e => setLocalCta({...localCta, title: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Descripción</label>
                  <textarea rows={2} value={localCta.description || ""} onChange={e => setLocalCta({...localCta, description: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Texto del Botón</label>
                  <input type="text" value={localCta.buttonText || ""} onChange={e => setLocalCta({...localCta, buttonText: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" />
                </div>
                <div className="flex justify-end items-center gap-4 border-t border-gray-100 pt-4 mt-2">
                  {ctaSaved && (
                    <span className="text-sm text-green-600 font-bold">
                      ✓ Banner inferior guardado con éxito
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveCta}
                    disabled={isSavingCta}
                    className="bg-primary-600 text-white font-bold px-6 py-2.5 rounded-lg hover:bg-primary-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center min-w-[150px] shadow"
                  >
                    {isSavingCta ? "Guardando..." : "Guardar Banner"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
