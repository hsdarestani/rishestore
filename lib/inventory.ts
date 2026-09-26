import { db } from "@/lib/db";

type Tx = any;

export async function releaseExpiredReservations(tx: Tx = db) {
  const expired = await tx.inventoryReservation.findMany({
    where: {
      status: "active",
      expiresAt: { lt: new Date() },
    },
  });

  for (const reservation of expired) {
    if (reservation.batchId) {
      const batch = await tx.inventoryBatch.findUnique({ where: { id: reservation.batchId } });
      if (batch && batch.reserved > 0) {
        await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: { reserved: { decrement: Math.min(batch.reserved, reservation.quantity) } },
        });
      }
    }
    await tx.inventoryReservation.update({
      where: { id: reservation.id },
      data: { status: "expired", releasedAt: new Date() },
    });
  }
}

export async function availableProductStock(productId: string) {
  await releaseExpiredReservations();
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) return 0;
  const reservations = await db.inventoryReservation.aggregate({
    where: {
      productId,
      status: "active",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    _sum: { quantity: true },
  });
  return Math.max(0, product.stock - Number(reservations._sum.quantity || 0));
}

export async function reserveOrderInventory(
  tx: Tx,
  orderId: string,
  items: Array<{ productId: string; quantity: number; allowBackorder?: boolean }>,
  ttlMinutes = 30,
) {
  await releaseExpiredReservations(tx);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

  for (const item of items) {
    if (item.allowBackorder) continue;

    const batches = await tx.inventoryBatch.findMany({
      where: {
        productId: item.productId,
        quantity: { gt: 0 },
      },
      orderBy: [
        { expiresAt: "asc" },
        { receivedAt: "asc" },
        { id: "asc" },
      ],
    });

    let remaining = item.quantity;
    for (const batch of batches) {
      if (remaining <= 0) break;
      const available = Math.max(0, batch.quantity - batch.reserved);
      if (available <= 0) continue;
      const take = Math.min(available, remaining);

      await tx.inventoryBatch.update({
        where: { id: batch.id },
        data: { reserved: { increment: take } },
      });

      await tx.inventoryReservation.create({
        data: {
          reservationKey: orderId + ":" + batch.id + ":" + item.productId,
          orderId,
          warehouseId: batch.warehouseId,
          productId: item.productId,
          batchId: batch.id,
          quantity: take,
          status: "active",
          expiresAt,
        },
      });

      remaining -= take;
    }

    if (remaining > 0) throw new Error("OUT_OF_STOCK");
  }
}

export async function releaseOrderReservations(tx: Tx, orderId: string) {
  const reservations = await tx.inventoryReservation.findMany({
    where: { orderId, status: "active" },
  });

  for (const reservation of reservations) {
    if (reservation.batchId) {
      const batch = await tx.inventoryBatch.findUnique({ where: { id: reservation.batchId } });
      if (batch && batch.reserved > 0) {
        await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: { reserved: { decrement: Math.min(batch.reserved, reservation.quantity) } },
        });
      }
    }

    await tx.inventoryReservation.update({
      where: { id: reservation.id },
      data: { status: "released", releasedAt: new Date() },
    });
  }
}

export async function commitOrderReservations(tx: Tx, orderId: string) {
  const reservations = await tx.inventoryReservation.findMany({
    where: { orderId, status: "active" },
  });

  const byProduct = new Map<string, number>();

  for (const reservation of reservations) {
    if (reservation.batchId) {
      const batch = await tx.inventoryBatch.findUnique({ where: { id: reservation.batchId } });
      if (!batch || batch.quantity < reservation.quantity || batch.reserved < reservation.quantity) {
        throw new Error("RESERVATION_INVALID");
      }

      await tx.inventoryBatch.update({
        where: { id: batch.id },
        data: {
          quantity: { decrement: reservation.quantity },
          reserved: { decrement: reservation.quantity },
        },
      });

      await tx.inventoryMovement.create({
        data: {
          warehouseId: reservation.warehouseId,
          productId: reservation.productId,
          type: "sale_issue",
          quantity: -reservation.quantity,
          unitCost: batch.unitCost,
          referenceType: "order",
          referenceId: orderId,
        },
      });
    }

    byProduct.set(
      reservation.productId,
      (byProduct.get(reservation.productId) || 0) + reservation.quantity,
    );

    await tx.inventoryReservation.update({
      where: { id: reservation.id },
      data: {
        status: "committed",
        committedAt: new Date(),
      },
    });
  }

  for (const [productId, quantity] of byProduct) {
    await tx.product.update({
      where: { id: productId },
      data: { stock: { decrement: quantity } },
    });
  }
}
