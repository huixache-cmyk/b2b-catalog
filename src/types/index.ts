export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  sku: string;
  material: string;
  cost?: number;
  stock: number;
  images: string[];
  description: string;
  isNew?: boolean;
  featured?: boolean;
  seasons?: string[];
  colors?: string[];
  discount100?: number;
  discount150?: number;
}

export interface CartItem {
  id: string; // Unique ID for cart item
  productId: string;
  productName: string;
  sku: string;
  image: string;
  color: string;
  quantity: number;
  isPersonalized: boolean;
  printOption: string;
  unitPrice: number;
  totalPrice: number;
  blueprintImage?: string;
  mockupImage?: string;
}

export interface QuoteRequest {
  id: string;
  date: string;
  client: {
    name: string;
    company: string;
    email: string;
    phone: string;
    state?: string;
    city?: string;
    comments: string;
  };
  items: CartItem[];
  total: number;
  status: 'pending' | 'reviewed' | 'completed';
}

export const DEFAULT_CATEGORIES = [
  "Tazas y Cilindros",
  "Tecnología",
  "Oficina",
  "Hogar",
  "Ecológicos",
  "Bolsas y Mochilas",
  "Escritura",
  "Cuidado Personal"
];

export const MATERIALS = [
  "Plástico",
  "Metal",
  "Bambú",
  "Cerámica",
  "Vidrio",
  "Algodón",
  "Poliéster",
  "Madera",
  "Acero Inoxidable"
];

export const DEFAULT_SEASONS = [
  "Mundial",
  "Día de las Madres",
  "Navidad",
  "Regreso a Clases",
  "Día del Padre",
  "Verano"
];

export const COLOR_PALETTE = [
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

export const getColorName = (hex: string) => {
  if (!hex || !hex.startsWith('#')) return hex || '';
  const color = COLOR_PALETTE.find(c => c.hex.toLowerCase() === hex.toLowerCase());
  return color ? color.name : hex;
};
