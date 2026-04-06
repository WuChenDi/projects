import type { GameData, GameRecord } from '@/types'
import { BetType } from '@/types'

export function calculatePoints(cards: number[]): number {
  return cards.reduce((sum, card) => sum + card, 0) % 10
}

export function formatBetSummary(game: GameData): string {
  const allUserBets = Object.values(game.bets)
  const betSummary = allUserBets.reduce(
    (acc, userBets) => {
      if (userBets.banker)
        acc[BetType.Banker] = (acc[BetType.Banker] || 0) + userBets.banker
      if (userBets.player)
        acc[BetType.Player] = (acc[BetType.Player] || 0) + userBets.player
      if (userBets.tie)
        acc[BetType.Tie] = (acc[BetType.Tie] || 0) + userBets.tie
      return acc
    },
    {} as Record<BetType, number>,
  )

  const totalAmount = Object.values(betSummary).reduce(
    (sum, amount) => sum + (amount || 0),
    0,
  )

  let message = `📋 **Game ${game.gameNumber} Bet Summary**\n\n`
  message += `👥 Participants: ${allUserBets.length}\n`
  message += `💰 Total bets: ${totalAmount} pts\n\n`
  message += `📊 **Bets by type:**\n`
  message += `🏦 Banker: ${betSummary[BetType.Banker] || 0} pts\n`
  message += `👤 Player: ${betSummary[BetType.Player] || 0} pts\n`
  message += `🤝 Tie: ${betSummary[BetType.Tie] || 0} pts\n\n`
  message += `🎲 Preparing to reveal...`
  return message
}

export interface GameResultOptions {
  isAutoGameEnabled?: boolean
  nextGameDelaySeconds?: number
  totalGamesInSession?: number
}

export function formatGameResult(
  game: GameData,
  options?: GameResultOptions,
): string {
  const winnerText = {
    [BetType.Banker]: '🏦 Banker wins!',
    [BetType.Player]: '👤 Player wins!',
    [BetType.Tie]: '🤝 Tie!',
  }

  let message = `🎯 **Game ${game.gameNumber} Result**\n\n`
  message += `🏦 Banker final points: ${game.result.banker} pts\n`
  message += `👤 Player final points: ${game.result.player} pts\n\n`
  message += `🏆 **${winnerText[game.result.winner!]}**\n\n`

  const winners: string[] = []
  const losers: string[] = []
  let totalWinAmount = 0
  let totalLossAmount = 0

  Object.entries(game.bets).forEach(([userId, userBets]) => {
    const userName = userBets.userName || 'Unknown'
    const displayName = `${userName} (${userId})`

    let userWinAmount = 0
    let userLossAmount = 0

    Object.entries(userBets).forEach(([betType, amount]) => {
      if (betType !== 'userName' && typeof amount === 'number') {
        if (betType === game.result.winner) {
          const winAmount = betType === BetType.Tie ? amount * 8 : amount
          userWinAmount += winAmount
          totalWinAmount += winAmount
        } else {
          userLossAmount += amount
          totalLossAmount += amount
        }
      }
    })

    const netAmount = userWinAmount - userLossAmount
    if (netAmount > 0) {
      winners.push(`${displayName}: +${netAmount}`)
    } else if (netAmount < 0) {
      losers.push(`${displayName}: ${netAmount}`)
    } else {
      losers.push(`${displayName}: ±0`)
    }
  })

  if (winners.length > 0) {
    message += `✅ **Winners:**\n${winners.join('\n')}\n\n`
  }
  if (losers.length > 0) {
    message += `❌ **Losers:**\n${losers.join('\n')}\n\n`
  }

  if (Object.keys(game.bets).length > 0) {
    message += `📊 **Round Stats:**\n`
    message += `💰 Total payout: ${totalWinAmount} pts\n`
    message += `💸 Total collected: ${totalLossAmount} pts\n`
    message += `📈 House profit: ${totalLossAmount - totalWinAmount > 0 ? '+' : ''}${totalLossAmount - totalWinAmount} pts\n\n`
  }

  const isAutoEnabled = options?.isAutoGameEnabled
  const delaySeconds = options?.nextGameDelaySeconds || 10

  if (isAutoEnabled === true) {
    message += `🤖 **Auto game mode in progress**\n`
    message += `⏰ Next game starts automatically in ${delaySeconds}s\n`
    message += `🛑 Use /stopauto to disable auto mode\n`

    if (options?.totalGamesInSession) {
      message += `📊 ${options.totalGamesInSession} games completed this session`
    }
  } else if (isAutoEnabled === false) {
    message += `🎮 **Manual game mode**\n`
    message += `💡 Use /newgame to start a new game\n`
    message += `🤖 Use /autogame to enable auto mode`
  } else {
    message += `🎮 **Game over**\n`
    message += `💡 Use /newgame to continue playing`
  }

  return message
}

export function formatGameHistory(history: GameRecord[]): string {
  let message = `📊 **Last ${history.length} Game Records**\n\n`

  history.forEach((record, index) => {
    const winnerText = {
      [BetType.Banker]: '🏦B',
      [BetType.Player]: '👤P',
      [BetType.Tie]: '🤝T',
    }

    const date = new Date(record.endTime)
    const timeStr = date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })

    message += `${index + 1}. **${record.gameNumber}**\n`
    message += `   ${timeStr} | ${winnerText[record.result.winner!]} | ${record.result.banker}-${record.result.player} | ${record.totalBets} players\n\n`
  })

  message += `💡 Use /gameinfo <game_id> to view details`
  return message
}

export function formatGameInfo(game: GameRecord): string {
  const winnerText = {
    [BetType.Banker]: '🏦 Banker wins',
    [BetType.Player]: '👤 Player wins',
    [BetType.Tie]: '🤝 Tie',
  }

  const startTime = new Date(game.startTime).toLocaleString('en-US')
  const endTime = new Date(game.endTime).toLocaleString('en-US')
  const duration = Math.floor((game.endTime - game.startTime) / 1000)

  let message = `🎯 **Game Details - ${game.gameNumber}**\n\n`
  message += `📅 Start time: ${startTime}\n`
  message += `⏰ End time: ${endTime}\n`
  message += `⏱️ Duration: ${duration}s\n\n`

  message += `🎲 **Deal Result:**\n`
  message += `🏦 Banker: ${game.cards.banker.join(' + ')} = ${game.result.banker} pts\n`
  message += `👤 Player: ${game.cards.player.join(' + ')} = ${game.result.player} pts\n`
  message += `🏆 **${winnerText[game.result.winner!]}**\n\n`

  if (game.totalBets > 0) {
    message += `💰 **Betting Info:**\n`
    message += `👥 Participants: ${game.totalBets}\n`
    message += `💵 Total bet amount: ${game.totalAmount} pts\n\n`

    const allUserBets = Object.values(game.bets)
    const betSummary = allUserBets.reduce(
      (acc, userBets) => {
        if (userBets.banker)
          acc[BetType.Banker] = (acc[BetType.Banker] || 0) + userBets.banker
        if (userBets.player)
          acc[BetType.Player] = (acc[BetType.Player] || 0) + userBets.player
        if (userBets.tie)
          acc[BetType.Tie] = (acc[BetType.Tie] || 0) + userBets.tie
        return acc
      },
      {} as Record<BetType, number>,
    )

    message += `📊 **Bets by type:**\n`
    message += `🏦 Banker: ${betSummary[BetType.Banker] || 0} pts\n`
    message += `👤 Player: ${betSummary[BetType.Player] || 0} pts\n`
    message += `🤝 Tie: ${betSummary[BetType.Tie] || 0} pts\n\n`

    if (allUserBets.length > 0) {
      message += `👤 **Participants:** `
      const anonymizedUsers = Object.keys(game.bets).map((userId) => {
        return `User${userId.slice(-4)}`
      })
      message += anonymizedUsers.join(', ')
    }
  } else {
    message += `😔 **No bets placed**`
  }

  return message
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
