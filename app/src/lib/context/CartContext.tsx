import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';
import type { Part } from '@/types/part';
import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage/localStorage';

export interface CartItem {
  part: Part;
  qty: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  addItem: (part: Part, qty?: number) => void;
  removeItem: (partId: string) => void;
  updateQty: (partId: string, qty: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function parsePrice(s: string): number {
  return parseFloat(s.replace(/[^0-9.]/g, '')) || 0;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => getItem<CartItem[]>(STORAGE_KEYS.cart, []));

  useEffect(() => {
    setItem(STORAGE_KEYS.cart, items);
  }, [items]);

  const addItem = (part: Part, qty: number = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.part.id === part.id);
      if (existing) {
        return prev.map((i) => (i.part.id === part.id ? { ...i, qty: i.qty + qty } : i));
      }
      return [...prev, { part, qty }];
    });
  };

  const removeItem = (partId: string) => {
    setItems((prev) => prev.filter((i) => i.part.id !== partId));
  };

  const updateQty = (partId: string, qty: number) => {
    if (qty <= 0) {
      removeItem(partId);
      return;
    }
    setItems((prev) => prev.map((i) => (i.part.id === partId ? { ...i, qty } : i)));
  };

  const clear = () => setItems([]);

  const count = useMemo(() => items.reduce((sum, i) => sum + i.qty, 0), [items]);
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + parsePrice(i.part.price) * i.qty, 0),
    [items]
  );

  return (
    <CartContext.Provider value={{ items, count, subtotal, addItem, removeItem, updateQty, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
