# baccarat — Design

> A Telegram Baccarat dealer built as a single Cloudflare Worker. The Worker is a
> stateless HTTP/webhook front; the actual game — its state machine, timers, and
> history — lives in one **Durable Object per Telegram group**, addressed by
> `idFromName(chatId)`. Cards are Telegram dice rolls (the visible 🎲 *is* the
> shuffle), points are the dice-sum mod 10, and every finished round is written to
> the room's embedded SQLite.

This is the authoritative design spec; the implementation follows it. Section
numbers are stable anchors — source comments and reviews reference them as
`design §N`.

**Contents**

1. [Background & goals](#1-background--goals)
2. [Architecture](#2-architecture)
3. [Request flow](#3-request-flow)
4. [The game state machine](#4-the-game-state-machine)
5. [Dice, dealing & the third-card rules](#5-dice-dealing--the-third-card-rules)
6. [Sequential messaging](#6-sequential-messaging)
7. [Timers & crash recovery](#7-timers--crash-recovery)
8. [Betting, limits & payouts](#8-betting-limits--payouts)
9. [Data model & storage](#9-data-model--storage)
10. [The REST API](#10-the-rest-api)
11. [Security](#11-security)
12. [Configuration & deployment](#12-configuration--deployment)

---

## 1. Background & goals

Running a baccarat table in a group chat by hand needs a trusted dealer to
shuffle, count points mod 10, apply the third-card matrix, and tally payouts.
Existing casino bots assume a backend and a database. `baccarat` is a single
Cloudflare Worker deployed to your own account, and holds itself to these goals:

- **G1 — Rules in code, not in a human.** Natural 8/9, the full player/banker
  draw matrix, and tie-8× / 1× payouts are computed deterministically.
- **G2 — Verifiable randomness.** Card values come from Telegram `sendDice`,
  rolled visibly in the chat; the operator cannot pick cards.
- **G3 — Per-group isolation.** Each Telegram group is a fully independent table —
  its own state, timers, and history — with no cross-talk.
- **G4 — No infrastructure to babysit.** State and history live inside the Durable
  Object; the only deployed artifact is the Worker.
- **G5 — Tunable without redeploying code.** Phase durations are `wrangler.jsonc`
  vars parsed once per request.

### Non-goals

- **Not real-money gambling.** Points are in-memory scores — no wallet, ledger,
  cross-round balance, or settlement.
- **Not multi-table per group.** One group = one Durable Object = one active
  round.
- **Not durably-scheduled.** Timers are plain `setTimeout` (§7), not DO Alarms;
  correctness after eviction comes from recovery, not timer persistence.
- **Not private-chat play.** Games are group-only.

---

## 2. Architecture

There are **two request-handling layers**, both built on the Worker runtime but
with separate route namespaces:

```
                        Cloudflare edge
 Telegram ── POST /webhook ──►┌──────────────────────────────────────┐
                             │ src/index.ts  (Hono Worker)            │
 automation ─ REST /… ───────►│  /webhook → Grammy dispatch           │
                             │  createRoutes() → REST API             │
                             └──────────────┬───────────────────────┘
                                            │ callGameRoom / proxyToGameRoom
                                            │ GAME_ROOMS.idFromName(chatId).fetch(path)
                             ┌──────────────▼───────────────────────┐
                             │ BaccaratGameRoom  (Durable Object)    │
                             │  pathname switch router               │
                             │  GameEngine (state machine + timers)  │
                             │  MessageSender ─► Telegram Bot API     │
                             │  DO KV storage: 'game', 'autoGame'     │
                             │  DO SQLite: game_records               │
                             └───────────────────────────────────────┘
```

1. **Worker layer** — `src/index.ts` + `src/handlers/routes.ts`. The public
   HTTP/webhook surface: `/webhook`, the REST API, health/config. Stateless per
   request; global CORS via `app.use('*', cors())`; JSON 404 / 500 handlers.
2. **Durable Object layer** — `src/durable-objects/game-room.ts`. One
   `BaccaratGameRoom` instance per Telegram chat, keyed by `idFromName(chatId)`.
   Holds the real game state, timers, and storage. It is routed **internally by
   URL pathname** on a synthetic `https://game.room<path>` request.

**Per-request `Bot` rule.** A Grammy `Bot` is **constructed per request / per DO
init and never reused** — `src/index.ts` (webhook), `routes.ts` (send-message /
set-webhook), `game-room.ts` `initEngine()` (DO). Grammy `Bot` instances carry
per-update state and must not be shared across the Worker's concurrent requests.

**DO entry export.** `src/index.ts` does
`export default { fetch: app.fetch }` **and** `export { BaccaratGameRoom }` — the
DO class must be a named export from the Worker entry for the `GAME_ROOMS`
binding to resolve it.

---

## 3. Request flow

The Worker never touches game state directly; it resolves the group's Durable
Object and forwards. Tracing `/bet banker 100`:

```
POST /webhook  (Telegram update)
  1. new Bot(BOT_TOKEN); createConfig(env); registerCommands(bot,env,config)
  2. webhookCallback(bot,'hono') dispatches to the matching command
  3. chat-guard middleware: drop silently if chatId ∉ ALLOWED_CHAT_IDS
  4. bot.command('bet'): parse betType+amount, validate ≤ config.maxBetAmount
  5. callGameRoom(env, chatId, '/place-bet', 'POST', {betType, amount, userId, userName})
       → GAME_ROOMS.idFromName(chatId).get().fetch('https://game.room/place-bet', {…, chatId})
  6. DO.fetch(): if !engine → initEngine() (Bot, MessageSender, GameStorage,
       GameEngine, engine.initialize())   ── lazy, first-hit only
  7. switch(url.pathname) '/place-bet' → handlePlaceBet
  8. re-validate params/betType/amount → engine.placeBet(...)
  9. GameEngine: state==Betting, time window, per-bet + per-user caps, mutate
       game.bets, storage.put('game', game)
 10. JSON response bubbles DO → callGameRoom → ctx.reply(...) to Telegram
```

**Two entry paths, one destination.** The Telegram path uses `callGameRoom`
(`commands.ts`); the REST path uses `proxyToGameRoom` (`routes.ts`). Both merge
`chatId` into the request and hit the same DO pathnames. The DO's pathname router
is the single funnel; add new game actions there.

**DO pathnames.** `/start-game`, `/place-bet`, `/process-game`, `/get-status`,
`/stop-game` (= `/force-stop-game`), `/enable-auto`, `/disable-auto`,
`/game-history`, `/game-detail`, `/health`. `game-detail` reads by
`gameNumber` only; the others resolve the room from `chatId`.

---

## 4. The game state machine

`GameData.state` moves through `GameState` (`src/types.ts`):

```
idle ──startGame──► betting ──process/timer──► processing ──► revealing ──► finished
   ▲                    │                                                      │
   │                    └── forceStop / cleanup ──────────────────────────────┘
   └───────────────────── auto-game loop re-enters startGame ◄─────────────────┘
```

| State | Meaning | Exit |
| --- | --- | --- |
| `betting` | Window open; bets accepted; countdown timers armed. | Betting timer fires, or `/process`, or force-stop. |
| `processing` | Betting closed; bet summary sent; `isProcessing` guard set. | Enters `revealing`; a `globalProcessTimeoutMs` watchdog force-cleans a hang. |
| `revealing` | Cards being dealt via dice; `revealingInProgress` guard set. | Result computed → `finished`. |
| `finished` | Winner + payouts sent; record saved. | Auto-game reschedules `startGame`, or a cleanup timer wipes live state. |

The live game object is persisted to DO KV under `'game'` at every transition, so
a re-instantiated DO can recover (§7). Auto-game mode is a separate boolean under
`'autoGame'`.

**Concurrency guards.** `isProcessing` and `revealingInProgress` are in-memory
flags that prevent double-processing / double-reveal. Because a Durable Object
executes single-threaded, they are mostly advisory belt-and-suspenders — but the
`safeProcessGame` early-return on `isProcessing` still matters when a manual
`/process` races the auto-process timer.

---

## 5. Dice, dealing & the third-card rules

### 5.1 Dice as RNG

Card values are Telegram dice. `sendDice` returns `result.dice.value` (1–6);
`MessageSender.rollDice` uses it when valid, else **falls back to
`Math.floor(Math.random()*6)+1`** if the dice API fails (logged as a warning). A
side's points are `calculatePoints(cards) = sum % 10` (`src/lib/game-utils.ts`).

### 5.2 Deal order

`dealCards` (`src/game/game-engine.ts`) deals four cards in strict order —
**Banker#1, Player#1, Banker#2, Player#2** — each an awaited `rollDice`, so the
dice roll, its animation wait, and its result message stay in sequence (§6).
Cards are persisted after the initial deal and again after any third card.

### 5.3 Natural & third-card matrix

After the first two cards, if **either** side totals ≥ 8 it is a *natural* — no
third card. Otherwise:

- **Player** draws on a two-card total of **0–5**, stands on 6–7.
- **Banker** draws on **0–2**, stands on **7+**. At 3–6, the decision depends on
  the player's third card (`playerThirdCard`):

  | Banker total | Draws iff player's third card ∈ |
  | --- | --- |
  | 3 | any value except 8 |
  | 4 | {2,3,4,5,6,7} |
  | 5 | {4,5,6,7} |
  | 6 | {6,7} |

  If the player **stood** (`playerThirdCard === null`), the banker draws on 0–5
  and stands on 6.

`calculateAndSendResult` recomputes final points (mod 10), sets the winner
(higher points; equal = tie), transitions to `finished`, saves the record, then
sends the formatted result and hands off to `handleGameCompletion`.

---

## 6. Sequential messaging

Telegram rate-limits sends and does not guarantee ordering under concurrency, but
a dealer must show *dice → animation → result* in order. `MessageSender`
(`src/game/message-sender.ts`) serializes all sends through a **promise-chain
lock**, not a real queue:

```ts
private enqueue(task) {
  const next = this.lock.then(task, task)   // run even if the previous task rejected
  this.lock = next.then(()=>{}, ()=>{})     // swallow errors so the chain stays alive
  return next
}
```

Every `send` and `rollDice` chains onto `this.lock`, so tasks execute strictly in
enqueue order. Crucially the chain **continues even if a task throws** — an
errored send must not deadlock the rest of a round's messages. `reset()` starts a
fresh chain (called on new game, force-stop, and cleanup). This is deliberately
*not* a message-queue subsystem — the promise chain is the queue.

---

## 7. Timers & crash recovery

### 7.1 Plain `setTimeout`, not DO Alarms

Countdown reminders (20/10/5 s), the betting-window auto-process, the auto-game
loop, and post-game cleanup are all plain `setTimeout` tracked in a `Set`
(`setTimer` / `clearAllTimers`). This is a deliberate simplicity choice — but
`setTimeout` timers **do not survive DO eviction or hibernation**. The correctness
guarantee therefore comes from recovery, not from timers.

### 7.2 Recovery on re-instantiation

`initEngine()` calls `engine.initialize()`, which loads the persisted `'game'`
and, if present, runs `recoverGameState(now)` — deriving the right action from
the stored state rather than from a (lost) timer:

| Persisted state | Recovery action |
| --- | --- |
| `betting`, > 30 s past `bettingEndTime` | Stuck window → `safeProcessGame()` (auto-close and reveal). |
| `betting`, still within window | Re-arm countdown + auto-process timers via `setupCountdownTimers`. |
| `processing` / `revealing` | Considered stuck (its timers are gone) → `cleanupGame(...)`. |
| `finished` + `autoGame` set | Re-enter `handleGameCompletion()` to continue the auto-game loop. |

### 7.3 Watchdog

`safeProcessGame` arms a `globalProcessTimeoutMs` (default 90 s) `setTimeout`; if
a reveal hangs that long it calls `forceCleanup`, wiping live state so the room is
not permanently stuck in `processing`/`revealing`.

---

## 8. Betting, limits & payouts

### 8.1 Accumulation

Bets are keyed per user (`game.bets[userId]: UserBets`), and per bet type within a
user. A repeat bet on the same type **accumulates** (`existing + amount`); the
response flags `isAccumulated` / `isNewBetType` / `previousAmount` so the reply
can show `100 + 50 = 150`.

### 8.2 Limits

Two caps, both **hardcoded** (not env vars):

- `maxBetAmount = 10000` — per bet type, checked against the *accumulated* amount
  (`src/types.ts`, in `Config`).
- `maxUserTotalBet = 50000` — sum of a user's bets across all types
  (`src/game/game-engine.ts`).

`placeBet` re-validates state (`Betting`), time window, bet type, positivity, and
both caps server-side — the command-layer checks in `commands.ts` are a
fast-fail convenience, not the authority.

### 8.3 Payouts

Computed in `formatGameResult` (`src/lib/game-utils.ts`): a winning `tie` bet
pays `amount × 8`; a winning `banker`/`player` bet pays `amount × 1`; losing bets
forfeit the stake. Net per user = winnings − losses; the message also reports
round totals and “house profit”. Payouts are **display-only** — there is no
persisted balance (§1, non-goal).

---

## 9. Data model & storage

Two storage mechanisms inside each Durable Object:

### 9.1 DO key-value (`state.storage.get/put`)

- `'game'` → the live `GameData` (see §4), rewritten at every transition.
- `'autoGame'` → boolean auto-game flag.

`GameData` (`src/types.ts`): `gameNumber`, `state`, `bets` (`Record<userId,
UserBets>`), `cards.{banker,player}: number[]`, `result.{banker,player,winner}`,
`startTime`, `bettingEndTime`, `chatId`.

### 9.2 DO embedded SQLite (`state.storage.sql`)

A single table stores finished rounds:

```sql
CREATE TABLE IF NOT EXISTS game_records (
  game_number TEXT PRIMARY KEY,
  chat_id     TEXT NOT NULL,
  data        TEXT NOT NULL,   -- full GameRecord as JSON
  end_time    INTEGER NOT NULL
);
```

`GameStorage` (`src/lib/storage.ts`) lazily `ensureTable()`s, writes with
`INSERT OR REPLACE`, and reads history filtered by `chat_id ORDER BY end_time
DESC LIMIT ?`. `GameRecord` extends `GameData` (drops `bettingEndTime`, adds
`endTime`, `totalBets`, `totalAmount`). Because the DO is already per-chat, the
`chat_id` column is redundant isolation but keeps history queries explicit.

**Game number** = `YYYYMMDD` + `HHMMSS` (host clock, UTC on Workers) + 6 random
digits — human-sortable and effectively unique (`generateGameNumber`).

---

## 10. The REST API

`src/handlers/routes.ts` builds a Hono sub-app mounted at `/`. It exposes the
same game actions as the bot for automation:

- **Public reads** — `/`, `/health`, `/config`, `/game-status/:chatId`,
  `/game-history/:chatId`, `/game-detail/:gameNumber` (chat allow-list only).
- **Secret-gated mutations** — `/auto-game`, `/enable-auto`, `/disable-auto`,
  `/process-game`, `/place-bet`, `/send-message`, `/set-webhook`.

`proxyToGameRoom(c, doPath)` validates the chat, resolves
`GAME_ROOMS.idFromName(chatId)`, merges `chatId` into the body, and forwards to
the DO — returning the DO's JSON and status verbatim. `game-detail` is handled
inline (it requires a `?chatId=` to pick the room and a numeric `gameNumber`).

---

## 11. Security

The bot and its API are internet-facing and mostly unauthenticated by default;
harden them explicitly:

- **Chat allow-list** — `validateChatId` (`routes.ts`) and the command-guard
  middleware (`commands.ts`) reject chats not in `ALLOWED_CHAT_IDS`. **If unset,
  every chat is allowed** — set it in production.
- **API secret** — `requireApiSecret` gates mutating REST routes via `X-API-Key`
  / `?api_key=`, but only when `API_SECRET` is set (it is *not* in
  `wrangler.jsonc`; add it as a secret). Unset ⇒ mutations are open to any
  allow-listed chat.
- **Bot token** — ships as a plaintext `var` placeholder in `wrangler.jsonc` for
  convenience; in production set it with `wrangler secret put BOT_TOKEN`, not as a
  committed var.
- **Read endpoints** (`/game-status`, `/game-history`, `/game-detail`, `/config`)
  are unauthenticated aside from the chat allow-list.
- **PII minimization** — the Telegram `/gameinfo` renderer anonymizes player IDs
  to `User<last4>` (`formatGameInfo`). This is presentation-only, not
  storage-level: the REST `/game-detail` and `/game-status` return the raw stored
  `bets` (full `userName` + `userId`), and the in-chat result messages
  (`formatGameResult`) still show `userName (userId)`.
- **`currentChatId` fallback** — the DO keeps the last `chatId` in memory as a
  fallback for requests that omit it (force-stop, history). It is lost on
  eviction; requests that carry `chatId` in body/query are robust.

---

## 12. Configuration & deployment

### 12.1 Config

`createConfig(env)` (`src/types.ts`) is the single parse site, called from the
Worker entry, the REST routes, and the DO. It parses **seven** timing knobs from
`wrangler.jsonc` vars (all ms strings) plus the hardcoded `maxBetAmount`. Full
table in the [README](README.md#configuration).

> **Inert vars.** `DICE_ROLL_TIMEOUT_MS`, `DICE_ROLL_MAX_RETRIES`, and
> `CARD_DEAL_DELAY_MS` are declared in `Env` and `wrangler.jsonc` but never read.
> They are dead knobs — do not assume changing them does anything.
> `MESSAGE_DELAY_MS` is a half-dead knob: `createConfig` parses it and `/config`
> echoes it, but no code path paces messages by it (dice waits are the only delays).

### 12.2 Bindings & migrations

One binding: `GAME_ROOMS` → `BaccaratGameRoom`, made SQLite-backed by the `v1`
migration (`new_sqlite_classes`). `compatibility_flags: ["nodejs_compat"]`.
Observability on, head sampling 1.0.

### 12.3 Deploy

```bash
pnpm --filter @cdlab/baccarat build    # bun build — bundle sanity check only
pnpm --filter @cdlab/baccarat deploy   # wrangler deploy --minify (the real deploy)
```

`build` is a `bun build` sanity check; the actual deploy is `wrangler deploy`, not
the `dist/` output. There is **no test suite**. After deploying, register the
webhook (`POST /set-webhook {url}`) so Telegram routes updates to the Worker.

> The `deploy:dev` / `deploy:prod` scripts pass `--env development|production`,
> but `wrangler.jsonc` has **no `[env]` blocks** — those targets are unconfigured.
> Use the plain `deploy` script until env blocks are added.
