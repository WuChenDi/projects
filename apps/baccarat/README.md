# baccarat

[中文](./README.zh-CN.md)

A Telegram Baccarat game bot deployed on Cloudflare Workers with Durable Objects, built with Hono and Grammy.

## Features

- Full baccarat rules with natural wins and third-card draw logic
- Immersive card dealing with dice animations
- Auto-game mode with configurable intervals
- Per-group game isolation via Durable Objects
- Game history persistence via Cloudflare KV

## Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Start the bot and show instructions |
| `/id` | Show group and user ID info |
| `/newgame` | Start a new baccarat game |
| `/bet <type> <amount>` | Place a bet (e.g. `/bet banker 100`) |
| `/process` | Manually trigger game processing |
| `/status` | View current game status |
| `/stopgame` | Force stop the current game |
| `/autogame` | Enable auto-game mode |
| `/stopauto` | Disable auto-game mode |
| `/history` | View last 10 game records |
| `/gameinfo <number>` | View game details by number |
| `/help` | Show help message |

## Game Rules

- **Bet types**: `banker` (1:1), `player` (1:1), `tie` (8:1)
- **Points**: Dice values 1-6, total mod 10
- **Natural**: Either side totals 8 or 9 — no third card
- **Player draw**: Draws at 5 or below, stands at 6+
- **Banker draw**: Always draws at 0-4, stands at 7+. At 5: draws if player drew 1/4/5/6. At 6: draws only if player drew 6

## HTTP API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Service info |
| `GET` | `/health` | Health check |
| `POST` | `/webhook` | Telegram webhook handler |
| `GET` | `/config` | Game timing configuration |
| `POST` | `/auto-game/:chatId` | Start a game for a group |
| `POST` | `/enable-auto/:chatId` | Enable auto-game mode |
| `POST` | `/disable-auto/:chatId` | Disable auto-game mode |
| `POST` | `/process-game/:chatId` | Trigger game processing |
| `GET` | `/game-status/:chatId` | Get game status |
| `POST` | `/place-bet/:chatId` | Place a bet |
| `GET` | `/game-history/:chatId` | Get game history |
| `GET` | `/game-detail/:gameNumber` | Get game details |
| `POST` | `/send-message` | Send a message to a group |
| `POST` | `/set-webhook` | Configure Telegram webhook |

## Architecture

```
src/
  index.ts                  — Hono entry point, webhook + API routes
  types.ts                  — Domain types: Env, Config, GameData, BetType
  lib/
    bot.ts                  — Grammy wrapper (sendMessage, sendDice, setWebhook)
    storage.ts              — KV helpers (save/get game records)
    game-utils.ts           — Card calculation, Telegram message formatting
  game/
    message-sender.ts       — Sequential message sender with dice animation
    game-engine.ts          — Core baccarat game logic and state management
  handlers/
    commands.ts             — 12 Telegram bot commands
    routes.ts               — REST API routes with DO proxy
  durable-objects/
    game-room.ts            — Per-group game room (Durable Object)
```

**Key design decisions:**

- No DI container — direct dependency passing
- No abstract base classes — plain functions and simple classes
- No custom logger — uses `console.log` (Cloudflare Workers captures these)
- No timer service — plain `setTimeout` / `clearTimeout`
- Sequential messaging via promise chain instead of a message queue system

## Configuration

All timing values are configurable via `wrangler.jsonc` environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `BETTING_DURATION_MS` | 30000 | Betting phase duration |
| `AUTO_GAME_INTERVAL_MS` | 10000 | Delay between auto games |
| `DICE_ANIMATION_WAIT_MS` | 4000 | Wait for dice animation |
| `DICE_RESULT_DELAY_MS` | 1000 | Delay after showing result |
| `MESSAGE_DELAY_MS` | 2000 | Delay between messages |
| `GLOBAL_PROCESS_TIMEOUT_MS` | 90000 | Game processing timeout |
| `CLEANUP_DELAY_MS` | 30000 | Cleanup delay after game end |

## Environment Variables

### `BOT_TOKEN`

Telegram Bot API token. To obtain one:

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts to set a name and username
3. BotFather will reply with a token like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
4. Copy the token and set it in `wrangler.jsonc` under `vars.BOT_TOKEN`

### `ALLOWED_CHAT_IDS`

Comma-separated list of Telegram group chat IDs that are allowed to use the bot.

**How to get a group's chat ID:**

**Method 1** — Use the Telegram Bot API directly (no deployment needed):

1. Add the bot to your group and send any message
2. Open this URL in your browser (replace `<BOT_TOKEN>` with your token):
   ```
   https://api.telegram.org/bot<BOT_TOKEN>/getUpdates
   ```
3. Find `"chat":{"id":-100xxxxxxxxxx}` in the JSON response — that negative number is the group ID

**Method 2** — Use the `/id` command after the bot is deployed and webhook is set.

> If `ALLOWED_CHAT_IDS` is not set, the bot will accept requests from any group.

## Development

```bash
# Install dependencies
pnpm install

# Local development
pnpm --filter @cdlab996/baccarat dev

# Deploy
pnpm --filter @cdlab996/baccarat deploy

# Set webhook
curl -X POST https://your-worker.workers.dev/set-webhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-worker.workers.dev/webhook"}'
```
