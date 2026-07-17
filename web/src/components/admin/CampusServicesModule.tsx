import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { adminApi } from '../../services/api';
import { formatFCFA } from '../../utils/currency';
import { getCurrentAcademicYear } from '../../utils/academicYear';
import { ADM } from './adminModuleLayout';
import { FiCoffee, FiTruck } from 'react-icons/fi';

type SubTab = 'canteen' | 'transport';

const CampusServicesModule: React.FC = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<SubTab>('canteen');
  const year = getCurrentAcademicYear();

  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['admin-canteen-plans'],
    queryFn: () => adminApi.getCanteenPlans(),
  });
  const { data: routes = [], isLoading: loadingRoutes } = useQuery({
    queryKey: ['admin-transport-routes'],
    queryFn: () => adminApi.getTransportRoutes(),
  });
  const { data: students = [] } = useQuery({
    queryKey: ['admin-students-campus'],
    queryFn: () => adminApi.getStudents(),
  });

  const [planForm, setPlanForm] = useState({
    name: '',
    academicYear: year,
    priceAmount: '',
    menuNotes: '',
    maxSubscribers: '',
    isPublished: true,
  });
  const [routeForm, setRouteForm] = useState({
    name: '',
    academicYear: year,
    departureArea: '',
    arrivalArea: '',
    scheduleNotes: '',
    capacity: '',
    priceAmount: '',
    driverName: '',
    isPublished: true,
  });
  const [enroll, setEnroll] = useState({ studentId: '', planId: '', routeId: '', stopLabel: '' });
  const [trackingRouteId, setTrackingRouteId] = useState('');
  const [pingForm, setPingForm] = useState({ latitude: '', longitude: '', note: '' });

  const { data: tracking } = useQuery({
    queryKey: ['admin-transport-tracking', trackingRouteId],
    queryFn: () => adminApi.getTransportTracking(trackingRouteId, { limit: 10 }),
    enabled: !!trackingRouteId && tab === 'transport',
    refetchInterval: trackingRouteId ? 15000 : false,
  });

  const postPing = useMutation({
    mutationFn: () =>
      adminApi.postTransportPing(trackingRouteId, {
        latitude: parseFloat(pingForm.latitude),
        longitude: parseFloat(pingForm.longitude),
        note: pingForm.note || undefined,
      }),
    onSuccess: () => {
      toast.success('Position GPS enregistrée');
      qc.invalidateQueries({ queryKey: ['admin-transport-tracking', trackingRouteId] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Erreur GPS'),
  });

  const createPlan = useMutation({
    mutationFn: () =>
      adminApi.createCanteenPlan({
        ...planForm,
        priceAmount: parseFloat(planForm.priceAmount) || 0,
        maxSubscribers: planForm.maxSubscribers ? parseInt(planForm.maxSubscribers, 10) : null,
        weekdays: ['LUN', 'MAR', 'MER', 'JEU', 'VEN'],
      }),
    onSuccess: () => {
      toast.success('Formule cantine créée');
      qc.invalidateQueries({ queryKey: ['admin-canteen-plans'] });
      setPlanForm((f) => ({ ...f, name: '', priceAmount: '', menuNotes: '', maxSubscribers: '' }));
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Erreur'),
  });

  const createRoute = useMutation({
    mutationFn: () =>
      adminApi.createTransportRoute({
        ...routeForm,
        priceAmount: parseFloat(routeForm.priceAmount) || 0,
        capacity: routeForm.capacity ? parseInt(routeForm.capacity, 10) : null,
      }),
    onSuccess: () => {
      toast.success('Ligne de transport créée');
      qc.invalidateQueries({ queryKey: ['admin-transport-routes'] });
      setRouteForm((f) => ({
        ...f,
        name: '',
        departureArea: '',
        arrivalArea: '',
        scheduleNotes: '',
        capacity: '',
        priceAmount: '',
        driverName: '',
      }));
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Erreur'),
  });

  const enrollCanteen = useMutation({
    mutationFn: () =>
      adminApi.createCanteenSubscription({ studentId: enroll.studentId, planId: enroll.planId }),
    onSuccess: () => {
      toast.success('Élève inscrit à la cantine');
      qc.invalidateQueries({ queryKey: ['admin-canteen-plans'] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Erreur'),
  });

  const enrollTransport = useMutation({
    mutationFn: () =>
      adminApi.createTransportSubscription({
        studentId: enroll.studentId,
        routeId: enroll.routeId,
        stopLabel: enroll.stopLabel || undefined,
      }),
    onSuccess: () => {
      toast.success('Élève inscrit au transport');
      qc.invalidateQueries({ queryKey: ['admin-transport-routes'] });
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      toast.error(e.response?.data?.error || 'Erreur'),
  });

  const deletePlan = useMutation({
    mutationFn: (id: string) => adminApi.deleteCanteenPlan(id),
    onSuccess: () => {
      toast.success('Formule supprimée');
      qc.invalidateQueries({ queryKey: ['admin-canteen-plans'] });
    },
  });

  const deleteRoute = useMutation({
    mutationFn: (id: string) => adminApi.deleteTransportRoute(id),
    onSuccess: () => {
      toast.success('Ligne supprimée');
      qc.invalidateQueries({ queryKey: ['admin-transport-routes'] });
    },
  });

  const studentOptions = useMemo(
    () =>
      (students as any[]).map((s) => ({
        id: s.id as string,
        label: `${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''} — ${s.class?.name ?? 'Sans classe'}`,
      })),
    [students]
  );

  return (
    <div className={ADM.root}>
      <div>
        <h2 className={ADM.h2}>Cantine & transport</h2>
        <p className={ADM.intro}>
          Formules repas, lignes de bus, inscriptions élèves et notifications parents.
        </p>
      </div>

      <div className={ADM.tabRow}>
        {(
          [
            { id: 'canteen' as const, label: 'Cantine', icon: FiCoffee },
            { id: 'transport' as const, label: 'Transport', icon: FiTruck },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={ADM.tabBtn(tab === t.id, 'bg-amber-50 text-amber-950 ring-1 ring-amber-200')}
            >
              <Icon className={ADM.tabIcon} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'canteen' && (
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">Nouvelle formule cantine</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Nom" value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} />
              <Input
                label="Année"
                value={planForm.academicYear}
                onChange={(e) => setPlanForm({ ...planForm, academicYear: e.target.value })}
              />
              <Input
                label="Prix (FCFA)"
                type="number"
                value={planForm.priceAmount}
                onChange={(e) => setPlanForm({ ...planForm, priceAmount: e.target.value })}
              />
              <Input
                label="Capacité max"
                type="number"
                value={planForm.maxSubscribers}
                onChange={(e) => setPlanForm({ ...planForm, maxSubscribers: e.target.value })}
              />
              <Input
                label="Menu / notes"
                value={planForm.menuNotes}
                onChange={(e) => setPlanForm({ ...planForm, menuNotes: e.target.value })}
              />
              <label className="flex items-end gap-2 text-sm pb-2">
                <input
                  type="checkbox"
                  checked={planForm.isPublished}
                  onChange={(e) => setPlanForm({ ...planForm, isPublished: e.target.checked })}
                />
                Publié (visible parents)
              </label>
            </div>
            <Button type="button" size="sm" onClick={() => createPlan.mutate()} disabled={createPlan.isPending || !planForm.name}>
              Créer la formule
            </Button>
          </Card>

          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">Inscrire un élève</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              <select
                className="rounded-lg border px-3 py-2 text-sm"
                value={enroll.studentId}
                onChange={(e) => setEnroll({ ...enroll, studentId: e.target.value })}
                aria-label="Élève"
              >
                <option value="">Élève…</option>
                {studentOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg border px-3 py-2 text-sm"
                value={enroll.planId}
                onChange={(e) => setEnroll({ ...enroll, planId: e.target.value })}
                aria-label="Formule"
              >
                <option value="">Formule…</option>
                {(plans as any[]).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.academicYear})
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                onClick={() => enrollCanteen.mutate()}
                disabled={!enroll.studentId || !enroll.planId || enrollCanteen.isPending}
              >
                Inscrire
              </Button>
            </div>
          </Card>

          <Card className="overflow-hidden">
            {loadingPlans ? (
              <div className="p-6 text-center text-gray-500">Chargement…</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Formule</th>
                    <th className="px-3 py-2">Année</th>
                    <th className="px-3 py-2 text-right">Prix</th>
                    <th className="px-3 py-2 text-right">Inscrits</th>
                    <th className="px-3 py-2">Statut</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {(plans as any[]).map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="px-3 py-2">{p.academicYear}</td>
                      <td className="px-3 py-2 text-right">{formatFCFA(p.priceAmount)}</td>
                      <td className="px-3 py-2 text-right">{p._count?.subscriptions ?? 0}</td>
                      <td className="px-3 py-2">{p.isPublished ? 'Publié' : 'Brouillon'}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="text-red-600 text-xs"
                          onClick={() => {
                            if (window.confirm('Supprimer cette formule ?')) deletePlan.mutate(p.id);
                          }}
                        >
                          Suppr.
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {tab === 'transport' && (
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">Nouvelle ligne de transport</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Input label="Nom ligne" value={routeForm.name} onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })} />
              <Input
                label="Année"
                value={routeForm.academicYear}
                onChange={(e) => setRouteForm({ ...routeForm, academicYear: e.target.value })}
              />
              <Input
                label="Départ"
                value={routeForm.departureArea}
                onChange={(e) => setRouteForm({ ...routeForm, departureArea: e.target.value })}
              />
              <Input
                label="Arrivée"
                value={routeForm.arrivalArea}
                onChange={(e) => setRouteForm({ ...routeForm, arrivalArea: e.target.value })}
              />
              <Input
                label="Horaires"
                value={routeForm.scheduleNotes}
                onChange={(e) => setRouteForm({ ...routeForm, scheduleNotes: e.target.value })}
              />
              <Input
                label="Chauffeur"
                value={routeForm.driverName}
                onChange={(e) => setRouteForm({ ...routeForm, driverName: e.target.value })}
              />
              <Input
                label="Capacité"
                type="number"
                value={routeForm.capacity}
                onChange={(e) => setRouteForm({ ...routeForm, capacity: e.target.value })}
              />
              <Input
                label="Prix (FCFA)"
                type="number"
                value={routeForm.priceAmount}
                onChange={(e) => setRouteForm({ ...routeForm, priceAmount: e.target.value })}
              />
              <label className="flex items-end gap-2 text-sm pb-2">
                <input
                  type="checkbox"
                  checked={routeForm.isPublished}
                  onChange={(e) => setRouteForm({ ...routeForm, isPublished: e.target.checked })}
                />
                Publié
              </label>
            </div>
            <Button type="button" size="sm" onClick={() => createRoute.mutate()} disabled={createRoute.isPending || !routeForm.name}>
              Créer la ligne
            </Button>
          </Card>

          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">Inscrire un élève</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <select
                className="rounded-lg border px-3 py-2 text-sm"
                value={enroll.studentId}
                onChange={(e) => setEnroll({ ...enroll, studentId: e.target.value })}
                aria-label="Élève transport"
              >
                <option value="">Élève…</option>
                {studentOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <select
                className="rounded-lg border px-3 py-2 text-sm"
                value={enroll.routeId}
                onChange={(e) => setEnroll({ ...enroll, routeId: e.target.value })}
                aria-label="Ligne"
              >
                <option value="">Ligne…</option>
                {(routes as any[]).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <Input
                label="Arrêt"
                value={enroll.stopLabel}
                onChange={(e) => setEnroll({ ...enroll, stopLabel: e.target.value })}
              />
              <Button
                type="button"
                size="sm"
                className="self-end"
                onClick={() => enrollTransport.mutate()}
                disabled={!enroll.studentId || !enroll.routeId || enrollTransport.isPending}
              >
                Inscrire
              </Button>
            </div>
          </Card>

          <Card className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">Suivi GPS du bus</h3>
            <select
              className="rounded-lg border px-3 py-2 text-sm w-full max-w-md"
              value={trackingRouteId}
              onChange={(e) => setTrackingRouteId(e.target.value)}
              aria-label="Ligne à suivre"
            >
              <option value="">Choisir une ligne…</option>
              {(routes as any[]).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {tracking?.latest ? (
              <p className="text-xs text-gray-700">
                Dernière position : {tracking.latest.latitude.toFixed(5)},{' '}
                {tracking.latest.longitude.toFixed(5)}
                {tracking.latest.recordedAt
                  ? ` — ${new Date(tracking.latest.recordedAt).toLocaleString('fr-FR')}`
                  : ''}
                {tracking.latest.note ? ` (${tracking.latest.note})` : ''}
              </p>
            ) : trackingRouteId ? (
              <p className="text-xs text-gray-500">Aucun ping GPS pour cette ligne.</p>
            ) : null}
            {trackingRouteId && (
              <div className="grid gap-2 sm:grid-cols-3">
                <Input
                  label="Latitude"
                  value={pingForm.latitude}
                  onChange={(e) => setPingForm({ ...pingForm, latitude: e.target.value })}
                />
                <Input
                  label="Longitude"
                  value={pingForm.longitude}
                  onChange={(e) => setPingForm({ ...pingForm, longitude: e.target.value })}
                />
                <Input
                  label="Note"
                  value={pingForm.note}
                  onChange={(e) => setPingForm({ ...pingForm, note: e.target.value })}
                />
                <Button
                  type="button"
                  size="sm"
                  className="self-end"
                  onClick={() => postPing.mutate()}
                  disabled={
                    !pingForm.latitude || !pingForm.longitude || postPing.isPending
                  }
                >
                  Enregistrer un ping
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="self-end"
                  onClick={() => {
                    if (!navigator.geolocation) {
                      toast.error('Géolocalisation indisponible');
                      return;
                    }
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        setPingForm({
                          ...pingForm,
                          latitude: String(pos.coords.latitude),
                          longitude: String(pos.coords.longitude),
                        });
                        toast.success('Position du navigateur récupérée');
                      },
                      () => toast.error('Impossible d’obtenir la position')
                    );
                  }}
                >
                  Ma position
                </Button>
              </div>
            )}
          </Card>

          <Card className="overflow-hidden">
            {loadingRoutes ? (
              <div className="p-6 text-center text-gray-500">Chargement…</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-3 py-2">Ligne</th>
                    <th className="px-3 py-2">Trajet</th>
                    <th className="px-3 py-2 text-right">Prix</th>
                    <th className="px-3 py-2 text-right">Places</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {(routes as any[]).map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {r.departureArea || '—'} → {r.arrivalArea || '—'}
                      </td>
                      <td className="px-3 py-2 text-right">{formatFCFA(r.priceAmount)}</td>
                      <td className="px-3 py-2 text-right">
                        {r._count?.subscriptions ?? 0}
                        {r.capacity != null ? ` / ${r.capacity}` : ''}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="text-sky-700 text-xs mr-2"
                          onClick={() => setTrackingRouteId(r.id)}
                        >
                          GPS
                        </button>
                        <button
                          type="button"
                          className="text-red-600 text-xs"
                          onClick={() => {
                            if (window.confirm('Supprimer cette ligne ?')) deleteRoute.mutate(r.id);
                          }}
                        >
                          Suppr.
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default CampusServicesModule;
