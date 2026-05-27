export interface WarehouseMap {
  [id: number]: string;
}

export interface PaymentConfig {
  discount: number;
  maxPrice: number;
}

export interface SearchCandidate {
  domain: string;
  region: string;
  version: string;
}

export interface ProductRaw {
  id: number;
  name?: string;
  brand?: string;
  supplier?: string;
  supplierId?: number;
  priceU?: number;
  salePriceU?: number;
  rating?: number;
  feedbacks?: number;
  totalQuantity?: number;
  sizes?: SizeRaw[];
  time1?: number;
  time2?: number;
  panelPromoId?: number;
}

export interface SizeRaw {
  name?: string;
  origName?: string;
  price?: { basic?: number; product?: number };
  stocks?: StockRaw[];
}

export interface StockRaw {
  wh: number;
  qty: number;
}

export interface ProductOutput {
  id: number;
  name: string;
  brand: string;
  supplier: string;
  supplierId: number;
  priceOriginal: number;
  priceDiscounted: number;
  priceWallet: number;
  rating: number;
  feedbacks: number;
  totalStock: number;
  stocksDetail: string;
  itemUrl: string;
  imageUrl: string;
  deliveryMsk?: string;
  deliveryBy?: string;
  position?: number;
  isPromo?: string;
  description?: string;
  characteristics?: { name: string; value: string }[];
}

export interface DetailInfo {
  description: string;
  options?: { name: string; value: string | number }[];
  grouped_options?: { name?: string; options?: { name: string; value: string | number }[] }[];
}

export interface RegionPreset {
  name: string;
  id: string;
  curr: string;
}
