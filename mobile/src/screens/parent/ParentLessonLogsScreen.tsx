import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { parentApi } from '../../api/parent';
import { colors } from '../../theme';
import { PremiumEmpty, PremiumListItem } from '../../components/premium/PremiumUi';
import { ParentModuleShell } from './ParentModuleShell';
import { useParentChild } from '../../context/ParentChildContext';
import { fmtDate, str } from '../../lib/format';

export default function ParentLessonLogsScreen() {
  const { selectedId } = useParentChild();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) return;
    void (async () => {
      setLoading(true);
      try {
        setRows(await parentApi.getChildLessonLogs(selectedId));
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedId]);

  return (
    <ParentModuleShell eyebrow="Scolarité" title="Cahier de texte">
      {loading ? (
        <ActivityIndicator color={colors.gold} />
      ) : rows.length === 0 ? (
        <PremiumEmpty icon="journal-outline" title="Aucune séance" />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, i) => str(item.id, String(i))}
          renderItem={({ item }) => {
            const course = item.course as { name?: string } | undefined;
            const teacher = item.teacher as { user?: { firstName?: string; lastName?: string } } | undefined;
            const name = `${teacher?.user?.firstName ?? ''} ${teacher?.user?.lastName ?? ''}`.trim();
            return (
              <PremiumListItem
                title={str(item.title, course?.name || 'Séance')}
                subtitle={[str(item.content || item.homework, ''), name].filter((s) => s && s !== '—').join(' · ')}
                value={fmtDate(str(item.date, undefined))}
              />
            );
          }}
        />
      )}
    </ParentModuleShell>
  );
}
