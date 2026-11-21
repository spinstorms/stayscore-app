# StayScore — by The Uncharted Itinerary

Native **iOS**, **Android**, and **Foldable / iPhone Duo / Tablet** luxury hotel comparison app built with **Expo SDK 58**, **React Native 0.88**, **Expo Router**, and **TypeScript**.

## What It Does
- **StayScore Global Luxury Directory (112+ Hotels):** Compares our personally visited & filmed hotel reviews alongside iconic luxury resorts worldwide (Maldives, Bali, Thailand, Japan, Dubai, Europe, Bora Bora, Americas, and Africa).
- **Automatic Live Sync ($0/month backend):** Pulls live JSON directly from `https://live.uncharteditinerary.com/data/` with offline caching via `AsyncStorage`. Whenever you publish a new YouTube review or update your Google Sheet affiliate deals, the app updates automatically with zero App Store resubmissions.
- **Adaptive Foldable / iPhone Duo / iPad Support:** Built with `orientation: "default"`, `supportsTablet: true`, `UIRequiresFullScreen: false`, Android `edgeToEdgeEnabled: true`, and a responsive `useAdaptiveLayout()` hook that automatically switches into Split-Pane Master-Detail (Home) and 2-Column Side-by-Side Comparison (Compare VS) on unfolded screens (`width >= 680`).
- **YouTube Episodes & Shorts Hub:** Direct access to full reviews, travel notes, and vertical Shorts.
- **Travel Perks & Filming Kit:** 1-tap promo code copy with haptic feedback (`TRIPREADY`, `OKM2ZH`, etc.) and curated gear links.

---

## Quick Start: Test on Your Real Phone in 5 Minutes (Free)

1. Install **Expo Go** from the Apple App Store or Google Play Store on your phone.
2. On your computer (Mac, Windows, or Linux), install [Node.js 22+](https://nodejs.org/), clone this repo, and run:
   ```bash
   npm install
   npx expo start --tunnel
   ```
3. Scan the QR code shown in your terminal using your iPhone Camera app (or inside Expo Go on Android). The live **StayScore** app opens directly on your phone!

---

## Publishing to the Apple App Store & Google Play Store (Cloud Builds — No Mac Needed)

We included a ready-to-use `eas.json` configuration for **Expo Application Services (EAS)**, which compiles both the iOS `.ipa` and Android `.aab` in the cloud:

1. Create a free Expo account at [expo.dev](https://expo.dev) and sign in:
   ```bash
   npm install -g eas-cli
   eas login
   eas init
   ```
2. **Test Builds (TestFlight on iPhone / APK on Android):**
   ```bash
   eas build --profile preview --platform all
   ```
3. **Production App Store & Google Play Builds:**
   ```bash
   eas build --profile production --platform all
   eas submit --platform all
   ```

### Store Requirements Checklist
- **Apple App Store:** Apple Developer Program membership ($99/year). TestFlight reviews typically take 24–48 hours.
- **Google Play Store:** Google Play Console account ($25 one-time fee). Note that new personal Google Play accounts require 12 closed testers opted in for 14 days before public production release.
