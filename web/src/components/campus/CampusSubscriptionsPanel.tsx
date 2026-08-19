'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { formatFCFA } from '../../utils/currency';

export type CampusMealPlan = {
  id: string;
  name: string;
  academicYear: string;
  menuNotes?: string | null;
  priceAmount: number;
};

export type CampusCanteenSubscription = {
  planId: string;
};

export type CampusTransportRoute = {
  id: string;
  name: string;
  departureArea?: string | null;
  arrivalArea?: string | null;
  scheduleNotes?: string | null;
  priceAmount: number;
};

export type CampusTransportSubscription = {
  routeId: string;
};

export type CampusTrackingResponse = {
  latest?: {
    latitude: number;
    longitude: number;
    recordedAt?: string;
  } | null;
};

export type CampusSubscriptionsApi = {
  getCanteenPlans: () => Promise<CampusMealPlan[]>;
  getCanteenSubscriptions: () => Promise<CampusCanteenSubscription[]>;
  subscribeCanteen: (planId: string) => Promise<unknown>;
  getTransportRoutes: () => Promise<CampusTransportRoute[]>;
  getTransportSubscriptions: () => Promise<CampusTransportSubscription[]>;
  subscribeTransport: (routeId: string, stopLabel?: string) => Promise<unknown>;
  getTransportTracking: (routeId: string) => Promise<CampusTrackingResponse>;
};

type Props = {
  queryKeyPrefix: string;
  intro: string;
  subscribeCanteenLabel?: string;
  subscribeTransportLabel?: string;
  enabled?: boolean;
  api: CampusSubscriptionsApi;
};

const CampusSubscriptionsPanel: React.FC<Props> = ({
  queryKeyPrefix,
  intro,
  subscribeCanteenLabel = 'Inscrire',
  subscribeTransportLabel = 'Inscrire',
  enabled = true,
  api,
}) => {
  const qc = useQueryClient();
  const [stopLabel, setStopLabel] = useState('');

  const { data: plans = [] } = useQuery({
    queryKey: [queryKeyPrefix, 'canteen-plans'],
    queryFn: api.getCanteenPlans,
    enabled,
  });
  const { data: canteenSubs = [] } = useQuery({
    queryKey: [queryKeyPrefix, 'canteen-subs'],
    queryFn: api.getCanteenSubscriptions,
    enabled,
  });
  const { data: routes = [] } = useQuery({
    queryKey: [queryKeyPrefix, 'transport-routes'],
    queryFn: api.getTransportRoutes,
    enabled,
  });
  const { data: transportSubs = [] } = useQuery({
    queryKey: [queryKeyPrefix, 'transport-subs'],
    queryFn: api.getTransportSubscriptions,
    enabled,
  });

  const subCanteen = useMutation({
    mutationFn: (planId: string) => api.subscribeCanteen(planId),
    onSuccess: () => {
      toast.success('Inscription cantine enregistrée');
      void qc.invalidateQueries({ queryKey: [queryKeyPrefix, 'canteen-subs'] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Erreur'),
  });

  const subTransport = useMutation({
    mutationFn: (routeId: string) => api.subscribeTransport(routeId, stopLabel || undefined),
    onSuccess: () => {
      toast.success('Inscription transport enregistrée');
      void qc.invalidateQueries({ queryKey: [queryKeyPrefix, 'transport-subs'] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Erreur'),
  });

  const subscribedPlanIds = new Set(canteenSubs.map((s) => s.planId));
  const subscribedRouteIds = new Set(transportSubs.map((s) => s.routeId));

  return (
    <div className="space-y-6">
      <Card className="border border-amber-100 bg-amber-50/40 p-4">
        <h3 className="text-sm font-semibold text-amber-950">Cantine & transport</h3>
        <p className="mt-1 text-xs text-amber-900/80">{intro}</p>
      </Card>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900">Cantine</h4>
        {plans.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune formule publiée pour le moment.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {plans.map((p) => (
              <Card key={p.id} className="space-y-2 p-4">
                <div className="font-medium text-gray-900">{p.name}</div>
                <div className="text-xs text-gray-500">{p.academicYear}</div>
                {p.menuNotes ? <p className="text-xs text-gray-600">{p.menuNotes}</p> : null}
                <p className="text-sm font-semibold">{formatFCFA(p.priceAmount)}</p>
                {subscribedPlanIds.has(p.id) ? (
                  <span className="text-xs font-medium text-emerald-700">Déjà inscrit</span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => subCanteen.mutate(p.id)}
                    disabled={subCanteen.isPending}
                  >
                    {subscribeCanteenLabel}
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900">Transport scolaire</h4>
        <label className="block max-w-xs text-xs text-gray-600">
          Arrêt souhaité (optionnel)
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={stopLabel}
            onChange={(e) => setStopLabel(e.target.value)}
          />
        </label>
        {routes.length === 0 ? (
          <p className="text-sm text-gray-500">Aucune ligne publiée pour le moment.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {routes.map((r) => (
              <Card key={r.id} className="space-y-2 p-4">
                <div className="font-medium text-gray-900">{r.name}</div>
                <div className="text-xs text-gray-500">
                  {r.departureArea || '—'} → {r.arrivalArea || '—'}
                </div>
                {r.scheduleNotes ? <p className="text-xs text-gray-600">{r.scheduleNotes}</p> : null}
                <p className="text-sm font-semibold">{formatFCFA(r.priceAmount)}</p>
                {subscribedRouteIds.has(r.id) ? (
                  <div className="space-y-2">
                    <span className="text-xs font-medium text-emerald-700">Déjà inscrit</span>
                    <TransportTrackingSnippet
                      queryKeyPrefix={queryKeyPrefix}
                      routeId={r.id}
                      fetchTracking={api.getTransportTracking}
                    />
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => subTransport.mutate(r.id)}
                    disabled={subTransport.isPending}
                  >
                    {subscribeTransportLabel}
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

function TransportTrackingSnippet({
  queryKeyPrefix,
  routeId,
  fetchTracking,
}: {
  queryKeyPrefix: string;
  routeId: string;
  fetchTracking: (routeId: string) => Promise<CampusTrackingResponse>;
}) {
  const { data } = useQuery({
    queryKey: [queryKeyPrefix, 'transport-tracking', routeId],
    queryFn: () => fetchTracking(routeId),
    refetchInterval: 20000,
  });
  const latest = data?.latest;
  if (!latest) {
    return <p className="text-[11px] text-gray-500">Position bus : pas encore de signal GPS.</p>;
  }
  return (
    <p className="text-[11px] text-sky-800">
      Bus : {Number(latest.latitude).toFixed(4)}, {Number(latest.longitude).toFixed(4)}
      {latest.recordedAt ? ` — ${new Date(latest.recordedAt).toLocaleTimeString('fr-FR')}` : ''}
    </p>
  );
}

export default CampusSubscriptionsPanel;
