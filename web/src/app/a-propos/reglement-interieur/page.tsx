import type { Metadata } from "next";
import AProposReglement from "@/views/AProposReglement";

export const metadata: Metadata = {
  title: "Règlement intérieur",
  description:
    "Le règlement intérieur de l’établissement : fonctionnement, discipline et vie de la communauté éducative.",
};

export default function AProposReglementPage() {
  return <AProposReglement />;
}
