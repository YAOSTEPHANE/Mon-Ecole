import Link from 'next/link';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import UltraPremiumPageShell from '../components/public/UltraPremiumPageShell';
import {
  FiCheck,
  FiX,
  FiStar,
  FiArrowRight,
  FiCreditCard,
} from 'react-icons/fi';

const Pricing = () => {
  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '49',
      period: 'mois',
      description: 'Parfait pour les petites écoles',
      features: [
        "Jusqu'à 100 élèves",
        "Jusqu'à 10 enseignants",
        'Gestion des notes et bulletins',
        'Système d’absences',
        'Emploi du temps',
        'Support email',
      ],
      limitations: [
        'Pas de module financier',
        'Pas de notifications SMS',
        'Stockage limité à 5GB',
      ],
      popular: false,
      color: 'from-cptb-blue to-cptb-blue-dark',
    },
    {
      id: 'professional',
      name: 'Professionnel',
      price: '99',
      period: 'mois',
      description: 'Idéal pour les établissements moyens',
      features: [
        "Jusqu'à 500 élèves",
        "Jusqu'à 50 enseignants",
        'Toutes les fonctionnalités Starter',
        'Module financier',
        'Notifications SMS',
        'Stockage 50GB',
        'Support prioritaire',
        'Formation incluse',
      ],
      limitations: [],
      popular: true,
      color: 'from-cptb-gold to-cptb-gold-dark',
    },
    {
      id: 'enterprise',
      name: 'Entreprise',
      price: 'Sur mesure',
      period: '',
      description: 'Pour les grandes institutions',
      features: [
        'Nombre illimité d’élèves',
        'Nombre illimité d’enseignants',
        'Toutes les fonctionnalités',
        'API personnalisée',
        'Intégrations sur mesure',
        'Stockage illimité',
        'Support 24/7',
        'Formation dédiée',
        'Gestionnaire de compte dédié',
      ],
      limitations: [],
      popular: false,
      color: 'from-stone-800 to-[#07081a]',
    },
  ];

  return (
    <UltraPremiumPageShell
      navLabel="Offre"
      title="Tarifs"
      description="Choisissez le plan qui correspond à la taille et aux ambitions de votre établissement."
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${plan.popular ? 'ring-2 ring-cptb-gold/55 shadow-lux' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-cptb-blue to-cptb-blue-dark px-4 py-1 text-white ring-1 ring-cptb-gold/35">
                    <FiStar className="mr-1 inline h-4 w-4 text-cptb-gold" />
                    Le plus populaire
                  </Badge>
                </div>
              )}
              <div className="mb-6 text-center">
                <div
                  className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${plan.color} shadow-lux-soft ring-1 ring-cptb-gold/25`}
                >
                  <FiCreditCard className="h-10 w-10 text-white" />
                </div>
                <h3 className="font-display mb-2 text-2xl font-semibold tracking-tight text-stone-900">
                  {plan.name}
                </h3>
                <p className="mb-4 text-stone-600">{plan.description}</p>
                <div className="mb-4">
                  {plan.price === 'Sur mesure' ? (
                    <div className="font-display text-3xl font-semibold text-stone-900">{plan.price}</div>
                  ) : (
                    <>
                      <span className="font-display text-4xl font-semibold text-stone-900">{plan.price}€</span>
                      <span className="text-stone-500">/{plan.period}</span>
                    </>
                  )}
                </div>
              </div>

              <ul className="mb-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <FiCheck className="mr-2 mt-0.5 h-5 w-5 shrink-0 text-cptb-gold" />
                    <span className="text-sm text-stone-700">{feature}</span>
                  </li>
                ))}
                {plan.limitations.map((limitation) => (
                  <li key={limitation} className="flex items-start opacity-60">
                    <FiX className="mr-2 mt-0.5 h-5 w-5 shrink-0 text-stone-400" />
                    <span className="text-sm text-stone-500">{limitation}</span>
                  </li>
                ))}
              </ul>

              <Link href="/contact" className="block">
                <Button className="w-full" size="lg">
                  {plan.price === 'Sur mesure' ? 'Nous contacter' : 'Choisir ce plan'}
                  <FiArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </Card>
          ))}
        </div>

        <Card id="comparison" className="mb-12">
          <h2 className="font-display mb-6 text-center text-2xl font-semibold tracking-tight text-stone-900">
            Comparaison des plans
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-amber-200/60">
                  <th className="px-4 py-3 text-left font-semibold text-stone-700">Fonctionnalité</th>
                  <th className="px-4 py-3 text-center font-semibold text-stone-700">Starter</th>
                  <th className="px-4 py-3 text-center font-semibold text-stone-700">Professionnel</th>
                  <th className="px-4 py-3 text-center font-semibold text-stone-700">Entreprise</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-stone-100">
                  <td className="px-4 py-3">Nombre d’élèves</td>
                  <td className="px-4 py-3 text-center">Jusqu’à 100</td>
                  <td className="px-4 py-3 text-center">Jusqu’à 500</td>
                  <td className="px-4 py-3 text-center">Illimité</td>
                </tr>
                <tr className="border-b border-stone-100">
                  <td className="px-4 py-3">Module financier</td>
                  <td className="px-4 py-3 text-center">
                    <FiX className="mx-auto h-5 w-5 text-rose-500" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <FiCheck className="mx-auto h-5 w-5 text-cptb-gold" />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <FiCheck className="mx-auto h-5 w-5 text-cptb-gold" />
                  </td>
                </tr>
                <tr className="border-b border-stone-100">
                  <td className="px-4 py-3">Support</td>
                  <td className="px-4 py-3 text-center">Email</td>
                  <td className="px-4 py-3 text-center">Prioritaire</td>
                  <td className="px-4 py-3 text-center">24/7</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="border border-cptb-gold/25 bg-gradient-to-br from-amber-50/80 via-white to-stone-50 py-12 text-center ring-1 ring-cptb-blue/5">
          <h2 className="font-display mb-4 text-3xl font-semibold tracking-tight text-stone-900">
            Vous avez des questions sur nos tarifs ?
          </h2>
          <p className="mb-6 text-stone-600">
            Notre équipe commerciale est disponible pour discuter de vos besoins spécifiques
          </p>
          <Link href="/contact">
            <Button>
              <FiArrowRight className="mr-2 h-4 w-4" />
              Contactez-nous
            </Button>
          </Link>
        </Card>
      </div>
    </UltraPremiumPageShell>
  );
};

export default Pricing;
