import type { MessageSender } from '@/game/message-sender'
import { getGenid } from '@/lib/genid'
import type { GameResultOptions } from '@/lib/game-utils'
import {
  calculatePoints,
  formatBetSummary,
  formatGameResult,
} from '@/lib/game-utils'
import type { GameStorage } from '@/lib/storage'
import type { Config, GameData, UserBets } from '@/types'
import { BetType, GameState } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlaceBetResult {
  success: boolean
  error?: string
  betType?: BetType
  amount?: number
  userName?: string
  remainingTime?: number
  totalBets?: number
  totalBetsAmount?: number
  totalBetsCount?: number
  isAccumulated?: boolean
  isNewBetType?: boolean
  previousAmount?: number
  addedAmount?: number
}

export interface GameStatus {
  success: boolean
  error?: string
  status: {
    state: string
    gameNumber?: string
    betsCount: number
    totalBets: number
    totalBetsCount?: number
    bets?: Record<string, UserBets>
    timeRemaining?: number
    result?: { banker: number; player: number; winner: BetType | null }
    needsProcessing?: boolean
    autoGameEnabled: boolean
    isAutoMode?: boolean
  }
}

// ---------------------------------------------------------------------------
// GameEngine
// ---------------------------------------------------------------------------

export class GameEngine {
  private game: GameData | null = null
  private sender: MessageSender
  private state: DurableObjectState
  private config: Config
  private storage: GameStorage

  private isProcessing = false
  private revealingInProgress = false

  // Plain setTimeout timers
  private timers: Set<ReturnType<typeof setTimeout>> = new Set()

  // Bet limits
  private readonly maxBetAmount: number
  private readonly maxUserTotalBet: number

  constructor(
    sender: MessageSender,
    state: DurableObjectState,
    config: Config,
    storage: GameStorage,
  ) {
    this.sender = sender
    this.state = state
    this.config = config
    this.storage = storage
    this.maxBetAmount = config.maxBetAmount
    this.maxUserTotalBet = 50000
  }

  // -------------------------------------------------------------------------
  // Timer helpers
  // -------------------------------------------------------------------------

  private setTimer(delay: number, callback: () => void | Promise<void>): void {
    const id = setTimeout(() => {
      this.timers.delete(id)
      void callback()
    }, delay)
    this.timers.add(id)
  }

  private clearAllTimers(): void {
    for (const id of this.timers) clearTimeout(id)
    this.timers.clear()
  }

  // -------------------------------------------------------------------------
  // Initialization & recovery
  // -------------------------------------------------------------------------

  async initialize(): Promise<void> {
    try {
      this.game = (await this.state.storage.get<GameData>('game')) || null

      if (!this.game) {
        console.log('[GameEngine] No existing game, ready for new game')
        return
      }

      console.log(
        `[GameEngine] Restoring game ${this.game.gameNumber} in state ${this.game.state}`,
      )
      const now = Date.now()
      await this.recoverGameState(now)
    } catch (error) {
      console.error('[GameEngine] Initialization failed:', error)
      await this.cleanupGame('initialization error')
      throw error
    }
  }

  private async recoverGameState(now: number): Promise<void> {
    if (!this.game) return

    const timeSinceBettingEnd = now - this.game.bettingEndTime

    switch (this.game.state) {
      case GameState.Betting:
        if (timeSinceBettingEnd > 30000) {
          console.warn(
            '[GameEngine] Stuck betting state detected, auto-processing',
          )
          await this.safeProcessGame()
        } else {
          console.log('[GameEngine] Restoring betting timers')
          this.setupCountdownTimers(this.game.chatId, this.game.gameNumber)
        }
        break

      case GameState.Processing:
      case GameState.Revealing:
        console.warn(`[GameEngine] Stuck ${this.game.state} state, cleaning up`)
        await this.cleanupGame('stuck in processing/revealing')
        break

      case GameState.Finished: {
        const autoGameEnabled = Boolean(
          await this.state.storage.get('autoGame'),
        )
        if (autoGameEnabled) {
          console.log('[GameEngine] Restoring auto game mode')
          await this.handleGameCompletion()
        }
        break
      }
    }
  }

  // -------------------------------------------------------------------------
  // Start game
  // -------------------------------------------------------------------------

  async startGame(chatId: string): Promise<{
    success: boolean
    gameNumber?: string
    bettingEndTime?: number
    error?: string
  }> {
    try {
      if (this.game && this.game.state !== GameState.Finished) {
        return { success: false, error: 'Game already in progress' }
      }

      // Clean up old state
      await this.cleanupGame('starting new game')
      this.resetFlags()

      const gameNumber = String(getGenid().nextId())
      const now = Date.now()

      this.game = {
        gameNumber,
        state: GameState.Betting,
        bets: {},
        cards: { banker: [], player: [] },
        result: { banker: 0, player: 0, winner: null },
        startTime: now,
        bettingEndTime: now + this.config.bettingDurationMs,
        chatId,
      }

      await this.state.storage.put('game', this.game)
      this.sender.reset()
      this.setupCountdownTimers(chatId, gameNumber)

      console.log(
        `[GameEngine] Game ${gameNumber} started, betting for ${this.config.bettingDurationMs}ms`,
      )

      return {
        success: true,
        gameNumber,
        bettingEndTime: this.game.bettingEndTime,
      }
    } catch (error) {
      console.error('[GameEngine] Failed to start game:', error)
      await this.cleanupGame('start game error')
      return { success: false, error: 'Unable to start game' }
    }
  }

  // -------------------------------------------------------------------------
  // Place bet
  // -------------------------------------------------------------------------

  async placeBet(
    userId: string,
    userName: string,
    betType: BetType,
    amount: number,
  ): Promise<PlaceBetResult> {
    try {
      // Validate game state
      if (!this.game || this.game.state !== GameState.Betting) {
        return { success: false, error: 'No active betting game' }
      }

      // Check betting time
      const now = Date.now()
      if (now > this.game.bettingEndTime) {
        return { success: false, error: 'Betting time expired' }
      }

      // Validate parameters
      if (!Object.values(BetType).includes(betType)) {
        return {
          success: false,
          error: 'Invalid bet type\nValid types: banker, player, tie',
        }
      }
      if (!userId || !userName) {
        return { success: false, error: 'Incomplete user info' }
      }
      if (isNaN(amount) || amount <= 0) {
        return { success: false, error: 'Bet amount must be a positive number' }
      }

      // Check single bet limit
      if (amount > this.maxBetAmount) {
        return {
          success: false,
          error: `Single bet cannot exceed ${this.maxBetAmount} points`,
        }
      }

      const userBets = this.game.bets[userId]
      if (userBets) {
        // Accumulated single item limit
        const existingAmount = userBets[betType] || 0
        const newAmount = existingAmount + amount
        if (newAmount > this.maxBetAmount) {
          return {
            success: false,
            error: `${betType} accumulated amount ${newAmount} exceeds single bet limit of ${this.maxBetAmount}\nCurrent bet: ${existingAmount} points`,
          }
        }

        // User total bet limit
        const currentTotal = this.calculateUserTotalBets(userBets)
        if (currentTotal + amount > this.maxUserTotalBet) {
          return {
            success: false,
            error: `Total bet cannot exceed ${this.maxUserTotalBet} points\nCurrent total: ${currentTotal} points`,
          }
        }
      }

      // Process bet logic
      if (!this.game.bets[userId]) {
        this.game.bets[userId] = { userName }
      }

      const ub = this.game.bets[userId]
      const existing = ub[betType] || 0
      ub.userName = userName

      let isAccumulated = false
      let isNewBetType = false
      let previousAmount: number | undefined
      let addedAmount: number | undefined
      let finalAmount: number

      if (existing > 0) {
        finalAmount = existing + amount
        ub[betType] = finalAmount
        isAccumulated = true
        previousAmount = existing
        addedAmount = amount
      } else {
        ub[betType] = amount
        finalAmount = amount
        isNewBetType = true
      }

      // Save game state
      await this.state.storage.put('game', this.game)

      const remainingTime = Math.max(
        0,
        Math.floor((this.game.bettingEndTime - now) / 1000),
      )
      const totalUsers = Object.keys(this.game.bets).length
      const { totalBetsAmount, totalBetsCount } = this.calculateGameTotalBets()

      console.log(
        `[GameEngine] Bet placed: ${userName} bet ${finalAmount} on ${betType}${isAccumulated ? ' (accumulated)' : ''}`,
      )

      return {
        success: true,
        betType,
        amount: finalAmount,
        userName,
        remainingTime,
        totalBets: totalUsers,
        totalBetsAmount,
        totalBetsCount,
        isAccumulated,
        isNewBetType,
        previousAmount,
        addedAmount,
      }
    } catch (error) {
      console.error('[GameEngine] Bet failed:', error)
      return { success: false, error: 'Bet failed' }
    }
  }

  // -------------------------------------------------------------------------
  // Process game (close betting, reveal)
  // -------------------------------------------------------------------------

  async processGame(): Promise<{
    success: boolean
    gameNumber?: string
    error?: string
  }> {
    return await this.safeProcessGame()
  }

  private async safeProcessGame(): Promise<{
    success: boolean
    gameNumber?: string
    error?: string
  }> {
    if (!this.game || this.game.state !== GameState.Betting) {
      console.warn('[GameEngine] No processable game or not in betting state')
      return { success: false, error: 'No active betting game to process' }
    }

    if (this.isProcessing) {
      console.warn('[GameEngine] Already processing, skipping')
      return { success: false, error: 'Game is already being processed' }
    }

    this.isProcessing = true

    // Global timeout protection
    let globalTimeout: ReturnType<typeof setTimeout> | null = null
    globalTimeout = setTimeout(async () => {
      console.error('[GameEngine] Processing timeout, force cleanup')
      await this.forceCleanup('global processing timeout')
    }, this.config.globalProcessTimeoutMs)

    try {
      this.game.state = GameState.Processing
      await this.state.storage.put('game', this.game)

      // Cancel countdown timers
      this.clearAllTimers()

      const betsCount = Object.keys(this.game.bets).length

      // Send bet summary
      if (betsCount === 0) {
        await this.sender.send(
          this.game.chatId,
          `😔 **Game ${this.game.gameNumber} - No bets placed**\n\n🎲 Game continues, dealing cards...`,
        )
      } else {
        await this.sender.send(this.game.chatId, formatBetSummary(this.game))
      }

      // Start revealing
      await this.startRevealing()

      if (globalTimeout) clearTimeout(globalTimeout)
      return { success: true, gameNumber: this.game?.gameNumber }
    } catch (error) {
      if (globalTimeout) clearTimeout(globalTimeout)
      console.error('[GameEngine] Processing failed:', error)
      await this.forceCleanup('processing failed')
      return {
        success: false,
        error: 'Game processing failed unexpectedly',
      }
    } finally {
      this.isProcessing = false
    }
  }

  // -------------------------------------------------------------------------
  // Revealing phase
  // -------------------------------------------------------------------------

  private async startRevealing(): Promise<void> {
    if (!this.game || this.revealingInProgress) return

    try {
      this.revealingInProgress = true
      this.game.state = GameState.Revealing
      await this.state.storage.put('game', this.game)

      await this.sender.send(
        this.game.chatId,
        '🎲 **Revealing phase begins!**\n\n🃏 Dealing two cards each to Banker and Player...',
      )

      await this.dealCards()
      await this.calculateAndSendResult()
    } catch (error) {
      console.error('[GameEngine] Revealing failed:', error)
      if (this.game) {
        await this.sender.send(
          this.game.chatId,
          '❌ Card revealing failed, game terminated. Use /newgame to restart',
        )
      }
      await this.forceCleanup('revealing failed')
      throw error
    } finally {
      this.revealingInProgress = false
    }
  }

  // -------------------------------------------------------------------------
  // Deal cards
  // -------------------------------------------------------------------------

  private async dealCards(): Promise<void> {
    if (!this.game) return

    const chatId = this.game.chatId

    // Deal 4 cards in strict order: B1, P1, B2, P2
    const bankerCard1 = await this.sender.rollDice(chatId, 'banker', 1)
    this.game.cards.banker.push(bankerCard1)

    const playerCard1 = await this.sender.rollDice(chatId, 'player', 1)
    this.game.cards.player.push(playerCard1)

    const bankerCard2 = await this.sender.rollDice(chatId, 'banker', 2)
    this.game.cards.banker.push(bankerCard2)

    const playerCard2 = await this.sender.rollDice(chatId, 'player', 2)
    this.game.cards.player.push(playerCard2)

    // Save dealt cards
    await this.state.storage.put('game', this.game)

    const bankerSum = calculatePoints(this.game.cards.banker)
    const playerSum = calculatePoints(this.game.cards.player)

    // Send summary after initial deal
    await this.sender.send(
      chatId,
      `📊 **First two cards points:**\n` +
        `🏦 Banker: ${this.game.cards.banker.join(' + ')} = **${bankerSum} pts**\n` +
        `👤 Player: ${this.game.cards.player.join(' + ')} = **${playerSum} pts**`,
    )

    // Check for natural win
    if (bankerSum >= 8 || playerSum >= 8) {
      await this.sender.send(chatId, '🎯 **Natural! No third card needed!**')
    } else {
      await this.handleThirdCard(bankerSum, playerSum)
    }
  }

  // -------------------------------------------------------------------------
  // Third card rules (baccarat)
  // -------------------------------------------------------------------------

  private async handleThirdCard(
    bankerSum: number,
    playerSum: number,
  ): Promise<void> {
    if (!this.game) return

    const chatId = this.game.chatId
    let playerThirdCard: number | null = null

    // Player draw rule: total of 5 or less requires a third card
    if (playerSum <= 5) {
      await this.sender.send(
        chatId,
        `👤 **Player has ${playerSum} points, drawing a third card...**`,
      )

      playerThirdCard = await this.sender.rollDice(chatId, 'player', 3)
      this.game.cards.player.push(playerThirdCard)
    } else {
      await this.sender.send(
        chatId,
        `👤 **Player has ${playerSum} points, stands**`,
      )
    }

    // Banker draw logic
    let bankerNeedCard = false
    let bankerReason = ''

    if (bankerSum <= 2) {
      // Banker 0-2 always draws
      bankerNeedCard = true
      bankerReason = `${bankerSum} points, must draw`
    } else if (bankerSum >= 7) {
      // 7 or above stands
      bankerNeedCard = false
      bankerReason = `${bankerSum} points, stands`
    } else if (playerThirdCard === null) {
      // Player stood (6 or 7): banker draws on 0-5, stands on 6
      if (bankerSum <= 5) {
        bankerNeedCard = true
        bankerReason = `${bankerSum} points, player stood, must draw`
      } else {
        bankerNeedCard = false
        bankerReason = '6 points, player stood, stands'
      }
    } else if (bankerSum === 3) {
      // Banker 3: draws unless player third card is 8
      if (playerThirdCard === 8) {
        bankerNeedCard = false
        bankerReason = `3 points, player drew 8, stands`
      } else {
        bankerNeedCard = true
        bankerReason = `3 points, player drew ${playerThirdCard}, must draw`
      }
    } else if (bankerSum === 4) {
      // Banker 4: draws if player third card is 2-7
      if ([2, 3, 4, 5, 6, 7].includes(playerThirdCard)) {
        bankerNeedCard = true
        bankerReason = `4 points, player drew ${playerThirdCard}, must draw`
      } else {
        bankerNeedCard = false
        bankerReason = `4 points, player drew ${playerThirdCard}, stands`
      }
    } else if (bankerSum === 5) {
      // Banker 5: draws if player third card is 4-7
      if ([4, 5, 6, 7].includes(playerThirdCard)) {
        bankerNeedCard = true
        bankerReason = `5 points, player drew ${playerThirdCard}, must draw`
      } else {
        bankerNeedCard = false
        bankerReason = `5 points, player drew ${playerThirdCard}, stands`
      }
    } else if (bankerSum === 6) {
      // Banker 6: draws if player third card is 6 or 7
      if ([6, 7].includes(playerThirdCard)) {
        bankerNeedCard = true
        bankerReason = `6 points, player drew ${playerThirdCard}, must draw`
      } else {
        bankerNeedCard = false
        bankerReason = `6 points, player drew ${playerThirdCard}, stands`
      }
    }

    if (bankerNeedCard) {
      await this.sender.send(chatId, `🏦 **Banker: ${bankerReason}...**`)

      const bankerThird = await this.sender.rollDice(chatId, 'banker', 3)
      this.game.cards.banker.push(bankerThird)
    } else {
      await this.sender.send(chatId, `🏦 **Banker: ${bankerReason}**`)
    }

    // Save after third card handling
    await this.state.storage.put('game', this.game)
  }

  // -------------------------------------------------------------------------
  // Calculate and send result
  // -------------------------------------------------------------------------

  private async calculateAndSendResult(): Promise<void> {
    if (!this.game) return

    const bankerFinal = calculatePoints(this.game.cards.banker)
    const playerFinal = calculatePoints(this.game.cards.player)

    this.game.result.banker = bankerFinal
    this.game.result.player = playerFinal

    // Determine winner
    if (bankerFinal > playerFinal) {
      this.game.result.winner = BetType.Banker
    } else if (playerFinal > bankerFinal) {
      this.game.result.winner = BetType.Player
    } else {
      this.game.result.winner = BetType.Tie
    }

    this.game.state = GameState.Finished
    await this.state.storage.put('game', this.game)

    console.log(
      `[GameEngine] Game ${this.game.gameNumber} result: Banker=${bankerFinal} Player=${playerFinal} Winner=${this.game.result.winner}`,
    )

    // Save game record to SQLite
    try {
      this.storage.saveGameRecord(this.game)
    } catch (err) {
      console.error('[GameEngine] Failed to save game record:', err)
    }

    // Send final result
    const autoGameEnabled = Boolean(await this.state.storage.get('autoGame'))
    const resultOptions: GameResultOptions = {
      isAutoGameEnabled: autoGameEnabled,
      nextGameDelaySeconds: this.config.autoGameIntervalMs / 1000,
    }

    await this.sender.send(
      this.game.chatId,
      formatGameResult(this.game, resultOptions),
    )

    this.isProcessing = false
    await this.handleGameCompletion()
  }

  // -------------------------------------------------------------------------
  // Game completion & auto game
  // -------------------------------------------------------------------------

  private async handleGameCompletion(): Promise<void> {
    if (!this.game) return

    try {
      const autoGameEnabled = await this.state.storage.get('autoGame')

      if (autoGameEnabled) {
        const chatId = this.game.chatId
        this.setTimer(this.config.autoGameIntervalMs, async () => {
          try {
            const stillEnabled = await this.state.storage.get('autoGame')
            if (stillEnabled) {
              await this.startAutoGame(chatId)
            } else {
              await this.cleanupGame('auto game disabled')
            }
          } catch (error) {
            console.error('[GameEngine] Auto game failed:', error)
            await this.cleanupGame('auto game error')
          }
        })
        console.log(
          `[GameEngine] Next auto game scheduled in ${this.config.autoGameIntervalMs}ms`,
        )
      } else {
        // Schedule cleanup after delay
        this.setTimer(this.config.cleanupDelayMs, async () => {
          await this.cleanupGame('cleanup after game end')
        })
      }
    } catch (error) {
      console.error('[GameEngine] Game completion handling failed:', error)
      await this.cleanupGame('completion handling error')
    }
  }

  private async startAutoGame(chatId: string): Promise<void> {
    try {
      const result = await this.startGame(chatId)
      if (result.success) {
        await this.sender.send(
          chatId,
          `🤖 **Auto Game - Game ${result.gameNumber} started!**\n\n` +
            `💰 Betting time: ${this.config.bettingDurationMs / 1000}s\n` +
            `📝 Bet format: /bet banker 100\n` +
            `⏰ Game will auto-process in ${this.config.bettingDurationMs / 1000}s...\n` +
            `🔄 Games will continue automatically`,
        )
      } else {
        console.error(`[GameEngine] Failed to start auto game: ${result.error}`)
        await this.cleanupGame('auto game start failed')
      }
    } catch (error) {
      console.error('[GameEngine] Auto game start error:', error)
      await this.cleanupGame('auto game start error')
    }
  }

  async enableAutoGame(
    chatId: string,
  ): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      await this.state.storage.put('autoGame', true)

      if (!this.game || this.game.state === GameState.Finished) {
        await this.startAutoGame(chatId)
      }

      console.log('[GameEngine] Auto game enabled')
      return { success: true, message: 'Auto game enabled' }
    } catch (error) {
      console.error('[GameEngine] Failed to enable auto game:', error)
      return { success: false, error: 'Unable to enable auto game' }
    }
  }

  async disableAutoGame(): Promise<{
    success: boolean
    message?: string
    error?: string
  }> {
    try {
      await this.state.storage.put('autoGame', false)
      this.clearAllTimers()
      this.sender.reset()

      console.log('[GameEngine] Auto game disabled')
      return { success: true, message: 'Auto game disabled' }
    } catch (error) {
      console.error('[GameEngine] Failed to disable auto game:', error)
      return { success: false, error: 'Unable to disable auto game' }
    }
  }

  // -------------------------------------------------------------------------
  // Force stop
  // -------------------------------------------------------------------------

  async forceStop(): Promise<void> {
    console.warn(`[GameEngine] Force stopping game ${this.game?.gameNumber}`)

    if (this.game) {
      await this.sender.send(
        this.game.chatId,
        `🛑 **Game has been force stopped**\n\n` +
          `📋 Game ID: ${this.game.gameNumber}\n` +
          `⚠️ All ongoing operations have been terminated\n` +
          `💡 Use /newgame to start a new game`,
      )
    }

    this.clearAllTimers()
    this.sender.reset()
    this.resetFlags()
    this.game = null

    await this.state.storage.delete('game')
    await this.state.storage.put('autoGame', false)

    console.log('[GameEngine] Force stop complete')
  }

  // -------------------------------------------------------------------------
  // Status
  // -------------------------------------------------------------------------

  async getStatus(): Promise<GameStatus> {
    try {
      const autoGameEnabled = Boolean(await this.state.storage.get('autoGame'))

      if (!this.game) {
        return {
          success: true,
          status: {
            state: 'no_game',
            autoGameEnabled,
            totalBets: 0,
            betsCount: 0,
          },
        }
      }

      const now = Date.now()
      const timeRemaining = Math.max(
        0,
        Math.floor((this.game.bettingEndTime - now) / 1000),
      )
      const { totalBetsAmount, totalBetsCount } = this.calculateGameTotalBets()

      return {
        success: true,
        status: {
          gameNumber: this.game.gameNumber,
          state: this.game.state,
          betsCount: Object.keys(this.game.bets).length,
          totalBets: totalBetsAmount,
          totalBetsCount,
          bets: this.game.bets,
          timeRemaining:
            this.game.state === GameState.Betting ? timeRemaining : 0,
          result: this.game.result,
          needsProcessing:
            this.game.state === GameState.Betting &&
            now >= this.game.bettingEndTime,
          autoGameEnabled,
          isAutoMode: autoGameEnabled,
        },
      }
    } catch (error) {
      console.error('[GameEngine] Failed to get status:', error)
      return {
        success: false,
        error: 'Failed to get game status',
        status: {
          state: 'error',
          autoGameEnabled: false,
          totalBets: 0,
          betsCount: 0,
        },
      }
    }
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  async cleanup(): Promise<void> {
    await this.cleanupGame('external cleanup')
  }

  private async cleanupGame(reason: string): Promise<void> {
    try {
      console.log(`[GameEngine] Cleaning up: ${reason}`)
      this.clearAllTimers()
      this.resetFlags()
      this.sender.reset()
      this.game = null
      await this.state.storage.delete('game')
    } catch (error) {
      console.error('[GameEngine] Cleanup failed:', error)
    }
  }

  private async forceCleanup(reason: string): Promise<void> {
    console.warn(`[GameEngine] Force cleanup: ${reason}`)
    this.clearAllTimers()
    this.resetFlags()
    this.sender.reset()
    this.game = null
    await this.state.storage.delete('game')
  }

  private resetFlags(): void {
    this.isProcessing = false
    this.revealingInProgress = false
  }

  // -------------------------------------------------------------------------
  // Countdown timers
  // -------------------------------------------------------------------------

  private setupCountdownTimers(chatId: string, gameNumber: string): void {
    if (!this.game) return

    // Clear existing timers first
    this.clearAllTimers()

    const gameEndTime = this.game.bettingEndTime
    const intervals = [20, 10, 5]

    // Set countdown reminder timers
    for (const seconds of intervals) {
      const reminderTime = gameEndTime - seconds * 1000
      const timeToReminder = reminderTime - Date.now()

      if (timeToReminder > 0) {
        this.setTimer(timeToReminder, () => {
          if (
            this.game &&
            this.game.state === GameState.Betting &&
            this.game.gameNumber === gameNumber
          ) {
            void this.sender.send(
              chatId,
              `⏰ **Betting countdown: ${seconds}s!**\n\n` +
                `👥 Current participants: ${Object.keys(this.game.bets).length}\n` +
                `💡 Place your bets now!`,
            )
          }
        })
      }
    }

    // Set auto-process timer
    const timeToGameEnd = gameEndTime - Date.now()
    if (timeToGameEnd > 0) {
      this.setTimer(timeToGameEnd, async () => {
        try {
          if (
            this.game &&
            this.game.state === GameState.Betting &&
            this.game.gameNumber === gameNumber
          ) {
            console.log(`[GameEngine] Auto processing game ${gameNumber}`)
            await this.sender.send(
              chatId,
              `⛔ **Game ${this.game.gameNumber} - Betting closed!**\n\n🎲 Auto-processing game...`,
            )
            await this.safeProcessGame()
          }
        } catch (error) {
          console.error('[GameEngine] Auto process timer failed:', error)
          await this.forceCleanup('auto process timer error')
        }
      })
    }

    console.log(`[GameEngine] Countdown timers set for game ${gameNumber}`)
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private calculateUserTotalBets(userBets: UserBets): number {
    return Object.entries(userBets).reduce((sum: number, [key, value]) => {
      if (key !== 'userName' && typeof value === 'number') {
        return sum + value
      }
      return sum
    }, 0)
  }

  private calculateGameTotalBets(): {
    totalBetsAmount: number
    totalBetsCount: number
  } {
    if (!this.game) return { totalBetsAmount: 0, totalBetsCount: 0 }

    let totalBetsAmount = 0
    let totalBetsCount = 0

    for (const userBets of Object.values(this.game.bets)) {
      for (const [key, value] of Object.entries(userBets)) {
        if (key !== 'userName' && typeof value === 'number' && value > 0) {
          totalBetsAmount += value
          totalBetsCount += 1
        }
      }
    }

    return { totalBetsAmount, totalBetsCount }
  }
}
