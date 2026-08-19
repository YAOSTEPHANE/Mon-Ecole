import type { Metadata } from "next";
import APropos from "@/views/APropos";

export const metadata: Metadata = {
  title: "À propos de nous",
  description:
    "Découvrez Mon Ecole : identité, atouts, plateforme, personnel, établissements et règlement intérieur.",
};

export default function AProposPage() {
  return <APropos />;
}
