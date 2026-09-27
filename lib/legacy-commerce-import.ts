import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { normalizePhone, validIranPhone } from "@/lib/money";

type SqlValue = string | number | null;
type SqlRow = Record<string, SqlValue>;

function mysqlUnescape(value: string) {
  const map: Record<string, string> = {
    "0": "\0",
    b: "\b",
    n: "\n",
    r: "\r",
    t: "\t",
    Z: String.fromCharCode(26),
    "\\": "\\",
    "'": "'",
    '"': '"',
  };
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "\\" && i + 1 < value.length) {
      const next = value[++i];
      out += map[next] ?? next;
    } else if (ch === "'" && value[i + 1] === "'") {
      out += "'";
      i++;
    } else {
      out += ch;
    }
  }
  return out;
}

function parseToken(raw: string): SqlValue {
  const value = raw.trim();
  if (/^NULL$/i.test(value)) return null;
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return mysqlUnescape(value.slice(1, -1));
  }
  if (/^-?\d+$/.test(value)) return Number(value);
  if (/^-?\d+\.\d+$/.test(value)) return Number(value);
  return value;
}

function splitTuple(input: string) {
  const values: SqlValue[] = [];
  let buffer = "";
  let quoted = false;
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      buffer += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === "'") {
        if (input[i + 1] === "'") {
          buffer += input[++i];
        } else {
          quoted = false;
        }
      }
      continue;
    }

    if (ch === "'") {
      quoted = true;
      buffer += ch;
    } else if (ch === ",") {
      values.push(parseToken(buffer));
      buffer = "";
    } else {
      buffer += ch;
    }
  }
  values.push(parseToken(buffer));
  return values;
}

function insertStatements(sql: string, table: string) {
  const tick = String.fromCharCode(96);
  const needle = "INSERT INTO " + tick + table + tick;
  const statements: string[] = [];
  let cursor = 0;

  while (cursor < sql.length) {
    const start = sql.indexOf(needle, cursor);
    if (start < 0) break;

    let quoted = false;
    let escaped = false;
    let end = start;

    for (; end < sql.length; end++) {
      const ch = sql[end];
      if (quoted) {
        if (escaped) {
          escaped = false;
        } else if (ch === "\\") {
          escaped = true;
        } else if (ch === "'") {
          if (sql[end + 1] === "'") end++;
          else quoted = false;
        }
      } else if (ch === "'") {
        quoted = true;
      } else if (ch === ";") {
        statements.push(sql.slice(start, end + 1));
        cursor = end + 1;
        break;
      }
    }

    if (end >= sql.length) break;
  }
  return statements;
}

function parseInsert(statement: string) {
  const tick = String.fromCharCode(96);
  const firstParen = statement.indexOf("(");
  const valuesMarker = ") VALUES";
  const valuesAt = statement.indexOf(valuesMarker);
  if (firstParen < 0 || valuesAt < 0) return [] as SqlRow[];

  const columns = statement
    .slice(firstParen + 1, valuesAt)
    .split(",")
    .map((column) => column.trim().split(tick).join(""));

  const body = statement.slice(valuesAt + valuesMarker.length, -1);
  const rows: SqlRow[] = [];
  let i = 0;

  while (i < body.length) {
    while (i < body.length && /[\s,]/.test(body[i])) i++;
    if (i >= body.length) break;
    if (body[i] !== "(") {
      i++;
      continue;
    }

    const start = ++i;
    let quoted = false;
    let escaped = false;
    let depth = 1;

    for (; i < body.length; i++) {
      const ch = body[i];
      if (quoted) {
        if (escaped) {
          escaped = false;
        } else if (ch === "\\") {
          escaped = true;
        } else if (ch === "'") {
          if (body[i + 1] === "'") i++;
          else quoted = false;
        }
      } else if (ch === "'") {
        quoted = true;
      } else if (ch === "(") {
        depth++;
      } else if (ch === ")") {
        depth--;
        if (depth === 0) {
          const values = splitTuple(body.slice(start, i));
          if (values.length === columns.length) {
            rows.push(Object.fromEntries(columns.map((column, index) => [column, values[index]])));
          }
          i++;
          break;
        }
      }
    }
  }

  return rows;
}

function tableRows(sql: string, table: string) {
  return insertStatements(sql, table).flatMap(parseInsert);
}

function text(value: SqlValue | undefined) {
  return value == null ? "" : String(value).trim();
}

function number(value: SqlValue | undefined) {
  const result = Number(value || 0);
  return Number.isFinite(result) ? Math.round(result) : 0;
}

function email(value: SqlValue | undefined) {
  const normalized = text(value).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

function phone(value: SqlValue | undefined) {
  const normalized = normalizePhone(text(value));
  return validIranPhone(normalized) ? normalized : null;
}

function date(value: SqlValue | undefined) {
  const raw = text(value);
  if (!raw || raw.startsWith("0000-00-00")) return null;
  const parsed = new Date(raw.replace(" ", "T") + "Z");
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function orderStatus(value: string) {
  if (value === "wc-completed") return "COMPLETED" as const;
  if (value === "wc-processing") return "PROCESSING" as const;
  if (value === "wc-pws-post") return "SHIPPED" as const;
  if (value === "wc-cancelled" || value === "trash" || value === "wc-failed") return "CANCELED" as const;
  return "PENDING" as const;
}

function paymentStatus(status: string, paidAt: Date | null) {
  if (status === "wc-refunded") return "REFUNDED" as const;
  if (status === "wc-failed") return "FAILED" as const;
  if (paidAt || status === "wc-completed" || status === "wc-processing" || status === "wc-pws-post") return "PAID" as const;
  if (status === "wc-on-hold" || status === "wc-pending") return "PENDING" as const;
  return "UNPAID" as const;
}

function fullName(first: SqlValue | undefined, last: SqlValue | undefined, fallback = "") {
  return [text(first), text(last)].filter(Boolean).join(" ").trim() || fallback;
}

function objectMetadata(value: unknown): Prisma.InputJsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Prisma.InputJsonObject
    : {};
}

export async function importLegacyCommerceSql(sql: string) {
  if (!sql.includes("wp_wc_orders") || !sql.includes("wp_users")) {
    throw new Error("LEGACY_SQL_INVALID");
  }

  const users = tableRows(sql, "wp_users");
  const userMetaRows = tableRows(sql, "wp_usermeta");
  const wcCustomers = tableRows(sql, "wp_wc_customer_lookup");
  const orders = tableRows(sql, "wp_wc_orders").filter((row) => text(row.type) === "shop_order");
  const addresses = tableRows(sql, "wp_wc_order_addresses").filter((row) => text(row.address_type) === "billing");
  const operational = tableRows(sql, "wp_wc_order_operational_data");
  const orderItems = tableRows(sql, "wp_woocommerce_order_items");
  const itemMetaRows = tableRows(sql, "wp_woocommerce_order_itemmeta");
  const legacyEvents = tableRows(sql, "wp_rishe_sales_events");
  const legacyEventSales = tableRows(sql, "wp_rishe_event_sales");
  const legacyEventLines = tableRows(sql, "wp_rishe_event_sale_lines");

  const userMeta = new Map<number, Record<string, string>>();
  for (const row of userMetaRows) {
    const userId = number(row.user_id);
    if (!userMeta.has(userId)) userMeta.set(userId, {});
    const key = text(row.meta_key);
    if (key) userMeta.get(userId)![key] = text(row.meta_value);
  }

  const legacyUserById = new Map(users.map((row) => [number(row.ID), row]));
  const billingByOrder = new Map(addresses.map((row) => [number(row.order_id), row]));
  const operationalByOrder = new Map(operational.map((row) => [number(row.order_id), row]));
  const ordersByLegacyCustomer = new Map<number, SqlRow[]>();
  for (const row of orders) {
    const customerId = number(row.customer_id);
    if (!ordersByLegacyCustomer.has(customerId)) ordersByLegacyCustomer.set(customerId, []);
    ordersByLegacyCustomer.get(customerId)!.push(row);
  }

  const itemMeta = new Map<number, Record<string, string>>();
  for (const row of itemMetaRows) {
    const itemId = number(row.order_item_id);
    if (!itemMeta.has(itemId)) itemMeta.set(itemId, {});
    itemMeta.get(itemId)![text(row.meta_key)] = text(row.meta_value);
  }

  const lineItemsByOrder = new Map<number, SqlRow[]>();
  for (const row of orderItems) {
    if (text(row.order_item_type) !== "line_item") continue;
    const orderId = number(row.order_id);
    if (!lineItemsByOrder.has(orderId)) lineItemsByOrder.set(orderId, []);
    lineItemsByOrder.get(orderId)!.push(row);
  }

  const productIds = new Set<number>();
  for (const meta of itemMeta.values()) {
    const id = Number(meta._product_id || 0);
    if (id > 0) productIds.add(id);
  }
  for (const row of legacyEventLines) {
    const id = number(row.wc_product_id);
    if (id > 0) productIds.add(id);
  }

  const products = await db.product.findMany({
    where: { legacyProductId: { in: Array.from(productIds) } },
    select: { id: true, legacyProductId: true, slug: true, name: true },
  });
  const productByLegacyId = new Map(products.filter((p) => p.legacyProductId != null).map((p) => [p.legacyProductId as number, p]));

  const existingUsers = await db.user.findMany({ select: { id: true, phone: true, email: true, role: true } });
  const userByPhone = new Map(existingUsers.map((user) => [user.phone, user]));
  const usedEmails = new Map(existingUsers.filter((user) => user.email).map((user) => [String(user.email).toLowerCase(), user.phone]));
  const userIdMap = new Map<number, string>();
  const placeholderHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);

  let usersCreated = 0;
  let usersMerged = 0;
  let usersSkippedNoPhone = 0;

  for (const legacyUser of users) {
    const legacyId = number(legacyUser.ID);
    const meta = userMeta.get(legacyId) || {};
    const mobile = phone(meta.billing_phone) || phone(legacyUser.user_login);
    if (!mobile) {
      usersSkippedNoPhone++;
      continue;
    }

    const candidateEmail = email(meta.billing_email) || email(legacyUser.user_email);
    const safeEmail = candidateEmail && (!usedEmails.has(candidateEmail) || usedEmails.get(candidateEmail) === mobile) ? candidateEmail : null;
    const name = fullName(meta.first_name || meta.billing_first_name, meta.last_name || meta.billing_last_name, text(legacyUser.display_name) || mobile);

    let current = userByPhone.get(mobile);
    if (!current) {
      const created = await db.user.create({
        data: {
          name,
          phone: mobile,
          email: safeEmail,
          passwordHash: placeholderHash,
          role: "CUSTOMER",
          createdAt: date(legacyUser.user_registered) || new Date(),
        },
        select: { id: true, phone: true, email: true, role: true },
      });
      current = created;
      userByPhone.set(mobile, current);
      if (safeEmail) usedEmails.set(safeEmail, mobile);
      usersCreated++;
    } else {
      usersMerged++;
    }
    userIdMap.set(legacyId, current.id);
  }

  const legacyCustomerToNew = new Map<number, string>();
  const customerByPhone = new Map<string, string>();
  const customerCache = await db.customer.findMany();
  for (const customer of customerCache) {
    if (customer.mobileNormalized) customerByPhone.set(customer.mobileNormalized, customer.id);
  }

  let customersCreated = 0;
  let customersMerged = 0;

  async function ensureCustomer(input: {
    key: string;
    mobile?: string | null;
    name?: string | null;
    email?: string | null;
    province?: string | null;
    city?: string | null;
    sourceCode?: string;
    metadata?: Prisma.InputJsonObject;
    firstPurchase?: Date | null;
    lastPurchase?: Date | null;
  }) {
    let current = input.mobile ? await db.customer.findUnique({ where: { mobileNormalized: input.mobile } }) : null;
    if (!current) current = await db.customer.findUnique({ where: { customerKey: input.key } });

    if (!current) {
      current = await db.customer.create({
        data: {
          customerKey: input.key,
          mobileNormalized: input.mobile || null,
          name: input.name || null,
          email: input.email || null,
          province: input.province || null,
          city: input.city || null,
          sourceCode: input.sourceCode || "legacy",
          metadata: (input.metadata || {}) as Prisma.InputJsonValue,
          firstPurchase: input.firstPurchase || null,
          lastPurchase: input.lastPurchase || null,
        },
      });
      customersCreated++;
    } else {
      const metadata = { ...objectMetadata(current.metadata), ...(input.metadata || {}) };
      current = await db.customer.update({
        where: { id: current.id },
        data: {
          mobileNormalized: current.mobileNormalized || input.mobile || null,
          name: current.name || input.name || null,
          email: current.email || input.email || null,
          province: current.province || input.province || null,
          city: current.city || input.city || null,
          sourceCode: current.sourceCode || input.sourceCode || "legacy",
          metadata: metadata as Prisma.InputJsonValue,
          firstPurchase: current.firstPurchase && input.firstPurchase
            ? new Date(Math.min(current.firstPurchase.getTime(), input.firstPurchase.getTime()))
            : current.firstPurchase || input.firstPurchase || null,
          lastPurchase: current.lastPurchase && input.lastPurchase
            ? new Date(Math.max(current.lastPurchase.getTime(), input.lastPurchase.getTime()))
            : current.lastPurchase || input.lastPurchase || null,
        },
      });
      customersMerged++;
    }

    if (current.mobileNormalized) customerByPhone.set(current.mobileNormalized, current.id);
    return current;
  }

  for (const legacyCustomer of wcCustomers) {
    const legacyCustomerId = number(legacyCustomer.customer_id);
    const linkedUserId = number(legacyCustomer.user_id);
    const linkedUser = legacyUserById.get(linkedUserId);
    const linkedMeta = userMeta.get(linkedUserId) || {};
    const customerOrders = (ordersByLegacyCustomer.get(legacyCustomerId) || []).slice().sort((a, b) => {
      return (date(a.date_created_gmt)?.getTime() || 0) - (date(b.date_created_gmt)?.getTime() || 0);
    });

    let mobile = phone(legacyCustomer.username) || phone(linkedMeta.billing_phone) || phone(linkedUser?.user_login);
    if (!mobile) {
      for (const order of customerOrders.slice().reverse()) {
        mobile = phone(billingByOrder.get(number(order.id))?.phone);
        if (mobile) break;
      }
    }

    const latestOrder = customerOrders[customerOrders.length - 1];
    const latestBilling = latestOrder ? billingByOrder.get(number(latestOrder.id)) : undefined;
    const name = fullName(legacyCustomer.first_name, legacyCustomer.last_name)
      || fullName(linkedMeta.first_name || linkedMeta.billing_first_name, linkedMeta.last_name || linkedMeta.billing_last_name)
      || fullName(latestBilling?.first_name, latestBilling?.last_name)
      || null;
    const customerEmail = email(legacyCustomer.email) || email(linkedMeta.billing_email) || email(latestBilling?.email);
    const firstPurchase = customerOrders.length ? date(customerOrders[0].date_created_gmt) : null;
    const lastPurchase = customerOrders.length ? date(customerOrders[customerOrders.length - 1].date_created_gmt) : null;

    const customer = await ensureCustomer({
      key: mobile ? "phone:" + mobile : "legacy-wc:" + legacyCustomerId,
      mobile,
      name,
      email: customerEmail,
      province: text(legacyCustomer.state) || text(latestBilling?.state) || null,
      city: text(legacyCustomer.city) || text(latestBilling?.city) || null,
      sourceCode: "legacy-woocommerce",
      metadata: { legacyWooCustomerId: legacyCustomerId, legacyWordpressUserId: linkedUserId || null },
      firstPurchase,
      lastPurchase,
    });

    legacyCustomerToNew.set(legacyCustomerId, customer.id);
    await db.customerChannel.upsert({
      where: { channel_externalCustomerId: { channel: "woocommerce", externalCustomerId: String(legacyCustomerId) } },
      create: { customerId: customer.id, channel: "woocommerce", externalCustomerId: String(legacyCustomerId) },
      update: { customerId: customer.id },
    });
    if (linkedUserId) {
      await db.customerChannel.upsert({
        where: { channel_externalCustomerId: { channel: "wordpress", externalCustomerId: String(linkedUserId) } },
        create: { customerId: customer.id, channel: "wordpress", externalCustomerId: String(linkedUserId) },
        update: { customerId: customer.id },
      });
    }
  }

  for (const legacyUser of users) {
    const legacyId = number(legacyUser.ID);
    const meta = userMeta.get(legacyId) || {};
    const mobile = phone(meta.billing_phone) || phone(legacyUser.user_login);
    if (!mobile) continue;
    const currentUserId = userIdMap.get(legacyId);
    if (!currentUserId) continue;
    const currentCustomerId = customerByPhone.get(mobile);
    const name = fullName(meta.first_name || meta.billing_first_name, meta.last_name || meta.billing_last_name, text(legacyUser.display_name) || mobile);
    const customer = currentCustomerId
      ? await db.customer.findUnique({ where: { id: currentCustomerId } })
      : await ensureCustomer({
          key: "phone:" + mobile,
          mobile,
          name,
          email: email(meta.billing_email) || email(legacyUser.user_email),
          sourceCode: "legacy-wordpress",
          metadata: { legacyWordpressUserId: legacyId },
        });
    if (customer) {
      await db.customerChannel.upsert({
        where: { channel_externalCustomerId: { channel: "wordpress", externalCustomerId: String(legacyId) } },
        create: { customerId: customer.id, channel: "wordpress", externalCustomerId: String(legacyId) },
        update: { customerId: customer.id },
      });
    }
  }

  const orderCustomerId = new Map<number, string>();
  const orderUserId = new Map<number, string | null>();
  const latestAddressByPhone = new Map<string, { province: string; city: string; address: string; postalCode: string | null; at: number }>();

  let ordersCreated = 0;
  let ordersSkippedExisting = 0;
  let orderItemsCreated = 0;

  for (const legacyOrder of orders) {
    const legacyOrderId = number(legacyOrder.id);
    const code = "LEGACY-WC-" + legacyOrderId;
    const existingOrder = await db.order.findUnique({ where: { code } });
    if (existingOrder) {
      ordersSkippedExisting++;
      orderCustomerId.set(legacyOrderId, existingOrder.customerId || "");
      orderUserId.set(legacyOrderId, existingOrder.userId || null);
      continue;
    }

    const billing = billingByOrder.get(legacyOrderId);
    const legacyCustomerId = number(legacyOrder.customer_id);
    const mobile = phone(billing?.phone);
    const rawPhone = mobile || text(billing?.phone);
    const customerName = fullName(billing?.first_name, billing?.last_name)
      || fullName(wcCustomers.find((row) => number(row.customer_id) === legacyCustomerId)?.first_name, wcCustomers.find((row) => number(row.customer_id) === legacyCustomerId)?.last_name)
      || "مشتری ریشه";
    const orderEmail = email(billing?.email) || email(legacyOrder.billing_email);

    let customerId = legacyCustomerToNew.get(legacyCustomerId) || (mobile ? customerByPhone.get(mobile) : undefined);
    if (!customerId) {
      const guestKey = mobile
        ? "phone:" + mobile
        : orderEmail
          ? "legacy-email:" + orderEmail
          : "legacy-guest:" + createHash("sha1").update([customerName, text(billing?.postcode), text(billing?.address_1)].join("|")).digest("hex").slice(0, 20);
      const guest = await ensureCustomer({
        key: guestKey,
        mobile,
        name: customerName,
        email: orderEmail,
        province: text(billing?.state) || null,
        city: text(billing?.city) || null,
        sourceCode: "legacy-order",
        metadata: { firstLegacyOrderId: legacyOrderId },
        firstPurchase: date(legacyOrder.date_created_gmt),
        lastPurchase: date(legacyOrder.date_created_gmt),
      });
      customerId = guest.id;
    }

    const user = mobile ? userByPhone.get(mobile) : undefined;
    const op = operationalByOrder.get(legacyOrderId);
    const paidAt = date(op?.date_paid_gmt);
    const statusRaw = text(legacyOrder.status);
    const legacyLineItems = lineItemsByOrder.get(legacyOrderId) || [];

    const items = legacyLineItems.map((item) => {
      const meta = itemMeta.get(number(item.order_item_id)) || {};
      const legacyProductId = Number(meta._product_id || 0);
      const product = productByLegacyId.get(legacyProductId);
      const quantity = Math.max(1, Math.round(Number(meta._qty || 1)));
      const lineSubtotal = Math.max(0, Math.round(Number(meta._line_subtotal || 0)));
      const lineTotal = Math.max(0, Math.round(Number(meta._line_total || lineSubtotal)));
      return {
        productId: product?.id || null,
        productName: text(item.order_item_name) || product?.name || "محصول قدیمی ریشه",
        productSlug: product?.slug || "legacy-product-" + legacyProductId,
        unitPrice: quantity > 0 ? Math.round(lineSubtotal / quantity) : lineSubtotal,
        quantity,
        total: lineTotal,
        lineSubtotal,
      };
    });

    const subtotal = items.reduce((sum, item) => sum + item.lineSubtotal, 0);
    const shippingCost = Math.max(0, number(op?.shipping_total_amount));
    const total = Math.max(0, number(legacyOrder.total_amount));
    const statedDiscount = Math.max(0, number(op?.discount_total_amount));
    const computedDiscount = Math.max(0, subtotal + shippingCost - total);
    const discount = Math.max(statedDiscount, computedDiscount);
    const paymentMethod = text(legacyOrder.payment_method);
    const salesChannel = text(op?.created_via) === "rishe-event-app" || paymentMethod.startsWith("rishe_event")
      ? "event"
      : "website";
    const tx = text(legacyOrder.transaction_id) || null;
    const transactionConflict = tx ? await db.order.findFirst({ where: { transactionId: tx }, select: { id: true } }) : null;

    const created = await db.order.create({
      data: {
        code,
        userId: user?.id || null,
        customerId,
        customerName,
        phone: rawPhone,
        email: orderEmail,
        province: text(billing?.state),
        city: text(billing?.city),
        address: [text(billing?.address_1), text(billing?.address_2)].filter(Boolean).join("، "),
        postalCode: text(billing?.postcode) || null,
        notes: text(legacyOrder.customer_note) || "منتقل شده از فروشگاه قبلی ریشه",
        salesChannel,
        status: orderStatus(statusRaw),
        paymentStatus: paymentStatus(statusRaw, paidAt),
        subtotal,
        discount,
        shippingCost,
        total,
        paymentProvider: paymentMethod || null,
        transactionId: transactionConflict ? null : tx,
        paymentRef: transactionConflict && tx ? tx : null,
        createdAt: date(legacyOrder.date_created_gmt) || new Date(),
        items: {
          create: items.map(({ lineSubtotal, ...item }) => item),
        },
      },
    });

    ordersCreated++;
    orderItemsCreated += items.length;
    orderCustomerId.set(legacyOrderId, customerId);
    orderUserId.set(legacyOrderId, user?.id || null);

    const createdAt = date(legacyOrder.date_created_gmt);
    const currentCustomer = await db.customer.findUnique({ where: { id: customerId } });
    if (currentCustomer && createdAt) {
      await db.customer.update({
        where: { id: customerId },
        data: {
          firstPurchase: currentCustomer.firstPurchase
            ? new Date(Math.min(currentCustomer.firstPurchase.getTime(), createdAt.getTime()))
            : createdAt,
          lastPurchase: currentCustomer.lastPurchase
            ? new Date(Math.max(currentCustomer.lastPurchase.getTime(), createdAt.getTime()))
            : createdAt,
        },
      });
    }

    if (mobile && user?.id && text(billing?.address_1)) {
      const candidate = {
        province: text(billing?.state),
        city: text(billing?.city),
        address: [text(billing?.address_1), text(billing?.address_2)].filter(Boolean).join("، "),
        postalCode: text(billing?.postcode) || null,
        at: createdAt?.getTime() || 0,
      };
      const previous = latestAddressByPhone.get(mobile);
      if (!previous || candidate.at > previous.at) latestAddressByPhone.set(mobile, candidate);
    }

    await db.orderHistory.create({
      data: {
        orderId: created.id,
        fromState: null,
        toState: orderStatus(statusRaw),
        reason: "وضعیت منتقل شده از WooCommerce",
        createdAt: date(legacyOrder.date_updated_gmt) || date(legacyOrder.date_created_gmt) || new Date(),
      },
    }).catch(() => undefined);
  }

  let addressesCreated = 0;
  for (const [mobile, address] of latestAddressByPhone) {
    const user = userByPhone.get(mobile);
    if (!user || !address.address) continue;
    const exists = await db.address.findFirst({
      where: { userId: user.id, address: address.address, postalCode: address.postalCode },
      select: { id: true },
    });
    if (!exists) {
      await db.address.create({
        data: {
          userId: user.id,
          title: "آدرس منتقل شده",
          province: address.province,
          city: address.city,
          address: address.address,
          postalCode: address.postalCode,
        },
      });
      addressesCreated++;
    }
  }

  const eventIdMap = new Map<number, string>();
  let eventsCreated = 0;
  for (const legacyEvent of legacyEvents) {
    const publicId = text(legacyEvent.public_id) || "legacy-event-" + number(legacyEvent.id);
    const existing = await db.eventSaleEvent.findUnique({ where: { publicId } });
    const event = existing || await db.eventSaleEvent.create({
      data: {
        publicId,
        name: text(legacyEvent.name) || "ایونت ریشه",
        status: text(legacyEvent.status) || "closed",
        startsAt: date(legacyEvent.starts_at),
        endsAt: date(legacyEvent.ends_at),
        location: text(legacyEvent.location) || null,
        metadata: { legacyEventId: number(legacyEvent.id) },
      },
    });
    if (!existing) eventsCreated++;
    eventIdMap.set(number(legacyEvent.id), event.id);
  }

  const eventLinesBySale = new Map<number, SqlRow[]>();
  for (const row of legacyEventLines) {
    const saleId = number(row.event_sale_id);
    if (!eventLinesBySale.has(saleId)) eventLinesBySale.set(saleId, []);
    eventLinesBySale.get(saleId)!.push(row);
  }

  let eventSalesCreated = 0;
  let eventSalesSkippedTest = 0;
  let eventLinesCreated = 0;

  for (const legacySale of legacyEventSales) {
    const legacySaleId = number(legacySale.id);
    if (!legacySale.wc_order_id && text(legacySale.customer_name) === "تست") {
      eventSalesSkippedTest++;
      continue;
    }

    const publicId = text(legacySale.public_id) || "legacy-event-sale-" + legacySaleId;
    if (await db.eventSale.findUnique({ where: { publicId } })) continue;

    const eventId = eventIdMap.get(number(legacySale.event_id));
    if (!eventId) continue;

    const mobile = phone(legacySale.customer_mobile);
    const linkedOrderId = number(legacySale.wc_order_id);
    const customerId = linkedOrderId
      ? orderCustomerId.get(linkedOrderId) || null
      : mobile
        ? customerByPhone.get(mobile) || null
        : null;
    const sellerUserId = userIdMap.get(number(legacySale.seller_user_id)) || null;

    const sale = await db.eventSale.create({
      data: {
        publicId,
        clientUuid: text(legacySale.client_uuid) || publicId,
        eventId,
        sellerUserId,
        customerId,
        customerName: text(legacySale.customer_name) || null,
        mobile,
        status: text(legacySale.status) || "synced",
        paymentType: text(legacySale.payment_method) || null,
        subtotal: Math.round(number(legacySale.subtotal_irr) / 10),
        discount: Math.round(number(legacySale.discount_irr) / 10),
        total: Math.round(number(legacySale.total_irr) / 10),
        occurredAt: date(legacySale.occurred_at) || new Date(),
        syncedAt: date(legacySale.synced_at) || date(legacySale.updated_at) || new Date(),
        metadata: {
          legacyEventSaleId: legacySaleId,
          legacyWooOrderId: linkedOrderId || null,
          legacyRisheOrderId: number(legacySale.rishe_order_id) || null,
          paidToman: Math.round(number(legacySale.paid_irr) / 10),
          cogsToman: Math.round(number(legacySale.cogs_irr) / 10),
          accountingStatus: text(legacySale.accounting_status) || null,
          errorMessage: text(legacySale.error_message) || null,
        },
      },
    });
    eventSalesCreated++;

    const grouped = new Map<string, { productId: string; quantity: number; unitPrice: number; total: number }>();
    for (const line of eventLinesBySale.get(legacySaleId) || []) {
      const product = productByLegacyId.get(number(line.wc_product_id));
      if (!product) continue;
      const quantity = Math.max(1, Math.round(number(line.quantity_scaled) / 10000));
      const unitPrice = Math.round(number(line.unit_price_irr) / 10);
      const total = Math.round(number(line.line_total_irr) / 10);
      const current = grouped.get(product.id);
      if (current) {
        current.quantity += quantity;
        current.total += total;
      } else {
        grouped.set(product.id, { productId: product.id, quantity, unitPrice, total });
      }
    }

    if (grouped.size) {
      await db.eventSaleLine.createMany({
        data: Array.from(grouped.values()).map((line) => ({ eventSaleId: sale.id, ...line })),
        skipDuplicates: true,
      });
      eventLinesCreated += grouped.size;
    }
  }

  const summary = {
    usersInDump: users.length,
    usersCreated,
    usersMerged,
    usersSkippedNoPhone,
    customersInDump: wcCustomers.length,
    customersCreated,
    customersMerged,
    ordersInDump: orders.length,
    ordersCreated,
    ordersSkippedExisting,
    orderItemsCreated,
    addressesCreated,
    eventsCreated,
    eventSalesInDump: legacyEventSales.length,
    eventSalesCreated,
    eventSalesSkippedTest,
    eventLinesCreated,
    importedAt: new Date().toISOString(),
  };

  await db.setting.upsert({
    where: { key: "legacyCommerceImportSummary" },
    create: { key: "legacyCommerceImportSummary", value: JSON.stringify(summary) },
    update: { value: JSON.stringify(summary) },
  });

  return summary;
}
