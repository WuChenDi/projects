import type { GameData, GameRecord } from '@/types'

export class GameStorage {
  private initialized = false
  private sql: SqlStorage

  constructor(storage: DurableObjectStorage) {
    this.sql = storage.sql
  }

  private ensureTable(): void {
    if (this.initialized) return
    this.sql.exec(
      `CREATE TABLE IF NOT EXISTS game_records (
        game_number TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        data TEXT NOT NULL,
        end_time INTEGER NOT NULL
      )`,
    )
    this.initialized = true
  }

  saveGameRecord(game: GameData): void {
    this.ensureTable()

    const { bettingEndTime, ...rest } = game
    const allBets = Object.values(game.bets)
    let totalAmount = 0
    for (const ub of allBets) {
      if (ub.banker) totalAmount += ub.banker
      if (ub.player) totalAmount += ub.player
      if (ub.tie) totalAmount += ub.tie
    }

    const record: GameRecord = {
      ...rest,
      endTime: Date.now(),
      totalBets: allBets.length,
      totalAmount,
    }

    this.sql.exec(
      'INSERT OR REPLACE INTO game_records (game_number, chat_id, data, end_time) VALUES (?, ?, ?, ?)',
      record.gameNumber,
      record.chatId,
      JSON.stringify(record),
      record.endTime,
    )
  }

  getGameHistory(chatId: string, limit = 10): GameRecord[] {
    this.ensureTable()

    const rows = this.sql.exec<{ data: string }>(
      'SELECT data FROM game_records WHERE chat_id = ? ORDER BY end_time DESC LIMIT ?',
      chatId,
      limit,
    )

    return [...rows].map((row) => JSON.parse(row.data) as GameRecord)
  }

  getGameDetail(gameNumber: string): GameRecord | null {
    this.ensureTable()

    const rows = this.sql.exec<{ data: string }>(
      'SELECT data FROM game_records WHERE game_number = ? LIMIT 1',
      gameNumber,
    )

    for (const row of rows) {
      return JSON.parse(row.data) as GameRecord
    }
    return null
  }
}
