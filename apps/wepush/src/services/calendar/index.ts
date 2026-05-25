import { LunarDay } from 'tyme4ts'

export interface FestivalInput {
  name: string
  date: string // MM-DD (interpreted per `isLunar`)
  isLunar?: boolean
}

export interface CustomDateInput {
  keyword: string
  date: string // YYYY-MM-DD
}

export interface BirthdayInfo {
  name: string
  date: string
  diffDay: number
  isLunar: boolean
}

const MS_PER_DAY = 86_400_000

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function ceilDiffDays(target: Date, base: Date): number {
  const diff = target.getTime() - base.getTime()
  return Math.ceil(diff / MS_PER_DAY)
}

function solarOccurrence(month: number, day: number, year: number): Date {
  return startOfDay(new Date(year, month - 1, day))
}

/**
 * Next solar date matching the supplied lunar MM-DD on or after `today`.
 * Searches the current and next lunar year (handles wrap-around at the
 * January boundary). Returns `null` if conversion fails (invalid lunar
 * date — e.g. a 30th day in a 29-day lunar month).
 */
function lunarOccurrence(month: number, day: number, today: Date): Date | null {
  // Lunar new year falls in Jan–Feb of the solar calendar, so we probe the
  // previous and next lunar year too — a "lunar 11月" may map to the current
  // solar year while a "lunar 1月" may fall into the next one.
  const guesses = [
    today.getFullYear() - 1,
    today.getFullYear(),
    today.getFullYear() + 1,
  ]
  for (const year of guesses) {
    try {
      const solar = LunarDay.fromYmd(year, month, day).getSolarDay()
      const d = startOfDay(
        new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay()),
      )
      if (d.getTime() >= today.getTime()) return d
    } catch {
      // skip invalid input (e.g. day=30 in a 29-day lunar month)
    }
  }
  return null
}

export function sortBirthdayTime(list: FestivalInput[]): BirthdayInfo[] {
  if (!list.length) return []
  const today = startOfDay(new Date())
  const year = today.getFullYear()

  return list
    .map<BirthdayInfo | null>((item) => {
      const [mm, dd] = item.date.split('-').map((s) => Number.parseInt(s, 10))
      if (!mm || !dd) return null

      let target: Date | null
      if (item.isLunar) {
        target = lunarOccurrence(mm, dd, today)
      } else {
        target = solarOccurrence(mm, dd, year)
        if (ceilDiffDays(target, today) < 0) {
          target = solarOccurrence(mm, dd, year + 1)
        }
      }
      if (!target) return null
      return {
        name: item.name,
        date: item.date,
        diffDay: ceilDiffDays(target, today),
        isLunar: !!item.isLunar,
      }
    })
    .filter((x): x is BirthdayInfo => x !== null)
    .sort((a, b) => a.diffDay - b.diffDay)
}

function formatBirthday(item: BirthdayInfo): string {
  const tag = item.isLunar ? '(农历)' : ''
  if (item.diffDay === 0) return `今天是${item.name}${tag}`
  return `距离${item.name}${tag}还有${item.diffDay}天`
}

export function nextBirthdayMessage(
  list: FestivalInput[],
  windowDays = 30,
): string {
  const sorted = sortBirthdayTime(list)
  const next = sorted[0]
  if (!next || next.diffDay > windowDays) return ''
  return formatBirthday(next)
}

/**
 * Sorted upcoming festivals formatted as ready-to-display strings.
 * No window filter — all configured festivals in chronological order.
 * Used to populate the indexed birthday_0..birthday_N template slots.
 */
export function birthdayList(list: FestivalInput[]): string[] {
  return sortBirthdayTime(list).map(formatBirthday)
}

export function calculateSpecialDays(
  list: CustomDateInput[],
): Record<string, number> {
  const out: Record<string, number> = {}
  if (!list.length) return out
  const today = startOfDay(new Date())
  for (const item of list) {
    if (!item.date || !item.keyword) continue
    const [yyyy, mm, dd] = item.date
      .split('-')
      .map((s) => Number.parseInt(s, 10))
    const target = startOfDay(new Date(yyyy, mm - 1, dd))
    const days = Math.floor((today.getTime() - target.getTime()) / MS_PER_DAY)
    out[item.keyword] = days
  }
  return out
}

export function formatDateCN(d: Date = new Date()): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
}
