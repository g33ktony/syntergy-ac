# Parallel handoff — un ticket, velocidad, cargas

> Read this first. Then open **only** the plan for your agent. Do not implement another lane’s files.

**Spec:** `docs/superpowers/specs/2026-08-17-single-ticket-speed-charge-design.md`  
**Parent branch (docs only):** `feat/single-ticket-speed-charge`  
**Base for worktrees:** that branch after it is on GitHub (or `origin/master` + cherry-pick the docs commits).

## When to start (human)

| Agent | Plan | Start |
|-------|------|--------|
| **Cursor** | `2026-08-17-lane-cursor-gate.md` | **Now** (this repo / its worktree) |
| **Claude** | `2026-08-17-lane-claude-charge.md` **Tasks 1–4 only** | **Now** (own worktree) |
| **Codex** | `2026-08-17-lane-codex-map.md` | **Now** (own worktree) |
| **Claude** | same file **Tasks 5+ (wire App)** | **Wait** — Cursor will say when GATE is on `master` (or the integration branch) |

Do **not** give Claude Tasks 5+ until Cursor reports GATE merged. Tasks 1–4 are new files only and will not collide.

## Worktrees (sibling dirs)

From `/Users/antonio/Documents/personal_projects` after `feat/single-ticket-speed-charge` is fetched:

```bash
REPO=syntergy-ac
git -C "$REPO" fetch origin
git -C "$REPO" worktree add -b feat/lane-cursor-gate ../syntergy-ac-cursor feat/single-ticket-speed-charge
git -C "$REPO" worktree add -b feat/lane-codex-map ../syntergy-ac-codex feat/single-ticket-speed-charge
git -C "$REPO" worktree add -b feat/lane-claude-charge ../syntergy-ac-claude feat/single-ticket-speed-charge
```

If a worktree path already exists, pick another sibling name. Never `checkout` a branch that is already checked out in another worktree.

Each agent: `npm install && npm test && npx tsc -b --noEmit` before coding. TDD: failing test first.

## File lock (do not touch another lane)

| Path | Owner |
|------|--------|
| `src/lib/speed-factor.ts` (+ test) | Cursor |
| `src/lib/co2.ts` (+ test) | Cursor |
| `src/lib/reserve-copy.ts` (+ test) | Cursor |
| `src/lib/constants.ts` | Cursor |
| `src/types.ts` | Cursor |
| `src/lib/calc.ts`, `calc-fuel.ts`, `calc-phev.ts` + their tests | Cursor |
| `src/lib/calc-any.test.ts` | Cursor |
| `src/App.tsx` | Cursor (GATE). Claude only after GATE |
| `src/components/TripControls.tsx` | Cursor |
| `src/components/VehicleSlot.tsx` | Cursor (GATE). Claude only after GATE |
| `src/components/ResultCard.tsx`, `FuelResultCard.tsx`, `PhevResultCard.tsx` | Cursor |
| `src/App.css` | Cursor (layout / ticket / speed field only) |
| `src/components/MapView.tsx` | **Codex** |
| `src/map-overlays.css` (create) | **Codex** |
| `src/lib/charge-plan.ts` (+ test) | **Claude** |
| `src/lib/charge-legs.ts` (+ test) | **Claude** (Task 5+, after GATE) |
| `src/lib/providers/*` | Nobody in wave 1. Claude Task 5+ may **call** `lookupTrip`, not rewrite OSM/Google |

If you need a type another lane owns, import it — do not duplicate. If it does not exist yet, use the signatures in **your** plan (they match the spec). Claude’s planner does not import `calc.ts`.

## PR targets

Wave 1: three PRs into `master` (or into `feat/single-ticket-speed-charge` if the human prefers one integration branch). They should merge with **no overlapping files**.

Wave 2: Claude `feat/lane-claude-charge-wire` **after** Cursor GATE + Codex MapView are on the base. That PR may edit `App.tsx` and `VehicleSlot.tsx`.

## Global constraints (all lanes)

- Product name **Syntergy AC** only.
- UI copy Spanish (México). Imperial units do not change language.
- No API keys in git.
- TDD: write the failing test, run it, then implement.
- Do not add charge **dwell** minutes (next spec).
- One Ink Rule: no extra hue per car; Codex uses stroke weight / dashed tinta.
