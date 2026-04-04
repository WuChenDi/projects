import { Bot } from 'grammy'
import { GameEngine } from '@/game/game-engine'
import { MessageSender } from '@/game/message-sender'
import { GameStorage } from '@/lib/storage'
import type { Env } from '@/types'
import { createConfig } from '@/types'

export class BaccaratGameRoom {
  private engine: GameEngine | null = null
  private gameStorage: GameStorage | null = null
  private currentChatId: string | null = null

  constructor(
    private state: DurableObjectState,
    private env: Env,
  ) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (!this.engine) {
      await this.initEngine()
    }

    try {
      switch (url.pathname) {
        case '/start-game':
          return await this.handleStartGame(request)
        case '/place-bet':
          return await this.handlePlaceBet(request)
        case '/process-game':
          return await this.handleProcessGame(request)
        case '/get-status':
          return await this.handleGetStatus()
        case '/stop-game':
        case '/force-stop-game':
          return await this.handleForceStop(request)
        case '/enable-auto':
          return await this.handleEnableAuto(request)
        case '/disable-auto':
          return await this.handleDisableAuto(request)
        case '/game-history':
          return await this.handleGameHistory(url)
        case '/game-detail':
          return await this.handleGameDetail(url)
        case '/health':
          return Response.json({
            healthy: true,
            timestamp: new Date().toISOString(),
          })
        default:
          return Response.json(
            { success: false, error: 'Not found' },
            { status: 404 },
          )
      }
    } catch (error) {
      console.error('[GameRoom] Request failed:', error)
      return Response.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Internal error',
        },
        { status: 500 },
      )
    }
  }

  private async initEngine(): Promise<void> {
    const config = createConfig(this.env)
    const bot = new Bot(this.env.BOT_TOKEN)
    const sender = new MessageSender(bot, config)
    this.gameStorage = new GameStorage(this.state.storage)
    this.engine = new GameEngine(sender, this.state, config, this.gameStorage)
    await this.engine.initialize()
  }

  private async handleStartGame(request: Request): Promise<Response> {
    const { chatId } = (await request.json()) as { chatId?: string }

    if (!chatId) {
      return Response.json(
        { success: false, error: 'chatId is required' },
        { status: 400 },
      )
    }

    this.currentChatId = chatId
    const result = await this.engine!.startGame(chatId)

    if (result.success) {
      return Response.json({
        success: true,
        message: 'New game started',
        gameNumber: result.gameNumber,
        chatId,
        timestamp: new Date().toISOString(),
      })
    }

    return Response.json(
      { success: false, error: result.error || 'Failed to start game' },
      { status: 400 },
    )
  }

  private async handlePlaceBet(request: Request): Promise<Response> {
    const body = (await request.json()) as {
      userId?: string
      userName?: string
      betType?: string
      amount?: number
      chatId?: string
    }
    const { userId, userName, betType, amount, chatId } = body

    if (!userId || !betType || !amount) {
      return Response.json(
        {
          success: false,
          error: 'Missing required parameters: userId, betType, amount',
        },
        { status: 400 },
      )
    }

    const validBetTypes = ['banker', 'player', 'tie']
    if (!validBetTypes.includes(betType)) {
      return Response.json(
        {
          success: false,
          error: 'Invalid bet type. Must be: banker, player, or tie',
        },
        { status: 400 },
      )
    }

    if (typeof amount !== 'number' || amount <= 0 || amount > 10000) {
      return Response.json(
        { success: false, error: 'Bet amount must be between 1 and 10000' },
        { status: 400 },
      )
    }

    if (chatId) {
      this.currentChatId = chatId
    }

    const result = await this.engine!.placeBet(
      userId,
      userName || userId,
      betType as import('@/types').BetType,
      amount,
    )

    if (result.success) {
      const betTypeNames: Record<string, string> = {
        banker: 'Banker',
        player: 'Player',
        tie: 'Tie',
      }

      return Response.json({
        success: true,
        message: 'Bet placed successfully',
        bet: {
          userId,
          userName: userName || userId,
          betType,
          amount: result.amount,
          timestamp: new Date().toISOString(),
        },
        totalBets: result.totalBetsAmount || 0,
        betsCount: result.totalBetsCount || 0,
        usersCount: result.totalBets || 0,
        betTypeName: betTypeNames[betType],
        isAccumulated: result.isAccumulated,
        isNewBetType: result.isNewBetType,
        previousAmount: result.previousAmount,
        remainingTime: result.remainingTime,
      })
    }

    return Response.json(
      { success: false, error: result.error || 'Bet failed' },
      { status: 400 },
    )
  }

  private async handleProcessGame(request: Request): Promise<Response> {
    const chatId = await this.extractChatId(request)
    if (chatId) {
      this.currentChatId = chatId
    }

    const result = await this.engine!.processGame()

    if (result.success) {
      return Response.json({
        success: true,
        message: 'Game processing complete',
        timestamp: new Date().toISOString(),
      })
    }

    return Response.json(
      { success: false, error: 'Game processing failed' },
      { status: 400 },
    )
  }

  private async handleGetStatus(): Promise<Response> {
    const statusResult = await this.engine!.getStatus()

    if (statusResult.success && statusResult.status) {
      return Response.json({
        success: true,
        status: {
          ...statusResult.status,
          totalBets: statusResult.status.totalBets || 0,
          betsCount: statusResult.status.betsCount || 0,
          totalBetsCount: statusResult.status.totalBetsCount || 0,
          usersCount: statusResult.status.betsCount || 0,
        },
        timestamp: new Date().toISOString(),
      })
    }

    return Response.json(
      { success: false, error: statusResult.error || 'Failed to get status' },
      { status: 400 },
    )
  }

  private async handleForceStop(request: Request): Promise<Response> {
    const chatId = await this.extractChatId(request)

    await this.engine!.disableAutoGame()
    await this.engine!.forceStop()

    return Response.json({
      success: true,
      message: 'Game force stopped',
      chatId,
      timestamp: new Date().toISOString(),
    })
  }

  private async handleEnableAuto(request: Request): Promise<Response> {
    const { chatId } = (await request.json()) as { chatId?: string }

    if (!chatId) {
      return Response.json(
        { success: false, error: 'chatId is required' },
        { status: 400 },
      )
    }

    this.currentChatId = chatId
    const result = await this.engine!.enableAutoGame(chatId)

    if (result.success) {
      return Response.json({
        success: true,
        message: 'Auto game mode enabled',
        chatId,
        timestamp: new Date().toISOString(),
      })
    }

    return Response.json(
      { success: false, error: result.error || 'Failed to enable auto game' },
      { status: 400 },
    )
  }

  private async handleDisableAuto(request: Request): Promise<Response> {
    const chatId = await this.extractChatId(request)
    if (chatId) {
      this.currentChatId = chatId
    }

    const result = await this.engine!.disableAutoGame()

    if (result.success) {
      return Response.json({
        success: true,
        message: 'Auto game mode disabled',
        timestamp: new Date().toISOString(),
      })
    }

    return Response.json(
      { success: false, error: result.error || 'Failed to disable auto game' },
      { status: 400 },
    )
  }

  private async handleGameHistory(url: URL): Promise<Response> {
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const history = await this.gameStorage!.getGameHistory(
      this.currentChatId || '',
      limit,
    )
    return Response.json({ success: true, history, total: history.length })
  }

  private async handleGameDetail(url: URL): Promise<Response> {
    const gameNumber = url.searchParams.get('gameNumber')
    if (!gameNumber) {
      return Response.json(
        { success: false, error: 'gameNumber is required' },
        { status: 400 },
      )
    }
    const game = await this.gameStorage!.getGameDetail(gameNumber)
    if (game) {
      return Response.json({ success: true, game })
    }
    return Response.json(
      { success: false, error: 'Game not found' },
      { status: 404 },
    )
  }

  private async extractChatId(request: Request): Promise<string | null> {
    try {
      const body = (await request.json()) as { chatId?: string }
      return body.chatId || this.currentChatId
    } catch {
      return this.currentChatId
    }
  }
}
