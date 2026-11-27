# StayOdds: store listings (prepared, not submitted)

Nothing in this folder submits anything. Oliver reviews first.

## What's here

| File | For | What it is |
|---|---|---|
| `store/listing.py` | both | All listing text in 10 languages. Run `python3 store/listing.py` after any edit. |
| `store.config.json` | App Store | Generated. Uploaded with `npx eas-cli metadata:push` (only when Oliver says go). |
| `store/google-play/<lang>/` | Google Play | Generated title, short and full description, release notes per language. |
| `store/screenshots/` | both | Screenshots at the sizes each store asks for. |
| `store/graphics/` | Google Play | 512px icon and 1024 x 500 feature graphic. |

Languages: English (UK and US), Spanish (Spain and Latin America), Portuguese (Brazil), French,
German, Italian, Arabic, Japanese, Indonesian and Persian. The App Store has no Persian listing,
so Persian is on Google Play and inside the app only.

## App Store: answers for App Store Connect

**App Privacy ("nutrition label")**
- Tracking: **No**. The app doesn't track people across other companies' apps or websites.
- Data collected: **Other user content** (the optional "Request a resort" and "Send feedback"
  forms send what you type to our inbox through Web3Forms). Not linked to identity, not used
  for tracking, purpose: App functionality.
- Location: the map can show where you are only if you allow it, and it stays on the phone, so
  it is **not collected**.
- Everything else (saved hotels, cached hotel data) stays on the phone: **not collected**.
- Videos play from YouTube, and booking links open partner sites in the browser; those sites
  have their own policies.

**Age rating**: every question "None" / "No". Result: 4+.
**Category**: Travel (secondary: Lifestyle).
**Price**: Free. **Availability**: all countries.
**Review contact**: Oliver Khademi, hello@uncharteditinerary.com. *Phone number still to add.*
**Sign-in for reviewers**: not needed (no accounts).
**Export compliance**: uses only standard encryption (already set: `ITSAppUsesNonExemptEncryption = false`).
**Privacy policy**: https://uncharteditinerary.com/privacy/ (covers the app; app section added).
**Support**: https://uncharteditinerary.com/contact/ . **Marketing**: https://stayodds.com/

**Screenshots Apple needs** (from `store/screenshots/ios/`)
- iPhone 6.9" (1320 x 2868): 3 to 10 images.
- iPad 13" (2064 x 2752): 3 to 10 images, because the app runs on iPad.

## Google Play: answers for Play Console

**Data safety**
- Data collected: **Messages / other user-generated content** from the optional request and
  feedback forms. Purpose: App functionality. Optional for the user. Not shared, not sold.
- Encrypted in transit: **Yes** (HTTPS). Users can ask for deletion: **Yes**, by email.
- Location: **not collected** (shown on the device only).
- No account, so no account deletion link is needed.

**Content rating questionnaire (IARC)**: category "Reference, News, or Educational" / "Travel";
no violence, sexual content, language, controlled substances, gambling or user interaction
between people. Expected rating: Everyone / PEGI 3.

**Target audience**: 18 and over (luxury travel and booking links). Not designed for children.
**Ads**: the app contains no ads. **App access**: everything is available without signing in.
**Category**: Travel & Local.

**Graphics Google needs** (from `store/graphics/` and `store/screenshots/android/`)
- App icon 512 x 512, feature graphic 1024 x 500.
- Phone screenshots (1080 x 1920 or larger, 2 to 8), 7" and 10" tablet screenshots.

**Before production on a new personal account**: a closed test with at least 12 testers who stay
opted in for 14 days in a row, then apply for production access in Play Console.

## Uploading, when Oliver says go

- App Store: `npx eas-cli metadata:push` (text), upload screenshots in App Store Connect, pick
  the TestFlight build, then **Submit for Review**.
- Google Play: create the app in Play Console, paste the text from `store/google-play/`, upload
  graphics and the production build (`eas build -p android --profile production` makes an .aab),
  start the closed test.
