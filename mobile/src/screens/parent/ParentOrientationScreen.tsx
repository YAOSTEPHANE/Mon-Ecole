import React, { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { parentApi } from '../../api/parent';
import { colors } from '../../theme';
import { PremiumCard, PremiumListItem, PremiumRow } from '../../components/premium/PremiumUi';
import { ParentModuleShell } from './ParentModuleShell';
import { useParentChild } from '../../context/ParentChildContext';
import { str } from '../../lib/format';

export default function ParentOrientationScreen() {
  const { selectedId } = useParentChild();
  const [catalog, setCatalog] = useState<{
    filieres?: Record<string, unknown>[];
    partnerships?: Record<string, unknown>[];
    aptitudeTests?: Record<string, unknown>[];
    advice?: Record<string, unknown>[];
  }>({});
  const [followUps, setFollowUps] = useState<Record<string, unknown>[]>([]);
  const [placements, setPlacements] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const cat = await parentApi.getOrientationCatalog();
        setCatalog(cat);
        if (selectedId) {
          const [f, p] = await Promise.all([
            parentApi.getChildOrientationFollowUps(selectedId),
            parentApi.getChildOrientationPlacements(selectedId),
          ]);
          setFollowUps(f);
          setPlacements(p);
        }
      } catch {
        setCatalog({});
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedId]);

  return (
    <ParentModuleShell eyebrow="Parcours" title="Orientation" requireChild={false} scroll>
      {loading ? <ActivityIndicator color={colors.gold} /> : null}
      <PremiumCard eyebrow="Catalogue" title="Filières">
        {(catalog.filieres ?? []).length === 0 ? (
          <PremiumRow title="Aucune filière publiée" value="—" last />
        ) : (
          (catalog.filieres ?? []).map((f, i) => (
            <PremiumListItem key={str(f.id, String(i))} title={str(f.name || f.title)} subtitle={str(f.description)} />
          ))
        )}
      </PremiumCard>
      <PremiumCard eyebrow="Partenaires" title="Établissements">
        {(catalog.partnerships ?? []).length === 0 ? (
          <PremiumRow title="Aucun partenariat publié" value="—" last />
        ) : (
          (catalog.partnerships ?? []).map((p, i) => (
            <PremiumListItem
              key={str(p.id, String(i))}
              title={str(p.name || p.title)}
              subtitle={str(p.description || p.kind)}
            />
          ))
        )}
      </PremiumCard>
      <PremiumCard eyebrow="Conseils" title="Parents">
        {(catalog.advice ?? []).slice(0, 8).map((a, i) => (
          <PremiumRow key={str(a.id, String(i))} title={str(a.title)} subtitle={str(a.content || a.body)} value="" last={i === (catalog.advice ?? []).length - 1} />
        ))}
      </PremiumCard>
      <PremiumCard eyebrow="Tests" title="Aptitudes">
        {(catalog.aptitudeTests ?? []).length === 0 ? (
          <PremiumRow title="Aucun test référencé" value="—" last />
        ) : (
          (catalog.aptitudeTests ?? []).map((t, i) => (
            <PremiumListItem
              key={str(t.id, String(i))}
              title={str(t.name || t.title)}
              subtitle={str(t.description)}
            />
          ))
        )}
      </PremiumCard>
      {selectedId ? (
        <>
          <PremiumCard eyebrow="Suivi" title="Entretiens">
            {followUps.length === 0 ? (
              <PremiumRow title="Aucun suivi" value="—" last />
            ) : (
              followUps.map((f, i) => (
                <PremiumRow
                  key={str(f.id, String(i))}
                  title={str(f.status || f.title)}
                  subtitle={str(f.notes || f.comment)}
                  value=""
                  last={i === followUps.length - 1}
                />
              ))
            )}
          </PremiumCard>
          <PremiumCard eyebrow="Stages" title="Placements">
            {placements.length === 0 ? (
              <PremiumRow title="Aucun stage" value="—" last />
            ) : (
              placements.map((p, i) => (
                <PremiumRow
                  key={str(p.id, String(i))}
                  title={str(p.organization || p.title)}
                  subtitle={str(p.kind || p.status)}
                  value=""
                  last={i === placements.length - 1}
                />
              ))
            )}
          </PremiumCard>
        </>
      ) : null}
    </ParentModuleShell>
  );
}
