import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList } from 'react-native';
import { parentApi } from '../../api/parent';
import { colors } from '../../theme';
import { PremiumEmpty, PremiumListItem } from '../../components/premium/PremiumUi';
import { ParentModuleShell } from './ParentModuleShell';
import { useParentChild } from '../../context/ParentChildContext';
import { apiError, str } from '../../lib/format';

export default function ParentExtracurricularScreen() {
  const { selectedId } = useParentChild();
  const [offerings, setOfferings] = useState<Record<string, unknown>[]>([]);
  const [regs, setRegs] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      const [o, r] = await Promise.all([
        parentApi.getChildExtracurricularOfferings(selectedId),
        parentApi.getChildExtracurricularRegistrations(selectedId),
      ]);
      setOfferings(o);
      setRegs(r);
    } catch {
      setOfferings([]);
      setRegs([]);
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void load();
  }, [load]);

  const registeredIds = new Set(
    regs.map((r) => String((r.offering as { id?: string } | undefined)?.id ?? r.offeringId ?? '')),
  );

  return (
    <ParentModuleShell eyebrow="Vie scolaire" title="Parascolaire">
      {loading ? (
        <ActivityIndicator color={colors.gold} />
      ) : offerings.length === 0 ? (
        <PremiumEmpty icon="football-outline" title="Aucune activité" />
      ) : (
        <FlatList
          data={offerings}
          keyExtractor={(item, i) => str(item.id, String(i))}
          renderItem={({ item }) => {
            const id = String(item.id);
            const enrolled = registeredIds.has(id);
            const reg = regs.find(
              (r) => String((r.offering as { id?: string } | undefined)?.id ?? r.offeringId) === id,
            );
            return (
              <PremiumListItem
                title={str(item.title)}
                subtitle={[str(item.kind || item.category), str(item.meetSchedule || item.location)].filter((s) => s !== '—').join(' · ')}
                value={enrolled ? 'Inscrit' : 'S’inscrire'}
                accent={enrolled}
                onPress={() => {
                  if (!selectedId) return;
                  void (async () => {
                    try {
                      if (enrolled && reg) {
                        await parentApi.deleteChildExtracurricularRegistration(selectedId, String(reg.id));
                      } else {
                        await parentApi.createChildExtracurricularRegistration(selectedId, id);
                      }
                      await load();
                    } catch (err) {
                      Alert.alert('Erreur', apiError(err, 'Action impossible.'));
                    }
                  })();
                }}
              />
            );
          }}
        />
      )}
    </ParentModuleShell>
  );
}
