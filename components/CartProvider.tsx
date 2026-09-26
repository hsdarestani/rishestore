"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image?: string | null;
  weightGrams?: number | null;
  stock: number;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  hydrated: boolean;
  add: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  remove: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const KEY = "rishe_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    hydrated,
    count: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    add(item, quantity = 1) {
      setItems((current) => {
        const existing = current.find((line) => line.productId === item.productId);
        if (existing) {
          return current.map((line) => {
            if (line.productId !== item.productId) return line;
            const max = item.stock > 0 ? item.stock : 99;
            return { ...line, quantity: Math.min(max, line.quantity + quantity), stock: item.stock, price: item.price };
          });
        }
        return [...current, { ...item, quantity: Math.max(1, Math.min(item.stock || 99, quantity)) }];
      });
    },
    remove(productId) {
      setItems((current) => current.filter((line) => line.productId !== productId));
    },
    setQuantity(productId, quantity) {
      setItems((current) => current.map((line) => {
        if (line.productId !== productId) return line;
        const max = line.stock > 0 ? line.stock : 99;
        return { ...line, quantity: Math.max(1, Math.min(max, quantity)) };
      }));
    },
    clear() {
      setItems([]);
      localStorage.removeItem(KEY);
    },
  }), [items, hydrated]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
