import { redirect } from "next/navigation";
import { requireAdmin, STAFF_CAPABILITIES } from "@/lib/auth";
import { db } from "@/lib/db";
import TeamManager from "@/components/TeamManager";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/login");

  const staff = await db.user.findMany({
    where: { role: "STAFF" },
    select: { id: true, name: true, phone: true, email: true, permissions: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: "desc" },
  });

  return <div className="admin-page"><TeamManager staff={JSON.parse(JSON.stringify(staff))} capabilities={[...STAFF_CAPABILITIES]} /></div>;
}
