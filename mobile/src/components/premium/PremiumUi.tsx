import React, { Children, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export const screenPad = {
  root: { flex: 1, backgroundColor: colors.bg } as const,
  body: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 } as const,
  fill: { flex: 1, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 } as const,
  home: { paddingHorizontal: 16, paddingBottom: 36 } as const,
  list: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28 } as const,
};

export function PremiumHero({
  eyebrow,
  title,
  subtitle,
  connected,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  connected: boolean;
}) {
  return (
    <View style={styles.hero}>
      <View style={styles.goldLine} />
      <View style={styles.heroTop}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <View style={[styles.livePill, connected ? styles.liveOn : styles.liveOff]}>
          <View style={[styles.liveDot, connected ? styles.liveDotOn : styles.liveDotOff]} />
          <Text style={[styles.liveText, connected ? styles.liveTextOn : styles.liveTextOff]}>
            {connected ? 'En ligne' : 'Hors ligne'}
          </Text>
        </View>
      </View>
      <Text style={styles.heroTitle}>{title}</Text>
      {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
    </View>
  );
}

export function PremiumCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      {eyebrow ? <Text style={styles.cardEyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function PremiumKpiGrid({ children }: { children: ReactNode }) {
  const count = Children.count(children);
  const wide = count === 1;
  return (
    <View style={styles.kpiGrid}>
      {Children.map(children, (child, index) => (
        <View key={index} style={[styles.kpiCell, wide && styles.kpiCellWide]}>
          {child}
        </View>
      ))}
    </View>
  );
}

export function PremiumKpi({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: IoniconName;
}) {
  return (
    <View style={styles.kpi}>
      <View style={styles.kpiIcon}>
        <Ionicons name={icon} size={16} color={colors.gold} />
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue} numberOfLines={2}>
        {value}
      </Text>
      {hint ? (
        <Text style={styles.kpiHint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function PremiumModuleGrid({ children }: { children: ReactNode }) {
  return <View style={styles.moduleGrid}>{children}</View>;
}

export function PremiumModuleTile({
  icon,
  label,
  hint,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  hint?: string;
  onPress?: () => void;
}) {
  const inner = (
    <View style={styles.tileInner}>
      <View style={styles.tileIcon}>
        <Ionicons name={icon} size={18} color={colors.gold} />
      </View>
      <Text style={styles.tileLabel} numberOfLines={2}>
        {label}
      </Text>
      {hint ? (
        <Text style={styles.tileHint} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
  return (
    <View style={styles.tileCell}>
      {onPress ? (
        <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
          {inner}
        </Pressable>
      ) : (
        inner
      )}
    </View>
  );
}

export function PremiumChipRow({
  children,
  style,
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return <View style={[styles.chipRow, style]}>{children}</View>;
}

export function PremiumFormStack({ children }: { children: ReactNode }) {
  return <View style={styles.formStack}>{children}</View>;
}

export function PremiumRow({
  title,
  subtitle,
  value,
  last,
  trailing,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  last?: boolean;
  trailing?: ReactNode;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSub} numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ??
        (value ? (
          <Text style={styles.rowValue} numberOfLines={2}>
            {value}
          </Text>
        ) : null)}
    </View>
  );
}

export function PremiumChip({
  icon,
  label,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  onPress?: () => void;
}) {
  const inner = (
    <>
      <Ionicons name={icon} size={14} color={colors.gold} />
      <Text style={styles.chipText}>{label}</Text>
    </>
  );
  if (!onPress) return <View style={styles.chip}>{inner}</View>;
  return (
    <Pressable style={styles.chip} onPress={onPress}>
      {inner}
    </Pressable>
  );
}

export function PremiumPageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.pageHeader, { paddingTop: Math.max(insets.top, 10) + 10 }]}>
      <View style={styles.goldLine} />
      <Text style={styles.pageEyebrow}>{eyebrow}</Text>
      <Text style={styles.pageTitle}>{title}</Text>
      {subtitle ? <Text style={styles.pageSub}>{subtitle}</Text> : null}
    </View>
  );
}

export function PremiumEmpty({
  icon,
  title,
  body,
}: {
  icon: IoniconName;
  title: string;
  body?: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={22} color={colors.gold} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
    </View>
  );
}

export function PremiumListItem({
  title,
  subtitle,
  value,
  onPress,
  accent,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  accent?: boolean;
}) {
  const inner = (
    <View style={[styles.listItem, accent && styles.listItemAccent]}>
      <View style={styles.rowMain}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSub} numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text style={styles.listValue} numberOfLines={2}>
          {value}
        </Text>
      ) : null}
      {onPress ? (
        <Ionicons name="chevron-forward" size={16} color={accent ? colors.navy : colors.muted} />
      ) : null}
    </View>
  );
  if (!onPress) return <View style={styles.listPress}>{inner}</View>;
  return (
    <Pressable onPress={onPress} style={styles.listPress}>
      {inner}
    </Pressable>
  );
}

export function PremiumFilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.filter, active && styles.filterActive]} onPress={onPress}>
      <Text style={[styles.filterText, active && styles.filterTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function PremiumButton({
  label,
  onPress,
  disabled,
  loading,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.btn,
        variant === 'ghost' && styles.btnGhost,
        variant === 'danger' && styles.btnDanger,
        (disabled || loading) && styles.btnDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? colors.ink : colors.gold} />
      ) : (
        <Text
          style={[
            styles.btnText,
            variant === 'ghost' && styles.btnGhostText,
            variant === 'danger' && styles.btnDangerText,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function PremiumInput(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.dock,
    borderRadius: 28,
    padding: 20,
    paddingBottom: 22,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(235,176,45,0.22)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
  goldLine: {
    position: 'absolute',
    top: 0,
    left: 22,
    right: 22,
    height: 2,
    backgroundColor: colors.gold,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: colors.gold,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fffdf9',
    letterSpacing: -0.4,
  },
  heroSub: {
    marginTop: 6,
    fontSize: 14,
    color: colors.dockMuted,
    fontWeight: '600',
    lineHeight: 20,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  liveOn: {
    backgroundColor: 'rgba(235,176,45,0.12)',
    borderColor: 'rgba(235,176,45,0.35)',
  },
  liveOff: {
    backgroundColor: 'rgba(190,18,60,0.12)',
    borderColor: 'rgba(254,205,211,0.35)',
  },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveDotOn: { backgroundColor: colors.gold },
  liveDotOff: { backgroundColor: '#fda4af' },
  liveText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  liveTextOn: { color: colors.gold },
  liveTextOff: { color: '#fecdd3' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 14,
    shadowColor: '#1c1917',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  cardEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.navy,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.ink,
    marginBottom: 14,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: 6,
  },
  kpiCell: {
    width: '50%',
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  kpiCellWide: {
    width: '100%',
  },
  kpi: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 108,
  },
  kpiIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.dock,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 4,
    lineHeight: 24,
  },
  kpiHint: { fontSize: 11, color: colors.muted, marginTop: 4 },
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  tileCell: {
    width: '50%',
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  tileInner: {
    backgroundColor: colors.dock,
    borderRadius: 18,
    padding: 14,
    minHeight: 104,
    borderWidth: 1,
    borderColor: 'rgba(235,176,45,0.22)',
  },
  tileIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(235,176,45,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tileLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fffdf9',
    lineHeight: 18,
  },
  tileHint: {
    marginTop: 4,
    fontSize: 11,
    color: colors.dockMuted,
    fontWeight: '600',
  },
  pressed: { opacity: 0.86 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  formStack: {
    gap: 10,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    gap: 12,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowMain: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.ink, lineHeight: 20 },
  rowSub: { fontSize: 12, color: colors.muted, marginTop: 3, lineHeight: 17 },
  rowValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
    maxWidth: '38%',
    textAlign: 'right',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.dock,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(235,176,45,0.22)',
  },
  chipText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#fffdf9',
    lineHeight: 16,
  },
  pageHeader: {
    backgroundColor: colors.dock,
    paddingHorizontal: 20,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderBottomWidth: 1,
    borderColor: 'rgba(235,176,45,0.22)',
    overflow: 'hidden',
  },
  pageEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.7,
    textTransform: 'uppercase',
    color: colors.gold,
    marginBottom: 6,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fffdf9',
    letterSpacing: -0.3,
  },
  pageSub: {
    marginTop: 5,
    fontSize: 13,
    color: colors.dockMuted,
    fontWeight: '600',
    lineHeight: 18,
  },
  empty: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.dock,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, textAlign: 'center' },
  emptyBody: {
    marginTop: 6,
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  listPress: { marginBottom: 10 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  listItemAccent: {
    borderColor: colors.gold,
    backgroundColor: colors.accentSoft,
  },
  listValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.navy,
    maxWidth: '34%',
    textAlign: 'right',
  },
  filter: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  filterActive: {
    backgroundColor: colors.dock,
    borderColor: 'rgba(235,176,45,0.35)',
  },
  filterText: { fontSize: 12, fontWeight: '700', color: colors.muted, maxWidth: 160 },
  filterTextActive: { color: colors.gold },
  btn: {
    backgroundColor: colors.dock,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(235,176,45,0.22)',
  },
  btnGhost: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  btnDanger: {
    backgroundColor: '#fff',
    borderColor: colors.danger,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: colors.gold, fontWeight: '800', fontSize: 14 },
  btnGhostText: { color: colors.ink },
  btnDangerText: { color: colors.danger },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: '#fff',
  },
});
