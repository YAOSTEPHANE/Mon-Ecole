'use client';

import CampusSubscriptionsPanel from '../campus/CampusSubscriptionsPanel';
import { parentApi } from '../../services/api';

type Props = { studentId: string };

const ParentCampusPanel: React.FC<Props> = ({ studentId }) => {
  return (
    <CampusSubscriptionsPanel
      queryKeyPrefix={`parent-campus-${studentId}`}
      intro="Inscrivez votre enfant aux formules repas et lignes de bus publiées par l’établissement."
      enabled={!!studentId}
      api={{
        getCanteenPlans: () => parentApi.getCanteenPlans(studentId),
        getCanteenSubscriptions: () => parentApi.getCanteenSubscriptions(studentId),
        subscribeCanteen: (planId) => parentApi.subscribeCanteen(studentId, planId),
        getTransportRoutes: () => parentApi.getTransportRoutes(studentId),
        getTransportSubscriptions: () => parentApi.getTransportSubscriptions(studentId),
        subscribeTransport: (routeId, stopLabel) =>
          parentApi.subscribeTransport(studentId, { routeId, stopLabel }),
        getTransportTracking: (routeId) => parentApi.getTransportTracking(studentId, routeId),
      }}
    />
  );
};

export default ParentCampusPanel;
