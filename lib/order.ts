import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { getStoreConfig } from "@/lib/settings";
import { releaseExpiredReservations } from "@/lib/inventory";

export type CartLineInput = { productId: string; quantity: number };

export async function calculateOrder(
  lines: CartLineInput[],
  options: { promotionCode?: string | null; customerId?: string | null; channel?: string } = {},
) {
  await releaseExpiredReservations();

  const channel = options.channel || "website";
  const now = new Date();
  const normalized = lines
    .map((line) => ({ productId: String(line.productId), quantity: Math.max(1, Math.min(50, Number(line.quantity) || 1)) }))
    .filter((line) => line.productId);

  if (!normalized.length) throw new Error("EMPTY_CART");
  const ids = [...new Set(normalized.map((line) => line.productId))];

  const [products, channelPrices, reservationGroups] = await Promise.all([
    db.product.findMany({ where: { id: { in: ids }, active: true } }),
    db.channelPrice.findMany({
      where: {
        productId: { in: ids },
        channel,
        active: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        ],
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.inventoryReservation.groupBy({
      by: ["productId"],
      where: {
        productId: { in: ids },
        status: "active",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      _sum: { quantity: true },
    }),
  ]);

  const productMap = new Map(products.map((p) => [p.id, p]));
  const channelPriceMap = new Map<string, number>();
  for (const row of channelPrices) {
    if (!channelPriceMap.has(row.productId)) channelPriceMap.set(row.productId, row.price);
  }
  const reservedMap = new Map(reservationGroups.map((r) => [r.productId, Number(r._sum.quantity || 0)]));

  const items = normalized.map((line) => {
    const product = productMap.get(line.productId);
    if (!product) throw new Error("INVALID_PRODUCT");
    const unitPrice = channelPriceMap.get(product.id) ?? product.price;
    if (unitPrice <= 0) throw new Error("INVALID_PRODUCT");

    const available = Math.max(0, product.stock - (reservedMap.get(product.id) || 0));
    if (!product.allowBackorder && available < line.quantity) {
      throw new Error("OUT_OF_STOCK:" + product.name);
    }

    return {
      product,
      quantity: line.quantity,
      unitPrice,
      total: unitPrice * line.quantity,
      available,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  let discount = 0;
  let promotion: any = null;
  const promotionCode = String(options.promotionCode || "").trim().toUpperCase();

  if (promotionCode) {
    promotion = await db.promotion.findFirst({
      where: {
        code: promotionCode,
        active: true,
        OR: [{ channel: null }, { channel }],
        minSubtotal: { lte: subtotal },
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
        ],
      },
    });

    if (!promotion) throw new Error("INVALID_PROMOTION");

    if (promotion.maxUses) {
      const count = await db.promotionRedemption.count({ where: { promotionId: promotion.id } });
      if (count >= promotion.maxUses) throw new Error("PROMOTION_LIMIT");
    }

    if (promotion.perCustomer && options.customerId) {
      const count = await db.promotionRedemption.count({
        where: { promotionId: promotion.id, customerId: options.customerId },
      });
      if (count >= promotion.perCustomer) throw new Error("PROMOTION_LIMIT");
    }

    if (promotion.type === "percent") {
      discount = Math.min(subtotal, Math.round((subtotal * promotion.value) / 10000));
    } else if (promotion.type === "fixed") {
      discount = Math.min(subtotal, promotion.value);
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - discount);
  const config = await getStoreConfig();
  const shippingCost =
    config.freeShippingThreshold > 0 && discountedSubtotal >= config.freeShippingThreshold
      ? 0
      : config.shippingFlatRate;

  return {
    items,
    subtotal,
    discount,
    promotion,
    promotionCode: promotion?.code || null,
    shippingCost,
    total: discountedSubtotal + shippingCost,
    config,
    channel,
  };
}

export function createOrderCode() {
  return "R-" + Date.now().toString(36).toUpperCase() + "-" + randomBytes(2).toString("hex").toUpperCase();
}
