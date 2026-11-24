import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import QRCode from 'qrcode';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import { openExternalUrl } from '../lib/api';
import {
  buildFactualVsVerdict,
  buildRedditMarkdownSingle,
  buildRedditMarkdownVs,
  buildSingleDeepLink,
  buildVsDeepLink,
  extractTopKeyFacts,
  formatCriticSlot,
  getPropertyStatusMeta,
} from '../lib/propertyStatus';
import type { StayOddsResult } from '../lib/scoring';
import { Colors } from '../lib/theme';
import type { Hotel } from '../lib/types';

type CardFormat = '1:1' | '9:16';

export type ShareCardModalProps =
  | {
      visible: boolean;
      onClose: () => void;
      mode: 'vs';
      hotelA: Hotel;
      hotelB: Hotel;
      oddsA: StayOddsResult;
      oddsB: StayOddsResult;
    }
  | {
      visible: boolean;
      onClose: () => void;
      mode: 'single';
      hotel: Hotel;
      odds: StayOddsResult;
    };

/** Pure React Native QR matrix renderer (100% Expo Go compatible, zero extra native SVG needed). */
function QrMatrixBox({ value, size = 96 }: { value: string; size?: number }) {
  const matrix = useMemo(() => {
    try {
      const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
      const dim = qr.modules.size;
      const rows: number[][] = [];
      for (let r = 0; r < dim; r++) {
        const row: number[] = [];
        for (let c = 0; c < dim; c++) {
          row.push(qr.modules.get(r, c) ? 1 : 0);
        }
        rows.push(row);
      }
      return { dim, rows };
    } catch {
      return null;
    }
  }, [value]);

  if (!matrix) return null;
  const pad = 6;
  const inner = size - pad * 2;
  const cell = inner / matrix.dim;

  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: pad,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <View style={{ width: inner, height: inner }}>
        {matrix.rows.map((row, r) => (
          <View key={r} style={{ flexDirection: 'row', height: cell }}>
            {row.map((bit, c) => (
              <View
                key={c}
                style={{
                  width: cell,
                  height: cell,
                  backgroundColor: bit ? '#071323' : '#FFFFFF',
                }}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

function statusPillPalette(tone: 'neutral' | 'open' | 'warn' | 'danger') {
  if (tone === 'danger') {
    return { bg: 'rgba(239,68,68,0.2)', border: 'rgba(248,113,113,0.65)', fg: '#FCA5A5' };
  }
  if (tone === 'warn') {
    return { bg: 'rgba(245,158,11,0.2)', border: 'rgba(251,191,36,0.65)', fg: '#FCD34D' };
  }
  if (tone === 'open') {
    return { bg: 'rgba(20,184,166,0.18)', border: 'rgba(45,212,191,0.55)', fg: '#5EEAD4' };
  }
  return { bg: 'rgba(148,163,184,0.16)', border: 'rgba(148,163,184,0.35)', fg: '#CBD5E1' };
}

export function ShareCardModal(props: ShareCardModalProps) {
  const { visible, onClose } = props;
  const [format, setFormat] = useState<CardFormat>('1:1');
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState('');
  const shotRef = useRef<React.ComponentRef<typeof ViewShot>>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? '' : cur)), 2800);
  };

  const meta = useMemo(() => {
    if (props.mode === 'vs') {
      const verdict = buildFactualVsVerdict(props.hotelA, props.hotelB, props.oddsA, props.oddsB);
      const deepLink = buildVsDeepLink(props.hotelA, props.hotelB);
      const title = `${props.hotelA.name} vs ${props.hotelB.name}`;
      const tweetText = `${props.hotelA.name} vs ${props.hotelB.name} on StayOdds (stayodds.com): ${verdict.headline}. Verified scores & key facts — zero made-up numbers:`;
      const redditMd = buildRedditMarkdownVs(props.hotelA, props.hotelB, props.oddsA, props.oddsB);
      return { verdict, deepLink, title, tweetText, redditMd };
    }
    const deepLink = buildSingleDeepLink(props.hotel);
    const scorePart = props.odds.greatStayOdds != null ? ` (${props.odds.greatStayOdds}% StayOdds)` : '';
    const title = `${props.hotel.name} — StayOdds Card`;
    const tweetText = `${props.hotel.name}${scorePart} — ${props.odds.statusBadge} on StayOdds (stayodds.com). Verified guest ratings, awards & property status:`;
    const redditMd = buildRedditMarkdownSingle(props.hotel, props.odds);
    return { verdict: null, deepLink, title, tweetText, redditMd };
  }, [props]);

  const handleSharePng = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      if (Platform.OS === 'web') {
        await Clipboard.setStringAsync(meta.deepLink).catch(() => {});
        showToast('Deep link copied! Open on iOS/Android or live web to export PNG.');
        return;
      }
      const uri = await shotRef.current?.capture?.();
      if (!uri) throw new Error('Capture returned empty URI');

      const canShareFile = await Sharing.isAvailableAsync();
      if (canShareFile) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: meta.title,
          UTI: 'public.png',
        });
        showToast('Scorecard PNG ready to share!');
      } else {
        await Share.share({
          title: meta.title,
          message: `${meta.tweetText} ${meta.deepLink}`,
          url: meta.deepLink,
        });
      }
    } catch (err) {
      await Share.share({
        title: meta.title,
        message: `${meta.tweetText} ${meta.deepLink}`,
        url: meta.deepLink,
      }).catch(() => {});
      showToast('Opened share sheet with verified comparison link.');
    } finally {
      setExporting(false);
    }
  };

  const handlePostX = () => {
    const intent = `https://x.com/intent/tweet?text=${encodeURIComponent(
      meta.tweetText
    )}&url=${encodeURIComponent(meta.deepLink)}`;
    openExternalUrl(intent);
  };

  const handleCopyReddit = async () => {
    await Clipboard.setStringAsync(meta.redditMd);
    showToast('✓ Reddit / FlyerTalk Markdown table copied!');
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(meta.deepLink);
    showToast('✓ Shareable deep link copied!');
  };

  const isStory = format === '9:16';

  const renderVsMiniCard = (hotel: Hotel, odds: StayOddsResult, side: 'A' | 'B', isWinner: boolean) => {
    const accent = side === 'A' ? '#FF5D22' : '#14B8A6';
    const st = getPropertyStatusMeta(hotel);
    const stPal = statusPillPalette(st.tone);
    const facts = extractTopKeyFacts(hotel, odds, isStory ? 3 : 2);

    return (
      <View
        style={[
          styles.hotelBox,
          { borderColor: isWinner ? accent : 'rgba(255,255,255,0.14)' },
        ]}
      >
        <View style={styles.hotelBoxTop}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <View style={styles.miniTagRow}>
              <View style={[styles.miniPill, { backgroundColor: side === 'A' ? 'rgba(255,93,34,0.22)' : 'rgba(20,184,166,0.22)' }]}>
                <Text style={[styles.miniPillTxt, { color: side === 'A' ? '#FF8B5E' : '#5EEAD4' }]}>
                  HOTEL {side}{isWinner ? ' ★' : ''}
                </Text>
              </View>
              <Text style={styles.miniStatusTxt} numberOfLines={1}>
                {odds.statusBadge}
              </Text>
            </View>
            <Text style={styles.cardHotelName} numberOfLines={2}>
              {hotel.name}
            </Text>
            <Text style={styles.cardHotelLoc} numberOfLines={1}>
              {hotel.location}, {hotel.country}
              {hotel.brand ? ` • ${hotel.brand}` : ''}
            </Text>
          </View>

          <View style={[styles.scoreRingBox, { borderColor: accent }]}>
            <Text style={styles.scoreRingBig}>
              {odds.greatStayOdds != null ? `${odds.greatStayOdds}%` : 'OPEN'}
            </Text>
            <Text style={styles.scoreRingLbl}>STAYODDS</Text>
          </View>
        </View>

        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${odds.greatStayOdds ?? 0}%`, backgroundColor: accent },
            ]}
          />
        </View>

        <View style={styles.pillarsRow}>
          <View style={styles.pillarTile}>
            <Text style={styles.pillarLbl}>MY STAY</Text>
            <Text style={styles.pillarVal} numberOfLines={1}>
              {odds.personalScoreLabel ? odds.personalScoreLabel.replace(/ /g, '') : odds.visited ? 'Filmed' : '—'}
            </Text>
          </View>
          <View style={styles.pillarTile}>
            <Text style={styles.pillarLbl}>CRITICS</Text>
            <Text style={styles.pillarVal} numberOfLines={1}>
              {formatCriticSlot(odds).compact}
            </Text>
          </View>
          <View style={styles.pillarTile}>
            <Text style={styles.pillarLbl}>GUESTS</Text>
            <Text style={styles.pillarVal} numberOfLines={1}>
              {odds.verifiedGuest ? `${odds.verifiedGuest.rating.toFixed(1)}/${odds.verifiedGuest.scale}` : 'Live'}
            </Text>
          </View>
          <View style={styles.pillarTile}>
            <Text style={styles.pillarLbl}>GAP</Text>
            <Text style={styles.pillarVal} numberOfLines={1}>
              {odds.opinionGap.deltaLabel}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusStrip,
            { backgroundColor: stPal.bg, borderColor: stPal.border },
          ]}
        >
          <Text style={[styles.statusStripHead, { color: stPal.fg }]}>
            STATUS &amp; WORKS • {st.badge.toUpperCase()}
          </Text>
          <Text style={styles.statusStripBody} numberOfLines={2}>
            {st.shortSummary}
          </Text>
        </View>

        {facts.length > 0 ? (
          <View style={styles.factsBox}>
            {facts.map((f) => (
              <Text key={f.label} style={styles.factLine} numberOfLines={2}>
                <Text style={{ color: accent, fontWeight: '800' }}>• {f.label}: </Text>
                {f.value}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  const renderSingleCardContent = (hotel: Hotel, odds: StayOddsResult) => {
    const st = getPropertyStatusMeta(hotel);
    const stPal = statusPillPalette(st.tone);
    const facts = extractTopKeyFacts(hotel, odds, isStory ? 4 : 3);

    return (
      <>
        <View style={styles.hotelBox}>
          <View style={styles.hotelBoxTop}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={styles.miniTagRow}>
                <View style={[styles.miniPill, { backgroundColor: 'rgba(255,93,34,0.22)' }]}>
                  <Text style={[styles.miniPillTxt, { color: '#FF8B5E' }]}>{odds.tierLabel.toUpperCase()}</Text>
                </View>
                <Text style={styles.miniStatusTxt} numberOfLines={1}>{odds.statusBadge}</Text>
              </View>
              <Text style={[styles.cardHotelName, { fontSize: 18 }]} numberOfLines={2}>
                {hotel.name}
              </Text>
              <Text style={styles.cardHotelLoc} numberOfLines={1}>
                {hotel.location}, {hotel.country}
                {hotel.brand ? ` • ${hotel.brand}` : ''}
              </Text>
            </View>
            <View style={[styles.scoreRingBox, { borderColor: '#FF5D22' }]}>
              <Text style={styles.scoreRingBig}>
                {odds.greatStayOdds != null ? `${odds.greatStayOdds}%` : 'OPEN'}
              </Text>
              <Text style={styles.scoreRingLbl}>STAYODDS</Text>
            </View>
          </View>

          <View style={styles.pillarsRow}>
            <View style={styles.pillarTile}>
              <Text style={styles.pillarLbl}>MY STAY</Text>
              <Text style={styles.pillarVal} numberOfLines={1}>
                {odds.personalScoreLabel ? odds.personalScoreLabel.replace(/ /g, '') : odds.visited ? 'Filmed' : '—'}
              </Text>
            </View>
            <View style={styles.pillarTile}>
              <Text style={styles.pillarLbl}>CRITICS</Text>
              <Text style={styles.pillarVal} numberOfLines={1}>
                {formatCriticSlot(odds).compact}
              </Text>
            </View>
            <View style={styles.pillarTile}>
              <Text style={styles.pillarLbl}>GUESTS</Text>
              <Text style={styles.pillarVal} numberOfLines={1}>
                {odds.verifiedGuest ? `${odds.verifiedGuest.rating.toFixed(1)}/${odds.verifiedGuest.scale}` : 'Live'}
              </Text>
            </View>
            <View style={styles.pillarTile}>
              <Text style={styles.pillarLbl}>GAP</Text>
              <Text style={styles.pillarVal} numberOfLines={1}>
                {odds.opinionGap.deltaLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.opinionBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.opinionEyebrow}>OPINION GAP • {odds.opinionGap.title.toUpperCase()}</Text>
            <Text style={styles.opinionDelta}>{odds.opinionGap.deltaLabel}</Text>
          </View>
          <Text style={styles.opinionText} numberOfLines={2}>
            {odds.opinionGap.headline}
          </Text>
        </View>

        <View style={[styles.statusStrip, { backgroundColor: stPal.bg, borderColor: stPal.border }]}>
          <Text style={[styles.statusStripHead, { color: stPal.fg }]}>
            PROPERTY STATUS &amp; WORKS • {st.badge.toUpperCase()}
          </Text>
          <Text style={styles.statusStripBody} numberOfLines={3}>
            {st.shortSummary}
          </Text>
        </View>

        {facts.length > 0 ? (
          <View style={styles.hotelBox}>
            <Text style={styles.factsEyebrow}>VERIFIED KEY FACTS</Text>
            {facts.map((f) => (
              <Text key={f.label} style={styles.factLine} numberOfLines={2}>
                <Text style={{ color: '#5EEAD4', fontWeight: '800' }}>• {f.label}: </Text>
                {f.value}
              </Text>
            ))}
          </View>
        ) : null}
      </>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalEyebrow}>BRANDED STAYODDS EXPORT</Text>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {meta.title}
            </Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close share modal">
            <Ionicons name="close" size={22} color={Colors.inkPrimary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          <View style={styles.formatRow}>
            <Pressable
              style={[styles.formatPill, format === '1:1' && styles.formatPillActive]}
              onPress={() => setFormat('1:1')}
            >
              <Text style={[styles.formatTitle, format === '1:1' && styles.formatTitleActive]}>1:1 Feed</Text>
              <Text style={styles.formatSub}>X, Instagram, Reddit</Text>
            </Pressable>
            <Pressable
              style={[styles.formatPill, format === '9:16' && styles.formatPillActive]}
              onPress={() => setFormat('9:16')}
            >
              <Text style={[styles.formatTitle, format === '9:16' && styles.formatTitleActive]}>
                9:16 Story + QR
              </Text>
              <Text style={styles.formatSub}>Stories, WhatsApp, iMessage</Text>
            </Pressable>
          </View>

          {/* Capturable Branded Card (100% vector/local views — zero remote image CORS issues) */}
          <View style={styles.previewShell}>
            <ViewShot
              ref={shotRef}
              options={{ format: 'png', quality: 1, result: 'tmpfile' }}
              style={[styles.cardCanvas, isStory ? styles.cardCanvasStory : styles.cardCanvasSquare]}
            >
              {/* Brand Header */}
              <View style={styles.brandRow}>
                <View>
                  <Text style={styles.wordmark}>
                    StayOdds<Text style={{ color: '#FF5D22' }}>.</Text>
                  </Text>
                  <Text style={styles.brandSub}>by The Uncharted Itinerary</Text>
                </View>
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeTxt}>
                    {props.mode === 'vs' ? 'VERIFIED HEAD-TO-HEAD' : 'VERIFIED SCORECARD'}
                  </Text>
                </View>
              </View>

              {props.mode === 'vs' && meta.verdict ? (
                <>
                  <View style={styles.verdictBox}>
                    <Text style={styles.verdictEyebrow}>VERIFIED VERDICT</Text>
                    <Text style={styles.verdictHeadline} numberOfLines={2}>
                      {meta.verdict.headline}
                    </Text>
                    <Text style={styles.verdictDetail} numberOfLines={2}>
                      {meta.verdict.detail}
                    </Text>
                  </View>

                  {renderVsMiniCard(props.hotelA, props.oddsA, 'A', meta.verdict.winnerSide === 'A')}
                  {renderVsMiniCard(props.hotelB, props.oddsB, 'B', meta.verdict.winnerSide === 'B')}
                </>
              ) : props.mode === 'single' ? (
                renderSingleCardContent(props.hotel, props.odds)
              ) : null}

              {/* Footer (with scannable QR Code on 9:16 Story!) */}
              {isStory ? (
                <View style={styles.storyFooter}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.storyFooterEyebrow}>SCAN TO OPEN LIVE BREAKDOWN</Text>
                    <Text style={styles.storyFooterUrl} numberOfLines={1}>
                      stayodds.com
                    </Text>
                    <Text style={styles.storyFooterNote}>
                      Zero fabricated scores • Real verified guest ratings, awards &amp; property status.
                    </Text>
                  </View>
                  <QrMatrixBox value={meta.deepLink} size={94} />
                </View>
              ) : (
                <View style={styles.squareFooter}>
                  <Text style={styles.squareFooterUrl} numberOfLines={1}>
                    stayodds.com
                  </Text>
                  <Text style={styles.squareFooterNote}>Zero fabricated scores • Verified data only</Text>
                </View>
              )}
            </ViewShot>
          </View>

          {toast ? (
            <View style={styles.toastBox}>
              <Text style={styles.toastTxt}>{toast}</Text>
            </View>
          ) : null}

          <Pressable
            style={[styles.btnPrimary, exporting && { opacity: 0.7 }]}
            onPress={handleSharePng}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="share-outline" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.btnPrimaryTxt}>
              {exporting ? 'Generating PNG…' : `Export & Share ${format} PNG`}
            </Text>
          </Pressable>

          <View style={styles.secondaryGrid}>
            <Pressable style={styles.btnSecondary} onPress={handlePostX}>
              <Ionicons name="logo-twitter" size={16} color={Colors.inkPrimary} />
              <Text style={styles.btnSecondaryTxt}>Post to X</Text>
            </Pressable>
            <Pressable style={styles.btnSecondary} onPress={handleCopyLink}>
              <Ionicons name="link-outline" size={16} color={Colors.inkPrimary} />
              <Text style={styles.btnSecondaryTxt}>Copy Deep Link</Text>
            </Pressable>
          </View>

          <Pressable style={styles.btnSecondaryFull} onPress={handleCopyReddit}>
            <Ionicons name="copy-outline" size={16} color={Colors.accentDark} />
            <Text style={[styles.btnSecondaryTxt, { color: Colors.accentDark }]}>
              Copy Reddit / FlyerTalk Markdown Table
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalWrap: { flex: 1, backgroundColor: Colors.bgCanvas },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.bgWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 10,
  },
  modalEyebrow: { fontSize: 10, fontWeight: '800', color: Colors.accent, letterSpacing: 0.8 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: Colors.inkPrimary, marginTop: 2 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.bgCanvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: { padding: 14, gap: 12, paddingBottom: 40 },

  formatRow: { flexDirection: 'row', gap: 10 },
  formatPill: {
    flex: 1,
    backgroundColor: Colors.bgWhite,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 10,
  },
  formatPillActive: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  formatTitle: { fontSize: 13.5, fontWeight: '800', color: Colors.inkPrimary },
  formatTitleActive: { color: Colors.accentDark },
  formatSub: { fontSize: 11, color: Colors.inkMuted, marginTop: 2 },

  previewShell: {
    backgroundColor: '#050D19',
    borderRadius: 18,
    padding: 8,
    alignItems: 'center',
  },
  cardCanvas: {
    width: '100%',
    backgroundColor: '#071323',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
    gap: 10,
  },
  cardCanvasSquare: {},
  cardCanvasStory: { paddingVertical: 18, gap: 12 },

  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  wordmark: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  brandSub: { fontSize: 10, fontWeight: '600', color: '#94A3B8' },
  headerBadge: {
    backgroundColor: 'rgba(255,93,34,0.18)',
    borderColor: 'rgba(255,93,34,0.55)',
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  headerBadgeTxt: { fontSize: 9.5, fontWeight: '800', color: '#FF8B5E', letterSpacing: 0.4 },

  verdictBox: {
    backgroundColor: 'rgba(255,93,34,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,93,34,0.45)',
    borderRadius: 12,
    padding: 10,
  },
  verdictEyebrow: { fontSize: 9, fontWeight: '800', color: '#FF8B5E', letterSpacing: 0.7 },
  verdictHeadline: { fontSize: 14.5, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  verdictDetail: { fontSize: 11.5, color: '#CBD5E1', marginTop: 3, lineHeight: 16 },

  hotelBox: {
    backgroundColor: 'rgba(15, 29, 50, 0.92)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 11,
    gap: 8,
  },
  hotelBoxTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  miniTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  miniPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  miniPillTxt: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.4 },
  miniStatusTxt: { fontSize: 10, fontWeight: '700', color: '#94A3B8', flex: 1 },
  cardHotelName: { fontSize: 15, fontWeight: '800', color: '#FFFFFF', lineHeight: 19 },
  cardHotelLoc: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

  scoreRingBox: {
    backgroundColor: '#071323',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 66,
  },
  scoreRingBig: { fontSize: 18, fontWeight: '900', color: '#FFFFFF' },
  scoreRingLbl: { fontSize: 8, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 },

  barTrack: { height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },

  pillarsRow: { flexDirection: 'row', gap: 6 },
  pillarTile: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pillarLbl: { fontSize: 8.5, fontWeight: '800', color: '#94A3B8' },
  pillarVal: { fontSize: 12, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },

  statusStrip: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
  },
  statusStripHead: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  statusStripBody: { fontSize: 11, color: '#F1F5F9', marginTop: 2, lineHeight: 15 },

  factsBox: { gap: 3 },
  factsEyebrow: { fontSize: 9.5, fontWeight: '800', color: '#FF8B5E', letterSpacing: 0.6 },
  factLine: { fontSize: 11, color: '#E2E8F0', lineHeight: 15 },

  opinionBox: {
    backgroundColor: 'rgba(20,184,166,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.4)',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  opinionEyebrow: { fontSize: 9, fontWeight: '800', color: '#5EEAD4', letterSpacing: 0.5, flex: 1 },
  opinionDelta: { fontSize: 12, fontWeight: '900', color: '#5EEAD4' },
  opinionText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF', lineHeight: 17 },

  storyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 10,
    marginTop: 2,
  },
  storyFooterEyebrow: { fontSize: 9, fontWeight: '800', color: '#FF8B5E', letterSpacing: 0.6 },
  storyFooterUrl: { fontSize: 12.5, fontWeight: '800', color: '#FFFFFF', marginTop: 3 },
  storyFooterNote: { fontSize: 10.5, color: '#CBD5E1', marginTop: 4, lineHeight: 14 },

  squareFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    gap: 8,
  },
  squareFooterUrl: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  squareFooterNote: { fontSize: 10, color: '#94A3B8' },

  toastBox: {
    backgroundColor: Colors.teal,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  toastTxt: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '700' },

  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    paddingVertical: 13,
    borderRadius: 999,
  },
  btnPrimaryTxt: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  secondaryGrid: { flexDirection: 'row', gap: 10 },
  btnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.bgWhite,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 11,
    borderRadius: 999,
  },
  btnSecondaryFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    paddingVertical: 11,
    borderRadius: 999,
  },
  btnSecondaryTxt: { fontSize: 13, fontWeight: '700', color: Colors.inkPrimary },
});
