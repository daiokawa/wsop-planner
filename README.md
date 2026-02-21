# WSOP Planner 2026

A smart tournament planner for the 2026 World Series of Poker. Input your budget, preferred game types, and travel dates — the app recommends an optimized schedule using a greedy scoring algorithm.

**Live:** https://wsop.ahillchan.com

## Features

- **Smart Recommendations** — Greedy algorithm scores tournaments based on your budget, game preferences, and risk appetite (policy slider)
- **"Not Sure About Dates?" Mode** — Enter just your number of days in Vegas; the app finds the optimal window across the entire WSOP schedule via sliding window search
- **Day 2+ Conflict Detection** — Warns you when Day 1 of one event overlaps with Day 2/3/Final of another
- **Calendar View** — Visual month view of your plan with color-coded game formats
- **Browse & Add** — Explore all 100+ events and manually add/remove from your plan
- **Google Calendar Export** — One-click `.ics` download of your schedule
- **Multi-language** — English, Japanese, Korean, Chinese
- **Fully Client-Side** — No server, no database. All logic runs in your browser, data stored in localStorage

## How the Recommendation Engine Works

1. **Filter** — Remove events outside your budget range, date range, and game type preferences
2. **Score** — Each tournament gets a composite score based on:
   - Game type match (+30)
   - Main Event bonus (+100)
   - Policy slider influence: conservative favors low buy-in / large fields, aggressive favors high stakes / big guarantees
   - Field size, freezeout format, game mix variety, flight preference
3. **Budget Guard** — `maxSingleSpend = budget × (0.6 + slider × 0.4)` prevents a single high-buy-in event from consuming the entire budget (the "cliff problem")
4. **Greedy Select** — Pick the highest-scoring events that fit within budget, with no Day 1 date conflicts and one flight per multi-flight event

## Tech Stack

- **Next.js 15** (App Router)
- **React 19**
- **Tailwind CSS v4**
- **TypeScript**
- **Vercel** (hosting)

## Getting Started

```bash
git clone https://github.com/daiokawa/wsop-planner.git
cd wsop-planner
npm install
npm run dev
```

Open http://localhost:3000.

## Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/
│   ├── HomeClient.tsx    # Main planner UI (state, preferences, plan)
│   ├── TournamentCard.tsx # Individual event card
│   ├── CalendarModal.tsx  # Calendar view
│   ├── FilterPanel.tsx    # Browse page filters
│   └── ClientProviders.tsx # Auth & i18n providers
├── data/
│   └── tournaments.ts    # All WSOP 2026 events (hand-curated)
├── lib/
│   ├── recommend.ts      # Scoring & greedy selection algorithm
│   ├── conflicts.ts      # Day 2+ overlap detection
│   ├── i18n.tsx          # Translations (en/ja/ko/zh)
│   └── storage.ts        # localStorage helpers
└── types/
    └── index.ts          # TypeScript type definitions
```

## Contributing

Forks and PRs are welcome. Some ideas:

- **More game data** — Add historical stats, satellite info, or structure details
- **Time-slot awareness** — Currently uses date-level conflict detection; time-of-day support would allow multiple same-day events
- **Additional series** — The architecture generalizes to other poker series (USOP, EPT, etc.)
- **Mobile UX** — Always room to improve the mobile experience

## License

MIT — see [LICENSE](LICENSE).

## Author

[@daiokawa](https://github.com/daiokawa)
