"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SupportChat from "@/components/SupportChat";
import CartDock from "@/components/CartDock";

export default function SiteChrome({
  children,
  storeName,
  phone,
  instagram,
  bale,
  whatsapp,
  warehouseAddress,
  storeAddress,
}: {
  children: React.ReactNode;
  storeName: string;
  phone?: string;
  instagram?: string;
  bale?: string;
  whatsapp?: string;
  warehouseAddress?: string;
  storeAddress?: string;
}) {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const isPos = pathname === "/pos" || pathname.startsWith("/pos/");
  if (isAdmin || isPos) return <>{children}</>;

  return <>
    <Header storeName={storeName} />
    <main>{children}</main>
    <Footer phone={phone} instagram={instagram} bale={bale} whatsapp={whatsapp} warehouseAddress={warehouseAddress} storeAddress={storeAddress} />
    <CartDock />
    <SupportChat phone={phone} whatsapp={whatsapp} bale={bale} />
  </>;
}
