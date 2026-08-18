import Link from 'next/link';
import Card from '../components/ui/Card';
import UltraPremiumPageShell from '../components/public/UltraPremiumPageShell';
import { FiShield, FiLock, FiDatabase, FiEye, FiCheckCircle, FiDownload } from 'react-icons/fi';

const privacyEmail =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_PRIVACY_EMAIL?.trim()) ||
  'privacy@schoolmanager.com';

const Privacy = () => {
  return (
    <UltraPremiumPageShell
      navLabel="Légal"
      title="Politique de confidentialité"
      description={`Dernière mise à jour : ${new Date().toLocaleDateString('fr-FR')}`}
    >
      <div className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="-mt-10">
          <Card variant="premium" className="shadow-lg ring-1 ring-stone-200/80">
            <div className="prose prose-stone max-w-none">
              <h2 className="mb-4 flex items-center text-2xl font-bold text-stone-900">
                <FiShield className="mr-2 h-6 w-6 shrink-0 text-amber-800" aria-hidden />
                1. Introduction
              </h2>
              <p className="mb-6 text-stone-700">
                École à jour s&apos;engage à protéger votre vie privée et vos données personnelles. Cette politique
                explique comment nous collectons, utilisons et protégeons vos informations.
              </p>

              <h2 className="mb-4 flex items-center text-2xl font-bold text-stone-900">
                <FiDatabase className="mr-2 h-6 w-6 shrink-0 text-amber-800" aria-hidden />
                2. Données collectées
              </h2>
              <p className="mb-4 text-stone-700">Nous collectons notamment :</p>
              <ul className="mb-6 list-disc space-y-2 pl-6 text-stone-700">
                <li>Informations personnelles (nom, prénom, e-mail, téléphone)</li>
                <li>Données académiques (notes, absences, bulletins)</li>
                <li>Données de connexion (adresse IP, journaux d&apos;accès)</li>
                <li>Cookies et technologies similaires</li>
              </ul>

              <h2 className="mb-4 flex items-center text-2xl font-bold text-stone-900">
                <FiLock className="mr-2 h-6 w-6 shrink-0 text-amber-800" aria-hidden />
                3. Utilisation des données
              </h2>
              <p className="mb-4 text-stone-700">Nous utilisons vos données pour :</p>
              <ul className="mb-6 list-disc space-y-2 pl-6 text-stone-700">
                <li>Fournir et améliorer nos services</li>
                <li>Gérer les comptes utilisateurs</li>
                <li>Envoyer des notifications importantes</li>
                <li>Assurer la sécurité de la plateforme</li>
                <li>Respecter nos obligations légales</li>
              </ul>

              <h2 className="mb-4 flex items-center text-2xl font-bold text-stone-900">
                <FiEye className="mr-2 h-6 w-6 shrink-0 text-amber-800" aria-hidden />
                4. Partage des données
              </h2>
              <p className="mb-6 text-stone-700">
                Nous ne vendons pas vos données personnelles. Un partage peut avoir lieu uniquement avec votre
                consentement explicite, pour respecter une obligation légale, ou avec des prestataires liés par
                confidentialité.
              </p>
              <ul className="mb-6 list-disc space-y-2 pl-6 text-stone-700">
                <li>Avec votre consentement explicite</li>
                <li>Pour respecter une obligation légale</li>
                <li>Avec nos prestataires de services (sous contrat de confidentialité)</li>
              </ul>

              <h2 className="mb-4 flex items-center text-2xl font-bold text-stone-900">
                <FiCheckCircle className="mr-2 h-6 w-6 shrink-0 text-amber-800" aria-hidden />
                5. Vos droits (RGPD)
              </h2>
              <p className="mb-4 text-stone-700">Conformément au RGPD, vous disposez des droits suivants :</p>
              <ul className="mb-6 list-disc space-y-2 pl-6 text-stone-700">
                <li>Droit d&apos;accès à vos données</li>
                <li>Droit de rectification</li>
                <li>Droit à l&apos;effacement</li>
                <li>Droit à la portabilité</li>
                <li>Droit d&apos;opposition</li>
                <li>Droit de limitation du traitement</li>
              </ul>
              <div className="mb-8 rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 sm:p-5">
                <h3 className="mb-2 flex items-center text-base font-bold text-stone-900">
                  <FiDownload className="mr-2 h-5 w-5 shrink-0 text-amber-800" aria-hidden />
                  Exercer vos droits dans l&apos;application
                </h3>
                <p className="mb-3 text-sm text-stone-700">
                  <strong>Portabilité / accès :</strong> une fois connecté, les comptes élève, parent, enseignant et
                  éducateur peuvent télécharger un fichier JSON regroupant les données associées au compte (profil,
                  messages, journaux de connexion, données pédagogiques ou de liaison selon le rôle).
                </p>
                <p className="mb-3 text-sm text-stone-700">
                  <strong>Effacement ou limitation :</strong> un formulaire permet d&apos;envoyer une demande au
                  responsable du traitement. Certaines informations (bulletins, facturation, obligations légales de
                  l&apos;établissement) peuvent être conservées pendant la durée prévue par la loi ; vous en serez
                  informé le cas échéant.
                </p>
                <p className="text-xs text-stone-600">
                  Les comptes administrateurs suivent une procédure interne pour les demandes sensibles.
                </p>
              </div>

              <h2 className="mb-4 text-2xl font-bold text-stone-900">6. Base légale et conservation</h2>
              <p className="mb-4 text-stone-700">
                Le traitement repose notamment sur l&apos;exécution du service éducatif, l&apos;obligation légale
                (tenue du dossier scolaire, facturation) et, le cas échéant, votre consentement (ex. communications
                optionnelles). Les durées de conservation varient selon la nature des données : les données de
                scolarité peuvent être conservées plusieurs années après la fin de la scolarité conformément au droit
                applicable ; les journaux de sécurité et de connexion sont conservés pour une durée limitée et proportionnée.
              </p>

              <h2 className="mb-4 text-2xl font-bold text-stone-900">7. Sécurité</h2>
              <p className="mb-4 text-stone-700">
                Nous mettons en œuvre des mesures techniques et organisationnelles adaptées pour protéger vos données
                contre l&apos;accès non autorisé, la perte ou la destruction. Les échanges avec le serveur utilisent
                TLS (HTTPS) en production. Certaines données d&apos;élèves particulièrement sensibles (adresse, urgence,
                informations de santé) peuvent être chiffrées côté serveur avant stockage en base.
              </p>
              <p className="mb-6 text-stone-700">
                Les accès et modifications significatives peuvent être journalisés (audit) pour répondre aux exigences
                de traçabilité et aux obligations du responsable de traitement.
              </p>

              <h2 className="mb-4 text-2xl font-bold text-stone-900">8. Contact et réclamations</h2>
              <p className="mb-4 text-stone-700">
                Pour toute question relative à cette politique, à vos droits ou pour une réclamation concernant le
                traitement de vos données, contactez le responsable du traitement ou le délégué à la protection des
                données (DPO) de votre établissement à l&apos;adresse ci-dessous. Vous pouvez également saisir la CNIL
                (France).
              </p>
              <ul className="mb-6 list-none space-y-2 text-stone-700">
                <li>
                  E-mail :{' '}
                  <a
                    href={`mailto:${privacyEmail}`}
                    className="font-medium text-amber-900/90 underline-offset-2 hover:underline"
                  >
                    {privacyEmail}
                  </a>
                </li>
              </ul>
              <p className="text-sm text-stone-600">
                Voir aussi nos{' '}
                <Link href="/terms" className="font-medium text-amber-900/90 underline-offset-2 hover:underline">
                  conditions d&apos;utilisation
                </Link>
                .
              </p>
            </div>
          </Card>
        </div>
      </div>
    </UltraPremiumPageShell>
  );
};

export default Privacy;
