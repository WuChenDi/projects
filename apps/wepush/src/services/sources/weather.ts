import { logger } from '@cdlab996/utils'
import { fetchJson } from '@/lib/http'
import { withRetry } from '@/lib/withRetry'
import type { SourceContext, SourceResult } from './types'

export interface WeatherData {
  city: string
  resolvedCode: string
  // Today's forecast item
  weather: string
  max_temperature: string
  min_temperature: string
  wind_direction: string
  wind_scale: string
  // Realtime / global aqi block
  temperature: string
  humidity: string
  pm25: string
  pm10: string
  air_quality: string
  aqi: string
  // Today's forecast extras
  sunrise: string
  sunset: string
  notice: string
  // Health advisory
  ganmao: string
}

interface ForecastItem {
  type: string
  high: string
  low: string
  fx: string
  fl: string
  sunrise?: string
  sunset?: string
  aqi?: number
  notice?: string
}

interface WeatherResponse {
  status: number
  message?: string
  cityInfo?: { city: string }
  data?: {
    forecast?: ForecastItem[]
    wendu?: string
    shidu?: string
    pm25?: number
    pm10?: number
    quality?: string
    ganmao?: string
  }
}

async function fetchOne(
  code: string,
  ctx: SourceContext,
): Promise<WeatherResponse> {
  return withRetry(
    () =>
      fetchJson<WeatherResponse>(
        `http://t.weather.itboy.net/api/weather/city/${encodeURIComponent(code)}`,
        { timeout: ctx.apiTimeout },
      ),
    {
      context: '获取基础天气',
      maxRetries: ctx.maxRetries,
      retryDelay: ctx.retryDelay,
    },
  )
}

function cityFallback(code: string): string | null {
  // itboy only indexes a subset of CMA codes. District-level codes (e.g.,
  // 101280109 = 广州·天河) often 403 with "CityId... 不在返回之内", while the
  // city-level code (101280101 = 广州·城区) works. Try `xxxxxx01` if the
  // input ends in any other 2 digits.
  if (!/^\d{9}$/.test(code)) return null
  if (code.endsWith('01')) return null
  return `${code.slice(0, 7)}01`
}

function mapResponse(
  data: WeatherResponse,
  resolvedCode: string,
): WeatherData | null {
  const today = data.data?.forecast?.[0]
  if (data.status !== 200 || !today || !data.cityInfo || !data.data) return null
  const root = data.data
  return {
    city: data.cityInfo.city,
    resolvedCode,
    weather: today.type,
    max_temperature: today.high.replace(/高温/, '').replace('℃', '').trim(),
    min_temperature: today.low.replace(/低温/, '').replace('℃', '').trim(),
    wind_direction: today.fx,
    wind_scale: today.fl.replace(/级.*/, ''),
    temperature: root.wendu ?? '',
    humidity: root.shidu ?? '',
    pm25: root.pm25 != null ? String(root.pm25) : '',
    pm10: root.pm10 != null ? String(root.pm10) : '',
    air_quality: root.quality ?? '',
    aqi: today.aqi != null ? String(today.aqi) : '',
    sunrise: today.sunrise ?? '',
    sunset: today.sunset ?? '',
    notice: today.notice ?? '',
    ganmao: root.ganmao ?? '',
  }
}

export async function getBaseWeather(
  cityCode: string,
  ctx: SourceContext,
): Promise<SourceResult<WeatherData>> {
  if (!cityCode) {
    return { ok: false, error: '未配置城市编码 (weatherCityCode)' }
  }
  try {
    let data = await fetchOne(cityCode, ctx)
    let mapped = mapResponse(data, cityCode)
    if (!mapped) {
      const fallback = cityFallback(cityCode)
      if (fallback) {
        logger.warn(
          `itboy 不支持 ${cityCode}(${data.message ?? `status=${data.status}`}), 回退到 ${fallback}`,
        )
        data = await fetchOne(fallback, ctx)
        mapped = mapResponse(data, fallback)
      }
    }
    if (!mapped) {
      const reasons: string[] = []
      if (data.status !== 200) {
        reasons.push(`status=${data.status}`)
        if (data.message) reasons.push(data.message)
      }
      if (!data.cityInfo) reasons.push('cityInfo 缺失')
      if (!data.data?.forecast?.[0]) reasons.push('forecast[0] 缺失')
      return {
        ok: false,
        error: `基础天气接口返回异常 (${reasons.join(', ')})`,
      }
    }
    return { ok: true, data: mapped }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
