import OnboardingPageClient from "@/components/onboarding/OnboardingPageClient";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/Financeiro/painel");
  }

  return <OnboardingPageClient />;
}
