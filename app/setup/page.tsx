import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import SetupForm from "@/components/SetupForm";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const admins = await db.user.count({ where: { role: "ADMIN" } });
  if (admins > 0) redirect("/admin");
  return <div className="page-shell narrow container"><SetupForm /></div>;
}
