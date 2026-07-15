export interface CurrencyConfig {
  value: string
  label: string
  symbol?: string
  id?: string
  price?: number
  currency?: string
}

export interface CurrencyCategories {
  crypto: CurrencyConfig[]
  fiat: CurrencyConfig[]
  products: CurrencyConfig[]
}

export interface ExchangeRates {
  [key: string]: {
    [key: string]: number
  }
}

export interface ConverterField {
  currency: string
  amount: string
  id: string
}

export interface CryptoApiResponse {
  [key: string]: {
    usd: number
  }
}

export interface FiatApiResponse {
  rates: {
    [key: string]: number
  }
}
