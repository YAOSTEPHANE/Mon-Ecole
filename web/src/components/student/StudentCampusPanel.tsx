'use client';

import CampusSubscriptionsPanel from '../campus/CampusSubscriptionsPanel';
import { studentApi } from '../../services/api';

export default function StudentCampusPanel() {
  return (
    <CampusSubscriptionsPanel
      queryKeyPrefix="student-campus"
      intro="Inscrivez-vous aux formules repas et lignes de bus publiées par l’établissement."
      subscribeCanteenLabel="M’inscrire"
      subscribeTransportLabel="M’inscrire"
      api={{
        getCanteenPlans: studentApi.getCanteenPlans,
        getCanteenSubscriptions: studentApi.getCanteenSubscriptions,
        subscribeCanteen: studentApi.subscribeCanteen,
        getTransportRoutes: studentApi.getTransportRoutes,
        getTransportSubscriptions: studentApi.getTransportSubscriptions,
        subscribeTransport: (routeId, stopLabel) =>
          studentApi.subscribeTransport({ routeId, stopLabel }),
        getTransportTracking: studentApi.getTransportTracking,
      }}
    />
  );
}
