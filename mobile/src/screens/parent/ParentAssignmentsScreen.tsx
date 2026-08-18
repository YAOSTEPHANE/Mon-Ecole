import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { parentApi } from '../../api/parent';
import { colors } from '../../theme';
import { PremiumEmpty, PremiumListItem } from '../../components/premium/PremiumUi';
import { ParentModuleShell } from './ParentModuleShell';
import { useParentChild } from '../../context/ParentChildContext';
import { fmtDate, str } from '../../lib/format';

export default function ParentAssignmentsScreen() {
  const { selectedId } = useParentChild();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    void (async () => {
      setLoading(true);
      try {
        setRows(await parentApi.getChildAssignments(selectedId));
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedId]);

  const data = useMemo(
    () =>
      rows.map((row, i) => {
        const assignment = (row.assignment as Record<string, unknown> | undefined) ?? row;
        const course = assignment.course as { name?: string } | undefined;
        const due = str(assignment.dueDate);
        const submitted = Boolean(row.submitted ?? assignment.submitted);
        const overdue = !submitted && due !== '—' && new Date(due) < new Date();
        return {
          key: str(row.id ?? assignment.id, String(i)),
          title: str(assignment.title, 'Devoir'),
          subtitle: [course?.name, due !== '—' ? `Échéance ${fmtDate(due)}` : null].filter(Boolean).join(' · '),
          value: submitted ? 'Rendu' : overdue ? 'En retard' : 'À faire',
        };
      }),
    [rows],
  );

  return (
    <ParentModuleShell eyebrow="Scolarité" title="Devoirs">
      {loading ? (
        <ActivityIndicator color={colors.gold} />
      ) : data.length === 0 ? (
        <PremiumEmpty icon="book-outline" title="Aucun devoir" />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <PremiumListItem title={item.title} subtitle={item.subtitle} value={item.value} accent={item.value === 'En retard'} />
          )}
        />
      )}
    </ParentModuleShell>
  );
}
