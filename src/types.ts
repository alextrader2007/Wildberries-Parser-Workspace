export interface Product {
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
  basket?: string;
  position?: number;
  isPromo?: string;
  deliveryBy?: string;
  deliveryMsk?: string;
  description?: string;
  characteristics?: { name: string; value: string }[];
}

export interface BasketInfo {
  vol: number;
  part: number;
  basket: string;
  imageUrl: string;
}

export interface SearchState {
  query: string;
  pages: number;
  curr: string;
  dest: string;
  status: 'idle' | 'searching' | 'success' | 'error';
  progress: string;
}

export interface SkuState {
  skus: string;
  curr: string;
  dest: string;
  status: 'idle' | 'parsing' | 'success' | 'error';
  progress: string;
}
