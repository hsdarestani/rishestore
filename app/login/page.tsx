import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthExperience } from "@/components/AuthForms";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.role === "ADMIN" ? "/admin" : "/account");

  return <div className="auth-page container">
    <AuthExperience />
  </div>;
}
