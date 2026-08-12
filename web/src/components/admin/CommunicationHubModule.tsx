import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../services/api';
import Card from '../ui/Card';
import CommunicationManagement from './CommunicationManagement';
import NotificationsAlertsPanel from './NotificationsAlertsPanel';
import SchoolGalleryAdminPanel from './SchoolGalleryAdminPanel';
import {
  FiGrid,
  FiMail,
  FiBell,
  FiFileText,
  FiRss,
  FiInbox,
  FiImage,
  FiGlobe,
} from 'react-icons/fi';
import { ADM } from './adminModuleLayout';
import PublicVisitorsAdminPanel from './PublicVisitorsAdminPanel';

type HubTab = 'overview' | 'messaging' | 'alerts' | 'circulars' | 'news' | 'gallery' | 'requests' | 'publicVisitors';

const CommunicationHubModule: React.FC = () => {
  const [tab, setTab] = useState<HubTab>('overview');

  const { data: messages } = useQuery({
    queryKey: ['admin-messages'],
    queryFn: () => adminApi.getMessages(),
  });
  const { data: announcements } = useQuery({
    queryKey: ['admin-announcements'],
    queryFn: () => adminApi.getAnnouncements(),
  });
  const { data: notifications } = useQuery({
    queryKey: ['admin-notifications', 'unread'],
    queryFn: () => adminApi.getNotifications({ unread: true }),
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-public-visitor-stats'],
    queryFn: () => adminApi.getPublicVisitorStats(),
  });

  const unreadMessages = useMemo(
    () => (messages as any[] | undefined)?.filter((m) => !m.read).length ?? 0,
    [messages]
  );
  const publishedNews = useMemo(() => {
    const list = (announcements as any[] | undefined) ?? [];
    const isCirc = (t: string) =>
      /^\[?\s*Circulaire/i.test((t || '').trim()) || /^Circulaire\b/i.test((t || '').trim());
    return list.filter((a) => a.published && !isCirc(a.title)).length;
  }, [announcements]);

  const subTabs: { id: HubTab; label: string; icon: typeof FiGrid }[] = [
    { id: 'overview', label: 'Vue d’ensemble', icon: FiGrid },
    { id: 'messaging', label: 'Messagerie', icon: FiMail },
    { id: 'alerts', label: 'Notifications & alertes', icon: FiBell },
    { id: 'circulars', label: 'Circulaires', icon: FiFileText },
    { id: 'news', label: 'Actualités', icon: FiRss },
    { id: 'gallery', label: 'Galerie photos', icon: FiImage },
    { id: 'requests', label: 'Demandes & réclamations', icon: FiInbox },
    { id: 'publicVisitors', label: 'Visiteurs site', icon: FiGlobe },
  ];

  return (
    <div className={ADM.root}>
      <div>
        <h2 className={ADM.h2}>Communication</h2>
        <p className={ADM.intro}>
          Échanges avec les familles et le personnel, alertes, publications et suivi des demandes.
        </p>
      </div>

      <div className={ADM.tabRow}>
        {subTabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={ADM.tabBtn(active, 'bg-rose-50 text-rose-900 ring-1 ring-rose-200')}
            >
              <Icon className={ADM.tabIcon} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div className={ADM.section}>
          <div className={ADM.grid5}>
            <Card className={`${ADM.statCard} border border-gray-200`}>
              <p className={ADM.statLabel}>Messages (non lus)</p>
              <p className={ADM.statVal}>{unreadMessages}</p>
              <p className={ADM.statHint}>Messagerie interne</p>
            </Card>
            <Card className={`${ADM.statCard} border border-amber-100 bg-amber-50/50`}>
              <p className="text-[10px] font-medium text-amber-900 uppercase tracking-wide leading-tight">
                Notifications non lues
              </p>
              <p className={`${ADM.statValTone} text-amber-900`}>
                {(notifications as any[] | undefined)?.length ?? 0}
              </p>
              <p className={ADM.statHint}>Alertes système</p>
            </Card>
            <Card className={`${ADM.statCard} border border-pink-100 bg-pink-50/40`}>
              <p className="text-[10px] font-medium text-pink-900 uppercase tracking-wide leading-tight">
                Annonces (total)
              </p>
              <p className={`${ADM.statValTone} text-pink-900`}>
                {(announcements as any[] | undefined)?.length ?? 0}
              </p>
              <p className={ADM.statHint}>Brouillons + publiées</p>
            </Card>
            <Card className={`${ADM.statCard} border border-violet-100 bg-violet-50/40`}>
              <p className="text-[10px] font-medium text-violet-900 uppercase tracking-wide leading-tight">
                Actualités publiées
              </p>
              <p className={`${ADM.statValTone} text-violet-900`}>{publishedNews}</p>
              <p className={ADM.statHint}>Hors circulaires (titre)</p>
            </Card>
            <Card className={`${ADM.statCard} border border-teal-100 bg-teal-50/40`}>
              <p className="text-[10px] font-medium text-teal-900 uppercase tracking-wide leading-tight">
                Chats visiteurs ouverts
              </p>
              <p className={`${ADM.statValTone} text-teal-900`}>
                {(stats as { openThreadsCount?: number } | undefined)?.openThreadsCount ?? 0}
              </p>
              <p className={ADM.statHint}>Site public (non connectés)</p>
            </Card>
          </div>
          <Card className={ADM.helpCard}>
            <p className="text-xs text-gray-700 leading-relaxed">
              La <strong>Messagerie</strong> permet d’écrire aux familles, élèves ou enseignants, d’utiliser des fils
              (threadKey), des pièces jointes par URL, des diffusions par classe ou par niveau, et déclenche des
              notifications / push côté destinataires. Les <strong>circulaires</strong> sont des annonces dont le titre
              commence par « Circulaire » (ou [Circulaire]). Les <strong>actualités</strong> regroupent les autres annonces
              publiées. Les <strong>demandes et réclamations</strong> mettent en avant les
              messages des familles, les sujets urgents ou les mots-clés (demande, réclamation…).
            </p>
          </Card>
        </div>
      )}

      {tab === 'messaging' && (
        <CommunicationManagement
          embedded
          compact
          embeddedTab="messages"
          messagesMode="all"
        />
      )}
      {tab === 'alerts' && (
        <div className="space-y-4">
          <NotificationsAlertsPanel />
          <CommunicationManagement embedded compact embeddedTab="notifications" />
        </div>
      )}
      {tab === 'circulars' && (
        <div className="space-y-3">
          <Card className="p-4 border border-rose-100 bg-rose-50/40">
            <p className="text-xs text-gray-700 leading-relaxed">
              Pour classer une annonce comme <strong>circulaire</strong>, commencez le titre par{' '}
              <code className="bg-white px-1 rounded text-rose-800">Circulaire</code> ou{' '}
              <code className="bg-white px-1 rounded text-rose-800">[Circulaire]</code>.
            </p>
          </Card>
          <CommunicationManagement
            embedded
            compact
            embeddedTab="announcements"
            announcementKind="circular"
          />
        </div>
      )}
      {tab === 'news' && (
        <CommunicationManagement
          embedded
          compact
          embeddedTab="announcements"
          announcementKind="news"
        />
      )}
      {tab === 'gallery' && (
        <div className="space-y-3">
          <Card className="p-4 border border-emerald-100 bg-emerald-50/30">
            <p className="text-xs text-gray-700 leading-relaxed">
              Photos affichées dans le <strong>fil portail</strong> des familles et des élèves (onglet Galerie ou fil
              « Tout »). Pour des articles longs avec plusieurs images, utilisez une <strong>annonce</strong> en catégorie
              « Galerie » avec URLs d’images.
            </p>
          </Card>
          <SchoolGalleryAdminPanel />
        </div>
      )}
      {tab === 'requests' && (
        <div className="space-y-3">
          <Card className="p-4 border border-blue-100 bg-blue-50/40">
            <p className="text-xs text-gray-700 leading-relaxed">
              Filtre : messages des <strong>parents et élèves</strong>, catégorie{' '}
              <strong>Urgent</strong>, ou contenant les mots demande, réclamation, plainte, recours.
            </p>
          </Card>
          <CommunicationManagement
            embedded
            compact
            embeddedTab="messages"
            messagesMode="requests"
          />
        </div>
      )}
      {tab === 'publicVisitors' && (
        <div className="space-y-3">
          <Card className="p-4 border border-teal-100 bg-teal-50/40">
            <p className="text-xs text-gray-700 leading-relaxed">
              Visiteurs <strong>non connectés</strong> du site : pages vues, formulaire contact,
              chat anonyme et demandes d’orientation. Répondez aux messages depuis l’onglet Chat site
              public — les réponses s’affichent dans le widget flottant du site.
            </p>
          </Card>
          <PublicVisitorsAdminPanel />
        </div>
      )}
    </div>
  );
};

export default CommunicationHubModule;
