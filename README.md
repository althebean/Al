# Royal Checkers (Expandable + AI + Play Store Ready)

A modern checkers game with polished visuals, modular architecture, and a built-in AI opponent.

## Features

- Chess.com-inspired polished board + piece styling.
- 8x8 and 10x10 board support.
- Forced captures and multi-capture chaining.
- King promotion with visual crown.
- Play modes:
  - Player vs Player
  - Player vs AI
- AI difficulty levels:
  - Beginner
  - Intermediate
  - Advanced
- Future-ready ad integration through `AdAdapter`.

## Run locally

```bash
cd /workspace/Al
python3 -m http.server 4173
```

Open:

```text
http://localhost:4173
```

## Play Store path (later)

### Capacitor route (best for ads)
1. Add Capacitor to this project.
2. Build Android project.
3. Integrate AdMob plugin.
4. Wire plugin calls into `AdAdapter` (`showInterstitial`, `showRewarded`).
5. Build signed AAB and publish in Play Console.

### TWA route (fast web-wrapper)
1. Deploy this app on HTTPS.
2. Wrap with Bubblewrap.
3. Publish to Play Store.

## AI notes

The AI uses minimax with alpha-beta pruning and a board-evaluation heuristic (piece count/value, king value, position bonuses).

## Ad integration notes

`AdAdapter` is a stub abstraction so gameplay logic stays unchanged when you add an ad SDK later.
