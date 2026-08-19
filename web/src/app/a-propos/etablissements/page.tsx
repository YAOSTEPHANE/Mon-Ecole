import type { Metadata } from "next";
import AProposEtablissements from "@/views/AProposEtablissements";

export const metadata: Metadata = {
  title: "Nos établissements",
  description:
    "Découvrez les cycles et filières : maternelle, primaire, enseignement général, technique et supérieur.",
};

export default function AProposEtablissementsPage() {
  return <AProposEtablissements />;
}
