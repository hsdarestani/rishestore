import { createHash, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { assertSameOrigin, requireAdmin } from "@/lib/auth";

const str = (v: unknown) => String(v ?? "").trim();
const opt = (v: unknown) => str(v) || null;
const num = (v: unknown, min = 0) => {
  const n = Math.trunc(Number(v ?? 0));
  return Number.isFinite(n) ? Math.max(min, n) : min;
};
const bps = (v: unknown) => Math.min(10000, num(v));
const code = (prefix: string) => prefix + "-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();

async function audit(userId: string, action: string, entityType: string, entityId?: string, metadata?: Record<string, unknown>) {
  await db.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId: entityId || null,
      correlationId: randomUUID(),
      metadata: metadata ? metadata as Prisma.InputJsonValue : undefined,
    },
  });
}

async function consume(tx: any, warehouseId: string, productId: string, quantity: number, refType: string, refId: string) {
  let remaining = quantity;
  let cost = 0;
  const batches = await tx.inventoryBatch.findMany({
    where: { warehouseId, productId, quantity: { gt: 0 } },
    orderBy: [{ expiresAt: "asc" }, { receivedAt: "asc" }, { id: "asc" }],
  });
  for (const batch of batches) {
    if (remaining <= 0) break;
    const available = Math.max(0, batch.quantity - batch.reserved);
    if (available <= 0) continue;
    const take = Math.min(available, remaining);
    await tx.inventoryBatch.update({ where: { id: batch.id }, data: { quantity: { decrement: take } } });
    await tx.inventoryMovement.create({
      data: { warehouseId, productId, type: "issue", quantity: -take, unitCost: batch.unitCost, referenceType: refType, referenceId: refId },
    });
    cost += take * batch.unitCost;
    remaining -= take;
  }
  if (remaining > 0) throw new Error("INSUFFICIENT_STOCK");
  await tx.product.update({ where: { id: productId }, data: { stock: { decrement: quantity } } });
  return cost;
}

async function receive(tx: any, warehouseId: string, productId: string, quantity: number, unitCost: number, batchCode: string, refType: string, refId: string) {
  const batch = await tx.inventoryBatch.upsert({
    where: { warehouseId_productId_batchCode: { warehouseId, productId, batchCode } },
    create: { warehouseId, productId, batchCode, quantity, unitCost },
    update: { quantity: { increment: quantity }, unitCost },
  });
  await tx.inventoryMovement.create({
    data: { warehouseId, productId, type: "receipt", quantity, unitCost, referenceType: refType, referenceId: refId },
  });
  await tx.product.update({ where: { id: productId }, data: { stock: { increment: quantity } } });
  return batch;
}

async function latestB2BBalance(tx: any, accountId: string) {
  const last = await tx.b2BLedgerEntry.findFirst({ where: { accountId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  return Number(last?.balance || 0);
}

async function latestSupplierBalance(tx: any, supplierId: string) {
  const last = await tx.supplierLedgerEntry.findFirst({ where: { supplierId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  return Number(last?.balance || 0);
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "دسترسی ندارید." }, { status: 403 });

    const body = await request.json();
    const action = str(body.action);
    let result: any;

    switch (action) {
      case "promotion.create": {
        const type = str(body.type) === "fixed" ? "fixed" : "percent";
        const rawValue = num(body.value);
        const value = type === "percent" ? Math.min(10000, rawValue) : rawValue;
        const promoCode = str(body.code).toUpperCase();
        result = await db.promotion.create({
          data: {
            promotionKey: randomUUID(),
            code: promoCode || null,
            name: str(body.name) || promoCode || "پروموشن",
            channel: opt(body.channel),
            type,
            value,
            minSubtotal: num(body.minSubtotal),
            maxUses: str(body.maxUses) ? num(body.maxUses, 1) : null,
            perCustomer: str(body.perCustomer) ? num(body.perCustomer, 1) : null,
            active: true,
            startsAt: str(body.startsAt) ? new Date(str(body.startsAt)) : null,
            endsAt: str(body.endsAt) ? new Date(str(body.endsAt)) : null,
          },
        });
        await audit(admin.id, action, "promotion", result.id);
        break;
      }

      case "promotion.toggle": {
        const id = str(body.id);
        const current = await db.promotion.findUnique({ where: { id } });
        if (!current) throw new Error("NOT_FOUND");
        result = await db.promotion.update({ where: { id }, data: { active: !current.active } });
        await audit(admin.id, action, "promotion", id, { active: result.active });
        break;
      }

      case "channel-price.set": {
        const productId = str(body.productId);
        const channel = str(body.channel) || "website";
        const price = num(body.price, 1);
        await db.channelPrice.updateMany({ where: { productId, channel, active: true }, data: { active: false, endsAt: new Date() } });
        result = await db.channelPrice.create({
          data: { productId, channel, price, active: true, startsAt: new Date() },
        });
        await db.priceHistory.create({
          data: {
            priceKey: randomUUID(),
            productId,
            channel,
            price,
            cost: str(body.cost) ? num(body.cost) : null,
            effectiveFrom: new Date(),
          },
        });
        await audit(admin.id, action, "channel_price", result.id, { productId, channel, price });
        break;
      }

      case "loyalty.adjust": {
        const customerId = str(body.customerId);
        const pointsRaw = Math.trunc(Number(body.points || 0));
        if (!customerId || !Number.isFinite(pointsRaw) || pointsRaw === 0) return NextResponse.json({ error: "مشتری و مقدار امتیاز لازم است." }, { status: 400 });
        result = await db.loyaltyEntry.create({
          data: { entryKey: randomUUID(), customerId, points: pointsRaw, reason: opt(body.reason) || "اصلاح دستی توسط مدیر" },
        });
        await audit(admin.id, action, "loyalty_entry", result.id, { customerId, points: pointsRaw });
        break;
      }

      case "event.create": {
        const name = str(body.name);
        if (!name) return NextResponse.json({ error: "نام ایونت لازم است." }, { status: 400 });
        result = await db.eventSaleEvent.create({
          data: {
            publicId: randomUUID(),
            name,
            status: "active",
            warehouseId: opt(body.warehouseId),
            location: opt(body.location),
            startsAt: str(body.startsAt) ? new Date(str(body.startsAt)) : new Date(),
            endsAt: str(body.endsAt) ? new Date(str(body.endsAt)) : null,
          },
        });
        await audit(admin.id, action, "event_sale_event", result.id);
        break;
      }

      case "event.sale": {
        const eventId = str(body.eventId);
        const productId = str(body.productId);
        const quantity = num(body.quantity, 1);
        const clientUuid = str(body.clientUuid) || randomUUID();
        const event = await db.eventSaleEvent.findUnique({ where: { id: eventId } });
        const product = await db.product.findUnique({ where: { id: productId } });
        if (!event || !product) throw new Error("NOT_FOUND");
        const existing = await db.eventSale.findUnique({ where: { clientUuid } });
        if (existing) { result = existing; break; }
        const unitPrice = num(body.unitPrice) || product.price;
        const subtotal = unitPrice * quantity;
        const discount = Math.min(subtotal, num(body.discount));
        const total = subtotal - discount;
        const mobile = opt(body.mobile);

        result = await db.$transaction(async (tx) => {
          if (event.warehouseId) await consume(tx, event.warehouseId, productId, quantity, "event_sale", clientUuid);

          let customerId: string | null = null;
          if (mobile) {
            const customer = await tx.customer.upsert({
              where: { mobileNormalized: mobile },
              create: { customerKey: "mobile:" + mobile, mobileNormalized: mobile, name: opt(body.customerName), sourceCode: "event" },
              update: { name: opt(body.customerName) || undefined, sourceCode: "event", lastPurchase: new Date(), firstPurchase: new Date() },
            });
            customerId = customer.id;
          }

          const sale = await tx.eventSale.create({
            data: {
              publicId: randomUUID(),
              clientUuid,
              eventId,
              sellerUserId: admin.id,
              customerId,
              customerName: opt(body.customerName),
              mobile,
              paymentType: opt(body.paymentType) || "card",
              subtotal,
              discount,
              total,
              occurredAt: new Date(),
            },
          });
          await tx.eventSaleLine.create({ data: { eventSaleId: sale.id, productId, quantity, unitPrice, total } });
          await tx.analyticsEvent.create({
            data: {
              eventKey: "event_sale:" + sale.id,
              eventType: "event_sale",
              customerId,
              productId,
              salesChannel: "event",
              sourceCode: event.name,
              amount: total,
              quantity,
              correlationId: randomUUID(),
              occurredAt: new Date(),
            },
          });
          return sale;
        });
        await audit(admin.id, action, "event_sale", result.id, { eventId, total });
        break;
      }

      case "purchase.receive": {
        const purchaseOrderId = str(body.purchaseOrderId);
        const warehouseId = str(body.warehouseId);
        const itemId = str(body.purchaseOrderItemId);
        const quantity = num(body.quantity, 1);
        const landedCost = num(body.landedCost);
        const po = await db.purchaseOrder.findUnique({ where: { id: purchaseOrderId }, include: { items: true } });
        const item = po?.items.find((x) => x.id === itemId);
        if (!po || !item) throw new Error("NOT_FOUND");
        const remaining = Math.max(0, item.quantity - item.receivedQty);
        if (quantity > remaining) return NextResponse.json({ error: "مقدار دریافت از مانده سفارش بیشتر است." }, { status: 409 });
        const base = item.unitPrice * quantity;
        const total = base + landedCost;
        const unitCost = Math.max(0, Math.round(total / quantity));
        const receiptCode = code("RCV");
        result = await db.$transaction(async (tx) => {
          const receipt = await tx.purchaseReceipt.create({
            data: {
              publicId: randomUUID(),
              code: receiptCode,
              purchaseOrderId,
              supplierId: po.supplierId,
              warehouseId,
              subtotal: base,
              landedCost,
              total,
              dueDate: str(body.dueDate) ? new Date(str(body.dueDate)) : null,
            },
          });
          const batch = await receive(tx, warehouseId, item.productId, quantity, unitCost, receiptCode, "purchase_receipt", receipt.id);
          await tx.purchaseReceiptLine.create({
            data: { purchaseReceiptId: receipt.id, purchaseOrderItemId: item.id, productId: item.productId, inventoryBatchId: batch.id, quantity, unitCost, total },
          });
          if (landedCost > 0) {
            await tx.landedCost.create({ data: { purchaseReceiptId: receipt.id, costType: str(body.landedCostType) || "shipping", amount: landedCost, allocationMethod: "value", note: opt(body.note) } });
          }
          const updatedItem = await tx.purchaseOrderItem.update({ where: { id: item.id }, data: { receivedQty: { increment: quantity } } });
          const allItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId } });
          const allReceived = allItems.every((x) => x.receivedQty >= x.quantity);
          const anyReceived = allItems.some((x) => x.receivedQty > 0);
          await tx.purchaseOrder.update({ where: { id: purchaseOrderId }, data: { status: allReceived ? "received" : anyReceived ? "part_received" : po.status } });
          const oldBalance = await latestSupplierBalance(tx, po.supplierId);
          await tx.supplierLedgerEntry.create({
            data: { publicId: randomUUID(), supplierId: po.supplierId, purchaseOrderId, receiptId: receipt.id, entryType: "purchase_receipt", debit: 0, credit: total, balance: oldBalance + total, dueDate: receipt.dueDate },
          });
          return { receipt, updatedItem };
        });
        await audit(admin.id, action, "purchase_receipt", result.receipt.id, { quantity, landedCost });
        break;
      }

      case "purchase.pay": {
        const supplierId = str(body.supplierId);
        const accountId = str(body.treasuryAccountId);
        const amount = num(body.amount, 1);
        result = await db.$transaction(async (tx) => {
          const treasury = await tx.treasuryTransaction.create({
            data: { accountId, externalId: opt(body.externalId) || "supplier:" + randomUUID(), direction: "debit", amount, description: opt(body.note) || "پرداخت تأمین‌کننده", sourceType: "supplier_payment", sourceId: supplierId },
          });
          const payment = await tx.purchasePayment.create({ data: { publicId: randomUUID(), purchaseOrderId: opt(body.purchaseOrderId), supplierId, treasuryTransactionId: treasury.id, amount, note: opt(body.note) } });
          const oldBalance = await latestSupplierBalance(tx, supplierId);
          await tx.supplierLedgerEntry.create({ data: { publicId: randomUUID(), supplierId, purchaseOrderId: opt(body.purchaseOrderId), paymentId: payment.id, entryType: "payment", debit: amount, credit: 0, balance: oldBalance - amount } });
          return payment;
        });
        await audit(admin.id, action, "purchase_payment", result.id, { amount });
        break;
      }

      case "treasury.provider.create": {
        result = await db.treasuryProvider.create({
          data: { publicId: randomUUID(), code: str(body.code) || code("PRV"), name: str(body.name), adapter: str(body.adapter) || "manual", treasuryAccountId: opt(body.treasuryAccountId), active: true },
        });
        await audit(admin.id, action, "treasury_provider", result.id);
        break;
      }

      case "treasury.match": {
        const transactionId = str(body.transactionId);
        const matchType = str(body.matchType);
        const entityId = str(body.entityId);
        const amount = num(body.amount, 1);
        result = await db.treasuryMatch.create({ data: { publicId: randomUUID(), transactionId, matchType, entityId, amount } });
        await audit(admin.id, action, "treasury_match", result.id, { amount });
        break;
      }

      case "treasury.settlement": {
        result = await db.treasurySettlement.create({
          data: {
            publicId: randomUUID(),
            providerId: opt(body.providerId),
            treasuryAccountId: str(body.treasuryAccountId),
            externalSettlementId: opt(body.externalSettlementId),
            amount: num(body.amount, 1),
            fee: num(body.fee),
            settledAt: str(body.settledAt) ? new Date(str(body.settledAt)) : new Date(),
          },
        });
        await audit(admin.id, action, "treasury_settlement", result.id);
        break;
      }

      case "b2b.dispatch": {
        const accountId = str(body.accountId);
        const warehouseId = str(body.warehouseId);
        const productId = str(body.productId);
        const quantity = num(body.quantity, 1);
        const unitPrice = num(body.unitPrice);
        const idempotencyKey = str(body.idempotencyKey) || randomUUID();
        const existing = await db.b2BDispatch.findUnique({ where: { idempotencyKey } });
        if (existing) { result = existing; break; }

        result = await db.$transaction(async (tx) => {
          const dispatch = await tx.b2BDispatch.create({
            data: { publicId: randomUUID(), code: code("B2BD"), accountId, sourceWarehouseId: warehouseId, idempotencyKey, correlationId: randomUUID() },
          });
          await consume(tx, warehouseId, productId, quantity, "b2b_dispatch", dispatch.id);
          await tx.b2BDispatchLine.create({ data: { dispatchId: dispatch.id, productId, quantity, unitPrice, transferGroupId: randomUUID() } });
          return dispatch;
        });
        await audit(admin.id, action, "b2b_dispatch", result.id, { quantity });
        break;
      }

      case "b2b.return": {
        const dispatchId = str(body.dispatchId);
        const productId = str(body.productId);
        const quantity = num(body.quantity, 1);
        const dispatch = await db.b2BDispatch.findUnique({ where: { id: dispatchId } });
        if (!dispatch) throw new Error("NOT_FOUND");
        const idempotencyKey = str(body.idempotencyKey) || randomUUID();
        result = await db.$transaction(async (tx) => {
          const ret = await tx.b2BReturn.create({ data: { publicId: randomUUID(), code: code("B2BR"), accountId: dispatch.accountId, dispatchId, idempotencyKey } });
          await tx.b2BReturnLine.create({ data: { returnId: ret.id, productId, quantity, transferGroupId: randomUUID() } });
          await receive(tx, dispatch.sourceWarehouseId, productId, quantity, 0, ret.code, "b2b_return", ret.id);
          return ret;
        });
        await audit(admin.id, action, "b2b_return", result.id, { quantity });
        break;
      }

      case "b2b.sales-report": {
        const accountId = str(body.accountId);
        const productId = str(body.productId);
        const quantity = num(body.quantity, 1);
        const unitPrice = num(body.unitPrice, 1);
        const account = await db.b2BAccount.findUnique({ where: { id: accountId } });
        if (!account) throw new Error("NOT_FOUND");
        const subtotal = unitPrice * quantity;
        const commission = Math.round(subtotal * account.commissionBps / 10000);
        const receivable = Math.max(0, subtotal - commission);
        if (account.creditLimit > 0 && account.balance + receivable > account.creditLimit) return NextResponse.json({ error: "این گزارش فروش سقف اعتبار طرف تجاری را رد می‌کند." }, { status: 409 });
        const idempotencyKey = str(body.idempotencyKey) || randomUUID();
        result = await db.$transaction(async (tx) => {
          const report = await tx.b2BSalesReport.create({
            data: { publicId: randomUUID(), code: code("B2BS"), accountId, externalReference: opt(body.externalReference), subtotal, commission, receivable, idempotencyKey },
          });
          await tx.b2BSalesReportLine.create({ data: { salesReportId: report.id, productId, quantity, unitPrice, total: subtotal } });
          const oldBalance = await latestB2BBalance(tx, accountId);
          await tx.b2BLedgerEntry.create({ data: { publicId: randomUUID(), accountId, reportId: report.id, entryType: "sales_report", debit: receivable, credit: 0, balance: oldBalance + receivable, dueDate: str(body.dueDate) ? new Date(str(body.dueDate)) : null } });
          await tx.b2BAccount.update({ where: { id: accountId }, data: { balance: { increment: receivable } } });
          return report;
        });
        await audit(admin.id, action, "b2b_sales_report", result.id, { receivable });
        break;
      }

      case "b2b.settle": {
        const accountId = str(body.accountId);
        const treasuryAccountId = str(body.treasuryAccountId);
        const amount = num(body.amount, 1);
        result = await db.$transaction(async (tx) => {
          const treasury = await tx.treasuryTransaction.create({ data: { accountId: treasuryAccountId, externalId: opt(body.externalId) || "b2b:" + randomUUID(), direction: "credit", amount, description: opt(body.note) || "تسویه B2B", sourceType: "b2b_settlement", sourceId: accountId } });
          const settlement = await tx.b2BSettlement.create({ data: { publicId: randomUUID(), accountId, treasuryTransactionId: treasury.id, amount, note: opt(body.note) } });
          const oldBalance = await latestB2BBalance(tx, accountId);
          await tx.b2BLedgerEntry.create({ data: { publicId: randomUUID(), accountId, settlementId: settlement.id, entryType: "settlement", debit: 0, credit: amount, balance: oldBalance - amount } });
          await tx.b2BAccount.update({ where: { id: accountId }, data: { balance: { decrement: amount } } });
          return settlement;
        });
        await audit(admin.id, action, "b2b_settlement", result.id, { amount });
        break;
      }

      case "shipment.tracking": {
        const shipmentId = str(body.shipmentId);
        const status = str(body.status);
        result = await db.$transaction(async (tx) => {
          const event = await tx.shipmentTrackingEvent.create({
            data: { shipmentId, externalEventId: opt(body.externalEventId) || randomUUID(), status, location: opt(body.location), message: opt(body.message), occurredAt: str(body.occurredAt) ? new Date(str(body.occurredAt)) : new Date() },
          });
          await tx.shipment.update({ where: { id: shipmentId }, data: { status, trackingCode: opt(body.trackingCode) || undefined, shippedAt: status === "shipped" ? new Date() : undefined, deliveredAt: status === "delivered" ? new Date() : undefined } });
          return event;
        });
        await audit(admin.id, action, "shipment_tracking", result.id, { status });
        break;
      }

      case "shipment.cost": {
        result = await db.shipmentCost.create({ data: { publicId: randomUUID(), shipmentId: str(body.shipmentId), costType: str(body.costType) || "carrier", amount: num(body.amount, 1), externalCostId: opt(body.externalCostId), invoiceReference: opt(body.invoiceReference) } });
        await audit(admin.id, action, "shipment_cost", result.id);
        break;
      }

      case "shipment.settle": {
        const shipmentId = str(body.shipmentId);
        const treasuryAccountId = str(body.treasuryAccountId);
        const amount = num(body.amount, 1);
        result = await db.$transaction(async (tx) => {
          const treasury = await tx.treasuryTransaction.create({ data: { accountId: treasuryAccountId, externalId: opt(body.externalId) || "logistics:" + randomUUID(), direction: "debit", amount, description: "تسویه لجستیک", sourceType: "logistics_settlement", sourceId: shipmentId } });
          return tx.logisticsSettlement.create({ data: { publicId: randomUUID(), shipmentId, treasuryTransactionId: treasury.id, amount } });
        });
        await audit(admin.id, action, "logistics_settlement", result.id, { amount });
        break;
      }

      case "tax.map-product": {
        result = await db.taxProductMapping.upsert({
          where: { profileId_productId: { profileId: str(body.profileId), productId: str(body.productId) } },
          create: { profileId: str(body.profileId), productId: str(body.productId), taxProductId: str(body.taxProductId), title: opt(body.title), unitCode: opt(body.unitCode), vatRateBps: bps(body.vatRateBps), active: true },
          update: { taxProductId: str(body.taxProductId), title: opt(body.title), unitCode: opt(body.unitCode), vatRateBps: bps(body.vatRateBps), active: true },
        });
        await audit(admin.id, action, "tax_product_mapping", result.id);
        break;
      }

      case "tax.invoice.create": {
        const profileId = str(body.profileId);
        const orderId = str(body.orderId);
        const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
        if (!order) throw new Error("NOT_FOUND");
        const mappings = await db.taxProductMapping.findMany({ where: { profileId, productId: { in: order.items.map((i) => i.productId).filter(Boolean) as string[] }, active: true } });
        const map = new Map(mappings.map((m) => [m.productId, m]));
        const invoiceNumber = str(body.number) || ("TAX-" + order.code + "-" + Date.now().toString(36).toUpperCase());
        result = await db.$transaction(async (tx) => {
          const invoice = await tx.taxInvoice.create({ data: { profileId, orderId, number: invoiceNumber, status: "draft", total: order.total } });
          for (const item of order.items) {
            const mapping = item.productId ? map.get(item.productId) : null;
            const vat = mapping ? Math.round((item.total * mapping.vatRateBps) / 10000) : 0;
            await tx.taxInvoiceLine.create({
              data: { taxInvoiceId: invoice.id, productId: item.productId, taxProductId: mapping?.taxProductId || null, description: item.productName, quantity: item.quantity, unitPrice: item.unitPrice, discount: 0, vat, total: item.total + vat },
            });
          }
          const payload = { invoice: invoiceNumber, order: order.code, total: order.total, profileId };
          const hash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
          await tx.taxInvoice.update({ where: { id: invoice.id }, data: { payloadHash: hash } });
          await tx.taxEvent.create({ data: { taxInvoiceId: invoice.id, eventType: "created", status: "draft", payloadHash: hash, payload: payload as Prisma.InputJsonValue } });
          return { ...invoice, payloadHash: hash };
        });
        await audit(admin.id, action, "tax_invoice", result.id);
        break;
      }

      case "tax.invoice.transition": {
        const id = str(body.id);
        const status = str(body.status);
        const allowed = new Set(["draft", "queued", "submitted", "accepted", "rejected", "corrected", "cancelled", "returned"]);
        if (!allowed.has(status)) return NextResponse.json({ error: "وضعیت صورتحساب معتبر نیست." }, { status: 400 });
        result = await db.$transaction(async (tx) => {
          const invoice = await tx.taxInvoice.update({ where: { id }, data: { status, submittedAt: status === "submitted" ? new Date() : undefined, referenceId: opt(body.referenceId) || undefined, trackingCode: opt(body.trackingCode) || undefined } });
          await tx.taxEvent.create({ data: { taxInvoiceId: id, eventType: status, status, payloadHash: invoice.payloadHash } });
          if (status === "queued") {
            await tx.operationJob.upsert({
              where: { idempotencyKey: "tax_submit:" + id },
              create: { type: "tax_submit", aggregateId: id, idempotencyKey: "tax_submit:" + id, status: "pending", payload: { invoiceId: id } },
              update: { status: "pending", nextRunAt: null, lastError: null },
            });
          }
          return invoice;
        });
        await audit(admin.id, action, "tax_invoice", id, { status });
        break;
      }

      case "analytics.source.create": {
        result = await db.analyticsSource.create({ data: { code: str(body.code) || code("SRC"), name: str(body.name), channel: opt(body.channel), active: true } });
        await audit(admin.id, action, "analytics_source", result.id);
        break;
      }

      case "analytics.campaign.create": {
        result = await db.analyticsCampaign.create({ data: { campaignKey: randomUUID(), name: str(body.name), sourceId: opt(body.sourceId), channel: opt(body.channel), status: "active", startsAt: str(body.startsAt) ? new Date(str(body.startsAt)) : null, endsAt: str(body.endsAt) ? new Date(str(body.endsAt)) : null } });
        await audit(admin.id, action, "analytics_campaign", result.id);
        break;
      }

      case "analytics.alert.resolve": {
        result = await db.analyticsAlert.update({ where: { id: str(body.id) }, data: { status: "resolved", resolvedAt: new Date() } });
        await audit(admin.id, action, "analytics_alert", result.id);
        break;
      }

      case "config.snapshot": {
        const [settings, taxProfiles, carriers, treasuryProviders] = await Promise.all([
          db.setting.findMany(),
          db.taxProfile.findMany(),
          db.carrier.findMany(),
          db.treasuryProvider.findMany(),
        ]);
        const safeSettings = settings.filter((x) => !/secret|token|password|merchant|private/i.test(x.key));
        const payload = { settings: safeSettings, taxProfiles, carriers, treasuryProviders, createdAt: new Date().toISOString() };
        const checksum = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
        result = await db.configSnapshot.upsert({ where: { checksum }, create: { checksum, payload: payload as Prisma.InputJsonValue, createdBy: admin.id }, update: {} });
        await audit(admin.id, action, "config_snapshot", result.id);
        break;
      }

      case "backup.request": {
        const idempotencyKey = "backup:" + new Date().toISOString().slice(0, 13);
        result = await db.operationJob.upsert({
          where: { idempotencyKey },
          create: { type: "database_backup", aggregateId: null, idempotencyKey, status: "pending", payload: { requestedBy: admin.id } },
          update: { status: "pending", nextRunAt: null, lastError: null },
        });
        await audit(admin.id, action, "operation_job", result.id);
        break;
      }

      default:
        return NextResponse.json({ error: "عملیات ناشناخته است." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "";
    if (message === "INSUFFICIENT_STOCK") return NextResponse.json({ error: "موجودی انبار کافی نیست." }, { status: 409 });
    if (message === "NOT_FOUND") return NextResponse.json({ error: "رکورد موردنظر پیدا نشد." }, { status: 404 });
    if (/Unique constraint|P2002/.test(message)) return NextResponse.json({ error: "این عملیات یا شناسه قبلاً ثبت شده است." }, { status: 409 });
    return NextResponse.json({ error: "عملیات ذخیره نشد." }, { status: 500 });
  }
}
