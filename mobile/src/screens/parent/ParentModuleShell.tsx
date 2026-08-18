import React, { type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { colors } from '../../theme';
import {
  PremiumEmpty,
  PremiumPageHeader,
  screenPad,
} from '../../components/premium/PremiumUi';
import ParentChildPicker from '../ParentChildPicker';
import { childDisplayName, useParentChild } from '../../context/ParentChildContext';

export function ParentModuleShell({
  eyebrow,
  title,
  subtitle,
  requireChild = true,
  scroll = false,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  requireChild?: boolean;
  scroll?: boolean;
  children: ReactNode;
}) {
  const { selectedId, selectedChild, loading } = useParentChild();
  const sub =
    subtitle ??
    (requireChild && selectedChild ? childDisplayName(selectedChild) : undefined);

  const inner = (
    <>
      {requireChild ? <ParentChildPicker /> : null}
      {loading ? <ActivityIndicator color={colors.gold} style={{ marginTop: 16 }} /> : null}
      {!loading && requireChild && !selectedId ? (
        <PremiumEmpty icon="people-outline" title="Choisissez un enfant" />
      ) : null}
      {!loading && (!requireChild || selectedId) ? children : null}
    </>
  );

  return (
    <View style={screenPad.root}>
      <PremiumPageHeader eyebrow={eyebrow} title={title} subtitle={sub} />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[screenPad.body, { paddingBottom: 36 }]}
          keyboardShouldPersistTaps="handled"
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={screenPad.fill}>{inner}</View>
      )}
    </View>
  );
}
