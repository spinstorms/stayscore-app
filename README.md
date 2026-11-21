# StayOdds: Hotel Score Compare

**Critics vs Real Guest Reviews** — Native **iOS**, **Android**, and **Foldable / iPhone Duo / Tablet** luxury hotel comparison app built with **Expo SDK 58**, **React Native 0.88**, **Expo Router**, and **TypeScript**.

- **Bundle ID / Android Package:** `com.stayodds.app`
- **Founding First-Hand Contributor:** The Uncharted Itinerary

## Architecture & Data Integrity Policy
- **Two-Tier Transparent Scoring Engine (`lib/scoring.ts`):**
  - **Tier 1 — First-Hand Verified:** `40%` First-Hand Stay / `30%` Sourced Editorial Critics / `30%` Live Verified Guests (auto-reweights transparently if a layer isn't connected yet).
  - **Tier 2 — Global Directory:** Dynamic confidence weighting (`40/60` for 2+ critics, `25/75` for 1 critic, `100%` Guest Data Only, or `Live Ratings Pending` — never fabricates missing scores).
- **Strict `sourceUrl` Enforcement:** No editorial rating, official award, or third-party YouTube review can render without a valid `https://` source link.
- **Consensus Status Badges:** `Strong Consensus`, `Mostly Aligned`, and `Split Verdict` unlock only once 2+ verified numeric layers are active.
- **Adaptive Multi-Screen / Foldable Support:** Uses `useAdaptiveLayout()` (`width >= 680` switches to Split-Pane Master-Detail on Home, 2-column VS cards on Compare, and multi-column Deals grids).

## Quick Test on Your Real Phone via Expo Go (Phase 1A)
1. Install **Expo Go** on your iPhone or Android device.
2. Run locally:
   ```bash
   npm install
   npx expo start --tunnel
   ```
3. Scan the QR code with your phone camera (iOS) or Expo Go (Android).

## Cloud Builds (Phase 1B+ — After Supabase & Google Places API)
```bash
npm install -g eas-cli
eas login
eas init
eas build --profile preview --platform all
```
