import React, { useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { colors } from '../theme';
import { PremiumChipRow, PremiumEmpty, PremiumFilterChip } from '../components/premium/PremiumUi';
import { childDisplayName, useParentChild } from '../context/ParentChildContext';

type Props = {
  onPick?: (childId: string) => void;
  selectedId?: string | null;
};

export default function ParentChildPicker({ onPick, selectedId }: Props) {
  const { childrenList, selectedId: ctxId, setSelectedId, loading } = useParentChild();
  const activeId = selectedId ?? ctxId;

  useEffect(() => {
    if (activeId) onPick?.(activeId);
  }, [activeId, onPick]);

  if (loading) {
    return <ActivityIndicator color={colors.gold} style={{ marginBottom: 12 }} />;
  }

  if (childrenList.length === 0) {
    return (
      <PremiumEmpty
        icon="people-outline"
        title="Aucun enfant rattaché"
        body="Contactez l’établissement pour lier un élève à votre compte."
      />
    );
  }

  return (
    <PremiumChipRow>
      {childrenList.map((c) => (
        <PremiumFilterChip
          key={c.id}
          label={childDisplayName(c)}
          active={activeId === c.id}
          onPress={() => {
            setSelectedId(c.id);
            onPick?.(c.id);
          }}
        />
      ))}
    </PremiumChipRow>
  );
}
