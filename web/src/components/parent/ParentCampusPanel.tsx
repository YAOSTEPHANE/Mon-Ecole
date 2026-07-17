import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { parentApi } from '../../services/api';
import { formatFCFA } from '../../utils/currency';

type Props = { studentId: string };

const ParentCampusPanel: React.FC<Props> = ({ studentId }) => {
  const qc = useQueryClient();
  const [stopLabel, setStopLabel] = useState('');

  const { data: plans = [] } = useQuery({
    queryKey: ['parent-canteen-plans', studentId],
    queryFn: () => parentApi.getCanteenPlans(studentId),
    enabled: !!studentId,
  });
  const { data: canteenSubs = [] } = useQuery({
    queryKey: ['parent-canteen-subs', studentId],
    queryFn: () => parentApi.getCanteenSubscriptions(studentId),
    enabled: !!studentId,
  });
  const { data: routes = [] } = useQuery({
    queryKey: ['parent-transport-routes', studentId],
    queryFn: () => parentApi.getTransportRoutes(studentId),
    enabled: !!studentId,
  });
  const { data: transportSubs = [] } = useQuery({
    queryKey: ['parent-transport-subs', studentId],
    queryFn: () => parentApi.getTransportSubscriptions(studentId),
    enabled: !!studentId,
  });

  const subCanteen = useMutation({
    mutationFn: (planId: string) => parentApi.subscribeCanteen(studentId, planId),
    onSuccess: () => {
      toast.success('Inscription cantine enregistrée');
      qc.invalidateQueries({ queryKey: ['parent-canteen-subs', studentId] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Erreur'),
  });

  const subTransport = useMutation({
    mutationFn: (routeId: string) =>
      parentApi.subscribeTransport(studentId, { routeId, stopLabel: stopLabel || undefined }),
    onSuccess: () => {
      toast.success('Inscription transport enregistrée');
      qc.invalidateQueries({ queryKey: ['parent-transport-subs', studentId] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Erreur'),
  });

  const subscribedPlanIds = new Set((canteenSubs as any[]).map((s) => s.planId));
  const subscribedRouteIds = new Set((transportSubs as any[]).map((s) => s.routeId));

  return (
    <div className="space-y-6">
      <Card className="p-4 border border-amber-100 bg-amber-50/40">
        <h3 className="text-sm font-semibold text-amber-950">Cantine & transport</h3>
        <p className="text-xs text-amber-900/80 mt-1">
          Inscrivez votre enfant aux formules repas et lignes de bus publiées par l’établissement.
        </p>
      </Card>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900">Cantine</h4>
        {(plans as any[]).length === 0 ? (
          <p className="text-sm text-gray-500">Aucune formule publiée pour le moment.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(plans as any[]).map((p) => (
              <Card key={p.id} className="p-4 space-y-2">
                <div className="font-medium text-gray-900">{p.name}</div>
                <div className="text-xs text-gray-500">{p.academicYear}</div>
                {p.menuNotes && <p className="text-xs text-gray-600">{p.menuNotes}</p>}
                <p className="text-sm font-semibold">{formatFCFA(p.priceAmount)}</p>
                {subscribedPlanIds.has(p.id) ? (
                  <span className="text-xs text-emerald-700 font-medium">Déjà inscrit</span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => subCanteen.mutate(p.id)}
                    disabled={subCanteen.isPending}
                  >
                    Inscrire
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-900">Transport scolaire</h4>
        <label className="block text-xs text-gray-600 max-w-xs">
          Arrêt souhaité (optionnel)
          <input
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            value={stopLabel}
            onChange={(e) => setStopLabel(e.target.value)}
          />
        </label>
        {(routes as any[]).length === 0 ? (
          <p className="text-sm text-gray-500">Aucune ligne publiée pour le moment.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(routes as any[]).map((r) => (
              <Card key={r.id} className="p-4 space-y-2">
                <div className="font-medium text-gray-900">{r.name}</div>
                <div className="text-xs text-gray-500">
                  {r.departureArea || '—'} → {r.arrivalArea || '—'}
                </div>
                {r.scheduleNotes && <p className="text-xs text-gray-600">{r.scheduleNotes}</p>}
                <p className="text-sm font-semibold">{formatFCFA(r.priceAmount)}</p>
                {subscribedRouteIds.has(r.id) ? (
                  <div className="space-y-2">
                    <span className="text-xs text-emerald-700 font-medium">Déjà inscrit</span>
                    <TransportTrackingSnippet studentId={studentId} routeId={r.id} />
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => subTransport.mutate(r.id)}
                    disabled={subTransport.isPending}
                  >
                    Inscrire
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

function TransportTrackingSnippet({ studentId, routeId }: { studentId: string; routeId: string }) {
  const { data } = useQuery({
    queryKey: ['parent-transport-tracking', studentId, routeId],
    queryFn: () => parentApi.getTransportTracking(studentId, routeId),
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

export default ParentCampusPanel;
