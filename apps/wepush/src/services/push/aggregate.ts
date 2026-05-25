import {
  birthdayList,
  calculateSpecialDays,
  formatDateCN,
  nextBirthdayMessage,
} from '@/services/calendar'
import { getHitokoto } from '@/services/sources/hitokoto'
import { getCiba } from '@/services/sources/iciba'
import type { SourceContext } from '@/services/sources/types'
import { getBaseWeather } from '@/services/sources/weather'
import type { TemplateData } from '@/services/template/render'

export interface UserForAggregate {
  id: string
  name: string
  city: string
  weatherCityCode: string
  showColor: boolean
  festivals: Array<{ name: string; date: string; isLunar?: boolean }>
  customDates: Array<{ keyword: string; date: string }>
}

export type AggregateContext = SourceContext

// Number of indexed `birthday_N` template slots exposed. Slots beyond the
// configured festival count render as empty strings so unused placeholders
// degrade gracefully instead of leaking raw `{{birthday_5.DATA}}` text.
const BIRTHDAY_SLOTS = 10

export interface AggregateOutput {
  data: TemplateData
  errors: Record<string, string>
}

export async function aggregateUserData(
  user: UserForAggregate,
  ctx: AggregateContext,
): Promise<AggregateOutput> {
  const data: TemplateData = {}
  const errors: Record<string, string> = {}

  data.date = { value: formatDateCN() }

  if (user.weatherCityCode) {
    const weather = await getBaseWeather(user.weatherCityCode, ctx)
    if (weather.ok) {
      data.city = { value: weather.data.city }
      data.weather = { value: weather.data.weather }
      data.max_temperature = { value: weather.data.max_temperature }
      data.min_temperature = { value: weather.data.min_temperature }
      data.wind_direction = { value: weather.data.wind_direction }
      data.wind_scale = { value: weather.data.wind_scale }
      data.temperature = { value: weather.data.temperature }
      data.humidity = { value: weather.data.humidity }
      data.pm25 = { value: weather.data.pm25 }
      data.pm10 = { value: weather.data.pm10 }
      data.air_quality = { value: weather.data.air_quality }
      data.aqi = { value: weather.data.aqi }
      data.sunrise = { value: weather.data.sunrise }
      data.sunset = { value: weather.data.sunset }
      data.notice = { value: weather.data.notice }
      data.ganmao = { value: weather.data.ganmao }
    } else {
      errors.weather = weather.error
      if (user.city) data.city = { value: user.city }
    }
  } else if (user.city) {
    data.city = { value: user.city }
  }

  data.birthday_message = { value: nextBirthdayMessage(user.festivals) }
  const birthdays = birthdayList(user.festivals)
  for (let i = 0; i < BIRTHDAY_SLOTS; i++) {
    data[`birthday_${i}`] = { value: birthdays[i] ?? '' }
  }

  const specialDays = calculateSpecialDays(user.customDates)
  for (const [key, days] of Object.entries(specialDays)) {
    data[key] = { value: String(days) }
  }

  const [ciba, hitokoto] = await Promise.all([getCiba(ctx), getHitokoto(ctx)])
  if (ciba.ok) {
    data.english_note = { value: ciba.data.content }
    data.chinese_note = { value: ciba.data.note }
  } else {
    errors.iciba = ciba.error
  }
  if (hitokoto.ok) {
    data.moment_copyrighting = { value: hitokoto.data.content }
  } else {
    errors.hitokoto = hitokoto.error
  }

  return { data, errors }
}
