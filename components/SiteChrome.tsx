"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function SiteChrome({
  children,
  storeName,
  phone,
  instagram,
  bale,
}: {
  children: React.ReactNode;
  storeName: string;
  phone?: string;
  instagram?: string;
  bale?: string;
}) {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  if (isAdmin) return <>{children}</>;

  return <>
    <Header storeName={storeName} />
    <main>{children}</main>
    <Footer phone={phone} instagram={instagram} bale={bale} />
  </>;
}
