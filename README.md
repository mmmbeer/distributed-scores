# Shared Scores

Shared Scores is a mobile-first live scorekeeping app for two-sided sideline sports. A scorekeeper runs the board from a phone and shares a six-character code or viewer link. Viewers receive updates through Server-Sent Events with periodic fetch fallback.

## Sports

- Volleyball: best of 3 or 5; deciding set to 15; win by 2
- Basketball: 4 quarters or 2 halves; 1, 2, and 3 point actions
- Football: 4 quarters; 1, 2, 3, and 6 point actions
- Tennis: best of 3 or 5; automatic points, games, deuce, advantage, tiebreaks, and sets
- Baseball: 7 or 9 innings
- Hockey: 3 periods
- Soccer: 2 halves
- Pickleball: best of 3 or 5; games to 11, 15, or 21; win by 2
- Badminton: best of 3; games to 21; win by 2 with a 30-point cap

## Scorekeeper controls

- Tap either side to add one
- Swipe up or down to add or remove score
- Swipe left or right to remove or add a win
- Use sport-specific quick buttons for basketball and football
- Advance periods, quarters, halves, and innings from the center control
- Swap sides, edit names/colors, keep the display awake, and use fullscreen mode

## Local development

Requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Useful commands:

- `npm run lint`
- `npm run build`
- `npm test`
- `npm run db:generate`

The app uses Cloudflare D1 through the Sites runtime. Database schema lives in `db/schema.ts`; generated migrations live in `drizzle/`.

## Public score API

- `GET /api/v1/matches/{code}` returns a score snapshot
- `GET /api/v1/matches/{code}/events` streams `score` events
- `GET /api/v1/matches/recent` returns the 10 most recently updated public scoreboards
- `GET /api/v1/openapi.json` returns the OpenAPI description

Creating and updating matches requires the private scorekeeper token returned when a match is created. Viewer responses never expose it.
