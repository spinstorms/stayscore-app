import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { openExternalUrl } from '../../../lib/api';
import { useAdaptiveLayout } from '../../../lib/layout';
import { ordinal } from '../../../lib/ranks';
import { INSIGHTS_PAGE_URL, loadSiteInsights, SITE_URL, TIER_ORDER, type RangeStat, type SiteInsights } from '../../../lib/siteInsights';
import { useStayOdds } from '../../../lib/store';
import { t } from '../../../lib/i18n';
import { Colors } from '../../../lib/theme';
import { lazyTab } from '../../../components/LazyTab';
import { withRailShortcuts } from '../../../components/RailShortcuts';

const n = (x: number) => x.toLocaleString('en-GB');
const fmt = (x: number) => String(Number(x.toFixed(1)));

/** Same sections, order and wording as stayodds.com/insights/. */
export function InsightsScreen() {
  const router = useRouter();
  const { hotels } = useStayOdds();
  const { isSplitScreen, horizontalPadding, width: winWidth } = useAdaptiveLayout();
  const [d, setD] = useState<SiteInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadSiteInsights().then((x) => {
      setD(x);
      setLoading(false);
    });
  }, []);
  const refresh = useCallback(() => {
    setRefreshing(true);
    loadSiteInsights({ force: true }).then((x) => {
      if (x) setD(x);
      setRefreshing(false);
    });
  }, []);

  const known = useMemo(() => new Set(hotels.map((h) => h.id)), [hotels]);
  const open = (id: string) =>
    known.has(id)
      ? router.push({ pathname: '/hotel/[id]', params: { id } })
      : openExternalUrl(`${SITE_URL}/stayodds/${encodeURIComponent(id)}/`);
  const Link = ({ id, name }: { id: string; name: string }) => (
    <Text style={styles.link} onPress={() => open(id)}>
      {name}
    </Text>
  );

  if (loading && !d) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }
  if (!d) {
    return (
      <View style={styles.center}>
        <Text style={styles.sub}>Insights couldn't load. Check your connection and pull to refresh.</Text>
        <Pressable onPress={refresh} style={styles.cta}>
          <Text style={styles.ctaText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const tiers = TIER_ORDER.filter((k) => d.tiers[k]).map((k) => ({ label: k, ...d.tiers[k] }));
  const award = tiers.filter((t) => t.label !== 'No major award').map((t) => t.median);
  const none = d.tiers['No major award'];
  const criticsGaps = [...d.scatter].sort((a, b) => b.c - b.g - (a.c - a.g)).slice(0, 6);
  const diningDiff = d.dining ? d.dining.starred.median - d.dining.keyedNoStar.median : 0;
  const brands = d.brands;
  const steady = brands.length ? brands.reduce((a, b) => (b.max! - b.min! < a.max! - a.min! || (b.max! - b.min! === a.max! - a.min! && b.n > a.n) ? b : a)) : null;
  const wide = brands.length ? brands.reduce((a, b) => (b.max! - b.min! > a.max! - a.min! || (b.max! - b.min! === a.max! - a.min! && b.n > a.n) ? b : a)) : null;
  const pr = d.price;

  const gridStyle = isSplitScreen ? styles.grid2 : undefined;
  // iPad and wide screens: the panels sit two side by side
  const twoCol = winWidth >= 1000;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }, twoCol && styles.contentTwoCol]}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.accent} />}
    >
      <View style={[styles.header, { width: '100%' }]}>
        <Text style={styles.eyebrow}>StayOdds insights{d.updated ? ` · updated ${d.updated}` : ''}</Text>
        <Text style={styles.h1}>{t('How guests really rate luxury hotels')}</Text>
        <Text style={styles.sub}>
          What {d.nHotels || 'our'} luxury hotels look like when you put real guest reviews next to the critics, the awards, the
          price and the destination. Every chart uses hotels with a guest score from 20 or more reviews, and every rank is among
          the hotels on StayOdds.
        </Text>
      </View>

      <Panel eyebrow="Guests versus awards" title="Award winners guests don't love"
        sub="Award-winning hotels that rank lowest with guests in their own country, ranked against the other hotels in that country on StayOdds (countries with 10 or more hotels).">
        {d.disappoint.map((r) => {
          const pct = r.of > 1 ? ((r.rank - 1) / (r.of - 1)) * 100 : 0;
          return (
            <View key={r.id} style={styles.rowBlock}>
              <Link id={r.id} name={r.name} />
              <View style={styles.tags}>
                {r.awards.map((a) => (
                  <Text key={a} style={styles.tag}>
                    {a.replace(' (2026)', '').replace('in the World', "World's 50 Best").replace(/^No\. (\d+) World's 50 Best$/, "World's 50 Best #$1")}
                  </Text>
                ))}
              </View>
              <View style={styles.track}>
                <View style={[styles.trackFill, { width: `${pct}%` }]} />
                <View style={[styles.trackDot, { left: `${pct}%` }]} />
              </View>
              <View style={styles.trackEnds}>
                <Text style={styles.muted}>guests' best</Text>
                <Text style={styles.muted}>guests' worst</Text>
              </View>
              <Text style={styles.rankBig}>
                {ordinal(r.rank)} of {r.of}
              </Text>
              <Text style={styles.small}>
                {r.group} hotels on StayOdds · {r.guest}/100 from {n(r.reviews)} reviews
              </Text>
            </View>
          );
        })}
        <Note>
          Luxury guest scores sit close together (most are between 88 and 98), so a hotel can rank last in its country on a score
          that is still good. That is why the score and the number of reviews are shown under every rank.
        </Note>
      </Panel>

      <Panel eyebrow="Hotel brands" title="How guests rate each luxury brand"
        sub="Dot = the brand's typical (median) hotel. Thick bar = the middle half of its hotels. Thin line = best to worst hotel. Brands with 8 or more rated hotels.">
        <RangeRows min={70} rows={brands.map((b) => ({ label: b.brand, logo: b.logo, stat: b, detail: `Best: ${b.best} · Lowest: ${b.worst}` }))} />
        <Note>
          {steady && wide
            ? `Most consistent: ${steady.brand}, where every rated hotel scores between ${steady.min} and ${steady.max}. Widest spread: ${wide.brand}, from ${wide.min} to ${wide.max}. `
            : ''}
          Tap a brand to see its best and lowest-rated hotel.
        </Note>
      </Panel>

      <Panel eyebrow="Critics versus guests" title="Where critics and guests disagree"
        sub={`${n(d.scatter.length)} hotels have both a published critic score and a guest score. These are the six biggest "critics loved it, guests less so" gaps.`}>
        {criticsGaps.map((p) => (
          <View key={p.id} style={styles.listRow}>
            <Text style={styles.body}>
              <Link id={p.id} name={p.n} />
            </Text>
            <Text style={styles.small}>
              Critics <Text style={styles.bold}>{p.c}</Text> · Guests <Text style={styles.accentBold}>{p.g}</Text> · {p.c - p.g} points apart
            </Text>
          </View>
        ))}
        <Note>Critic scores are the published scores linked on each hotel page, converted to a score out of 100.</Note>
      </Panel>

      <Panel eyebrow="Awards" title="Do awards match guest opinion?" sub="Typical guest score by award. Dot = median hotel, bar = middle half.">
        <RangeRows min={85} rows={tiers.map((t) => ({ label: t.label, stat: t }))} />
        {award.length && none ? (
          <Note>
            Award-winning hotels have a typical guest score of {fmt(Math.min(...award))} to {fmt(Math.max(...award))}, against{' '}
            {fmt(none.median)} for hotels with no major award. Awards point to good hotels, but guests separate them far less than the
            lists do.
          </Note>
        ) : null}
      </Panel>

      <Panel eyebrow="Price and value" title="Does paying more buy happier guests?"
        sub="Guest score by price level. Price level comes from our latest nightly price check for each hotel (a sample date, so treat it as a guide).">
        <RangeRows min={70} rows={pr.map((b) => ({ label: b.band, stat: b }))} />
        <View style={gridStyle}>
          {pr.map((b) => (
            <View key={b.band} style={styles.idea}>
              <Text style={styles.ideaTitle}>Top rated {b.band}</Text>
              {b.top.map((t) => (
                <Text key={t.id} style={styles.small}>
                  <Link id={t.id} name={t.name} /> · <Text style={styles.bold}>{t.g}</Text>/100 ({n(t.rc)} reviews)
                </Text>
              ))}
            </View>
          ))}
        </View>
        {pr.length >= 2 ? (
          <Note>
            {pr.every((b) => (b.max ?? 0) >= 98)
              ? `Typical guest score ${pr[pr.length - 1].median > pr[0].median ? 'rises' : 'goes'} from ${fmt(pr[0].median)} (${pr[0].band}) to ${fmt(pr[pr.length - 1].median)} (${pr[pr.length - 1].band}), but every price level has hotels guests rate 98 or more, so a higher price is no guarantee.`
              : `Typical guest score: ${fmt(pr[0].median)} at ${pr[0].band}, ${fmt(pr[pr.length - 1].median)} at ${pr[pr.length - 1].band}.`}
          </Note>
        ) : null}
      </Panel>

      <Panel eyebrow="Destinations" title="Where guests are happiest"
        sub="Typical guest score of the StayOdds hotels in each destination with 8 or more rated hotels. Tap a row for its top-rated hotel.">
        <RangeRows min={70} rows={d.areas.map((a) => ({ label: a.area, stat: a, detail: `Top rated: ${a.best}` }))} />
        <Note>Every hotel page shows where that hotel ranks among the others in its area, and among hotels at a similar price.</Note>
      </Panel>

      <Panel eyebrow="Guests' favourites" title="The hotels guests rate highest"
        sub="Highest guest score from 500 or more reviews, so a handful of reviews can't put a hotel at the top. Ties are ordered by number of reviews.">
        {d.favourites.map((f, i) => (
          <Text key={f.id} style={[styles.body, styles.listRow]}>
            {i + 1}. <Link id={f.id} name={f.name} /> <Text style={styles.muted}>· {f.where}</Text> ·{' '}
            <Text style={styles.accentBold}>{f.g}</Text>/100 <Text style={styles.muted}>from {n(f.rc)} reviews</Text>
          </Text>
        ))}
      </Panel>

      <Panel eyebrow="Next-door rivals" title="Same street, very different stays"
        sub="Hotels within 2 km of each other where guests disagree the most (both with 200+ reviews). Location isn't everything.">
        <View style={gridStyle}>
          {d.rivals.map((r) => (
            <View key={`${r.hi.id}-${r.lo.id}`} style={styles.idea}>
              <Text style={styles.tag}>
                {r.where} · {r.km} km apart
              </Text>
              <Text style={styles.ideaTitle}>{r.gap} points apart</Text>
              <Text style={styles.small}>
                <Link id={r.hi.id} name={r.hi.name} /> <Text style={styles.accentBold}>{r.hi.g}</Text> from {n(r.hi.rc)} reviews
              </Text>
              <Text style={styles.small}>
                <Link id={r.lo.id} name={r.lo.name} /> <Text style={styles.bold}>{r.lo.g}</Text> from {n(r.lo.rc)} reviews
              </Text>
            </View>
          ))}
        </View>
      </Panel>

      <Panel eyebrow="Our stays vs guests" title="Where we and other guests disagree most"
        sub="Our filmed-stay score next to the guest score for the hotels we've stayed in. Below zero: guests liked it more than we did.">
        {d.ours.map((o) => {
          const w = Math.min(100, Math.abs(o.gap) * 3);
          const neg = o.gap < 0;
          return (
            <View key={o.id} style={styles.oursRow}>
              <View style={{ flex: 1.4, minWidth: 0 }}>
                <Link id={o.id} name={o.name} />
                <Text style={styles.muted}>
                  Us {o.ours} · Guests {o.g}
                </Text>
              </View>
              <View style={[styles.oursBarWrap, neg ? styles.oursNeg : styles.oursPos]}>
                <View style={[styles.oursBar, { width: `${w}%`, backgroundColor: neg ? Colors.inkSecondary : Colors.accent }]} />
              </View>
              <Text style={styles.oursGap}>
                {o.gap > 0 ? '+' : ''}
                {o.gap}
              </Text>
            </View>
          );
        })}
      </Panel>

      <Panel eyebrow="The critics" title="The Telegraph vs guests"
        sub={`${d.telN} hotels have a published Telegraph review score. These are the ones where the critic and guests disagree most.`}>
        <View style={gridStyle}>
          {[...d.telOver.slice(0, 3).map((t) => ({ t, over: true })), ...d.telUnder.slice(0, 3).map((t) => ({ t, over: false }))].map(({ t, over }) => (
            <View key={t.id} style={styles.idea}>
              <Text style={styles.tag}>{over ? 'Telegraph rates it higher' : 'Guests rate it higher'}</Text>
              <Text style={styles.ideaTitle}>
                <Link id={t.id} name={t.name} />
              </Text>
              <Text style={styles.small}>
                Telegraph <Text style={styles.bold}>{t.t}</Text> · Guests <Text style={styles.accentBold}>{t.g}</Text> from {n(t.rc)} reviews
              </Text>
            </View>
          ))}
        </View>
      </Panel>

      {d.dining ? (
        <Panel eyebrow="Dining" title="Does a MICHELIN-starred restaurant mean happier guests?"
          sub="Guest scores at hotels with a starred restaurant on site, next to MICHELIN Key hotels without one and every hotel on StayOdds.">
          <View style={gridStyle}>
            {([
              ['Starred restaurant on site', d.dining.starred],
              ['MICHELIN Key, no starred restaurant', d.dining.keyedNoStar],
              ['All StayOdds hotels', d.dining.all],
            ] as [string, RangeStat][]).map(([label, x]) => (
              <View key={label} style={styles.idea}>
                <Text style={styles.small}>{label}</Text>
                <Text style={styles.bigNum}>{fmt(x.median)}</Text>
                <Text style={styles.small}>
                  typical guest score · {x.n} hotels · middle half {fmt(x.q1)}–{fmt(x.q3)}
                </Text>
              </View>
            ))}
          </View>
          <Note>
            {diningDiff === 0 ? (
              <>
                <Text style={styles.bold}>No difference.</Text> A starred restaurant doesn't lift the overall guest score: guests judge
                the whole stay, not just dinner.
              </>
            ) : (
              <>
                <Text style={styles.bold}>{diningDiff > 0 ? 'A small lift' : 'Slightly lower'}:</Text> hotels with a starred restaurant
                score {Math.abs(diningDiff)} point{Math.abs(diningDiff) === 1 ? '' : 's'} {diningDiff > 0 ? 'higher' : 'lower'} with guests
                than other MICHELIN Key hotels.
              </>
            )}
          </Note>
        </Panel>
      ) : null}

      <Panel eyebrow="Is the water free?" title="Which brands give you free bottled water"
        sub="Share of each brand's hotels where bottled water in the room is free (brands with 8+ checked hotels). Policy data from isthewaterfree.com.">
        {d.water.map((w) => (
          <View key={w.brand} style={styles.waterRow}>
            <Text style={[styles.bold, { width: 120 }]} numberOfLines={1}>
              {w.brand}
            </Text>
            <View style={styles.waterTrack}>
              <View style={{ height: '100%', width: `${w.pct}%`, borderRadius: 99, backgroundColor: w.pct >= 90 ? '#16A34A' : w.pct >= 70 ? '#F59E0B' : '#DC2626' }} />
            </View>
            <Text style={styles.small}>
              {w.pct}% <Text style={styles.muted}>of {w.n}</Text>
            </Text>
          </View>
        ))}
        <Note>
          Where guests pay or are rationed:{' '}
          {d.waterCharged.length
            ? d.waterCharged.map((w, i) => (
                <Text key={w.id}>
                  {i ? ' · ' : ''}
                  <Link id={w.id} name={w.name} /> <Text style={styles.muted}>({w.status.toLowerCase()})</Text>
                </Text>
              ))
            : 'none found'}
        </Note>
      </Panel>

      {d.value.length ? (
        <Panel eyebrow="Best value" title="Guest scores of 95+ for the lowest prices"
          sub={`Hotels guests rate 95 or higher (300+ reviews), cheapest first. Each price was checked on ${d.valueChecked || 'our last check'} for 2 nights, 2 adults on three dates about 1, 2 and 4 months ahead; we show the middle price per night, and only for hotels whose booking listing we confirmed is the same hotel. Prices change, so check your own dates.`}>
          {d.value.map((v) => (
            <View key={v.id} style={styles.listRow}>
              <Text style={styles.body}>
                <Link id={v.id} name={v.name} /> <Text style={styles.muted}>· {v.where}</Text> · <Text style={styles.accentBold}>{v.g}</Text>/100 · about{' '}
                <Text style={styles.bold}>£{n(v.gbp)}</Text>/night <Text style={styles.muted}>({n(v.rc)} reviews)</Text>
              </Text>
              <Text style={styles.muted}>Sample dates: {v.dates.join(' · ')}</Text>
            </View>
          ))}
        </Panel>
      ) : null}

      <Panel eyebrow="For hotels" title="Run a hotel? Ask us for your full comparison."
        sub="How guests rate you against the hotels next door, the critics and others at your price. Hotels can't pay to change a score.">
        <Pressable style={styles.cta} onPress={() => openExternalUrl('mailto:hello@uncharteditinerary.com?subject=StayOdds%20hotel%20comparison')}>
          <Text style={styles.ctaText}>Get in touch</Text>
        </Pressable>
      </Panel>

      <Text style={styles.foot}>
        Sources: StayOdds hotel scorecards (guest reviews from booking sites and Tripadvisor, published critic scores, World's 50 Best
        Hotels 2026, MICHELIN Guide 2026 Keys, Forbes Travel Guide 2026, The Telegraph and water policies via isthewaterfree.com,
        restaurant distinctions from the MICHELIN Guide). Groups and ranks are among hotels on StayOdds only.{' '}
        <Text style={styles.link} onPress={() => openExternalUrl(INSIGHTS_PAGE_URL)}>
          Interactive charts on stayodds.com ↗
        </Text>
      </Text>
    </ScrollView>
  );
}

function Panel({ eyebrow, title, sub, children }: { eyebrow: string; title: string; sub: string; children: React.ReactNode }) {
  const shotRef = useRef<React.ComponentRef<typeof ViewShot>>(null);
  const [busy, setBusy] = useState(false);
  // Share this insight as a picture, like Compare's share card: the panel with the StayOdds
  // logo on top and the link underneath, then the phone's own share sheet.
  const share = async () => {
    if (busy) return;
    setBusy(true);
    const message = `${title} | StayOdds guest insights ${INSIGHTS_PAGE_URL}`;
    try {
      if (Platform.OS === 'web') {
        await Share.share({ title, message, url: INSIGHTS_PAGE_URL });
        return;
      }
      const uri = await shotRef.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: title, UTI: 'public.png' });
      } else {
        await Share.share({ title, message, url: INSIGHTS_PAGE_URL });
      }
    } catch {
      await Share.share({ title, message, url: INSIGHTS_PAGE_URL }).catch(() => {});
    } finally {
      setBusy(false);
    }
  };
  const { width: panelWinW } = useWindowDimensions();
  return (
    <View style={[styles.panelWrap, panelWinW >= 1000 && { width: '49%' }]}>
      <ViewShot ref={shotRef} options={{ format: 'png', quality: 1, result: 'tmpfile' }} style={styles.panel}>
        <View style={styles.shareBrand}>
          <Image source={require('../../../assets/images/stayodds-logo-white.png')} style={styles.shareLogo} />
          <Text style={styles.shareBrandText}>
            StayOdds<Text style={{ color: Colors.coral }}>.</Text>
          </Text>
        </View>
        <Text style={[styles.eyebrow, { paddingRight: 44 }]}>{t(eyebrow)}</Text>
        <Text style={styles.h2}>{t(title)}</Text>
        <Text style={styles.sub}>{t(sub)}</Text>
        <View style={{ gap: 10 }}>{children}</View>
        <Text style={styles.shareFoot}>stayodds.com/insights · real guest scores, not adverts</Text>
      </ViewShot>
      <Pressable
        onPress={share}
        style={styles.shareBtn}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Share: ${title}`}
      >
        {busy ? (
          <ActivityIndicator size="small" color={Colors.accent} />
        ) : (
          <Ionicons name="share-outline" size={18} color={Colors.accentDark} />
        )}
      </Pressable>
    </View>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return <Text style={styles.note}>{children}</Text>;
}

/** Dot + range rows (the website's range charts): thin line = best to worst, thick bar = middle half, dot = median. */
function RangeRows({ rows, min }: { rows: { label: string; stat: RangeStat; logo?: string; detail?: string }[]; min: number }) {
  const [openRow, setOpenRow] = useState<string | null>(null);
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - min) / (100 - min)) * 100));
  return (
    <View style={{ gap: 2 }}>
      <View style={styles.rrAxis}>
        <Text style={styles.muted}>{min}</Text>
        <Text style={styles.muted}>guest score</Text>
        <Text style={styles.muted}>100</Text>
      </View>
      {rows.map((r) => (
        <Pressable key={r.label} onPress={() => setOpenRow(openRow === r.label ? null : r.label)} style={styles.rrRow}>
          <View style={styles.rrLabelRow}>
            {r.logo ? <Image source={{ uri: SITE_URL + r.logo }} style={styles.rrLogo} resizeMode="contain" /> : null}
            <Text style={styles.rrLabel} numberOfLines={1}>
              {r.label}
            </Text>
            <Text style={styles.rrValue}>
              {fmt(r.stat.median)} <Text style={styles.muted}>· {r.stat.n}</Text>
            </Text>
          </View>
          <View style={styles.rrTrack}>
            {r.stat.min != null && r.stat.max != null ? (
              <View style={[styles.rrThin, { left: `${pos(r.stat.min)}%`, right: `${100 - pos(r.stat.max)}%` }]} />
            ) : null}
            <View style={[styles.rrThick, { left: `${pos(r.stat.q1)}%`, right: `${100 - pos(r.stat.q3)}%` }]} />
            <View style={[styles.rrDot, { left: `${pos(r.stat.median)}%` }]} />
          </View>
          {openRow === r.label ? (
            <Text style={styles.small}>
              Typical {fmt(r.stat.median)}/100 · middle half {fmt(r.stat.q1)}–{fmt(r.stat.q3)}
              {r.stat.min != null ? ` · range ${r.stat.min}–${r.stat.max}` : ''} · {r.stat.n} hotels
              {r.detail ? `\n${r.detail}` : ''}
            </Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.sand },
  content: { paddingTop: 16, paddingBottom: 40, gap: 16, maxWidth: 960, width: '100%', alignSelf: 'center' },
  contentTwoCol: { maxWidth: 1400, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: Colors.sand },
  header: { gap: 6 },
  eyebrow: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', color: Colors.accent },
  h1: { fontSize: 28, fontWeight: '900', color: Colors.inkPrimary, letterSpacing: -0.5, lineHeight: 32 },
  h2: { fontSize: 19, fontWeight: '800', color: Colors.inkPrimary, lineHeight: 24 },
  sub: { fontSize: 14, color: Colors.inkSecondary, lineHeight: 20 },
  panel: { backgroundColor: Colors.sandCard, borderRadius: 18, borderWidth: 1, borderColor: Colors.sandBorder, padding: 18, gap: 6 },
  panelWrap: { position: 'relative' },
  shareBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentSoft,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
  },
  shareBrand: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 },
  shareLogo: { width: 22, height: 22, borderRadius: 6 },
  shareBrandText: { fontSize: 14, fontWeight: '900', color: Colors.inkPrimary, letterSpacing: -0.3 },
  shareFoot: { marginTop: 8, fontSize: 11, fontWeight: '600', color: Colors.inkMuted },
  note: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12, marginTop: 4, fontSize: 14, color: Colors.inkSecondary, lineHeight: 20 },
  body: { fontSize: 14, color: Colors.inkPrimary, lineHeight: 20 },
  small: { fontSize: 12.5, color: Colors.inkSecondary, lineHeight: 18 },
  muted: { fontSize: 11.5, color: Colors.inkMuted },
  bold: { fontWeight: '800', color: Colors.inkPrimary },
  accentBold: { fontWeight: '800', color: Colors.accent },
  link: { fontWeight: '700', color: Colors.inkPrimary, textDecorationLine: 'underline', textDecorationColor: Colors.accentBorder },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    color: Colors.inkPrimary,
    backgroundColor: '#FFE3D8',
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  rowBlock: { gap: 4, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.borderSoft },
  track: { height: 14, borderRadius: 99, backgroundColor: '#E9EDF3', marginTop: 6, justifyContent: 'center' },
  trackFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 99, backgroundColor: '#FFE3D8' },
  trackDot: { position: 'absolute', width: 20, height: 20, marginLeft: -10, borderRadius: 10, backgroundColor: Colors.accent, borderWidth: 3, borderColor: '#FFFFFF' },
  trackEnds: { flexDirection: 'row', justifyContent: 'space-between' },
  rankBig: { fontSize: 18, fontWeight: '800', color: Colors.accent },
  listRow: { paddingVertical: 4 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  idea: { flexGrow: 1, flexBasis: 240, borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 14, gap: 4, marginBottom: 2 },
  ideaTitle: { fontSize: 15.5, fontWeight: '800', color: Colors.inkPrimary },
  bigNum: { fontSize: 30, fontWeight: '900', color: Colors.inkPrimary },
  oursRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  oursBarWrap: { flex: 1, flexDirection: 'row' },
  oursPos: { justifyContent: 'flex-start', borderLeftWidth: 2, borderLeftColor: Colors.border },
  oursNeg: { justifyContent: 'flex-end', borderRightWidth: 2, borderRightColor: Colors.border },
  oursBar: { height: 10, borderRadius: 99 },
  oursGap: { width: 40, textAlign: 'right', fontWeight: '800', color: Colors.inkPrimary },
  waterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  waterTrack: { flex: 1, height: 12, borderRadius: 99, backgroundColor: '#E9EDF3', overflow: 'hidden' },
  cta: { alignSelf: 'flex-start', backgroundColor: Colors.accent, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 },
  ctaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  foot: { fontSize: 12, color: Colors.inkMuted, lineHeight: 18 },
  rrAxis: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  rrRow: { paddingVertical: 6, gap: 4 },
  rrLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rrLogo: { width: 28, height: 18 },
  rrLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.inkPrimary },
  rrValue: { fontSize: 13, fontWeight: '800', color: Colors.inkPrimary },
  rrTrack: { height: 16, justifyContent: 'center' },
  rrThin: { position: 'absolute', height: 2, backgroundColor: '#94A3B8', borderRadius: 1 },
  rrThick: { position: 'absolute', height: 8, backgroundColor: '#FFD4C2', borderRadius: 4 },
  rrDot: { position: 'absolute', width: 12, height: 12, marginLeft: -6, borderRadius: 6, backgroundColor: Colors.accent },
});

export default lazyTab(withRailShortcuts(InsightsScreen));
