# 🚀 Quick Reference - Dezcalação

## Commands

```bash
npm run dev              # Dev server (localhost:3000)
npm run build            # Build production
npm run lint             # Lint code
npm test                 # Run all tests (E2E + Unit)
npm run test:e2e         # E2E only
npm run test:unit        # Unit only
npm run test:ui          # Playwright UI
npm run test:debug       # Debug mode
```

---

## Routes

| Route | Role | Purpose |
|-------|------|---------|
| `/` | Any | Landing page |
| `/login` | Any | Magic link auth |
| `/app` | Player | Dashboard (team + ranking) |
| `/app/time` | Player | Manage substitutions |
| `/admin` | Admin | Manage groups |
| `/admin/rodadas` | Admin | Close rounds (scoring) |

---

## Key Flows

### 1. Close Round (Scoring)
```
Admin: /admin/rodadas → "Fechar Rodada"
  ↓ closeRound(groupId, roundId)
  ├─ getFixtures() [API-Football]
  ├─ getPlayerStats() per fixture
  ├─ calculateRoundScores()
  └─ round.status = 'scored'
  ↓
Player: /app → sees ranking updated
```

### 2. Make Substitution
```
Player: /app → "🔄 Substituições"
  ↓ /app/time
  ├─ Click starter
  ├─ Select bench player (same position)
  ├─ applySubstitution() validates + inserts
  └─ "✓ Substituição realizada!"
  ↓
  Substitution applies when round closes
```

### 3. View Ranking
```
Player: /app
  ├─ ParticipantStandings (updates 30s)
  │  ├─ 🥇🥈🥉 medals (top 3)
  │  ├─ User current (green highlight)
  │  └─ Total points + last score
  └─ RoundDetails (accordion)
     └─ Click round → see scores
```

---

## Server Actions

| File | Functions | Purpose |
|------|-----------|---------|
| `app/admin/rodadas/actions.ts` | `closeRound()` | Calculate scoring |
| `app/app/substitutions-actions.ts` | `applySubstitution()` `removeSubstitution()` | Manage subs |
| `app/app/standings-actions.ts` | `getGroupStandingsWithRounds()` | Fetch ranking |

---

## Components

| Component | Type | Purpose |
|-----------|------|---------|
| `ParticipantTeam` | Client | Show team + subs button |
| `SubstitutionInterface` | Client | Selector UI (by position) |
| `ParticipantStandings` | Client | Live ranking (30s) |
| `RoundDetails` | Client | Round accordion |
| `ToastContainer` | Client | Notifications |

---

## Tests

```bash
# 14 E2E Tests
tests/e2e/
├── scoring.spec.ts (admin closes → scores)
├── substitutions.spec.ts (player makes subs)
└── ranking.spec.ts (leaderboard displays)

# 10 Unit Tests
tests/unit/
└── scoring.test.ts (pure functions)
```

---

## Scoring Logic

```typescript
// effectiveRating(player) → number
// Returns 0 if < minMinutes, neutralRating if null, else rating

// basePoints(lineup, ratings) → number
// Sum of 11 starters' effective ratings

// selecaoDaRodada(players) → Set<playerId>
// XI team: 1 GK, 2 ZAG, 2 LAT, 3 MEI, 3 ATK
```

---

## Database Tables

```sql
-- Core
profiles          -- Users
groups            -- Bolões/groups
group_members     -- Members per group
players           -- Players from API-Football

-- Draft
team_players      -- Draft: who picked who
substitutions     -- Subs per round

-- Scoring
rounds            -- Matchdays/rounds
player_round_ratings  -- Ratings from API
round_scores      -- Calculated scores
```

---

## Error Handling

```typescript
// Toast notifications
(window as any).showToast('Message', 'success' | 'error' | 'warning' | 'info', 3000)

// Try/catch in Server Actions
try {
  const result = await action()
  if (!result.success) {
    setError(result.error)
    showToast(result.error, 'error')
  }
} catch (err) {
  showToast(err.message, 'error')
}
```

---

## Debugging

```bash
# View browser logs
page.on('console', msg => console.log(msg.text()))

# Pause test
await page.pause()

# View trace
npx playwright show-trace trace.zip

# Console tags
// [Rounds] [Scoring] [Substitution]
```

---

## Deployment

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
API_FOOTBALL_KEY
NEXT_PUBLIC_SITE_URL
```

### Vercel
```bash
git push → auto-deploy
```

### Supabase
```bash
supabase migration up
supabase db push
```

---

## RLS Rules

```sql
-- Players: anyone can read
-- Groups: admin can create/update
-- group_members: see own group only
-- team_players: see own team
-- substitutions: see own subs
-- round_scores: see own scores
```

---

## Performance

```
Bundle: ~500KB
Middleware: ~82.7KB
Time to interactive: <2s
Ranking update: 30s (client-side)
```

---

## Checklist Before Commit

- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] No `console.log` in production code
- [ ] No API keys exposed
- [ ] Types are correct
- [ ] New features have tests
- [ ] Steering file updated

---

## Contact / Questions

See `docs/TESTING.md` for detailed test info  
See `docs/ARCHITECTURE.md` for technical design  
See `.kiro/steering/PROJETO.md` for dev guidelines

---

**Version:** 3.0 | **Status:** ✅ Production Ready
