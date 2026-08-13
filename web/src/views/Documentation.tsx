import Link from 'next/link';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import UltraPremiumPageShell from '../components/public/UltraPremiumPageShell';
import {
  FiBook,
  FiFileText,
  FiSearch,
  FiCode,
  FiSettings,
  FiUsers,
  FiBarChart,
  FiShield,
} from 'react-icons/fi';

const Documentation = () => {
  const sections = [
    {
      title: 'Guide de démarrage',
      icon: FiBook,
      gradient: 'from-amber-700 to-amber-950',
      ring: 'ring-amber-500/30',
      items: [
        { title: 'Installation', link: '/docs/installation' },
        { title: 'Configuration initiale', link: '/docs/setup' },
        { title: 'Premiers pas', link: '/docs/getting-started' },
        { title: 'Architecture', link: '/docs/architecture' },
      ],
    },
    {
      title: 'Guides utilisateur',
      icon: FiUsers,
      gradient: 'from-emerald-600 to-teal-900',
      ring: 'ring-emerald-500/25',
      items: [
        { title: 'Guide administrateur', link: '/docs/admin' },
        { title: 'Guide enseignant', link: '/docs/teacher' },
        { title: 'Guide élève', link: '/docs/student' },
        { title: 'Guide parent', link: '/docs/parent' },
      ],
    },
    {
      title: 'API & développement',
      icon: FiCode,
      gradient: 'from-stone-600 to-stone-900',
      ring: 'ring-stone-500/25',
      items: [
        { title: 'Documentation API', link: '/docs/api' },
        { title: 'Authentification', link: '/docs/auth' },
        { title: 'Endpoints', link: '/docs/endpoints' },
        { title: 'Exemples de code', link: '/docs/examples' },
      ],
    },
    {
      title: 'Fonctionnalités',
      icon: FiBarChart,
      gradient: 'from-amber-600 to-orange-900',
      ring: 'ring-orange-500/20',
      items: [
        { title: 'Gestion administrative', link: '/docs/features/admin' },
        { title: 'Gestion pédagogique', link: '/docs/features/pedagogy' },
        { title: 'Communication', link: '/docs/features/communication' },
        { title: 'Rapports et analytics', link: '/docs/features/analytics' },
      ],
    },
    {
      title: 'Sécurité',
      icon: FiShield,
      gradient: 'from-rose-700 to-stone-900',
      ring: 'ring-rose-500/20',
      items: [
        { title: 'Politique de sécurité', link: '/docs/security/policy' },
        { title: 'Bonnes pratiques', link: '/docs/security/best-practices' },
        { title: 'RGPD', link: '/docs/security/gdpr' },
        { title: 'Audit', link: '/docs/security/audit' },
      ],
    },
    {
      title: 'Ressources',
      icon: FiFileText,
      gradient: 'from-cptb-blue to-[#07081a]',
      ring: 'ring-cptb-gold/25',
      items: [
        { title: 'Tutoriels vidéo', link: '/docs/videos' },
        { title: 'FAQ technique', link: '/docs/faq' },
        { title: 'Changelog', link: '/docs/changelog' },
        { title: 'Support', link: '/contact' },
      ],
    },
  ];

  return (
    <UltraPremiumPageShell
      navLabel="Ressources"
      title="Documentation"
      description="Guides, parcours par rôle et références pour exploiter School Manager à fond."
    >
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="-mt-10 mb-12">
          <Card variant="premium" className="!p-5 sm:!p-6 shadow-lg ring-1 ring-stone-200/80">
            <div className="relative">
              <label htmlFor="doc-search" className="sr-only">
                Rechercher dans la documentation
              </label>
              <FiSearch
                className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
                aria-hidden
              />
              <input
                id="doc-search"
                type="search"
                placeholder="Rechercher un sujet…"
                className="w-full rounded-xl border border-stone-200/90 bg-white/95 py-3 pl-12 pr-4 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              />
            </div>
          </Card>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <Card
                key={index}
                variant="premium"
                className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-premium"
              >
                <div
                  className={`mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br ${section.gradient} shadow-lg ring-2 ${section.ring}`}
                >
                  <Icon className="h-8 w-8 text-white" aria-hidden />
                </div>
                <h3 className="mb-4 text-xl font-bold text-stone-900">{section.title}</h3>
                <ul className="space-y-2">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex}>
                      <Link
                        href={item.link}
                        className="flex items-center text-sm text-stone-600 transition-colors hover:text-amber-900"
                      >
                        <FiFileText className="mr-2 h-4 w-4 shrink-0 text-amber-800/80" aria-hidden />
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>

        <Card
          variant="premium"
          className="border border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-white to-stone-50/80 !p-8 ring-1 ring-amber-900/5"
        >
          <div className="py-2 text-center">
            <FiSettings className="mx-auto mb-4 h-12 w-12 text-amber-900" aria-hidden />
            <h3 className="mb-4 text-2xl font-bold text-stone-900">Besoin d&apos;aide ?</h3>
            <p className="mb-6 text-stone-600">Notre équipe vous accompagne sur la plateforme et l&apos;intégration.</p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/contact">
                <Button className="inline-flex items-center gap-2">
                  <FiFileText className="h-4 w-4" aria-hidden />
                  Nous contacter
                </Button>
              </Link>
              <Link href="/faq">
                <Button variant="outline" className="border-stone-300 text-stone-900 hover:bg-amber-50/50">
                  <FiSearch className="h-4 w-4" aria-hidden />
                  Consulter la FAQ
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </UltraPremiumPageShell>
  );
};

export default Documentation;
