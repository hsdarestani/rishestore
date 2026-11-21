import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizePhone, validIranPhone } from "@/lib/money";

type Contact = {
  name: string | null;
  phone?: string | null;
  email?: string | null;
  city?: string | null;
};

function csvCell(value: string) {
  const safeText = /^[\t\r\n]|^\s*[=+@-]/u.test(value) ? "'" + value : value;
  return '"' + safeText.replaceAll('"', '""') + '"';
}

export async function GET() {
  if (!(await requireAdmin())) {
    return new Response(null, { status: 403 });
  }

  const [customers, users, orders, manualSales, eventSales] = await db.$transaction([
    db.customer.findMany({
      select: { id: true, mobileNormalized: true, name: true, email: true, city: true, sourceCode: true },
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    }),
    db.user.findMany({
      where: { role: "CUSTOMER" },
      select: { id: true, name: true, phone: true, email: true },
    }),
    db.order.findMany({
      select: { id: true, customerId: true, customerName: true, phone: true, email: true, city: true },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    }),
    db.manualSale.findMany({
      where: { OR: [{ phone: { not: null } }, { customerName: { not: null } }] },
      select: { id: true, phone: true, customerName: true },
    }),
    db.eventSale.findMany({
      where: { OR: [{ mobile: { not: null } }, { customerId: { not: null } }, { customerName: { not: null } }] },
      select: { id: true, customerId: true, customerName: true, mobile: true },
    }),
  ], { isolationLevel: "RepeatableRead" });

  const rows = new Map<string, { name: string; phone: string; email: string; city: string; sources: Set<string> }>();
  const crmKeys = new Map<string, string>();

  function add(contact: Contact, source: string, fallback: string, linkedKey?: string) {
    const phone = contact.phone?.trim() ?? "";
    if (!linkedKey && !phone && !contact.name?.trim() && !contact.email?.trim()) return;
    const mobile = validIranPhone(phone) ? normalizePhone(phone) : "";
    const key = mobile ? "mobile:" + mobile : linkedKey ?? fallback;
    const row = rows.get(key) ?? { name: "", phone: "", email: "", city: "", sources: new Set<string>() };
    row.name ||= contact.name?.trim() ?? "";
    row.phone ||= mobile || phone;
    row.email ||= contact.email?.trim() ?? "";
    row.city ||= contact.city?.trim() ?? "";
    row.sources.add(source);
    rows.set(key, row);
    return key;
  }

  for (const customer of customers) {
    const key = add({ ...customer, phone: customer.mobileNormalized }, customer.sourceCode || "CRM", "crm:" + customer.id);
    if (key) crmKeys.set(customer.id, key);
  }
  for (const user of users) add(user, "حساب مشتری", "user:" + user.id);
  for (const order of orders) {
    add({ ...order, name: order.customerName }, "سفارش", "order:" + order.id, crmKeys.get(order.customerId ?? ""));
  }
  for (const sale of manualSales) {
    add({ ...sale, name: sale.customerName }, "فروش دستی", "manual:" + sale.id);
  }
  for (const sale of eventSales) {
    add({ name: sale.customerName, phone: sale.mobile }, "ایونت", "event:" + sale.id, crmKeys.get(sale.customerId ?? ""));
  }

  const lines = [["نام", "موبایل", "ایمیل", "شهر", "منابع", "رضایت پیام‌رسانی"],
    ...Array.from(rows.values(), row => [
      row.name, row.phone, row.email, row.city, [...row.sources].join(" | "), "نامشخص",
    ]),
  ];
  return new Response("\uFEFF" + lines.map(line => line.map(csvCell).join(",")).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="rishe-customers.csv"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
