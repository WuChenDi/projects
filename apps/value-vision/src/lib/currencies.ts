import { CurrencyCategories } from '@/types/currency'

export const CURRENCY_CONFIG: CurrencyCategories = {
  crypto: [
    { value: 'BTC', label: '🟠 Bitcoin', id: 'bitcoin', symbol: 'BTC' },
    { value: 'ETH', label: '♦️ Ethereum', id: 'ethereum', symbol: 'ETH' },
    { value: 'SOL', label: '🟣 Solana', id: 'solana', symbol: 'SOL' },
    { value: 'BNB', label: '🟡 BNB', id: 'binancecoin', symbol: 'BNB' },
    { value: 'OKB', label: '⚫ OKB', id: 'okb', symbol: 'OKB' },
  ],
  fiat: [
    { value: 'USD', label: '🇺🇸 United States', symbol: '$' },
    { value: 'CNY', label: '🇨🇳 China', symbol: '¥' },
    { value: 'JPY', label: '🇯🇵 Japan', symbol: '¥' },
    { value: 'KRW', label: '🇰🇷 South Korea', symbol: '₩' },
    { value: 'SGD', label: '🇸🇬 Singapore', symbol: 'S$' },
    { value: 'AED', label: '🇦🇪 United Arab Emirates', symbol: 'د.إ' },
    { value: 'HKD', label: '🇭🇰 Hong Kong', symbol: 'HK$' },
    { value: 'MYR', label: '🇲🇾 Malaysia', symbol: 'RM' },
  ],
  products: [
    { value: 'IPHONE17', label: '📱 iPhone17', price: 799, currency: 'USD' },
    { value: 'MACBOOK', label: '💻 MacBook Pro', price: 1599, currency: 'USD' },
    {
      value: 'XIAOMISU7',
      label: '🚗 Xiaomi SU7',
      price: 215900,
      currency: 'CNY',
    },
    {
      value: 'PORSCHE',
      label: '🚗 Porsche 718',
      price: 550000,
      currency: 'CNY',
    },
    {
      value: 'FERRARI',
      label: '🚗 Ferrari Roma',
      price: 1750000,
      currency: 'CNY',
    },
  ],
}

export const DEFAULT_FIELDS = [
  { currency: 'BTC', amount: '', id: 'field-btc' },
  { currency: 'ETH', amount: '', id: 'field-eth' },
  { currency: 'SOL', amount: '', id: 'field-sol' },
  { currency: 'USD', amount: '', id: 'field-usd' },
  { currency: 'CNY', amount: '', id: 'field-cny' },
  { currency: 'HKD', amount: '', id: 'field-hkd' },
]
