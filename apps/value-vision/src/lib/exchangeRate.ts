import { CURRENCY_CONFIG } from '@/lib/currencies'
import {
  ExchangeRates,
  CryptoApiResponse,
  FiatApiResponse,
} from '@/types/currency'

const CRYPTO_API_URL = 'https://api.coingecko.com/api/v3/simple/price'
const FIAT_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD'

export class ExchangeRate {
  private static getCryptoIds(): string {
    return CURRENCY_CONFIG.crypto.map((crypto) => crypto.id).join(',')
  }

  private static getFiatCurrencies(): string[] {
    return CURRENCY_CONFIG.fiat
      .map((fiat) => fiat.value)
      .filter((value) => value !== 'USD')
  }

  private static getCryptoCurrencies(): string[] {
    return CURRENCY_CONFIG.crypto.map((crypto) => crypto.value)
  }

  private static getProductCurrencies(): string[] {
    return CURRENCY_CONFIG.products.map((product) => product.value)
  }

  private static async fetchCryptoPrices(): Promise<Record<string, number>> {
    const cryptoIds = this.getCryptoIds()
    const response = await fetch(
      `${CRYPTO_API_URL}?ids=${cryptoIds}&vs_currencies=usd`,
    )
    const data: CryptoApiResponse = await response.json()

    const prices: Record<string, number> = {}
    CURRENCY_CONFIG.crypto.forEach((crypto) => {
      if (crypto.id && data[crypto.id]) {
        prices[crypto.value] = data[crypto.id].usd
      }
    })

    return prices
  }

  private static async fetchFiatRates(): Promise<FiatApiResponse> {
    const response = await fetch(FIAT_API_URL)
    return response.json()
  }

  private static getProductPrices(
    fiatRates: Record<string, number>,
  ): Record<string, number> {
    const prices: Record<string, number> = {}

    CURRENCY_CONFIG.products.forEach((product) => {
      if (product.price && product.currency) {
        if (product.currency === 'USD') {
          prices[product.value] = product.price
        } else {
          // Convert to USD
          prices[product.value] = product.price / fiatRates[product.currency]
        }
      }
    })

    return prices
  }

  private static calculateCrossRates(
    cryptoPrices: Record<string, number>,
    fiatRates: Record<string, number>,
    productPrices: Record<string, number>,
  ): ExchangeRates {
    const rates: ExchangeRates = {}
    const cryptos = this.getCryptoCurrencies()
    const fiats = ['USD', ...this.getFiatCurrencies()]
    const products = this.getProductCurrencies()
    const allCurrencies = [...cryptos, ...fiats, ...products]

    allCurrencies.forEach((from) => {
      rates[from] = {}

      allCurrencies.forEach((to) => {
        if (from === to) {
          rates[from][to] = 1
          return
        }

        rates[from][to] = this.calculateRate(
          from,
          to,
          cryptoPrices,
          fiatRates,
          productPrices,
          cryptos,
          fiats,
          products,
        )
      })
    })

    return rates
  }

  private static calculateRate(
    from: string,
    to: string,
    cryptoPrices: Record<string, number>,
    fiatRates: Record<string, number>,
    productPrices: Record<string, number>,
    cryptos: string[],
    fiats: string[],
    products: string[],
  ): number {
    // Crypto to Crypto
    if (cryptos.includes(from) && cryptos.includes(to)) {
      return cryptoPrices[from] / cryptoPrices[to]
    }

    // Crypto to USD
    if (cryptos.includes(from) && to === 'USD') {
      return cryptoPrices[from]
    }

    // USD to Crypto
    if (from === 'USD' && cryptos.includes(to)) {
      return 1 / cryptoPrices[to]
    }

    // Crypto to Fiat
    if (cryptos.includes(from) && fiats.includes(to) && to !== 'USD') {
      return cryptoPrices[from] * fiatRates[to]
    }

    // Fiat to Crypto
    if (fiats.includes(from) && from !== 'USD' && cryptos.includes(to)) {
      return 1 / (cryptoPrices[to] * fiatRates[from])
    }

    // USD to Fiat
    if (from === 'USD' && fiats.includes(to) && to !== 'USD') {
      return fiatRates[to]
    }

    // Fiat to USD
    if (fiats.includes(from) && from !== 'USD' && to === 'USD') {
      return 1 / fiatRates[from]
    }

    // Fiat to Fiat
    if (
      fiats.includes(from) &&
      fiats.includes(to) &&
      from !== 'USD' &&
      to !== 'USD'
    ) {
      return fiatRates[to] / fiatRates[from]
    }

    // Product conversions
    if (products.includes(from) && to === 'USD') {
      return productPrices[from]
    }

    if (from === 'USD' && products.includes(to)) {
      return 1 / productPrices[to]
    }

    if (products.includes(from) && fiats.includes(to) && to !== 'USD') {
      return productPrices[from] * fiatRates[to]
    }

    if (fiats.includes(from) && from !== 'USD' && products.includes(to)) {
      return 1 / (productPrices[to] * fiatRates[from])
    }

    if (cryptos.includes(from) && products.includes(to)) {
      return cryptoPrices[from] / productPrices[to]
    }

    if (products.includes(from) && cryptos.includes(to)) {
      return productPrices[from] / cryptoPrices[to]
    }

    if (products.includes(from) && products.includes(to)) {
      return productPrices[from] / productPrices[to]
    }

    return 0
  }

  public static async fetchExchangeRates(): Promise<ExchangeRates> {
    try {
      const [cryptoPrices, fiatData] = await Promise.all([
        this.fetchCryptoPrices(),
        this.fetchFiatRates(),
      ])

      const productPrices = this.getProductPrices(fiatData.rates)

      return this.calculateCrossRates(
        cryptoPrices,
        fiatData.rates,
        productPrices,
      )
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error)
      throw error
    }
  }
}
