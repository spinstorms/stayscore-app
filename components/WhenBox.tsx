import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  datedBookingUrl,
  defaultDates,
  findQuickDate,
  isValidRange,
  loadSavedDates,
  quickDates,
  rangeLabel,
  saveDates,
  shortDate,
  type TripDates,
} from '../lib/dates';
import { openExternalUrl } from '../lib/api';
import { Colors } from '../lib/theme';
import { routes } from '../lib/nav';

/**
 * "When are you going?" box from the website's hotel pages: quick dates (weekend, Christmas,
 * New Year, Valentine's, Easter, summer), remembered between hotels, and carried into the
 * booking link. `when` preselects a quick date (from the Holidays screen or a ?when= link).
 */
export function WhenBox({ bookingUrl, priceFrom, when }: { bookingUrl?: string; priceFrom?: string; when?: string }) {
  const router = useRouter();
  const quick = useMemo(() => quickDates(), []);
  const [dates, setDates] = useState<TripDates>(() => {
    const q = findQuickDate(when);
    return q ? { checkin: q.checkin, checkout: q.checkout, adults: 2 } : defaultDates();
  });
  const [picked, setPicked] = useState(Boolean(findQuickDate(when)));

  useEffect(() => {
    const q = findQuickDate(when);
    if (q) {
      const d = { checkin: q.checkin, checkout: q.checkout, adults: dates.adults };
      setDates(d);
      setPicked(true);
      saveDates(d);
      return;
    }
    let active = true;
    loadSavedDates().then((s) => {
      if (active && s) {
        setDates(s);
        setPicked(true);
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [when]);

  const update = (d: TripDates) => {
    setDates(d);
    setPicked(true);
    saveDates(d);
  };

  const label = picked ? rangeLabel(dates) : '';
  const url = bookingUrl ? datedBookingUrl(bookingUrl, dates) : '';

  return (
    <View style={styles.box}>
      <View style={styles.head}>
        <Text style={styles.title}>When are you going?</Text>
        {label ? <Text style={styles.picked}>{label}</Text> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
        {quick.map((q) => {
          const on = picked && q.checkin === dates.checkin && q.checkout === dates.checkout;
          return (
            <Pressable
              key={q.key}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => update({ checkin: q.checkin, checkout: q.checkout, adults: dates.adults })}
              style={[styles.chip, on && styles.chipOn]}
            >
              <Text style={[styles.chipLabel, on && styles.chipLabelOn]}>{q.label}</Text>
              <Text style={[styles.chipDates, on && styles.chipDatesOn]}>
                {shortDate(q.checkin)} – {shortDate(q.checkout)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.adultsRow}>
        <Text style={styles.adultsLabel}>Adults</Text>
        <Pressable
          accessibilityLabel="Fewer adults"
          hitSlop={8}
          onPress={() => update({ ...dates, adults: Math.max(1, dates.adults - 1) })}
          style={styles.stepBtn}
        >
          <Ionicons name="remove" size={16} color={Colors.navy} />
        </Pressable>
        <Text style={styles.adultsValue}>{dates.adults}</Text>
        <Pressable
          accessibilityLabel="More adults"
          hitSlop={8}
          onPress={() => update({ ...dates, adults: Math.min(8, dates.adults + 1) })}
          style={styles.stepBtn}
        >
          <Ionicons name="add" size={16} color={Colors.navy} />
        </Pressable>
        <Pressable style={styles.holidaysLink} onPress={() => router.push(routes.holidays() as never)}>
          <Text style={styles.holidaysLinkText}>Holiday ideas →</Text>
        </Pressable>
      </View>
      {bookingUrl ? (
        <Pressable style={styles.btnPrice} onPress={() => openExternalUrl(url)}>
          <Text style={styles.btnPriceText}>
            {isValidRange(dates) && picked
              ? `Check prices · ${shortDate(dates.checkin)}–${shortDate(dates.checkout)} ↗`
              : `Check prices${priceFrom ? ` · from ${priceFrom}` : ''} ↗`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: 10, marginTop: 4 },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 },
  title: { fontSize: 15, fontWeight: '800', color: Colors.inkPrimary },
  picked: { fontSize: 13, fontWeight: '700', color: '#15803D' },
  quickRow: { gap: 8, paddingRight: 4 },
  chip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: '#16A34A', borderColor: '#16A34A' },
  chipLabel: { fontSize: 13.5, fontWeight: '800', color: Colors.inkPrimary },
  chipLabelOn: { color: '#FFFFFF' },
  chipDates: { fontSize: 11.5, color: Colors.inkMuted, marginTop: 1 },
  chipDatesOn: { color: '#DCFCE7' },
  adultsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  adultsLabel: { fontSize: 13, fontWeight: '700', color: Colors.inkSecondary },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  adultsValue: { fontSize: 15, fontWeight: '800', color: Colors.inkPrimary, minWidth: 14, textAlign: 'center' },
  holidaysLink: { marginLeft: 'auto' },
  holidaysLinkText: { fontSize: 13, fontWeight: '700', color: Colors.accentDark },
  btnPrice: { backgroundColor: '#16A34A', borderRadius: 12, minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btnPriceText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
