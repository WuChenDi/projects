#!/usr/bin/env node
// Fetch CMA weather city codes from sundakai/China-Weather-City-Area-code and
// write public/data/city-codes.json. Re-run when upstream updates.
//
// Source: https://github.com/sundakai/China-Weather-City-Area-code
// Coverage: 3000+ entries, district-level (县/区) granularity for the
// t.weather.itboy.net / weather.com.cn CMA endpoint.

import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const CSV_URL =
  'https://raw.githubusercontent.com/sundakai/China-Weather-City-Area-code/master/%E4%B8%AD%E5%9B%BD%E5%A4%A9%E6%B0%94%E5%9F%8E%E5%B8%82%E5%9C%B0%E5%8C%BA%E7%BC%96%E5%8F%B7%E4%BB%A3%E7%A0%81%20%E6%9C%80%E6%96%B03240%E5%9C%B0%E5%8C%BA%E7%BC%96%E5%8F%B7%20%E5%9B%BD%E5%86%85%E7%AB%99%E5%8F%B7(3240).csv'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', 'public', 'data', 'city-codes.json')

const res = await fetch(CSV_URL)
if (!res.ok) {
  throw new Error(`Failed to fetch CSV: ${res.status} ${res.statusText}`)
}
const buf = new Uint8Array(await res.arrayBuffer())
const csv = new TextDecoder('gbk').decode(buf)

const lines = csv.split(/\r?\n/).filter((l) => l.trim())
const header = lines.shift()
if (!header || !header.includes('站点号')) {
  throw new Error(`Unexpected CSV header: ${header}`)
}

const seen = new Set()
const rows = []
for (const line of lines) {
  const [code, _township, district, city, province] = line
    .split(',')
    .map((s) => s.trim())
  if (!code || !/^\d{9}$/.test(code)) continue
  if (seen.has(code)) continue
  seen.add(code)
  rows.push({
    code,
    district: district || '',
    city: city || '',
    province: province || '',
  })
}
rows.sort((a, b) => a.code.localeCompare(b.code))

writeFileSync(
  OUT,
  `${JSON.stringify(
    {
      source: 'sundakai/China-Weather-City-Area-code',
      updatedAt: new Date().toISOString(),
      count: rows.length,
      rows,
    },
    null,
    0,
  )}\n`,
  'utf8',
)
console.log(`Wrote ${rows.length} entries to ${OUT}`)
