
export enum PlainTShirtColor {
  BLACK = "Preta",
  BLUE = "Azul",
  WHITE = "Branca",
  OFF_WHITE = "Off-White",
  FADED_BLUE = "Estonada Azul",
  FADED_GRAY = "Estonada Cinza",
  FADED_LEAD = "Estonada Chumbo",
}

export enum Gender {
  MALE = "Masculina",
  FEMALE = "Feminina",
}

export enum TShirtSize {
  S = "P",
  M = "M",
  L = "G",
  XL = "GG",
}

export interface PlainTShirt {
  id: string; // Composite key: color-gender-size or UUID from Supabase
  sku?: string; // Stock Keeping Unit
  color: PlainTShirtColor;
  gender: Gender;
  size: TShirtSize;
  quantity: number;
  supplier?: string; 
  cost?: number;     
  created_at?: string; 
}

export interface Print {
  id: string; // Unique name or UUID from Supabase
  sku?: string; // Stock Keeping Unit
  name: string;
  imageUrl: string;
  quantity: number;
  created_at?: string;
}

export interface FinishedTShirt {
  id: string; // Composite key: plainTShirtId_printId or UUID from Supabase
  sku?: string; // Stock Keeping Unit (e.g., PlainSKU-PrintSKU)
  plainTShirtId: string;
  printId: string;
  color: PlainTShirtColor;
  gender: Gender;
  size: TShirtSize;
  printName: string;
  printImageUrl: string;
  quantityInStock: number;
  price: number;
  created_at?: string; 
}

export interface Sale {
  id: string; // UUID
  finishedTShirtId: string;
  finishedTShirtDetails: { 
    sku?: string; // SKU of the sold finished t-shirt
    color: PlainTShirtColor;
    gender: Gender;
    size: TShirtSize;
    printName: string;
  };
  clientName?: string; 
  quantitySold: number;
  salePricePerUnit: number;
  totalSaleAmount: number;
  saleDate: string; // ISO string date
  created_at?: string; 
}

export type ModalType = 
  | 'addPlainTShirt' 
  | 'addPrint' 
  | 'produceTShirt' 
  | 'recordSale'
  | 'adjustStock' // Added for stock quantity adjustment
  | null;