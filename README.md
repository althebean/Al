# Royal Board Arena (Expandable + AI + Play Store Ready)

A modern board-game app with polished visuals, modular architecture, and built-in AI support.

## Included games

- Checkers (8x8 and 10x10)
- Tic-Tac-Toe
- Connect Four

## Features

- Single game hub with game switching from the same UI.
- Player vs Player and Player vs AI modes.
- Difficulty levels (Beginner / Intermediate / Advanced).
- Premium chess.com-inspired styling.
- Ad integration hook via `AdAdapter` for future AdMob wiring.

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

### Capacitor route (recommended)
1. Add Capacitor.
2. Build Android app shell.
3. Integrate AdMob plugin.
4. Wire plugin calls into `AdAdapter` methods.
5. Build signed AAB and publish.

## Notes

- Checkers AI uses minimax + alpha-beta pruning.
- Tic-Tac-Toe AI uses minimax for stronger levels.
- Connect Four AI uses tactical move checks + center preference.
