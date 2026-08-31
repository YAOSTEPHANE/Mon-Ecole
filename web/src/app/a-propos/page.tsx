import type { Metadata } from 'next';
import APropos from '@/views/APropos';
import { buildAboutPageMetadata } from '@/lib/homeMetadata';

export async function generateMetadata(): Promise<Metadata> {
  return buildAboutPageMetadata();
}

export default function AProposPage() {
  return <APropos />;
}
