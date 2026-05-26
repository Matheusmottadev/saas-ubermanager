import { redirect } from "next/navigation";

import LoginForm from "./LoginForm";
import { DEMO_USER_EMAIL, DEMO_USER_PASSWORD, getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function FinanceiroPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/Financeiro/painel");
  }

  return <LoginForm demoEmail={DEMO_USER_EMAIL} demoPassword={DEMO_USER_PASSWORD} />;
}
