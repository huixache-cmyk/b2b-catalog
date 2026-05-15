export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  sku: string;
  material: string;
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
