import Link from 'next/link';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import UltraPremiumPageShell from '../components/public/UltraPremiumPageShell';
import {
  FiFileText,
  FiAlertCircle,
  FiCheckCircle,
  FiShield,
  FiLock,
  FiUser,
  FiXCircle,
  FiInfo,
  FiMail,
  FiPhone,
} from 'react-icons/fi';

const Terms = () => {
  const updated = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <UltraPremiumPageShell
      navLabel="Légal"
      title="Conditions d'utilisation"
      description={`Dernière mise à jour : ${updated}. En utilisant École à jour, vous acceptez ces conditions.`}
    >
      <div className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="-mt-10 space-y-6">
        <Card
          variant="premium"
          className="mb-6 border border-amber-200/70 bg-gradient-to-br from-amber-50/90 to-stone-50/80 ring-1 ring-amber-900/5"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-stone-800 to-stone-950 text-amber-100 shadow-lg ring-1 ring-amber-500/30">
              <FiInfo className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <h3 className="mb-2 text-lg font-bold text-stone-900">Introduction</h3>
              <p className="text-stone-700">
                Les présentes conditions régissent votre accès et votre utilisation de la plateforme École à jour.
                En accédant ou en utilisant notre service, vous acceptez d&apos;être lié par ces conditions. Si vous
                n&apos;acceptez pas ces conditions, veuillez ne pas utiliser notre service.
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          {/* Section 1 */}
          <Card variant="premium">
            <div className="prose max-w-none">
              <h2 className="mb-4 flex items-center text-2xl font-bold text-stone-900">
                <FiCheckCircle className="mr-2 h-6 w-6 shrink-0 text-emerald-700" aria-hidden />
                1. Acceptation des Conditions
              </h2>
              <p className="mb-4 text-stone-700">
                En accédant et en utilisant École à jour, vous reconnaissez avoir lu, compris et accepté d&apos;être
                lié par les présentes conditions ainsi que par notre{' '}
                <Link href="/privacy" className="font-medium text-amber-900/90 underline-offset-2 hover:underline">
                  Politique de confidentialité
                </Link>
                .
              </p>
              <p className="mb-4 text-stone-700">
                Si vous n&apos;acceptez pas ces conditions, vous devez immédiatement cesser d&apos;utiliser le service.
              </p>
              <p className="text-stone-700">
                Ces conditions s&apos;appliquent à tous les utilisateurs de la plateforme, y compris les administrateurs,
                enseignants, élèves et parents.
              </p>
            </div>
          </Card>

          {/* Section 2 */}
          <Card variant="premium">
            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 flex items-center">
                <FiUser className="mr-2 h-6 w-6 shrink-0 text-amber-800" aria-hidden />
                2. Utilisation du Service
              </h2>
              <p className="text-stone-700 mb-4 font-semibold">
                Vous vous engagez à :
              </p>
              <ul className="list-disc pl-6 text-stone-700 mb-4 space-y-2">
                <li>Utiliser le service uniquement à des fins légales et conformément à ces conditions</li>
                <li>Ne pas partager, vendre ou transférer vos identifiants de connexion à des tiers</li>
                <li>Respecter les droits de propriété intellectuelle de École à jour et des autres utilisateurs</li>
                <li>Ne pas utiliser le service à des fins frauduleuses, malveillantes ou illégales</li>
                <li>Ne pas tenter d'accéder à des zones non autorisées du système</li>
                <li>Ne pas perturber ou nuire au fonctionnement du service</li>
                <li>Respecter la confidentialité des données des autres utilisateurs</li>
                <li>Fournir des informations exactes et à jour lors de l'inscription</li>
              </ul>
              <p className="text-stone-700 mb-4 font-semibold">
                Il est strictement interdit de :
              </p>
              <ul className="list-disc pl-6 text-stone-700 space-y-2">
                <li>Utiliser le service pour diffuser du contenu illégal, offensant ou inapproprié</li>
                <li>Modifier, copier ou reproduire le code source ou les fonctionnalités du service</li>
                <li>Utiliser des robots, scripts automatisés ou autres moyens pour accéder au service</li>
                <li>Transmettre des virus, vers ou autres codes malveillants</li>
                <li>Collecter des données personnelles d'autres utilisateurs sans autorisation</li>
              </ul>
            </div>
          </Card>

          {/* Section 3 */}
          <Card variant="premium">
            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 flex items-center">
                <FiShield className="mr-2 h-6 w-6 shrink-0 text-amber-800" aria-hidden />
                3. Comptes Utilisateurs
              </h2>
              <p className="text-stone-700 mb-4">
                Pour accéder à certaines fonctionnalités de École à jour, vous devez créer un compte utilisateur.
              </p>
              <p className="text-stone-700 mb-4 font-semibold">
                Responsabilités liées au compte :
              </p>
              <ul className="list-disc pl-6 text-stone-700 mb-4 space-y-2">
                <li>Vous êtes responsable de maintenir la confidentialité de vos identifiants de connexion</li>
                <li>Vous êtes responsable de toutes les activités qui se produisent sous votre compte</li>
                <li>Vous devez nous notifier immédiatement de toute utilisation non autorisée de votre compte</li>
                <li>Vous devez utiliser un mot de passe fort et unique</li>
                <li>Vous ne devez pas créer plusieurs comptes pour contourner les restrictions</li>
              </ul>
              <p className="text-stone-700">
                École à jour se réserve le droit de suspendre ou de supprimer votre compte en cas de violation 
                de ces conditions ou de comportement inapproprié.
              </p>
            </div>
          </Card>

          {/* Section 4 */}
          <Card variant="premium">
            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 flex items-center">
                <FiLock className="mr-2 h-6 w-6 shrink-0 text-amber-800" aria-hidden />
                4. Propriété Intellectuelle
              </h2>
              <p className="text-stone-700 mb-4">
                Tous les contenus présents sur École à jour, incluant mais sans s'y limiter :
              </p>
              <ul className="list-disc pl-6 text-stone-700 mb-4 space-y-2">
                <li>Les textes, graphiques, logos, icônes et images</li>
                <li>Le code source, les logiciels et les fonctionnalités</li>
                <li>La structure, l'organisation et le design de l'interface</li>
                <li>Les bases de données et leur structure</li>
                <li>Les marques de commerce et les noms de domaine</li>
              </ul>
              <p className="text-stone-700 mb-4">
                sont la propriété exclusive de École à jour ou de ses concédants de licence et sont protégés par 
                les lois françaises et internationales sur la propriété intellectuelle.
              </p>
              <p className="text-stone-700">
                Vous n'êtes pas autorisé à reproduire, modifier, distribuer, afficher publiquement ou créer des 
                œuvres dérivées basées sur le contenu de École à jour sans notre autorisation écrite préalable.
              </p>
            </div>
          </Card>

          {/* Section 5 */}
          <Card variant="premium">
            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 flex items-center">
                <FiAlertCircle className="mr-2 h-6 w-6 shrink-0 text-amber-800" aria-hidden />
                5. Limitations de Responsabilité
              </h2>
              <p className="text-stone-700 mb-4">
                École à jour est fourni "tel quel" et "selon disponibilité". Nous ne garantissons pas que :
              </p>
              <ul className="list-disc pl-6 text-stone-700 mb-4 space-y-2">
                <li>Le service sera ininterrompu, sécurisé ou exempt d'erreurs</li>
                <li>Les résultats obtenus seront exacts ou fiables</li>
                <li>Les défauts seront corrigés</li>
                <li>Le service répondra à vos besoins spécifiques</li>
              </ul>
              <p className="text-stone-700 mb-4">
                Dans la mesure permise par la loi, École à jour décline toute responsabilité concernant :
              </p>
              <ul className="list-disc pl-6 text-stone-700 mb-4 space-y-2">
                <li>Les dommages directs, indirects, accessoires ou consécutifs</li>
                <li>La perte de données, de profits ou d'opportunités commerciales</li>
                <li>Les interruptions de service ou les pannes techniques</li>
                <li>Les erreurs ou omissions dans le contenu</li>
              </ul>
              <p className="text-stone-700">
                Vous utilisez le service à vos propres risques. Il est de votre responsabilité de sauvegarder 
                régulièrement vos données importantes.
              </p>
            </div>
          </Card>

          {/* Section 6 */}
          <Card variant="premium">
            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 flex items-center">
                <FiXCircle className="mr-2 h-6 w-6 shrink-0 text-rose-700" aria-hidden />
                6. Résiliation
              </h2>
              <p className="text-stone-700 mb-4">
                Vous pouvez résilier votre compte à tout moment en contactant notre service client.
              </p>
              <p className="text-stone-700 mb-4">
                École à jour se réserve le droit de suspendre ou de résilier votre accès au service, 
                sans préavis, en cas de :
              </p>
              <ul className="list-disc pl-6 text-stone-700 mb-4 space-y-2">
                <li>Violation des présentes Conditions d'Utilisation</li>
                <li>Utilisation frauduleuse ou malveillante du service</li>
                <li>Non-paiement des frais d'abonnement (le cas échéant)</li>
                <li>Inactivité prolongée du compte</li>
                <li>Demande des autorités compétentes</li>
              </ul>
              <p className="text-stone-700">
                En cas de résiliation, votre droit d'utilisation du service prendra fin immédiatement. 
                Nous nous réservons le droit de supprimer ou de conserver vos données conformément à notre 
                Politique de Confidentialité.
              </p>
            </div>
          </Card>

          {/* Section 7 */}
          <Card variant="premium">
            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 flex items-center">
                <FiFileText className="mr-2 h-6 w-6 shrink-0 text-amber-800" aria-hidden />
                7. Modification des Conditions
              </h2>
              <p className="text-stone-700 mb-4">
                Nous nous réservons le droit de modifier ces Conditions d'Utilisation à tout moment. 
                Les modifications entreront en vigueur dès leur publication sur cette page.
              </p>
              <p className="text-stone-700 mb-4">
                Il est de votre responsabilité de consulter régulièrement cette page pour prendre connaissance 
                des éventuelles modifications.
              </p>
              <p className="text-stone-700">
                Votre utilisation continue du service après la publication des modifications constitue votre 
                acceptation des nouvelles conditions. Si vous n'acceptez pas les modifications, vous devez 
                cesser d'utiliser le service.
              </p>
            </div>
          </Card>

          {/* Section 8 */}
          <Card variant="premium">
            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 flex items-center">
                <FiShield className="mr-2 h-6 w-6 shrink-0 text-emerald-700" aria-hidden />
                8. Protection des Données
              </h2>
              <p className="text-stone-700 mb-4">
                Le traitement de vos données personnelles est régi par notre 
                <Link href="/privacy" className="ml-1 font-medium text-amber-900/90 underline-offset-2 hover:underline">
                  Politique de confidentialité
                </Link>
                , qui fait partie intégrante de ces conditions d&apos;utilisation.
              </p>
              <p className="text-stone-700">
                En utilisant École à jour, vous consentez au traitement de vos données personnelles conformément 
                à notre Politique de Confidentialité et au Règlement Général sur la Protection des Données (RGPD).
              </p>
            </div>
          </Card>

          {/* Section 9 */}
          <Card variant="premium">
            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 flex items-center">
                <FiFileText className="mr-2 h-6 w-6 shrink-0 text-amber-800" aria-hidden />
                9. Droit Applicable et Juridiction
              </h2>
              <p className="text-stone-700 mb-4">
                Les présentes Conditions d'Utilisation sont régies par le droit français.
              </p>
              <p className="text-stone-700 mb-4">
                En cas de litige, et après une tentative de résolution amiable, les parties conviennent que 
                les tribunaux français seront seuls compétents.
              </p>
              <p className="text-stone-700">
                Si vous êtes un consommateur résidant dans l'Union Européenne, vous bénéficiez également des 
                droits de protection des consommateurs prévus par la législation de votre pays de résidence.
              </p>
            </div>
          </Card>

          {/* Section 10 */}
          <Card variant="premium">
            <div className="prose max-w-none">
              <h2 className="text-2xl font-bold text-stone-900 mb-4 flex items-center">
                <FiCheckCircle className="mr-2 h-6 w-6 shrink-0 text-amber-800" aria-hidden />
                10. Dispositions Générales
              </h2>
              <p className="text-stone-700 mb-4">
                Si une disposition de ces Conditions d'Utilisation est jugée invalide ou inapplicable, 
                les autres dispositions resteront en vigueur.
              </p>
              <p className="text-stone-700 mb-4">
                Le fait que nous n'exercions pas un droit ou une disposition de ces conditions ne constitue 
                pas une renonciation à ce droit ou à cette disposition.
              </p>
              <p className="text-stone-700">
                Ces Conditions d'Utilisation constituent l'accord complet entre vous et École à jour concernant 
                l'utilisation du service et remplacent tous les accords antérieurs.
              </p>
            </div>
          </Card>

          {/* Section 11 - Contact */}
          <Card
            variant="premium"
            className="border border-amber-200/70 bg-gradient-to-br from-amber-50/80 to-stone-50/90 ring-1 ring-amber-900/5"
          >
            <div className="prose max-w-none">
              <h2 className="mb-4 flex items-center text-2xl font-bold text-stone-900">
                <FiMail className="mr-2 h-6 w-6 shrink-0 text-amber-800" aria-hidden />
                11. Contact
              </h2>
              <p className="mb-4 text-stone-700">
                Pour toute question, préoccupation ou réclamation concernant ces conditions d&apos;utilisation,
                vous pouvez nous contacter :
              </p>
              <div className="space-y-4 rounded-xl bg-white/95 p-6 ring-1 ring-stone-200/80">
                <div className="flex items-center space-x-3">
                  <FiMail className="h-5 w-5 shrink-0 text-amber-800" aria-hidden />
                  <div>
                    <p className="font-semibold text-stone-900">E-mail</p>
                    <a
                      href="mailto:legal@schoolmanager.com"
                      className="font-medium text-amber-900/90 underline-offset-2 hover:underline"
                    >
                      legal@schoolmanager.com
                    </a>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <FiPhone className="h-5 w-5 shrink-0 text-amber-800" aria-hidden />
                  <div>
                    <p className="font-semibold text-stone-900">Téléphone</p>
                    <a href="tel:+33123456789" className="text-stone-700 transition-colors hover:text-amber-900">
                      +33 1 23 45 67 89
                    </a>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <FiFileText className="h-5 w-5 shrink-0 text-amber-800" aria-hidden />
                  <div>
                    <p className="font-semibold text-stone-900">Adresse</p>
                    <p className="text-stone-700">
                      123 Rue de l'Éducation<br />
                      75001 Paris, France
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-stone-700 mt-4 text-sm">
                Nous nous engageons à répondre à toutes vos demandes dans les meilleurs délais.
              </p>
            </div>
          </Card>

          {/* Acceptation */}
          <Card
            variant="premium"
            className="border border-emerald-200/70 bg-gradient-to-br from-emerald-50/85 to-stone-50/80 ring-1 ring-emerald-900/5"
          >
            <div className="py-6 text-center">
              <FiCheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-700" aria-hidden />
              <h3 className="mb-2 text-xl font-bold text-stone-900">Acceptation des conditions</h3>
              <p className="mb-4 text-stone-700">
                En utilisant École à jour, vous confirmez avoir lu, compris et accepté les présentes conditions
                d&apos;utilisation.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <Link href="/home">
                  <Button className="bg-emerald-800 hover:bg-emerald-900">Retour à l&apos;accueil</Button>
                </Link>
                <Link href="/privacy">
                  <Button
                    variant="secondary"
                    className="border-2 border-emerald-700/80 text-emerald-900 hover:bg-emerald-50/80"
                  >
                    Voir la politique de confidentialité
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
        </div>
      </div>
    </UltraPremiumPageShell>
  );
};

export default Terms;

