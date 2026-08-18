import React, { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { getTabMeta, splitDockRoutes } from './tabConfig';

export default function PremiumTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [moreOpen, setMoreOpen] = useState(false);

  const { visible, overflow } = useMemo(
    () => splitDockRoutes(state.routes),
    [state.routes],
  );

  const overflowFocused = overflow.some((route) => state.routes[state.index]?.key === route.key);

  const goTo = (routeName: string, routeKey: string, focused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
    setMoreOpen(false);
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.dock}>
        <View style={styles.goldLine} />
        {visible.map((route) => {
          const focused = state.routes[state.index]?.key === route.key;
          const meta = getTabMeta(route.name);
          const options = descriptors[route.key]?.options;
          const label = meta.label || (typeof options?.tabBarLabel === 'string'
            ? options.tabBarLabel
            : route.name);

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={label}
              onPress={() => goTo(route.name, route.key, focused)}
              onLongPress={() =>
                navigation.emit({ type: 'tabLongPress', target: route.key })
              }
              style={styles.item}
            >
              <View style={[styles.iconWell, focused && styles.iconWellActive]}>
                <Ionicons
                  name={focused ? meta.iconActive : meta.icon}
                  size={20}
                  color={focused ? colors.dock : colors.dockMuted}
                />
              </View>
              <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}

        {overflow.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Plus"
            onPress={() => setMoreOpen(true)}
            style={styles.item}
          >
            <View style={[styles.iconWell, overflowFocused && styles.iconWellActive]}>
              <Ionicons
                name={overflowFocused || moreOpen ? 'grid' : 'grid-outline'}
                size={20}
                color={overflowFocused || moreOpen ? colors.dock : colors.dockMuted}
              />
            </View>
            <Text
              style={[styles.label, (overflowFocused || moreOpen) && styles.labelActive]}
            >
              Plus
            </Text>
          </Pressable>
        ) : null}
      </View>

      <Modal
        visible={moreOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMoreOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setMoreOpen(false)}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetEyebrow}>Espace</Text>
            <Text style={styles.sheetTitle}>Autres modules</Text>
            <ScrollView
              style={{ maxHeight: Math.min(height * 0.58, 520) }}
              contentContainerStyle={styles.sheetGrid}
              showsVerticalScrollIndicator={false}
            >
              {overflow.map((route) => {
                const focused = state.routes[state.index]?.key === route.key;
                const meta = getTabMeta(route.name);
                return (
                  <Pressable
                    key={route.key}
                    style={styles.sheetItem}
                    onPress={() => goTo(route.name, route.key, focused)}
                  >
                    <View style={[styles.sheetCard, focused && styles.sheetCardActive]}>
                      <View style={[styles.sheetIcon, focused && styles.sheetIconActive]}>
                        <Ionicons
                          name={focused ? meta.iconActive : meta.icon}
                          size={20}
                          color={focused ? colors.dock : colors.gold}
                        />
                      </View>
                      <Text style={styles.sheetLabel} numberOfLines={2}>
                        {meta.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bg,
    paddingHorizontal: 14,
    paddingTop: 6,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.dock,
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(235,176,45,0.22)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 18,
  },
  goldLine: {
    position: 'absolute',
    top: 0,
    left: 22,
    right: 22,
    height: 2,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.gold,
    opacity: 0.9,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 56,
  },
  iconWell: {
    width: 42,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWellActive: {
    backgroundColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: colors.dockMuted,
  },
  labelActive: {
    color: colors.gold,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12,10,9,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 14,
  },
  sheetEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: colors.navy,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ink,
    marginTop: 4,
    marginBottom: 16,
  },
  sheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    paddingBottom: 8,
  },
  sheetItem: {
    width: '33.33%',
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  sheetCard: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    padding: 12,
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetCardActive: {
    borderColor: colors.gold,
    backgroundColor: colors.accentSoft,
  },
  sheetIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.dock,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  sheetIconActive: {
    backgroundColor: colors.gold,
  },
  sheetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.ink,
    lineHeight: 16,
  },
});
