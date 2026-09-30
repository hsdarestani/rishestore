import CheckoutForm from "@/components/CheckoutForm";
import { getCurrentUser } from "@/lib/auth";
import { getStoreConfig } from "@/lib/settings";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [user, config] = await Promise.all([getCurrentUser(), getStoreConfig()]);
  const addresses = user
    ? await db.address.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: {
          id: true,
          title: true,
          province: true,
          city: true,
          address: true,
          postalCode: true,
        },
      })
    : [];

  return <div className="page-shell container">
    <CheckoutForm
      user={user ? { name: user.name, phone: user.phone, email: user.email } : null}
      addresses={addresses}
      config={{
        shippingFlatRate: config.shippingFlatRate,
        freeShippingThreshold: config.freeShippingThreshold,
        paymentReady: config.paymentReady,
      }}
    />
  </div>;
}
