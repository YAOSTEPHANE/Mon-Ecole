import type { Metadata } from "next";
import Home from "@/views/Home";
import { buildHomePageMetadata } from "@/lib/homeMetadata";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildHomePageMetadata();
}

export default function Page() {
  return <Home />;
}
