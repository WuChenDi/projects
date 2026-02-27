import { useState, useEffect } from 'react'
import { ExchangeRates } from '@/types/currency'
import { ExchangeRate } from '@/lib/exchangeRate'
import { defaultRates } from '@/lib/rates'

export const useExchangeRates = () => {
  const [rates, setRates] = useState<ExchangeRates>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRates = async () => {
    setLoading(true)
    setError(null)

    try {
      const newRates = await ExchangeRate.fetchExchangeRates()
      console.log('Exchange rates loaded successfully:', newRates)
      setRates(newRates)
    } catch (err) {
      console.error('Failed to load exchange rates:', err)
      setError('Failed to load exchange rates')
      setRates(defaultRates)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRates()
  }, [])

  const refreshRates = () => {
    loadRates()
  }

  return {
    rates,
    loading,
    error,
    refreshRates,
  }
}
