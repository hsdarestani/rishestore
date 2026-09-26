import type { Metadata } from "next";
import "@/app/globals.css";
import { CartProvider } from "@/components/CartProvider";
import SiteChrome from "@/components/SiteChrome";
import { getStoreConfig } from "@/lib/settings";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://new.rishe.store";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "ریشه | فروشگاه محصولات ایرانی", template: "%s | ریشه" },
  description: "فروشگاه ریشه؛ محصولات ایرانی با اطلاعات روشن درباره وزن، قیمت، کاربرد، کیفیت و مسیر خرید ساده.",
  openGraph: { type: "website", locale: "fa_IR", siteName: "ریشه", url: siteUrl },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  let config = { storeName: "ریشه", storePhone: "", instagramUrl: "" };
  try { config = await getStoreConfig(); } catch {}

  return (
    <html lang="fa" dir="rtl">
      <body>
        <CartProvider>
          <SiteChrome storeName={config.storeName} phone={config.storePhone} instagram={config.instagramUrl}>
            {children}
          </SiteChrome>
        </CartProvider>
      </body>
    </html>
  );
}
