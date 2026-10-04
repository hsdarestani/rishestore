import type { Metadata } from "next";
import "@/app/globals.css";
import { CartProvider } from "@/components/CartProvider";
import SiteChrome from "@/components/SiteChrome";
import MotionController from "@/components/MotionController";
import { getStoreConfig } from "@/lib/settings";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://rishe.store";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(siteUrl),
  title: { default: "ریشه | روایت اصالت، مستقیم از مزرعه پدری", template: "%s | ریشه" },
  description: "فروشگاه ریشه؛ محصولات دست‌چین ایرانی با تست پخت، قیمت و موجودی شفاف و روایت تامین هر محصول.",
  openGraph: { type: "website", locale: "fa_IR", siteName: "ریشه", url: siteUrl },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let config = {
    storeName: "ریشه",
    storePhone: "09910938033",
    instagramUrl: "",
    baleUrl: "https://ble.ir/rishe_support",
    whatsappUrl: "https://wa.me/989910938033",
    warehouseAddress: "کرج، محمدشهر، بلوار دشت بهشت",
    storeAddress: "",
    shippingFlatRate: 0,
    freeShippingThreshold: 0,
    paymentProvider: "zibal",
    paymentReady: false,
  };
  try { config = await getStoreConfig(); } catch {}

  return (
    <html lang="fa" dir="rtl">
      <body>
        <CartProvider>
          <MotionController />
          <SiteChrome
            storeName={config.storeName}
            phone={config.storePhone}
            instagram={config.instagramUrl}
            bale={config.baleUrl}
            whatsapp={config.whatsappUrl}
            warehouseAddress={config.warehouseAddress}
            storeAddress={config.storeAddress}
          >
            {children}
          </SiteChrome>
        </CartProvider>
      </body>
    </html>
  );
}
