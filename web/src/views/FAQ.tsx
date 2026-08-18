import { useState } from 'react';
import Link from 'next/link';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import UltraPremiumPageShell from '../components/public/UltraPremiumPageShell';
import {
  FiHelpCircle,
  FiChevronDown,
  FiChevronUp,
  FiSearch,
  FiMail,
  FiMessageSquare,
} from 'react-icons/fi';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
}

const fieldSearchClass =
  'w-full rounded-xl border border-stone-200/90 bg-white/95 py-3 pl-12 pr-4 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/40';

const FAQ = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<number[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const faqItems: FAQItem[] = [
    {
      id: 1,
      question: 'Comment créer un compte administrateur ?',
      answer:
        'Pour créer un compte administrateur, vous devez contacter le support technique. Les comptes administrateurs sont créés manuellement pour des raisons de sécurité. Envoyez une demande à contact@schoolmanager.com avec vos informations.',
      category: 'compte',
    },
    {
      id: 2,
      question: 'Comment réinitialiser mon mot de passe ?',
      answer:
        'Cliquez sur « Mot de passe oublié » sur la page de connexion. Vous recevrez un e-mail avec un lien pour réinitialiser votre mot de passe. Si vous ne recevez pas l’e-mail, vérifiez votre dossier spam.',
      category: 'compte',
    },
    {
      id: 3,
      question: 'Comment ajouter un nouvel élève ?',
      answer:
        'Connectez-vous en tant qu’administrateur, allez dans « Gestion Administrative » > « Élèves », puis cliquez sur « Ajouter un élève ». Remplissez le formulaire en plusieurs étapes avec les informations personnelles, académiques et de contact.',
      category: 'gestion',
    },
    {
      id: 4,
      question: 'Comment créer une classe ?',
      answer:
        'Dans le tableau de bord administrateur, allez dans « Gestion Administrative » > « Classes », puis cliquez sur « Créer une classe ». Remplissez les informations de la classe (nom, niveau, année académique, capacité) et assignez un enseignant principal.',
      category: 'gestion',
    },
    {
      id: 5,
      question: 'Comment saisir les notes des élèves ?',
      answer:
        'En tant qu’enseignant, allez dans « Mes Cours », sélectionnez un cours, puis « Notes ». Cliquez sur « Ajouter une note » et remplissez le formulaire avec le type d’évaluation, la note et le coefficient.',
      category: 'pedagogie',
    },
    {
      id: 6,
      question: 'Comment générer un bulletin de notes ?',
      answer:
        'Les bulletins sont générés automatiquement à la fin de chaque trimestre. Vous pouvez également les générer manuellement depuis « Gestion Complète » > « Bulletins » en sélectionnant la classe et le trimestre souhaités.',
      category: 'pedagogie',
    },
    {
      id: 7,
      question: 'Comment gérer les absences ?',
      answer:
        'Les enseignants peuvent marquer les absences depuis « Mes Cours » > « Absences ». Les absences peuvent être excusées ou non excusées. Les parents reçoivent une notification pour chaque absence non excusée.',
      category: 'pedagogie',
    },
    {
      id: 8,
      question: 'Comment contacter le support technique ?',
      answer:
        'Vous pouvez contacter le support par e-mail à support@schoolmanager.com, par téléphone au +33 1 23 45 67 89, ou via le formulaire de contact sur notre site web. Le support est disponible du lundi au vendredi de 9h à 18h.',
      category: 'support',
    },
    {
      id: 9,
      question: 'Quels navigateurs sont supportés ?',
      answer:
        'École à jour fonctionne sur tous les navigateurs modernes : Chrome, Firefox, Safari, Edge (versions récentes). Pour une expérience optimale, nous recommandons d’utiliser la dernière version de votre navigateur.',
      category: 'technique',
    },
    {
      id: 10,
      question: 'Mes données sont-elles sécurisées ?',
      answer:
        'Oui, toutes les données sont chiffrées en transit (HTTPS) et au repos. Nous respectons le RGPD et mettons en place des mesures de sécurité strictes. Consultez notre Politique de confidentialité pour plus d’informations.',
      category: 'securite',
    },
    {
      id: 11,
      question: 'Comment exporter les données ?',
      answer:
        'Les administrateurs peuvent exporter les données depuis « Gestion Administrative » > « Exporter les données ». Vous pouvez choisir le format (CSV, JSON, PDF) et le type de données à exporter (élèves, classes, enseignants, ou tout).',
      category: 'gestion',
    },
    {
      id: 12,
      question: 'Comment configurer les notifications ?',
      answer:
        'Allez dans « Paramètres » > « Notifications » pour configurer vos préférences. Vous pouvez activer ou désactiver les notifications par e-mail, SMS et notifications push pour différents types d’événements.',
      category: 'parametres',
    },
  ];

  const categories = [
    { id: 'all', label: 'Toutes les catégories' },
    { id: 'compte', label: 'Compte' },
    { id: 'gestion', label: 'Gestion' },
    { id: 'pedagogie', label: 'Pédagogie' },
    { id: 'support', label: 'Support' },
    { id: 'technique', label: 'Technique' },
    { id: 'securite', label: 'Sécurité' },
    { id: 'parametres', label: 'Paramètres' },
  ];

  const filteredItems = faqItems.filter((item) => {
    const matchesSearch =
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleItem = (id: number) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <UltraPremiumPageShell
      navLabel="Support"
      title="FAQ"
      description="Trouvez rapidement les réponses à vos questions sur École à jour."
    >
      <div className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="-mt-10 mb-10">
          <Card variant="premium" className="!p-5 sm:!p-6 shadow-lg ring-1 ring-stone-200/80">
            <div className="space-y-4">
              <div className="relative">
                <label htmlFor="faq-search" className="sr-only">
                  Rechercher dans la FAQ
                </label>
                <FiSearch
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400"
                  aria-hidden
                />
                <input
                  id="faq-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher dans la FAQ…"
                  className={fieldSearchClass}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/45 ${
                      selectedCategory === category.id
                        ? 'bg-stone-900 text-white shadow-md ring-1 ring-amber-500/35'
                        : 'bg-white/90 text-stone-700 ring-1 ring-stone-200/90 hover:bg-stone-50'
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div className="mb-12 space-y-4">
          {filteredItems.length === 0 ? (
            <Card variant="premium">
              <div className="py-12 text-center">
                <FiHelpCircle className="mx-auto mb-4 h-16 w-16 text-stone-300" aria-hidden />
                <p className="text-stone-600">Aucune question trouvée pour votre recherche.</p>
              </div>
            </Card>
          ) : (
            filteredItems.map((item) => (
              <Card key={item.id} variant="premium" className="!p-0 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleItem(item.id)}
                  aria-expanded={expandedItems.includes(item.id)}
                  className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-stone-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-500/35"
                >
                  <div className="flex flex-1 items-start gap-4">
                    <FiHelpCircle className="mt-1 h-6 w-6 shrink-0 text-amber-800" aria-hidden />
                    <div className="flex-1 min-w-0">
                      <h3 className="mb-1 font-bold text-stone-900">{item.question}</h3>
                      <p className="text-xs capitalize text-stone-500">{item.category}</p>
                    </div>
                  </div>
                  {expandedItems.includes(item.id) ? (
                    <FiChevronUp className="ml-4 h-5 w-5 shrink-0 text-stone-400" aria-hidden />
                  ) : (
                    <FiChevronDown className="ml-4 h-5 w-5 shrink-0 text-stone-400" aria-hidden />
                  )}
                </button>
                {expandedItems.includes(item.id) && (
                  <div className="border-t border-stone-200/80 px-6 pb-6 pt-0">
                    <p className="mt-4 leading-relaxed text-stone-600">{item.answer}</p>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        <Card
          variant="premium"
          className="border border-amber-200/60 bg-gradient-to-br from-amber-50/90 via-white to-stone-50/80 !p-8 ring-1 ring-amber-900/5"
        >
          <div className="py-2 text-center">
            <FiMessageSquare className="mx-auto mb-4 h-12 w-12 text-amber-800" aria-hidden />
            <h3 className="mb-2 text-2xl font-bold text-stone-900">Vous ne trouvez pas la réponse ?</h3>
            <p className="mb-6 text-stone-600">Notre équipe support est là pour vous aider.</p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/contact">
                <Button className="inline-flex items-center gap-2">
                  <FiMail className="h-4 w-4" aria-hidden />
                  Nous contacter
                </Button>
              </Link>
              <a href="mailto:support@schoolmanager.com">
                <Button variant="outline" className="border-stone-300 text-stone-900 hover:bg-amber-50/50">
                  <FiMail className="h-4 w-4" aria-hidden />
                  support@schoolmanager.com
                </Button>
              </a>
            </div>
          </div>
        </Card>
      </div>
    </UltraPremiumPageShell>
  );
};

export default FAQ;
