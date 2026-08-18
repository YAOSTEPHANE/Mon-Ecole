import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView } from 'react-native';
import { parentApi } from '../../api/parent';
import { colors } from '../../theme';
import { PremiumCard, PremiumEmpty, PremiumListItem, PremiumRow } from '../../components/premium/PremiumUi';
import { ParentModuleShell } from './ParentModuleShell';
import { useParentChild } from '../../context/ParentChildContext';
import { fmtDate, str } from '../../lib/format';

export default function ParentConductScreen() {
  const { selectedId } = useParentChild();
  const [conducts, setConducts] = useState<Record<string, unknown>[]>([]);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [rulebook, setRulebook] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    void (async () => {
      setLoading(true);
      try {
        const [c, d, r] = await Promise.all([
          parentApi.getChildConduct(selectedId),
          parentApi.getChildDisciplineRecords(selectedId),
          parentApi.getDisciplineRulebook(),
        ]);
        setConducts(c);
        setRecords(d);
        if (typeof r === 'string') setRulebook(r);
        else if (Array.isArray(r)) setRulebook(str((r[0] as Record<string, unknown> | undefined)?.content, ''));
        else setRulebook(str((r as Record<string, unknown>).content || (r as Record<string, unknown>).text, ''));
      } catch {
        setConducts([]);
        setRecords([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedId]);

  return (
    <ParentModuleShell eyebrow="Vie scolaire" title="Conduite" scroll>
      {loading ? <ActivityIndicator color={colors.gold} /> : null}
      <PremiumCard eyebrow="Appréciations" title="Conduite">
        {conducts.length === 0 ? (
          <PremiumRow title="Aucune appréciation" value="—" last />
        ) : (
          conducts.map((c, i) => (
            <PremiumRow
              key={str(c.id, String(i))}
              title={`${str(c.period)} · ${str(c.academicYear)}`}
              subtitle={str(c.comment || c.appreciation)}
              value={str(c.grade || c.score)}
              last={i === conducts.length - 1}
            />
          ))
        )}
      </PremiumCard>
      <PremiumCard eyebrow="Discipline" title="Dossiers">
        {records.length === 0 ? (
          <PremiumEmpty icon="shield-checkmark-outline" title="Aucun dossier disciplinaire" />
        ) : (
          records.map((r, i) => (
            <PremiumListItem
              key={str(r.id, String(i))}
              title={str(r.type || r.kind, 'Mesure')}
              subtitle={str(r.description || r.reason)}
              value={fmtDate(str(r.date || r.createdAt, undefined))}
            />
          ))
        )}
      </PremiumCard>
      {rulebook ? (
        <PremiumCard eyebrow="Règlement" title="Intérieur">
          <ScrollView style={{ maxHeight: 180 }}>
            <PremiumRow title={rulebook} value="" last />
          </ScrollView>
        </PremiumCard>
      ) : null}
    </ParentModuleShell>
  );
}
