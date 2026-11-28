import { useBleed } from '../../../lib/layout';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { QuickFeedbackModal, RequestResortModal } from '../../../components/SupportModals';
import { openExternalUrl } from '../../../lib/api';
import { BRAND } from '../../../lib/brand';
import { useAdaptiveLayout } from '../../../lib/layout';
import { useStayOdds } from '../../../lib/store';
import { Colors } from '../../../lib/theme';
import type { AffiliateDeal } from '../../../lib/types';
import { lazyTab } from '../../../components/LazyTab';
import { t } from '../../../lib/i18n';

type DealSection = 'all' | 'promos' | 'gear';

export function DealsScreen() {
  const { deals, refreshing, refresh } = useStayOdds();
  const { isSplitScreen, gridColumns, horizontalPadding } = useAdaptiveLayout();
  // seamless rail: the page colours, and the orange banner, run under the rail
  const bleed = useBleed();

  const [section, setSection] = useState<DealSection>('all');
  const [query, setQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const promoCount = useMemo(
    () => deals.filter((d) => d.section === 'Promotions & Codes').length,
    [deals]
  );
  const gearCount = useMemo(
    () => deals.filter((d) => d.section !== 'Promotions & Codes').length,
    [deals]
  );

  const filteredDeals = useMemo(() => {
    const q = query.trim().toLowerCase();
    return deals.filter((d) => {
      if (section === 'promos' && d.section !== 'Promotions & Codes') return false;
      if (section === 'gear' && d.section === 'Promotions & Codes') return false;
      if (!q) return true;
      return (
        d.title.toLowerCase().includes(q) ||
        (d.category || '').toLowerCase().includes(q) ||
        (d.description || '').toLowerCase().includes(q) ||
        (d.promoCode || '').toLowerCase().includes(q)
      );
    });
  }, [deals, section, query]);

  const handleCopyCode = async (deal: AffiliateDeal) => {
    if (!deal.promoCode) return;
    await Clipboard.setStringAsync(deal.promoCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setCopiedId(deal.id);
    setTimeout(() => {
      setCopiedId((prev) => (prev === deal.id ? null : prev));
    }, 2200);
  };

  return (
    <ScrollView
      style={[styles.screen, bleed.root]}
      contentContainerStyle={[{ paddingBottom: 38 }, bleed.pad]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.accent} />}
    >
      {/* Header Banner */}
      <View style={[styles.banner, bleed.band(horizontalPadding)]}>
        <Text style={styles.bannerEyebrow}>{t("PERSONALLY CURATED PERKS & FILMING KIT")}</Text>
        <Text style={styles.bannerTitle}>{t("Our Active Discount Codes & Gear")}</Text>
        <Text style={styles.bannerSub}>
          Tap any code to copy instantly — our hand-picked travel eSIM discounts, points offers, and filming kit.
        </Text>

        <View style={styles.segmentWrap}>
          {(
            [
              ['all', `All (${deals.length})`],
              ['promos', `Deals & Codes (${promoCount})`],
              ['gear', `Travel & Gear (${gearCount})`],
            ] as const
          ).map(([key, label]) => (
            <Pressable
              key={key}
              style={[styles.segBtn, section === key && styles.segBtnActive]}
              onPress={() => setSection(key)}
            >
              <Text style={[styles.segText, section === key && styles.segTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: horizontalPadding, paddingTop: 14 }}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={Colors.inkMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search eSIM, Amex, Holafly, DJI, Insta360, Wise..."
            placeholderTextColor={Colors.inkMuted}
          />
          {query ? (
            <Pressable onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.inkMuted} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Deals Adaptive Grid */}
      <View
        style={[
          styles.dealsGrid,
          isSplitScreen && styles.dealsGridWide,
          { paddingHorizontal: horizontalPadding },
        ]}
      >
        {filteredDeals.map((deal) => {
          const isPromo = deal.section === 'Promotions & Codes';
          const isCopied = copiedId === deal.id;
          return (
            <View
              key={deal.id}
              style={[
                styles.dealCard,
                deal.featured && styles.dealCardFeatured,
                isSplitScreen && {
                  width: gridColumns >= 3 ? '31.8%' : '48.6%',
                },
              ]}
            >
              <View style={styles.dealTopRow}>
                <View style={[styles.catChip, isPromo ? styles.catChipPromo : styles.catChipGear]}>
                  <Text
                    style={[
                      styles.catChipText,
                      isPromo ? styles.catChipTextPromo : styles.catChipTextGear,
                    ]}
                  >
                    {deal.category || (isPromo ? 'Travel Perk' : 'Gear')}
                  </Text>
                </View>
                {deal.badge ? (
                  <View style={styles.badgePill}>
                    <Text style={styles.badgeText}>{deal.badge}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.dealTitle}>{deal.title}</Text>
              {deal.description ? (
                <Text style={styles.dealDesc}>{deal.description}</Text>
              ) : null}

              {deal.promoCode ? (
                <Pressable
                  style={[styles.codeRow, isCopied && styles.codeRowCopied]}
                  onPress={() => handleCopyCode(deal)}
                >
                  <View>
                    <Text style={styles.codeLabel}>{t("PROMO CODE")}</Text>
                    <Text style={styles.codeValue}>{deal.promoCode}</Text>
                  </View>
                  <View style={[styles.copyPill, isCopied && styles.copyPillCopied]}>
                    <Ionicons
                      name={isCopied ? 'checkmark' : 'copy-outline'}
                      size={14}
                      color={isCopied ? '#FFFFFF' : Colors.accentDark}
                    />
                    <Text style={[styles.copyPillText, isCopied && { color: '#FFFFFF' }]}>
                      {isCopied ? 'Copied!' : 'Copy'}
                    </Text>
                  </View>
                </Pressable>
              ) : null}

              <Pressable
                style={[styles.ctaBtn, !isPromo && styles.ctaBtnDark]}
                onPress={() => openExternalUrl(deal.url)}
              >
                <Text style={styles.ctaBtnText}>{deal.buttonLabel || 'Claim Offer'}</Text>
                <Ionicons name="open-outline" size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* StayOdds Hub, Feedback & Resort Request */}
      <View
        style={{
          marginHorizontal: horizontalPadding,
          marginTop: 18,
          backgroundColor: Colors.accentSoft,
          borderWidth: 1,
          borderColor: Colors.accentBorder,
          borderRadius: 16,
          padding: 16,
          gap: 10,
        }}
      >
        <Text style={{ color: Colors.inkPrimary, fontSize: 15, fontWeight: '800' }}>
          StayOdds. Community &amp; Support
        </Text>
        <Text style={{ color: Colors.inkSecondary, fontSize: 12.5, lineHeight: 18 }}>
          Missing a resort, spotted a renovation, or want to read how our scoring works?
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Pressable
            onPress={() => setRequestOpen(true)}
            style={{
              backgroundColor: Colors.accent,
              paddingHorizontal: 13,
              paddingVertical: 9,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 12.5, fontWeight: '800' }}>+ Request a Resort</Text>
          </Pressable>
          <Pressable
            onPress={() => setFeedbackOpen(true)}
            style={{
              backgroundColor: Colors.bgWhite,
              borderWidth: 1,
              borderColor: Colors.accentBorder,
              paddingHorizontal: 13,
              paddingVertical: 9,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: Colors.accentDark, fontSize: 12.5, fontWeight: '700' }}>{t("Send Feedback")}</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 4 }}>
          <Pressable onPress={() => openExternalUrl(BRAND.aboutUrl)}>
            <Text style={{ color: '#FF9C70', fontSize: 12.5, fontWeight: '700' }}>About Us ↗</Text>
          </Pressable>
          <Pressable onPress={() => openExternalUrl(BRAND.faqUrl)}>
            <Text style={{ color: '#FF9C70', fontSize: 12.5, fontWeight: '700' }}>FAQ &amp; Scoring ↗</Text>
          </Pressable>
          <Pressable onPress={() => openExternalUrl(BRAND.contactUrl)}>
            <Text style={{ color: '#FF9C70', fontSize: 12.5, fontWeight: '700' }}>Contact ↗</Text>
          </Pressable>
        </View>
      </View>

      {/* Affiliate Disclosure */}
      <View style={[styles.disclosure, { marginHorizontal: horizontalPadding }]}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.inkMuted} />
        <Text style={styles.disclosureText}>
          Disclosure: Links on this screen may be affiliate or referral links. If you book or purchase through them, The Uncharted Itinerary earns a small commission at no extra cost to you. As an Amazon Associate, we earn from qualifying purchases.
        </Text>
      </View>

      <RequestResortModal visible={requestOpen} onClose={() => setRequestOpen(false)} />
      <QuickFeedbackModal visible={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // The Uncharted Itinerary zone: the channel's orange, as on stayodds.com
  // the whole page in the channel's orange, with white cards (option A)
  screen: { flex: 1, backgroundColor: Colors.uncharted },
  banner: {
    backgroundColor: '#E8501A',
    paddingTop: 18,
    paddingBottom: 18,
  },
  bannerEyebrow: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.85)', letterSpacing: 0.9 },
  bannerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  bannerSub: { fontSize: 12.5, color: 'rgba(255,255,255,0.92)', marginTop: 4, lineHeight: 18 },

  segmentWrap: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 12,
    padding: 4,
    marginTop: 14,
    gap: 4,
  },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  segBtnActive: { backgroundColor: Colors.unchartedDark },
  segText: { fontSize: 11.5, fontWeight: '700', color: '#FFFFFF' },
  segTextActive: { color: '#FFFFFF' },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bgWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.inkPrimary },

  dealsGrid: { paddingTop: 14, gap: 12 },
  dealsGridWide: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },

  dealCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    justifyContent: 'space-between',
  },
  dealCardFeatured: {
    borderColor: Colors.accentBorder,
    backgroundColor: Colors.bgWarm,
  },
  dealTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  catChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  catChipPromo: { backgroundColor: Colors.tealSoft },
  catChipGear: { backgroundColor: Colors.slateSoft },
  catChipText: { fontSize: 10.5, fontWeight: '800' },
  catChipTextPromo: { color: Colors.teal },
  catChipTextGear: { color: Colors.slate },
  badgePill: {
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeText: { fontSize: 10, fontWeight: '800', color: Colors.accentDark },

  dealTitle: { fontSize: 16, fontWeight: '800', color: Colors.inkPrimary },
  dealDesc: { fontSize: 13, color: Colors.inkSecondary, marginTop: 5, lineHeight: 19 },

  codeRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgWhite,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  codeRowCopied: { borderColor: Colors.emerald, backgroundColor: Colors.emeraldSoft },
  codeLabel: { fontSize: 9.5, fontWeight: '800', color: Colors.inkMuted, letterSpacing: 0.6 },
  codeValue: { fontSize: 14.5, fontWeight: '900', color: Colors.inkPrimary, marginTop: 1 },
  copyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyPillCopied: { backgroundColor: Colors.emerald },
  copyPillText: { fontSize: 12, fontWeight: '800', color: Colors.accentDark },

  ctaBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
    paddingVertical: 11,
    borderRadius: 10,
  },
  ctaBtnDark: { backgroundColor: Colors.charcoal },
  ctaBtnText: { color: '#FFFFFF', fontSize: 13.5, fontWeight: '800' },

  disclosure: {
    marginTop: 22,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.bgWhite,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderSoft,
  },
  disclosureText: { flex: 1, fontSize: 11.5, color: Colors.inkMuted, lineHeight: 17 },
});

export default lazyTab(DealsScreen);
