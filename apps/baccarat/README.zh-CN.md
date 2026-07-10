# baccarat

[English](./README.md) | [中文](./README.zh-CN.md)

部署在 Cloudflare Workers 上的 Telegram 百家乐游戏机器人，基于 Hono + Grammy 构建，使用 Durable Objects 实现多群组隔离。

## 功能特性

- 完整百家乐规则，包括天牌判定和补牌逻辑
- 沉浸式发牌体验，骰子动画 + 逐张开牌
- 自动游戏模式，可配置局间间隔
- 每个群组通过 Durable Objects 独立维护游戏状态
- 游戏历史记录通过 Durable Objects SQLite 持久化存储

## 技术栈

- **框架** — Hono（Cloudflare Workers）
- **Bot 框架** — Grammy
- **状态** — Durable Objects（`BaccaratGameRoom`，通过 `new_sqlite_classes` 内嵌 SQLite）
- **语言** — TypeScript

## Bot 命令

| 命令 | 说明 |
|------|------|
| `/start` | 启动 Bot，显示游戏说明 |
| `/id` | 获取群组和用户 ID |
| `/newgame` | 开始新游戏 |
| `/bet <类型> <金额>` | 下注（如 `/bet banker 100`） |
| `/process` | 手动触发开牌 |
| `/status` | 查看当前游戏状态 |
| `/stopgame` | 强制停止当前游戏 |
| `/autogame` | 开启自动游戏模式 |
| `/stopauto` | 关闭自动游戏模式 |
| `/history` | 查看最近 10 局记录 |
| `/gameinfo <编号>` | 查看指定游戏详情 |
| `/help` | 显示帮助信息 |

## 游戏规则

- **下注类型**：`banker` 庄家（1:1）、`player` 闲家（1:1）、`tie` 和局（8:1）
- **点数计算**：骰子点数 1-6，总和取个位数
- **天牌**：任一方前两张牌合计 8 或 9，双方不补牌
- **闲家补牌**：合计 5 以下补牌，6 以上不补
- **庄家补牌**：0-2 必补，7 以上不补。3 点：闲家补牌非 8 则补。4 点：闲家补 2-7 则补。5 点：闲家补 4-7 则补。6 点：闲家补 6-7 则补。闲家未补牌时，庄家 0-5 补牌、6-7 不补

## HTTP API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/` | 服务信息 |
| `GET` | `/health` | 健康检查 |
| `POST` | `/webhook` | Telegram Webhook 处理 |
| `GET` | `/config` | 游戏时间配置 |
| `POST` | `/auto-game/:chatId` | 开始游戏 |
| `POST` | `/enable-auto/:chatId` | 开启自动游戏 |
| `POST` | `/disable-auto/:chatId` | 关闭自动游戏 |
| `POST` | `/process-game/:chatId` | 触发开牌 |
| `GET` | `/game-status/:chatId` | 获取游戏状态 |
| `POST` | `/place-bet/:chatId` | 下注 |
| `GET` | `/game-history/:chatId` | 获取游戏历史 |
| `GET` | `/game-detail/:gameNumber` | 获取游戏详情 |
| `POST` | `/send-message` | 发送消息 |
| `POST` | `/set-webhook` | 设置 Webhook |

## 项目结构

```
src/
  index.ts                  — Hono 入口，Webhook + API 路由
  types.ts                  — 领域类型：Env、Config、GameData、BetType
  lib/
    bot.ts                  — Grammy 封装（sendMessage、sendDice、setWebhook）
    storage.ts              — SQLite 辅助函数（游戏记录读写）
    game-utils.ts           — 牌点计算、Telegram 消息格式化
  game/
    message-sender.ts       — 顺序消息发送器（含骰子动画）
    game-engine.ts          — 百家乐核心游戏逻辑和状态管理
  handlers/
    commands.ts             — 12 个 Telegram Bot 命令
    routes.ts               — REST API 路由（含 DO 代理）
  durable-objects/
    game-room.ts            — 游戏房间（Durable Object）
```

**设计原则：**

- 无 DI 容器 — 直接传参
- 无抽象基类 — 纯函数 + 简单类
- 无自定义日志服务 — 直接使用 `console.log`
- 无定时器服务 — 直接使用 `setTimeout` / `clearTimeout`
- 通过 Promise 链实现顺序消息发送，替代消息队列系统

## 配置项

所有时间参数通过 `wrangler.jsonc` 环境变量配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `BETTING_DURATION_MS` | 30000 | 下注阶段时长 |
| `AUTO_GAME_INTERVAL_MS` | 10000 | 自动游戏间隔 |
| `DICE_ANIMATION_WAIT_MS` | 4000 | 骰子动画等待 |
| `DICE_RESULT_DELAY_MS` | 1000 | 结果展示延迟 |
| `MESSAGE_DELAY_MS` | 2000 | 消息间隔 |
| `GLOBAL_PROCESS_TIMEOUT_MS` | 90000 | 游戏处理超时 |
| `CLEANUP_DELAY_MS` | 30000 | 游戏结束清理延迟 |

## 环境变量

### `BOT_TOKEN`

Telegram Bot API 令牌。获取方式：

1. 在 Telegram 中搜索 [@BotFather](https://t.me/BotFather)
2. 发送 `/newbot`，按提示设置 Bot 名称和用户名
3. BotFather 会回复一个令牌，格式如 `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
4. 复制令牌，填入 `wrangler.jsonc` 的 `vars.BOT_TOKEN`

### `ALLOWED_CHAT_IDS`

允许使用 Bot 的 Telegram 群组 ID 列表（逗号分隔）。

**获取群组 ID 的方式：**

**方法一** — 直接调用 Telegram Bot API（无需部署）：

1. 将 Bot 添加到群组，发送任意消息
2. 在浏览器中打开以下链接（替换 `<BOT_TOKEN>` 为你的令牌）：
   ```
   https://api.telegram.org/bot<BOT_TOKEN>/getUpdates
   ```
3. 在返回的 JSON 中找到 `"chat":{"id":-100xxxxxxxxxx}` — 这个负数就是群组 ID

**方法二** — Bot 部署并设置 Webhook 后，在群组中使用 `/id` 命令。

> 如果未设置 `ALLOWED_CHAT_IDS`，Bot 将接受任何群组的请求。

## 快速开始

### 前置条件

- Node.js 20+
- pnpm
- 一个 Telegram Bot Token（见上文 [`BOT_TOKEN`](#bot_token)）

### 安装

```bash
pnpm install
```

### 本地开发

```bash
pnpm --filter @cdlab/baccarat dev
```

通过 `nsl` 运行 `wrangler dev`，访问地址为 `http://baccarat.localhost:3355`。

### 构建 / 部署

```bash
pnpm --filter @cdlab/baccarat deploy
```

运行 `wrangler deploy --minify`。部署完成后，将 Telegram 指向该 worker 的 webhook：

```bash
curl -X POST https://your-worker.workers.dev/set-webhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-worker.workers.dev/webhook"}'
```

## License

[MIT](../../LICENSE) License &copy; 2026-PRESENT [wudi](https://github.com/WuChenDi)
