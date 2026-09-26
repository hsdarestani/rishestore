import { db } from "@/lib/db";
import { getPosSession } from "@/lib/pos-auth";
import PosClient from "@/components/PosClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "فروش ایونت | ریشه" };

export default async function PosPage() {
  const session = await getPosSession();
  if (!session) return <PosClient authorized={false} />;

  const event = await db.eventSaleEvent.findUnique({ where: { id: session.eventId } });
  if (!event || event.status !== "active") return <PosClient authorized={false} message="ایونت این دستگاه فعال نیست." />;

  const [products, prices] = await Promise.all([
    db.product.findMany({ where: { active: true, kind: "PRODUCT" }, orderBy: [{ legacyProductId: "asc" }, { name: "asc" }] }),
    db.channelPrice.findMany({
      where: { channel: "event", active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }] },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  const priceMap = new Map<string, number>();
  for (const row of prices) if (!priceMap.has(row.productId)) priceMap.set(row.productId, row.price);

  const payload = products.map((p) => ({
    id: p.id,
    name: p.name,
    price: priceMap.get(p.id) ?? p.price,
    stock: p.stock,
    image: p.image,
    weightGrams: p.weightGrams,
  }));

  return <PosClient authorized event={{ id: event.id, name: event.name, location: event.location }} products={payload} deviceName={session.deviceName || "دستگاه فروش"} />;
}
