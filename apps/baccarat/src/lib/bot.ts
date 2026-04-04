import type { Bot } from 'grammy'

export interface SendResult {
  success: boolean
  messageId?: number
  diceValue?: number
  error?: string
}

export async function sendMessage(
  bot: Bot,
  chatId: string | number,
  text: string,
  parseMode: 'Markdown' | 'HTML' = 'Markdown',
): Promise<SendResult> {
  try {
    const result = await bot.api.sendMessage(chatId, text, {
      parse_mode: parseMode,
    })
    return { success: true, messageId: result.message_id }
  } catch (error) {
    console.error('[Bot] Failed to send message:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function sendDice(
  bot: Bot,
  chatId: string | number,
  emoji = '🎲',
): Promise<SendResult> {
  try {
    const result = await bot.api.sendDice(chatId, emoji)
    return {
      success: true,
      messageId: result.message_id,
      diceValue: result.dice?.value,
    }
  } catch (error) {
    console.error('[Bot] Failed to send dice:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function setWebhook(bot: Bot, url: string): Promise<SendResult> {
  try {
    await bot.api.setWebhook(url)
    return { success: true }
  } catch (error) {
    console.error('[Bot] Failed to set webhook:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
