import type { Metadata } from "next";
import AProposPersonnel from "@/views/AProposPersonnel";

export const metadata: Metadata = {
  title: "Le personnel",
  description:
    "L’équipe pédagogique, éducative et administrative au service de la réussite des élèves.",
};

export default function AProposPersonnelPage() {
  return <AProposPersonnel />;
}
