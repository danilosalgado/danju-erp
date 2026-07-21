import { create } from 'zustand';

interface PDVProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  salePrice: number;
  currentStock: number;
  unit: string;
}

interface CartItem {
  product: PDVProduct;
  quantity: number;
  unitPrice: number; // editable sale price (starts as product.salePrice)
  discount: number;
}

interface PDVStore {
  cart: CartItem[];
  addToCart: (product: PDVProduct, isWeightUnit: boolean) => void;
  updateQuantity: (productId: string, delta: number) => void;
  setQuantity: (productId: string, qty: number) => void;
  setItemPrice: (productId: string, price: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

export const usePDVStore = create<PDVStore>((set) => ({
  cart: [],

  addToCart: (product, isWeightUnit) =>
    set((state) => {
      const existing = state.cart.find((i) => i.product.id === product.id);
      if (existing) {
        return {
          cart: state.cart.map((i) =>
            i.product.id === product.id
              ? { ...i, quantity: isWeightUnit ? i.quantity : i.quantity + 1 }
              : i
          ),
        };
      }
      return {
        cart: [
          ...state.cart,
          { product, quantity: isWeightUnit ? 0 : 1, unitPrice: product.salePrice, discount: 0 },
        ],
      };
    }),

  updateQuantity: (productId, delta) =>
    set((state) => ({
      cart: state.cart
        .map((i) =>
          i.product.id === productId
            ? { ...i, quantity: Math.max(0, +(i.quantity + delta).toFixed(3)) }
            : i
        )
        .filter((i) => i.quantity > 0),
    })),

  setQuantity: (productId, qty) =>
    set((state) => ({
      cart: state.cart.map((i) =>
        i.product.id === productId ? { ...i, quantity: Math.max(0, qty) } : i
      ),
    })),

  setItemPrice: (productId, price) =>
    set((state) => ({
      cart: state.cart.map((i) =>
        i.product.id === productId ? { ...i, unitPrice: Math.max(0, price) } : i
      ),
    })),

  removeItem: (productId) =>
    set((state) => ({
      cart: state.cart.filter((i) => i.product.id !== productId),
    })),

  clearCart: () => set({ cart: [] }),
}));
