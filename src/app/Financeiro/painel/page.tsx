import { Bricolage_Grotesque, Sora, Space_Grotesk, Syne } from "next/font/google";

import FinanceiroDashboardClient from "./FinanceiroDashboardClient";

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

export default function FinanceiroPainelPage() {
  return (
    <div
      className={`${syne.variable} ${sora.variable} ${spaceGrotesk.variable} ${bricolage.variable}`}
    >
      <FinanceiroDashboardClient />
    </div>
  );
}
