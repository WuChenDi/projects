import type { Bot } from 'grammy'
import { sendDice, sendMessage } from '@/lib/bot'
import type { Config } from '@/types'

export class MessageSender {
  private bot: Bot
  private config: Config
  private lock: Promise<void> = Promise.resolve()

  constructor(bot: Bot, config: Config) {
    this.bot = bot
    this.config = config
  }

  // Send a text message, waiting for any previous message to finish
  async send(
    chatId: string,
    text: string,
    parseMode: 'Markdown' | 'HTML' = 'Markdown',
  ): Promise<void> {
    await this.enqueue(async () => {
      await sendMessage(this.bot, chatId, text, parseMode)
    })
  }

  // Roll a dice: send dice emoji, wait for animation, send result text, return dice value
  async rollDice(
    chatId: string,
    playerType: 'banker' | 'player',
    cardIndex: number,
  ): Promise<number> {
    let value = 0
    await this.enqueue(async () => {
      const result = await sendDice(this.bot, chatId)

      if (
        result.success &&
        result.diceValue &&
        result.diceValue >= 1 &&
        result.diceValue <= 6
      ) {
        value = result.diceValue
      } else {
        // Fallback to random if dice API fails
        value = Math.floor(Math.random() * 6) + 1
        console.warn(
          `[MessageSender] Dice API failed for ${playerType} card ${cardIndex}, using fallback: ${value}`,
        )
      }

      // Wait for dice animation
      await sleep(this.config.diceAnimationWaitMs)

      // Send result message
      const label = playerType === 'banker' ? '🏦 Banker' : '👤 Player'
      await sendMessage(
        this.bot,
        chatId,
        `🎯 **${label} card ${cardIndex}: ${value} pts**`,
      )

      // Brief delay before next message
      await sleep(this.config.diceResultDelayMs)
    })
    return value
  }

  // Sequential execution via promise chain
  private enqueue(task: () => Promise<void>): Promise<void> {
    const next = this.lock.then(task, task) // execute even if previous failed
    this.lock = next.then(
      () => {},
      () => {},
    ) // swallow to keep chain alive
    return next
  }

  reset(): void {
    this.lock = Promise.resolve()
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
