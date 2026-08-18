'use client';

import Image from 'next/image';
import UltraPremiumPageShell from '../components/public/UltraPremiumPageShell';
import HomeReveal from '../components/public/HomeReveal';
import { FiCamera } from 'react-icons/fi';

type GalleryItem = {
  src: string;
  alt: string;
  label: string;
  span?: string;
};

const GALLERY: GalleryItem[] = [
  {
    src: '/home/gallery-assembly.jpg',
    alt: 'Rassemblement des élèves dans la cour',
    label: 'Vie collective',
    span: 'md:col-span-2 md:row-span-2',
  },
  {
    src: '/home/gallery-lab.jpg',
    alt: 'Travaux pratiques en laboratoire',
    label: 'Sciences',
  },
  {
    src: '/home/gallery-library.jpg',
    alt: 'Lecture et recherche en bibliothèque',
    label: 'Bibliothèque',
  },
  {
    src: '/home/gallery-sport.jpg',
    alt: 'Activité sportive sur le terrain de l’école',
    label: 'Sport',
    span: 'md:col-span-2',
  },
];

export default function Galerie() {
  return (
    <UltraPremiumPageShell
      navLabel="Galerie"
      title="Galerie photos"
      description="Classes, laboratoire, bibliothèque, sport et moments de vie : découvrez le quotidien de l’établissement."
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
        <HomeReveal>
          <div className="mb-10 text-center">
            <span className="home-eyebrow mx-auto inline-flex items-center gap-2 rounded-full border border-tran-mustard-200/80 bg-tran-mustard-50 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-tran-mustard-950">
              <FiCamera className="h-4 w-4" aria-hidden />
              La vie à l’école
            </span>
            <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl lg:text-5xl">
              Un campus, des visages, une communauté
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-stone-600">
              Une vitrine visuelle pour rassurer et donner envie : l’ambiance, l’encadrement et la vie scolaire au quotidien.
            </p>
          </div>

          <div className="grid auto-rows-[12rem] gap-4 sm:auto-rows-[14rem] md:grid-cols-4 md:auto-rows-[11rem]">
            {GALLERY.map(({ src, alt, label, span }, idx) => (
              <HomeReveal key={src} delayMs={idx * 60} className={span}>
                <figure className="group relative h-full min-h-[12rem] overflow-hidden rounded-[1.75rem] border border-stone-200/80 bg-stone-100 shadow-[0_20px_44px_-24px_rgba(28,39,76,0.28)]">
                  <Image
                    src={src}
                    alt={alt}
                    fill
                    className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 25vw"
                    priority={idx === 0}
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-950/80 via-stone-950/25 to-transparent px-5 pb-4 pt-12">
                    <p className="text-sm font-semibold text-white">{label}</p>
                  </figcaption>
                </figure>
              </HomeReveal>
            ))}
          </div>

          <div className="mt-10 rounded-[1.5rem] border border-stone-200/90 bg-white p-6 shadow-[0_12px_32px_-20px_rgba(28,39,76,0.22)] sm:p-8">
            <h2 className="font-display text-xl font-semibold text-stone-900">Vous voulez en savoir plus ?</h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Passez par la page <a href="/contact" className="font-semibold text-tran-mustard-800 hover:underline underline-offset-2">Contact</a> ou commencez la pré-inscription.
            </p>
          </div>
        </HomeReveal>
      </div>
    </UltraPremiumPageShell>
  );
}

