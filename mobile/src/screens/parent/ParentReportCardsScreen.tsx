import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList } from 'react-native';
import { parentApi } from '../../api/parent';
import { colors } from '../../theme';
import {
  PremiumButton,
  PremiumCard,
  PremiumEmpty,
  PremiumInput,
  PremiumListItem,
  PremiumRow,
} from '../../components/premium/PremiumUi';
import { ParentModuleShell } from './ParentModuleShell';
import { useParentChild } from '../../context/ParentChildContext';
import { apiError, str } from '../../lib/format';

type OfficialPayload = Awaited<ReturnType<typeof parentApi.getChildOfficialReportCard>>;

export default function ParentReportCardsScreen() {
  const { selectedId } = useParentChild();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [signature, setSignature] = useState('');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [official, setOfficial] = useState<OfficialPayload | null>(null);
  const [officialLoading, setOfficialLoading] = useState(false);

  const load = async (id: string) => {
    setLoading(true);
    try {
      const res = await parentApi.getChildReportCards(id);
      setRows(res.reportCards);
      setHidden(res.tuitionBlock?.hiddenAcademicYears ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedId) void load(selectedId);
    setSelected(null);
    setOfficial(null);
  }, [selectedId]);

  const openDetail = async (item: Record<string, unknown>) => {
    if (!selectedId) return;
    setSelected(item);
    setOfficial(null);
    setOfficialLoading(true);
    try {
      const payload = await parentApi.getChildOfficialReportCard(selectedId, String(item.id));
      setOfficial(payload);
    } catch (err) {
      Alert.alert('Bulletin', apiError(err, 'Impossible de charger le bulletin officiel.'));
      setSelected(null);
    } finally {
      setOfficialLoading(false);
    }
  };

  const acknowledge = async () => {
    if (!selectedId || !selected) return;
    if (!signature.trim()) {
      Alert.alert('Signature', 'Saisissez votre nom pour accuser réception.');
      return;
    }
    try {
      await parentApi.acknowledgeReportCard(selectedId, String(selected.id), signature.trim());
      await load(selectedId);
      setSelected({ ...selected, parentAcknowledgedAt: new Date().toISOString() });
      Alert.alert('Enregistré', 'Accusé de réception transmis.');
    } catch (err) {
      Alert.alert('Erreur', apiError(err, 'Signature impossible.'));
    }
  };

  const courses = official?.student?.allCourses ?? [];
  const averages = official?.student?.courseAverages ?? {};
  const ack = Boolean(selected?.parentAcknowledgedAt || selected?.acknowledgedAt);

  return (
    <ParentModuleShell
      eyebrow="Scolarité"
      title={selected ? str(selected.period, 'Bulletin') : 'Bulletins'}
      subtitle={
        selected
          ? str(selected.academicYear)
          : hidden.length
            ? `Accès limité · ${hidden.join(', ')}`
            : undefined
      }
      scroll={Boolean(selected)}
    >
      {selected ? (
        <>
          <PremiumButton label="Retour à la liste" variant="ghost" onPress={() => { setSelected(null); setOfficial(null); }} />
          {officialLoading ? <ActivityIndicator color={colors.gold} /> : null}
          <PremiumCard eyebrow="Synthèse" title={`${str(selected.period)} · ${str(selected.academicYear)}`}>
            <PremiumRow
              title="Moyenne"
              value={typeof selected.average === 'number' ? `${selected.average.toFixed(2)}/20` : '—'}
            />
            <PremiumRow title="Rang" value={selected.rank != null ? String(selected.rank) : '—'} />
            <PremiumRow
              title="Absences"
              value={String(official?.student?.absences?.total ?? '—')}
            />
            <PremiumRow
              title="Retards"
              value={String(official?.student?.absences?.late ?? '—')}
              last
            />
          </PremiumCard>
          <PremiumCard eyebrow="Matières" title="Notes du bulletin officiel">
            {courses.length === 0 ? (
              <PremiumRow title="Aucune matière" value="—" last />
            ) : (
              courses.map((course, i) => (
                <PremiumRow
                  key={course.id}
                  title={course.name}
                  subtitle={course.teacherName}
                  value={
                    typeof averages[course.id]?.average === 'number'
                      ? `${averages[course.id]!.average!.toFixed(2)}/20`
                      : '—'
                  }
                  last={i === courses.length - 1}
                />
              ))
            )}
          </PremiumCard>
          {str(selected.comments || official?.comments, '') ? (
            <PremiumCard eyebrow="Appréciation" title="Commentaires">
              <PremiumRow title={str(selected.comments || official?.comments)} value="" last />
            </PremiumCard>
          ) : null}
          {!ack ? (
            <>
              <PremiumInput
                placeholder="Signature pour accusé de réception"
                value={signature}
                onChangeText={setSignature}
                style={{ marginBottom: 10 }}
              />
              <PremiumButton label="Accuser réception" onPress={() => void acknowledge()} />
            </>
          ) : (
            <PremiumRow title="Accusé de réception" value="Signé" last />
          )}
        </>
      ) : (
        <>
          <PremiumInput
            placeholder="Signature pour accusé de réception"
            value={signature}
            onChangeText={setSignature}
            style={{ marginBottom: 10 }}
          />
          {loading ? (
            <ActivityIndicator color={colors.gold} />
          ) : rows.length === 0 ? (
            <PremiumEmpty icon="document-text-outline" title="Aucun bulletin" />
          ) : (
            <FlatList
              data={rows}
              keyExtractor={(item, i) => str(item.id, String(i))}
              renderItem={({ item }) => {
                const avg = typeof item.average === 'number' ? `${item.average.toFixed(1)}/20` : '—';
                const signed = Boolean(item.parentAcknowledgedAt || item.acknowledgedAt);
                return (
                  <PremiumListItem
                    title={`${str(item.period)} · ${str(item.academicYear)}`}
                    subtitle={signed ? 'Accusé reçu · voir le bulletin' : 'Toucher pour voir le bulletin officiel'}
                    value={avg}
                    accent={!signed}
                    onPress={() => void openDetail(item)}
                  />
                );
              }}
            />
          )}
        </>
      )}
    </ParentModuleShell>
  );
}
