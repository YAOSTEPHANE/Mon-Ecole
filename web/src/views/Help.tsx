import Link from 'next/link';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import UltraPremiumPageShell from '../components/public/UltraPremiumPageShell';
import {
  FiHelpCircle,
  FiBook,
  FiVideo,
  FiMessageSquare,
  FiMail,
  FiFileText,
  FiSearch,
} from 'react-icons/fi';

const searchClass =
  'w-full rounded-xl border border-stone-200/90 bg-white/95 py-4 pl-14 pr-4 text-lg text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40';

const Help = () => {
  const helpCategories = [
    {
      title: 'Guides rapides',
      icon: FiBook,
      gradient: 'from-amber-700 to-amber-900',
      ring: 'ring-amber-500/25',
      items: [
        'Créer votre premier compte',
        'Configurer votre établissement',
        'Ajouter des utilisateurs',
        'Importer des données',
      ],
    },
    {
      title: 'Tutoriels vidéo',
      icon: FiVideo,
      gradient: 'from-emerald-600 to-teal-800',
      ring: 'ring-emerald-500/25',
      items: [
        'Présentation générale',
        'Gestion des élèves',
        'Saisie des notes',
        'Génération de bulletins',
      ],
    },
    {
      title: 'Résolution de problèmes',
      icon: FiHelpCircle,
      gradient: 'from-stone-600 to-stone-800',
      ring: 'ring-stone-500/20',
      items: [
        'Problèmes de connexion',
        'Erreurs courantes',
        'Récupération de mot de passe',
        'Problèmes techniques',
      ],
    },
  ];

  return (
    <UltraPremiumPageShell
      navLabel="Ressources"
      title="Centre d'aide"
      description="Tout ce qu'il faut pour prendre en main École à jour, au même endroit."
    >
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="-mt-10 mb-12">
          <Card variant="premium" className="!p-5 sm:!p-6 shadow-lg ring-1 ring-stone-200/80">
            <div className="relative">
              <label htmlFor="help-search" className="sr-only">
                Rechercher dans l'aide
              </label>
              <FiSearch
                className="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-stone-400 sm:left-5"
                aria-hidden
              />
              <input
                id="help-search"
                type="search"
                placeholder="Rechercher dans l'aide…"
                className={searchClass}
              />
            </div>
          </Card>
        </div>

        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {helpCategories.map((category, index) => {
            const Icon = category.icon;
            return (
              <Card key={index} variant="premium" className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-premium">
                <div
                  className={`mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br ${category.gradient} shadow-lg ring-2 ${category.ring}`}
                >
                  <Icon className="h-8 w-8 text-white" aria-hidden />
                </div>
                <h3 className="mb-4 text-xl font-bold text-stone-900">{category.title}</h3>
                <ul className="space-y-2">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="flex items-center text-sm text-stone-600">
                      <span className="mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600/90" aria-hidden />
                      {item}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>

        <div className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card
            variant="premium"
            className="border border-amber-200/70 bg-gradient-to-br from-amber-50/90 to-white !p-8 ring-1 ring-amber-900/5"
          >
            <div className="py-2 text-center">
              <FiMessageSquare className="mx-auto mb-4 h-12 w-12 text-amber-800" aria-hidden />
              <h3 className="mb-2 text-xl font-bold text-stone-900">FAQ</h3>
              <p className="mb-4 text-stone-600">Consultez les questions fréquemment posées.</p>
              <Link href="/faq">
                <Button>Voir la FAQ</Button>
              </Link>
            </div>
          </Card>

          <Card
            variant="premium"
            className="border border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 to-white !p-8 ring-1 ring-emerald-900/5"
          >
            <div className="py-2 text-center">
              <FiMail className="mx-auto mb-4 h-12 w-12 text-emerald-800" aria-hidden />
              <h3 className="mb-2 text-xl font-bold text-stone-900">Contact</h3>
              <p className="mb-4 text-stone-600">Écrivez-nous pour un accompagnement personnalisé.</p>
              <Link href="/contact">
                <Button className="bg-emerald-800 hover:bg-emerald-900">Nous contacter</Button>
              </Link>
            </div>
          </Card>
        </div>

        <Card
          variant="premium"
          className="border border-stone-200/90 bg-gradient-to-br from-stone-100/80 via-white to-amber-50/40 !p-8 ring-1 ring-stone-900/5"
        >
          <div className="py-2 text-center">
            <FiFileText className="mx-auto mb-4 h-12 w-12 text-stone-800" aria-hidden />
            <h3 className="mb-2 text-2xl font-bold text-stone-900">Documentation complète</h3>
            <p className="mb-6 text-stone-600">
              Guides détaillés, parcours par rôle et références techniques.
            </p>
            <Link href="/documentation">
              <Button variant="secondary" className="inline-flex items-center gap-2">
                <FiBook className="h-4 w-4" aria-hidden />
                Accéder à la documentation
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </UltraPremiumPageShell>
  );
};

export default Help;
