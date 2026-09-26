import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getStoreConfig } from "@/lib/settings";

export type CartLineInput = { productId: string; quantity: number };

export async function calculateOrder(lines: CartLineInput[]) {
  const normalized = lines
    .map((line) => ({ productId: String(line.productId), quantity: Math.max(1, Math.min(50, Number(line.quantity) || 1)) }))
    .filter((line) => line.productId);

  if (!normalized.length) throw new Error("EMPTY_CART");
  const ids = [...new Set(normalized.map((line) => line.productId))];
  const products = await db.product.findMany({ where: { id: { in: ids }, active: true } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const items = normalized.map((line) => {
    const product = productMap.get(line.productId);
    if (!product || product.price <= 0) throw new Error("INVALID_PRODUCT");
    if (product.stock < line.quantity) throw new Error("OUT_OF_STOCK:" + (product?.name || line.productId));
    return {
      product,
      quantity: line.quantity,
      total: product.price * line.quantity,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const config = await getStoreConfig();
  const shippingCost =
    config.freeShippingThreshold > 0 && subtotal >= config.freeShippingThreshold ? 0 : config.shippingFlatRate;
  return { items, subtotal, shippingCost, total: subtotal + shippingCost, config };
}

export function createOrderCode() {
  return "R-" + Date.now().toString(36).toUpperCase() + "-" + randomBytes(2).toString("hex").toUpperCase();
}
