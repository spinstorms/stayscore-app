import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAdaptiveLayout } from '../lib/layout';
import { Colors } from '../lib/theme';

export type Section<K extends string> = { key: K; label: string; render: () => React.ReactNode };

/**
 * Two screens under one rail button (Watch & Deals, Holidays & Insights): a pill switch at the
 * top, the chosen screen below. Both stay built once opened, so switching back is instant.
 */
export function SectionSwitch<K extends string>({
  sections,
  value,
  onChange,
}: {
  sections: Section<K>[];
  value: K;
  onChange: (k: K) => void;
}) {
  const { horizontalPadding } = useAdaptiveLayout();
  const [opened, setOpened] = React.useState<K[]>([value]);
  React.useEffect(() => {
    setOpened((o) => (o.includes(value) ? o : [...o, value]));
  }, [value]);

  return (
    <View style={styles.screen}>
      <View style={[styles.bar, { paddingHorizontal: horizontalPadding }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
          {sections.map((s) => {
            const on = s.key === value;
            return (
              <Pressable
                key={s.key}
                onPress={() => onChange(s.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={[styles.pill, on && styles.pillOn]}
              >
                <Text style={[styles.pillText, on && styles.pillTextOn]}>{s.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      {sections.map((s) =>
        opened.includes(s.key) ? (
          <View key={s.key} style={[styles.body, s.key !== value && styles.hidden]}>
            {s.render()}
          </View>
        ) : null
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.bgCanvas },
  bar: {
    backgroundColor: Colors.bgWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 10,
  },
  pills: { gap: 8 },
  pill: {
    minHeight: 40,
    paddingHorizontal: 18,
    borderRadius: 999,
    justifyContent: 'center',
    backgroundColor: Colors.bgCanvas,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillOn: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  pillText: { fontSize: 14, fontWeight: '700', color: Colors.inkSecondary },
  pillTextOn: { color: '#FFFFFF' },
  body: { flex: 1 },
  hidden: { display: 'none' },
});
