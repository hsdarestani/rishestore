import CheckoutForm from "@/components/CheckoutForm";
import { getCurrentUser } from "@/lib/auth";
import { getStoreConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [user, config] = await Promise.all([getCurrentUser(), getStoreConfig()]);
  return <div className="page-shell container"><CheckoutForm user={user ? { name: user.name, phone: user.phone, email: user.email } : null} config={{ shippingFlatRate: config.shippingFlatRate, freeShippingThreshold: config.freeShippingThreshold, paymentReady: config.paymentReady }} /></div>;
}
