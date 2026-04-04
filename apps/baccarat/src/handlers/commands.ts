import type { Bot, Context } from 'grammy'
import { formatGameHistory, formatGameInfo } from '@/lib/game-utils'
import type { Config, Env, GameRecord } from '@/types'
import { BetType } from '@/types'

async function callGameRoom(
  env: Env,
  chatId: string,
  path: string,
  method: 'GET' | 'POST' = 'POST',
  data?: any,
): Promise<any> {
  const roomId = env.GAME_ROOMS.idFromName(chatId)
  const room = env.GAME_ROOMS.get(roomId)

  const requestBody = method === 'POST' ? { ...data, chatId } : undefined

  const response = await room.fetch(
    new Request(`https://game.room${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: requestBody ? JSON.stringify(requestBody) : undefined,
    }),
  )

  return await response.json()
}

function getMatchText(ctx: Context): string | undefined {
  return typeof ctx.match === 'string' ? ctx.match : ctx.match?.[0]
}

export function registerCommands(bot: Bot, env: Env, config: Config): void {
  bot.command('start', async (ctx) => {
    const chatId = ctx.chat?.id
    const chatType = ctx.chat?.type

    if (chatType === 'group' || chatType === 'supergroup') {
      await ctx.reply(
        `🎮 Baccarat Bot is running!\n` +
          `Group ID: \`${chatId}\`\n\n` +
          `🎲 Game commands:\n` +
          `/newgame - Start a new game\n` +
          `/bet banker 100 - Bet on Banker\n` +
          `/bet player 50 - Bet on Player\n` +
          `/bet tie 25 - Bet on Tie\n` +
          `/process - Process game immediately\n` +
          `/status - View game status\n` +
          `/stopgame - Stop the current game\n\n` +
          `🤖 Auto game:\n` +
          `/autogame - Enable auto game mode\n` +
          `/stopauto - Disable auto game mode\n\n` +
          `📊 Game records:\n` +
          `/history - View last 10 game records\n` +
          `/gameinfo <number> - View game details\n\n` +
          `📋 Other commands:\n` +
          `/help - Show help\n` +
          `/id - Get group ID`,
        { parse_mode: 'Markdown' },
      )
    } else {
      await ctx.reply(
        `👋 Hello! This is a private chat.\n` +
          `Your user ID: \`${chatId}\`\n\n` +
          `Please add me to a group to use Baccarat features.`,
        { parse_mode: 'Markdown' },
      )
    }
  })

  bot.command('id', async (ctx) => {
    const chat = ctx.chat
    const user = ctx.from

    let message = `🆔 **ID Info**\n\n`

    if (chat?.type === 'group' || chat?.type === 'supergroup') {
      message += `📋 Group info:\n`
      message += `• Name: ${chat.title}\n`
      message += `• Group ID: \`${chat.id}\`\n`
      message += `• Type: ${chat.type}\n\n`
    } else {
      message += `👤 Private chat info:\n`
      message += `• Chat ID: \`${chat?.id}\`\n\n`
    }

    message += `👤 User info:\n`
    message += `• User ID: \`${user?.id}\`\n`
    message += `• Name: ${user?.first_name} ${user?.last_name || ''}\n`
    message += `• Username: @${user?.username || 'N/A'}\n\n`
    message += `💡 Copy the ID above for API calls`

    await ctx.reply(message, { parse_mode: 'Markdown' })
  })

  bot.command('newgame', async (ctx) => {
    const chatId = ctx.chat?.id?.toString()
    if (!chatId) {
      await ctx.reply('❌ Unable to get chat ID')
      return
    }

    try {
      await ctx.reply('🎲 Starting a new game...')

      const result = await callGameRoom(env, chatId, '/start-game')

      if (result.success) {
        await ctx.reply(
          `✅ 🎮 New game started!\n` +
            `Game number: ${result.gameNumber}\n` +
            `⏰ Betting time: ${config.bettingDurationMs / 1000}s\n` +
            `💰 Use /bet to place your bets`,
        )
      } else {
        await ctx.reply(`❌ ${result.error || 'Failed to create game'}`)
      }
    } catch (error) {
      console.error('[Commands] Failed to handle newgame:', error)
      await ctx.reply('❌ Failed to create game, please try again later')
    }
  })

  bot.command('autogame', async (ctx) => {
    const chatId = ctx.chat?.id?.toString()
    if (!chatId) {
      await ctx.reply('❌ Unable to get chat ID')
      return
    }

    try {
      await ctx.reply('🤖 Enabling auto game mode...')

      const result = await callGameRoom(env, chatId, '/enable-auto')

      if (result.success) {
        await ctx.reply(
          `✅ 🤖 Auto game mode enabled!\n` +
            `🔄 Games will run automatically every ${config.autoGameIntervalMs / 1000}s\n` +
            `🛑 Use /stopauto to disable`,
        )
      } else {
        await ctx.reply(`❌ ${result.error || 'Failed to enable auto game'}`)
      }
    } catch (error) {
      console.error('[Commands] Failed to handle autogame:', error)
      await ctx.reply('❌ Failed to enable auto game, please try again later')
    }
  })

  bot.command('stopauto', async (ctx) => {
    const chatId = ctx.chat?.id?.toString()
    if (!chatId) {
      await ctx.reply('❌ Unable to get chat ID')
      return
    }

    try {
      await ctx.reply('🛑 Disabling auto game mode...')

      const result = await callGameRoom(env, chatId, '/disable-auto')

      if (result.success) {
        await ctx.reply(
          `✅ 🛑 Auto game mode disabled\n` +
            `🎮 Use /newgame to start a manual game`,
        )
      } else {
        await ctx.reply(`❌ ${result.error || 'Failed to disable auto game'}`)
      }
    } catch (error) {
      console.error('[Commands] Failed to handle stopauto:', error)
      await ctx.reply('❌ Failed to disable auto game, please try again later')
    }
  })

  bot.command('bet', async (ctx) => {
    const chatId = ctx.chat?.id?.toString()
    if (!chatId) {
      await ctx.reply('❌ Unable to get chat ID')
      return
    }

    try {
      const matchText = getMatchText(ctx)
      const args = matchText?.trim().split(/\s+/)

      if (!args || args.length !== 2) {
        await ctx.reply(
          '❌ Invalid bet format\nCorrect format: /bet banker 100',
        )
        return
      }

      const betTypeInput = args[0]?.toLowerCase()
      const amountInput = args[1]

      if (!betTypeInput || !amountInput) {
        await ctx.reply('❌ Incomplete bet parameters')
        return
      }

      if (!Object.values(BetType).includes(betTypeInput as BetType)) {
        await ctx.reply(
          '❌ Invalid bet type\nAvailable types: banker (Banker), player (Player), tie (Tie)',
        )
        return
      }

      const betType = betTypeInput as BetType
      const amount = parseInt(amountInput, 10)

      if (isNaN(amount) || amount <= 0) {
        await ctx.reply('❌ Bet amount must be a positive number')
        return
      }

      if (amount > config.maxBetAmount) {
        await ctx.reply(
          `❌ Maximum bet amount is ${config.maxBetAmount} per bet`,
        )
        return
      }

      await ctx.reply('💰 Processing bet...')

      const result = await callGameRoom(env, chatId, '/place-bet', 'POST', {
        betType,
        amount,
        userId: ctx.from?.id.toString(),
        userName: ctx.from?.first_name || ctx.from?.username || 'Unknown',
      })

      if (result.success) {
        const betTypeNames = {
          banker: 'Banker',
          player: 'Player',
          tie: 'Tie',
        }

        let message = `✅ 💰 ${ctx.from?.first_name || ctx.from?.username || 'Unknown'} (${ctx.from?.id}) bet placed!\n`
        message += `Type: ${betTypeNames[betType]}\n`

        const finalAmount = result.amount || amount

        if (result.isAccumulated) {
          const previousAmount = result.previousAmount || 0
          const addedAmount = result.addedAmount || amount
          message += `Amount: ${previousAmount} + ${addedAmount} = ${finalAmount} pts\n`
          message += `📈 Accumulated bet\n`
        } else if (result.isNewBetType) {
          message += `Amount: ${finalAmount} pts\n`
          message += `✨ New bet type added\n`
        } else {
          message += `Amount: ${finalAmount} pts\n`
          message += `🎯 First bet\n`
        }

        message += `Total bets: ${result.totalBetsAmount || 0} pts`

        await ctx.reply(`✅ ${message}`)
      } else {
        await ctx.reply(`❌ ${result.error || 'Failed to place bet'}`)
      }
    } catch (error) {
      console.error('[Commands] Failed to handle bet:', error)
      await ctx.reply('❌ Failed to place bet, please try again later')
    }
  })

  bot.command('process', async (ctx) => {
    const chatId = ctx.chat?.id?.toString()
    if (!chatId) {
      await ctx.reply('❌ Unable to get chat ID')
      return
    }

    try {
      await ctx.reply('🎲 Processing game now...')

      const result = await callGameRoom(env, chatId, '/process-game')

      if (result.success) {
        await ctx.reply(
          `✅ 🎯 Game processing complete!\n` +
            `🎲 Results will be revealed shortly`,
        )
      } else {
        await ctx.reply(`❌ ${result.error || 'Failed to process game'}`)
      }
    } catch (error) {
      console.error('[Commands] Failed to handle process:', error)
      await ctx.reply('❌ Failed to process game, please try again later')
    }
  })

  bot.command('status', async (ctx) => {
    const chatId = ctx.chat?.id?.toString()
    if (!chatId) {
      await ctx.reply('❌ Unable to get chat ID')
      return
    }

    try {
      const result = await callGameRoom(env, chatId, '/get-status', 'GET')

      if (result.success && result.status) {
        const status = result.status

        const stateNames: Record<string, string> = {
          idle: 'Idle',
          betting: 'Betting',
          processing: 'Processing',
          revealing: 'Revealing',
          finished: 'Finished',
          no_game: 'No Game',
          error: 'Error',
        }

        let message = `📊 **Game Status**\n\n`
        message += `🎮 State: ${stateNames[status.state] || status.state}\n`

        if (status.gameNumber) {
          message += `🎯 Game number: ${status.gameNumber}\n`
        }

        if (status.isAutoMode || status.autoGameEnabled) {
          message += `🤖 Auto mode: Enabled\n`
        }

        if (status.totalBets > 0) {
          message += `💰 Total bets: ${status.totalBets} pts\n`
        }

        if (status.betsCount > 0) {
          message += `👥 Participants: ${status.betsCount}\n`
        }

        if (status.totalBetsCount && status.totalBetsCount > 0) {
          message += `🎲 Bet count: ${status.totalBetsCount}\n`
        }

        if (status.timeRemaining && status.timeRemaining > 0) {
          message += `⏰ Time remaining: ${Math.ceil(status.timeRemaining / 1000)}s\n`
        }

        await ctx.reply(message, { parse_mode: 'Markdown' })
      } else {
        await ctx.reply('📊 No game status available')
      }
    } catch (error) {
      console.error('[Commands] Failed to handle status:', error)
      await ctx.reply('❌ Failed to get status, please try again later')
    }
  })

  bot.command('history', async (ctx) => {
    const chatId = ctx.chat?.id?.toString()
    if (!chatId) {
      await ctx.reply('❌ Unable to get chat ID')
      return
    }

    try {
      const result = await callGameRoom(
        env,
        chatId,
        '/game-history?limit=10',
        'GET',
      )

      if (result.success && result.history && result.history.length > 0) {
        await ctx.reply(formatGameHistory(result.history as GameRecord[]), {
          parse_mode: 'Markdown',
        })
      } else {
        await ctx.reply('📊 No game records yet')
      }
    } catch (error) {
      console.error('[Commands] Failed to handle history:', error)
      await ctx.reply('❌ Failed to get history, please try again later')
    }
  })

  bot.command('gameinfo', async (ctx) => {
    const matchText = getMatchText(ctx)
    const gameNumber = matchText?.trim()

    if (!gameNumber) {
      await ctx.reply(
        '❌ Please provide a game number\nFormat: /gameinfo 20250719123456789',
      )
      return
    }

    if (!/^\d{17}$/.test(gameNumber)) {
      await ctx.reply('❌ Invalid game number format\nExpected 17 digits')
      return
    }

    try {
      const chatId = ctx.chat?.id?.toString()
      if (!chatId) {
        await ctx.reply('❌ Unable to get chat ID')
        return
      }

      const result = await callGameRoom(
        env,
        chatId,
        `/game-detail?gameNumber=${gameNumber}`,
        'GET',
      )

      if (result.success && result.game) {
        await ctx.reply(formatGameInfo(result.game as GameRecord), {
          parse_mode: 'Markdown',
        })
      } else {
        await ctx.reply('❌ Game record not found')
      }
    } catch (error) {
      console.error('[Commands] Failed to handle gameinfo:', error)
      await ctx.reply('❌ Failed to get game details, please try again later')
    }
  })

  bot.command('stopgame', async (ctx) => {
    const chatId = ctx.chat?.id?.toString()
    if (!chatId) {
      await ctx.reply('❌ Unable to get chat ID')
      return
    }

    try {
      await ctx.reply('🛑 Force stopping game...')

      // 1. Disable auto game first
      await callGameRoom(env, chatId, '/disable-auto')

      // 2. Force stop the current game
      const stopGameResult = await callGameRoom(
        env,
        chatId,
        '/force-stop-game',
        'POST',
      )

      if (stopGameResult.success) {
        await ctx.reply(
          `✅ 🛑 Game force stopped\n` +
            `🧹 All in-progress operations cleared\n` +
            `🎮 Use /newgame to start a new game`,
        )
      } else {
        await ctx.reply(`❌ ${stopGameResult.error || 'Failed to stop game'}`)
      }
    } catch (error) {
      console.error('[Commands] Failed to handle stopgame:', error)
      await ctx.reply('❌ Failed to stop game, please try again later')
    }
  })

  bot.command('help', async (ctx) => {
    await ctx.reply(
      `🎮 **Baccarat Bot Help**\n\n` +
        `📋 **Basic commands:**\n` +
        `/start - Start the bot\n` +
        `/id - Get group and user info\n` +
        `/newgame - Start a new game\n` +
        `/bet banker 100 - Bet 100 on Banker\n` +
        `/bet player 50 - Bet 50 on Player\n` +
        `/bet tie 25 - Bet 25 on Tie\n` +
        `/process - Process game immediately\n` +
        `/status - View game status\n` +
        `/stopgame - Stop the current game\n\n` +
        `🤖 **Auto game:**\n` +
        `/autogame - Enable auto game mode\n` +
        `/stopauto - Disable auto game mode\n\n` +
        `📊 **Game records:**\n` +
        `/history - View last 10 game records\n` +
        `/gameinfo <number> - View game details\n\n` +
        `📏 **Rules:**\n` +
        `• Bet amount per bet: 1-${config.maxBetAmount} pts\n` +
        `• Betting time: ${config.bettingDurationMs / 1000}s\n` +
        `• Tie payout: 1:8\n` +
        `• Banker/Player payout: 1:1\n\n` +
        `💡 In auto mode, games run continuously every ${config.autoGameIntervalMs / 1000}s\n\n` +
        `🎯 All features are fully supported, just use the commands!`,
      { parse_mode: 'Markdown' },
    )
  })
}
