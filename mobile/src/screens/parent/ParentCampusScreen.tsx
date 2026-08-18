import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { parentApi } from '../../api/parent';
import { colors } from '../../theme';
import { PremiumCard, PremiumInput, PremiumListItem, PremiumRow } from '../../components/premium/PremiumUi';
import { ParentModuleShell } from './ParentModuleShell';
import { useParentChild } from '../../context/ParentChildContext';
import { apiError, str } from '../../lib/format';

export default function ParentCampusScreen() {
  const { selectedId } = useParentChild();
  const [plans, setPlans] = useState<Record<string, unknown>[]>([]);
  const [canteenSubs, setCanteenSubs] = useState<Record<string, unknown>[]>([]);
  const [routes, setRoutes] = useState<Record<string, unknown>[]>([]);
  const [transportSubs, setTransportSubs] = useState<Record<string, unknown>[]>([]);
  const [stop, setStop] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const [p, cs, r, ts] = await Promise.all([
        parentApi.getCanteenPlans(selectedId),
        parentApi.getCanteenSubscriptions(selectedId),
        parentApi.getTransportRoutes(selectedId),
        parentApi.getTransportSubscriptions(selectedId),
      ]);
      setPlans(p);
      setCanteenSubs(cs);
      setRoutes(r);
      setTransportSubs(ts);
    } catch {
      setPlans([]);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ParentModuleShell eyebrow="Campus" title="Cantine & transport" scroll>
      {loading ? <ActivityIndicator color={colors.gold} /> : null}
      <PremiumCard eyebrow="Cantine" title="Formules">
        {plans.length === 0 ? (
          <PremiumRow title="Aucune formule" value="—" last />
        ) : (
          plans.map((plan, i) => (
            <PremiumListItem
              key={str(plan.id, String(i))}
              title={str(plan.name || plan.title)}
              subtitle={str(plan.menu || plan.description)}
              value={typeof plan.price === 'number' ? `${Math.round(plan.price).toLocaleString('fr-FR')} F` : 'S’inscrire'}
              onPress={() => {
                if (!selectedId) return;
                void (async () => {
                  try {
                    await parentApi.subscribeCanteen(selectedId, String(plan.id));
                    await load();
                    Alert.alert('Cantine', 'Inscription enregistrée.');
                  } catch (err) {
                    Alert.alert('Erreur', apiError(err, 'Inscription cantine impossible.'));
                  }
                })();
              }}
            />
          ))
        )}
        {canteenSubs.length > 0 ? (
          <PremiumRow title={`${canteenSubs.length} abonnement(s) actif(s)`} value="" last />
        ) : null}
      </PremiumCard>

      <PremiumCard eyebrow="Transport" title="Lignes">
        <PremiumInput placeholder="Arrêt (optionnel)" value={stop} onChangeText={setStop} style={{ marginBottom: 10 }} />
        {routes.length === 0 ? (
          <PremiumRow title="Aucune ligne" value="—" last />
        ) : (
          routes.map((route, i) => (
            <PremiumListItem
              key={str(route.id, String(i))}
              title={str(route.name || route.label)}
              subtitle={str(route.description)}
              value="S’inscrire"
              onPress={() => {
                if (!selectedId) return;
                void (async () => {
                  try {
                    await parentApi.subscribeTransport(selectedId, {
                      routeId: String(route.id),
                      stopLabel: stop.trim() || undefined,
                    });
                    await load();
                    Alert.alert('Transport', 'Inscription enregistrée.');
                  } catch (err) {
                    Alert.alert('Erreur', apiError(err, 'Inscription transport impossible.'));
                  }
                })();
              }}
            />
          ))
        )}
        {transportSubs.length > 0 ? (
          <View>
            {transportSubs.map((s, i) => {
              const routeId = String((s.route as { id?: string } | undefined)?.id ?? s.routeId ?? '');
              return (
                <PremiumListItem
                  key={str(s.id, String(i))}
                  title={str((s.route as { name?: string } | undefined)?.name, 'Ligne')}
                  subtitle={str(s.stopLabel)}
                  value="Suivre"
                  onPress={
                    selectedId && routeId
                      ? () => {
                          void (async () => {
                            try {
                              const track = await parentApi.getTransportTracking(selectedId, routeId);
                              Alert.alert(
                                'Position du bus',
                                str(track.status || track.label || track.message, 'Suivi indisponible pour le moment.'),
                              );
                            } catch (err) {
                              Alert.alert('Erreur', apiError(err, 'Suivi indisponible.'));
                            }
                          })();
                        }
                      : undefined
                  }
                />
              );
            })}
          </View>
        ) : null}
      </PremiumCard>
    </ParentModuleShell>
  );
}
