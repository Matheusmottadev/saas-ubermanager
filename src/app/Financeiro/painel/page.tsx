import { Bricolage_Grotesque, Sora, Space_Grotesk, Syne } from "next/font/google";
import { redirect } from "next/navigation";

import FinanceiroDashboardClient from "./FinanceiroDashboardClient";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--panel-font-syne",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--panel-font-sora",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--panel-font-space",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--panel-font-bricolage",
});

export default async function FinanceiroPainelPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/Financeiro");
  }

  return (
    <div
      className={`${syne.variable} ${sora.variable} ${spaceGrotesk.variable} ${bricolage.variable}`}
    >
      <FinanceiroDashboardClient />
    </div>
  );
}
