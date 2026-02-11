# Expandable Checkers (Play Store Ready Starter)

This project is a modular web-based checkers game designed so you can:

- Ship quickly as an Android app using **Capacitor** or **Trusted Web Activity (TWA)**.
- Add features later (AI, online multiplayer, progression, skins).
- Add ads later via a dedicated `AdAdapter` hook.

## Current Features

- 8x8 and 10x10 board options.
- Capture-priority rules.
- Multi-capture chains.
- King promotion.
- Theme switching.
- Ad integration placeholder (`AdAdapter`) with `showInterstitial` and `showRewarded` methods.

## Run Locally

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

## Path to Google Play Store

### Option A: Capacitor (recommended for ad SDK control)
1. Install Capacitor in this project.
2. Build Android shell.
3. Point WebView to local bundled assets.
4. Integrate AdMob plugin and connect it to `AdAdapter` methods.
5. Build signed AAB and upload to Play Console.

### Option B: TWA (fastest if hosted on HTTPS)
1. Host this web app on HTTPS.
2. Wrap with Bubblewrap/TWA.
3. Publish to Play Store.
4. Ads are possible but usually easier via Capacitor/native SDK bridge.

## Ad Integration Plan

Keep gameplay logic independent from ad provider:

- `AdAdapter.initialize(config)`
- `AdAdapter.showInterstitial(placement)`
- `AdAdapter.showRewarded(placement)`

When ready, replace console stubs in `script.js` with plugin calls (e.g. AdMob).

## Expansion Suggestions

- Add AI engine module (minimax + difficulty levels).
- Add online mode via Firebase or a custom backend.
- Add player profile and cloud save.
- Add analytics and A/B testing for retention and ad frequency.
