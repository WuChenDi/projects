export interface Env {
  BOT_TOKEN: string
  ALLOWED_CHAT_IDS?: string
  GAME_ROOMS: DurableObjectNamespace
  // Timing config (all ms, string from env vars)
  BETTING_DURATION_MS?: string
  AUTO_GAME_INTERVAL_MS?: string
  DICE_ROLL_TIMEOUT_MS?: string
  DICE_ROLL_MAX_RETRIES?: string
  DICE_ANIMATION_WAIT_MS?: string
  DICE_RESULT_DELAY_MS?: string
  CARD_DEAL_DELAY_MS?: string
  MESSAGE_DELAY_MS?: string
  GLOBAL_PROCESS_TIMEOUT_MS?: string
  CLEANUP_DELAY_MS?: string
}

export interface Config {
  bettingDurationMs: number
  autoGameIntervalMs: number
  diceAnimationWaitMs: number
  diceResultDelayMs: number
  messageDelayMs: number
  globalProcessTimeoutMs: number
  cleanupDelayMs: number
  maxBetAmount: number
}

export function createConfig(env: Env): Config {
  return {
    bettingDurationMs: parseInt(env.BETTING_DURATION_MS || '30000'),
    autoGameIntervalMs: parseInt(env.AUTO_GAME_INTERVAL_MS || '10000'),
    diceAnimationWaitMs: parseInt(env.DICE_ANIMATION_WAIT_MS || '4000'),
    diceResultDelayMs: parseInt(env.DICE_RESULT_DELAY_MS || '1000'),
    messageDelayMs: parseInt(env.MESSAGE_DELAY_MS || '2000'),
    globalProcessTimeoutMs: parseInt(env.GLOBAL_PROCESS_TIMEOUT_MS || '90000'),
    cleanupDelayMs: parseInt(env.CLEANUP_DELAY_MS || '30000'),
    maxBetAmount: 10000,
  }
}

export enum GameState {
  Idle = 'idle',
  Betting = 'betting',
  Processing = 'processing',
  Revealing = 'revealing',
  Finished = 'finished',
}

export enum BetType {
  Banker = 'banker',
  Player = 'player',
  Tie = 'tie',
}

export interface UserBets {
  banker?: number
  player?: number
  tie?: number
  userName: string
}

export interface GameData {
  gameNumber: string // 17-digit
  state: GameState
  bets: Record<string, UserBets>
  cards: { banker: number[]; player: number[] }
  result: { banker: number; player: number; winner: BetType | null }
  startTime: number
  bettingEndTime: number
  chatId: string
}

export interface GameRecord extends Omit<GameData, 'bettingEndTime'> {
  endTime: number
  totalBets: number
  totalAmount: number
}
