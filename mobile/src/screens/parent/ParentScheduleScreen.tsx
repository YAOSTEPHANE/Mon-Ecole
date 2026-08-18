import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { parentApi } from '../../api/parent';
import { colors } from '../../theme';
import { PremiumChipRow, PremiumEmpty, PremiumFilterChip, PremiumListItem } from '../../components/premium/PremiumUi';
import { ParentModuleShell } from './ParentModuleShell';
import { useParentChild } from '../../context/ParentChildContext';
import { str } from '../../lib/format';

const DAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
];

export default function ParentScheduleScreen() {
  const { selectedId } = useParentChild();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);
  const [day, setDay] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedId) return;
    void (async () => {
      setLoading(true);
      try {
        setRows(await parentApi.getChildSchedule(selectedId));
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedId]);

  const filtered = useMemo(
    () => (day == null ? rows : rows.filter((r) => Number(r.dayOfWeek) === day)),
    [rows, day],
  );

  return (
    <ParentModuleShell eyebrow="Scolarité" title="Emploi du temps">
      <PremiumChipRow>
        {DAYS.map((item) => (
          <PremiumFilterChip
            key={item.value}
            label={item.label}
            active={day === item.value}
            onPress={() => setDay((prev) => (prev === item.value ? null : item.value))}
          />
        ))}
      </PremiumChipRow>
      {loading ? (
        <ActivityIndicator color={colors.gold} />
      ) : filtered.length === 0 ? (
        <PremiumEmpty icon="time-outline" title="Aucun créneau" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => str(item.id, String(i))}
          renderItem={({ item }) => {
            const course = item.course as { name?: string } | undefined;
            const dow = DAYS.find((d) => d.value === Number(item.dayOfWeek))?.label ?? '';
            return (
              <PremiumListItem
                title={str(course?.name, str(item.courseName, 'Cours'))}
                subtitle={[dow, str(item.room), str(item.teacherName)].filter((s) => s && s !== '—').join(' · ')}
                value={`${str(item.startTime)}–${str(item.endTime)}`}
              />
            );
          }}
        />
      )}
    </ParentModuleShell>
  );
}
